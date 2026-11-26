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

        if (payload.reps === null || !Number.isInteger(payload.reps) || payload.reps <= 0) {
            return { ok: false, error: 'Ingresá las repeticiones o el tiempo realizado.', action: null }
        }
        if (payload.weight !== null && (!Number.isFinite(payload.weight) || payload.weight < 0)) {
            return { ok: false, error: 'El peso no puede ser negativo.', action: null }
        }
        if (payload.rpe != null && (!Number.isFinite(payload.rpe) || payload.rpe < 1 || payload.rpe > 10)) {
            return { ok: false, error: 'El esfuerzo debe estar entre 1 y 10.', action: null }
        }

        const { data: action, error } = await supabase.rpc('save_workout_set_safe', {
            p_session_id: payload.sessionId,
            p_routine_day_exercise_id: payload.routineDayExerciseId,
            p_set_index: payload.setIndex,
            p_weight: payload.weight,
            p_reps: payload.reps,
            p_rpe: payload.rpe ?? null,
            p_performed_at: payload.performedAt,
        })

        if (error) {
            console.error('Error guardando set:', error)
            const friendlyError = error.message.includes('WORKOUT_NEXT_DAY_REQUIRED')
                ? 'Ya elegiste otro entrenamiento hoy. El próximo se habilita mañana.'
                : error.message.includes('WORKOUT_DAY_ALREADY_USED_THIS_WEEK')
                    ? 'Este entrenamiento ya fue realizado esta semana.'
                    : error.message.includes('WORKOUT_WEEK_NOT_CURRENT')
                        ? 'Este entrenamiento no corresponde a la semana actual.'
                        : error.message.includes('WORKOUT_SESSION_EXPIRED')
                            ? 'Esta sesión ya venció. Volvé a tu rutina para continuar.'
                            : error.message
            return { ok: false, error: friendlyError, action: null }
        }

        return {
            ok: true,
            error: null,
            action: action === 'updated' ? 'updated' : 'inserted',
        }
    } catch (err) {
        console.error('Error inesperado en saveSet:', err)
        return { ok: false, error: 'Error inesperado', action: null }
    }
}

export async function completeSession(payload: {
    sessionId: string
    allowIncomplete?: boolean
}): Promise<{
    ok: boolean
    error: string | null
    durationSeconds: number | null
    totalSets: number
    completedSets: number
    plannedSets: number
    requiresConfirmation: boolean
    completionStatus: 'complete' | 'incomplete' | null
}> {
    const failure = (error: string) => ({
        ok: false as const,
        error,
        durationSeconds: null,
        totalSets: 0,
        completedSets: 0,
        plannedSets: 0,
        requiresConfirmation: false,
        completionStatus: null,
    })

    try {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('finish_workout_session_safe', {
            p_session_id: payload.sessionId,
            p_allow_incomplete: payload.allowIncomplete ?? false,
        })

        if (error) {
            console.error('Error completando sesión:', error)
            return failure(error.message)
        }

        const result = Array.isArray(data) ? data[0] : null
        if (!result) return failure('No pudimos finalizar el entrenamiento.')

        const completedSets = Number(result.completed_sets ?? 0)
        const plannedSets = Number(result.planned_sets ?? 0)
        const durationSeconds = result.duration_seconds == null
            ? null
            : Number(result.duration_seconds)
        const completionStatus = result.completion_status === 'incomplete'
            ? 'incomplete' as const
            : result.completion_status === 'complete'
                ? 'complete' as const
                : null

        if (!completionStatus) return failure('La sesión devolvió un resultado inválido.')

        if (result.requires_confirmation) {
            return {
                ok: false,
                error: null,
                durationSeconds,
                totalSets: completedSets,
                completedSets,
                plannedSets,
                requiresConfirmation: true,
                completionStatus,
            }
        }

        if (typeof result.student_id !== 'string') {
            return failure('La sesión no devolvió un alumno válido.')
        }
        const sessionStudentId = result.student_id

        revalidatePath('/app')
        revalidatePath('/app/rutina')
        revalidatePath('/app/history')
        revalidatePath(`/dashboard/students/${sessionStudentId}`)
        revalidatePath(`/dashboard/students/${sessionStudentId}/progress`)

        return {
            ok: true,
            error: null,
            durationSeconds,
            totalSets: completedSets,
            completedSets,
            plannedSets,
            requiresConfirmation: false,
            completionStatus,
        }
    } catch (err) {
        console.error('Error inesperado en completeSession:', err)
        return failure('Error inesperado')
    }
}

export async function getExerciseMaxWeights(payload: {
    studentId: string
    routineDayExerciseIds: string[]
}): Promise<{ values: Record<string, number>; available: boolean }> {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error('[getExerciseMaxWeights] auth', authError)
        throw new Error('EXERCISE_MAX_WEIGHTS_AUTH_FAILED')
    }

    if (payload.routineDayExerciseIds.length === 0) {
        return { values: {}, available: true }
    }

    const { data: logs, error: logsError } = await supabase
        .from('exercise_logs')
        .select('routine_day_exercise_id, weight, workout_sessions!inner(student_id, status, completed_manually)')
        .eq('student_id', payload.studentId)
        .eq('workout_sessions.student_id', payload.studentId)
        .eq('workout_sessions.status', 'completed')
        .eq('workout_sessions.completed_manually', true)
        .in('routine_day_exercise_id', payload.routineDayExerciseIds)
        .not('weight', 'is', null)

    if (logsError) {
        console.error('[getExerciseMaxWeights] logs', logsError)
        return { values: {}, available: false }
    }

    const maxWeights: Record<string, number> = {}

    for (const log of logs ?? []) {
        const id = log.routine_day_exercise_id
        const weight = Number(log.weight)
        if (!id || isNaN(weight)) continue
        if (!maxWeights[id] || weight > maxWeights[id]) {
            maxWeights[id] = weight
        }
    }

    return { values: maxWeights, available: true }
}

export async function saveSessionNote(payload: {
    sessionId: string
    note: string
}): Promise<{ ok: boolean; error: string | null }> {
    try {
        const supabase = await createClient()
        const { error } = await supabase.rpc('save_workout_session_note_safe', {
            p_session_id: payload.sessionId,
            p_note: payload.note,
        })

        if (error) return { ok: false, error: error.message }
        return { ok: true, error: null }
    } catch {
        return { ok: false, error: 'Error inesperado' }
    }
}
