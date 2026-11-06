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
            return { ok: false, error: 'Ingresá las repeticiones o minutos realizados.', action: null }
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
            return { ok: false, error: error.message, action: null }
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
    studentId: string
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
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return failure('No autenticado')

        const { data: session } = await supabase
            .from('workout_sessions')
            .select('id, started_at, status, student_id, duration_seconds, routine_day_id, completion_status')
            .eq('id', payload.sessionId)
            .eq('student_id', payload.studentId)
            .single()

        if (!session) return failure('Sesión no encontrada')
        if (session.status !== 'in_progress' && session.status !== 'completed') {
            return failure('Estado de sesión inválido')
        }

        const [plannedResult, logsResult] = await Promise.all([
            supabase
                .from('routine_day_exercises')
                .select('id, sets')
                .eq('routine_day_id', session.routine_day_id),
            supabase
                .from('exercise_logs')
                .select('routine_day_exercise_id, set_index, reps, created_at')
                .eq('workout_session_id', payload.sessionId)
                .order('created_at', { ascending: false })
        ])

        if (plannedResult.error || logsResult.error) {
            console.error('Error calculando avance de sesión:', plannedResult.error ?? logsResult.error)
            return failure('No pudimos verificar las series del entrenamiento.')
        }

        const plannedRows = plannedResult.data ?? []
        const plannedSets = plannedRows.reduce(
            (total, exercise) => total + Math.max(1, Number(exercise.sets ?? 1)),
            0
        )
        const plannedSetsByExercise = new Map(
            plannedRows.map((exercise) => [exercise.id, Math.max(1, Number(exercise.sets ?? 1))])
        )
        const validLogs = (logsResult.data ?? []).filter((log) => {
            const exerciseSets = plannedSetsByExercise.get(log.routine_day_exercise_id)
            return exerciseSets != null
                && log.set_index != null
                && log.set_index >= 0
                && log.set_index < exerciseSets
                && Number.isInteger(Number(log.reps))
                && Number(log.reps) > 0
        })
        const completedSetKeys = new Set(
            validLogs.map((log) => `${log.routine_day_exercise_id}:${log.set_index}`)
        )
        const completedSets = completedSetKeys.size
        const effectivePlannedSets = Math.max(plannedSets, completedSets)
        const isIncomplete = completedSets < effectivePlannedSets

        if (completedSets === 0) return failure('No hay series registradas')

        if (isIncomplete && !payload.allowIncomplete) {
            return {
                ok: false,
                error: null,
                durationSeconds: session.duration_seconds ?? null,
                totalSets: completedSets,
                completedSets,
                plannedSets: effectivePlannedSets,
                requiresConfirmation: true,
                completionStatus: 'incomplete',
            }
        }

        let durationSeconds = session.duration_seconds ?? null
        let finishedAt: Date | null = null

        if (session.status === 'in_progress') {
            const now = new Date()
            const latestActivityAt = validLogs[0]?.created_at
                ? new Date(validLogs[0].created_at)
                : now
            const idleMilliseconds = now.getTime() - latestActivityAt.getTime()
            finishedAt = idleMilliseconds <= 15 * 60 * 1000 ? now : latestActivityAt
            const rawDurationSeconds = Math.floor(
                (finishedAt.getTime() - new Date(session.started_at).getTime()) / 1000
            )
            durationSeconds = Math.max(0, Math.min(rawDurationSeconds, 4 * 60 * 60))
        }

        const completionStatus = isIncomplete ? 'incomplete' as const : 'complete' as const
        const update: Record<string, string | number | boolean | null> = {
            status: 'completed',
            completed_manually: true,
            completion_status: completionStatus,
        }
        if (finishedAt) {
            update.finished_at = finishedAt.toISOString()
            update.duration_seconds = durationSeconds
        }

        const { error: updateError } = await supabase
            .from('workout_sessions')
            .update(update)
            .eq('id', payload.sessionId)
            .eq('student_id', payload.studentId)

        if (updateError) {
            console.error('Error completando sesión:', updateError)
            return failure(updateError.message)
        }

        revalidatePath('/app')
        revalidatePath('/app/rutina')
        revalidatePath('/app/history')
        revalidatePath(`/dashboard/students/${payload.studentId}`)
        revalidatePath(`/dashboard/students/${payload.studentId}/progress`)

        return {
            ok: true,
            error: null,
            durationSeconds,
            totalSets: completedSets,
            completedSets,
            plannedSets: effectivePlannedSets,
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
}): Promise<Record<string, number>> {
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
        return {}
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
        throw new Error('EXERCISE_MAX_WEIGHTS_LOAD_FAILED')
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
    } catch {
        return { ok: false, error: 'Error inesperado' }
    }
}
