'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function saveSet(payload: {
    sessionId: string
    studentId: string
    routineDayExerciseId: string
    setIndex: number
    weight: number | null
    reps: number | null
    rpe?: number | null
    performedAt: string
}): Promise<{ ok: boolean; error: string | null; action: 'inserted' | 'updated' | null }> {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { ok: false, error: 'No autenticado', action: null }
        }

        if (payload.weight === null && payload.reps === null) {
            return { ok: false, error: 'Completá al menos peso o reps', action: null }
        }

        const { data: existingLog } = await supabase
            .from('exercise_logs')
            .select('id')
            .eq('workout_session_id', payload.sessionId)
            .eq('routine_day_exercise_id', payload.routineDayExerciseId)
            .eq('set_index', payload.setIndex)
            .maybeSingle()

        if (existingLog?.id) {
            const { error: updateError } = await supabase
                .from('exercise_logs')
                .update({
                    weight: payload.weight,
                    reps: payload.reps,
                    rpe: payload.rpe ?? null,
                    performed_at: payload.performedAt,
                })
                .eq('id', existingLog.id)

            if (updateError) {
                console.error('Error actualizando set:', updateError)
                return { ok: false, error: updateError.message, action: null }
            }

            return { ok: true, error: null, action: 'updated' }
        }

        const { error: insertError } = await supabase
            .from('exercise_logs')
            .insert({
                student_id: payload.studentId,
                routine_day_exercise_id: payload.routineDayExerciseId,
                workout_session_id: payload.sessionId,
                weight: payload.weight,
                reps: payload.reps,
                rpe: payload.rpe ?? null,
                performed_at: payload.performedAt,
                set_index: payload.setIndex,
            })

        if (insertError) {
            console.error('Error guardando set:', insertError)
            return { ok: false, error: insertError.message, action: null }
        }

        return { ok: true, error: null, action: 'inserted' }
    } catch (err) {
        console.error('Error inesperado en saveSet:', err)
        return { ok: false, error: 'Error inesperado', action: null }
    }
}

export async function completeSession(payload: {
    sessionId: string
    studentId: string
}): Promise<{
    ok: boolean
    error: string | null
    durationSeconds: number | null
    totalSets: number
}> {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return { ok: false, error: 'No autenticado', durationSeconds: null, totalSets: 0 }
        }

        const { data: session } = await supabase
            .from('workout_sessions')
            .select('id, started_at, status, student_id, trainer_id, duration_seconds')
            .eq('id', payload.sessionId)
            .eq('student_id', payload.studentId)
            .single()

        if (!session) {
            return { ok: false, error: 'Sesión no encontrada', durationSeconds: null, totalSets: 0 }
        }

        if (session.status === 'completed') {
            const { count } = await supabase
                .from('exercise_logs')
                .select('id', { count: 'exact', head: true })
                .eq('workout_session_id', payload.sessionId)

            return {
                ok: true,
                error: null,
                durationSeconds: session.duration_seconds ?? null,
                totalSets: count ?? 0
            }
        }

        if (session.status !== 'in_progress') {
            return { ok: false, error: 'Estado de sesión inválido', durationSeconds: null, totalSets: 0 }
        }

        const { count } = await supabase
            .from('exercise_logs')
            .select('id', { count: 'exact', head: true })
            .eq('workout_session_id', payload.sessionId)

        if (!count || count === 0) {
            return { ok: false, error: 'No hay series registradas', durationSeconds: null, totalSets: 0 }
        }

        const finishedAt = new Date()
        const durationSeconds = Math.floor(
            (finishedAt.getTime() - new Date(session.started_at).getTime()) / 1000
        )

        const { error: updateError } = await supabase
            .from('workout_sessions')
            .update({
                status: 'completed',
                finished_at: finishedAt.toISOString(),
                duration_seconds: durationSeconds,
            })
            .eq('id', payload.sessionId)

        if (updateError) {
            console.error('Error completando sesión:', updateError)
            return { ok: false, error: updateError.message, durationSeconds: null, totalSets: 0 }
        }

        revalidatePath(`/dashboard/students/${payload.studentId}`)
        revalidatePath(`/dashboard/students/${payload.studentId}/progress`)
        return { ok: true, error: null, durationSeconds, totalSets: count }
    } catch (err) {
        console.error('Error inesperado en completeSession:', err)
        return { ok: false, error: 'Error inesperado', durationSeconds: null, totalSets: 0 }
    }
}

export async function getExerciseMaxWeights(payload: {
    studentId: string
    routineDayExerciseIds: string[]
}): Promise<Record<string, number>> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user || payload.routineDayExerciseIds.length === 0) {
        return {}
    }

    const { data: logs } = await supabase
        .from('exercise_logs')
        .select('routine_day_exercise_id, weight')
        .eq('student_id', payload.studentId)
        .in('routine_day_exercise_id', payload.routineDayExerciseIds)
        .not('weight', 'is', null)

    const maxWeights: Record<string, number> = {}

    for (const log of logs ?? []) {
        const id = log.routine_day_exercise_id
        const weight = Number(log.weight)
        if (!id || isNaN(weight)) continue
        if (!maxWeights[id] || weight > maxWeights[id]) {
            maxWeights[id] = weight
        }
    }

    return maxWeights
}

export async function saveSessionNote(payload: {
    sessionId: string
    studentId: string
    note: string
}): Promise<{ ok: boolean; error: string | null }> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { ok: false, error: 'No autenticado' }

        const { error } = await supabase
            .from('workout_sessions')
            .update({ notes: payload.note.trim() })
            .eq('id', payload.sessionId)
            .eq('student_id', payload.studentId)

        if (error) return { ok: false, error: error.message }
        return { ok: true, error: null }
    } catch (err) {
        return { ok: false, error: 'Error inesperado' }
    }
}
