import { createClient } from '@/lib/supabase/server'

export type SessionExerciseSummary = {
    exerciseName: string
    sets: number
    bestWeight: number | null
    bestReps: number | null
    isCardio: boolean
}

export type SessionHistoryItem = {
    sessionId: string
    performedDate: string
    startedAt: string
    durationSeconds: number | null
    dayLabel: string
    totalSets: number
    exercises: SessionExerciseSummary[]
}

export async function getStudentSessionHistory(
    studentId: string,
    limit = 20
): Promise<SessionHistoryItem[]> {
    const supabase = await createClient()

    // 1. Traer sesiones completadas del alumno
    const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, performed_date, started_at, finished_at, duration_seconds, routine_day_id')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .gt('duration_seconds', 30)
        .order('performed_date', { ascending: false })
        .order('started_at', { ascending: false })
        .limit(limit)

    if (sessionsError || !sessions || sessions.length === 0) return []

    const sessionIds = sessions.map((s) => s.id)
    const routineDayIds = [...new Set(sessions.map((s) => s.routine_day_id).filter(Boolean))]

    // 2. Traer labels de días de rutina
    const dayLabelMap = new Map<string, string>()
    if (routineDayIds.length > 0) {
        const { data: days } = await supabase
            .from('routine_days')
            .select('id, title, day_index')
            .in('id', routineDayIds)

        for (const day of days ?? []) {
            dayLabelMap.set(
                day.id,
                day.title?.trim() || `Día ${day.day_index}`
            )
        }
    }

    // 3. Traer todos los logs de esas sesiones
    const { data: logs, error: logsError } = await supabase
        .from('exercise_logs')
        .select('workout_session_id, routine_day_exercise_id, weight, reps, set_index')
        .in('workout_session_id', sessionIds)
        .eq('student_id', studentId)

    if (logsError || !logs) return []

    // 4. Traer routine_day_exercises + exercises para nombres
    const rdeIds = [...new Set(logs.map((l) => l.routine_day_exercise_id).filter(Boolean))]
    const exerciseNameMap = new Map<string, { name: string; isCardio: boolean }>()

    if (rdeIds.length > 0) {
        const { data: rdes } = await supabase
            .from('routine_day_exercises')
            .select('id, exercise_id')
            .in('id', rdeIds)

        const exerciseIds = [...new Set((rdes ?? []).map((r) => r.exercise_id).filter(Boolean))]

        if (exerciseIds.length > 0) {
            const { data: exercises } = await supabase
                .from('exercises')
                .select('id, name, metric_type')
                .in('id', exerciseIds)

            const exMap = new Map((exercises ?? []).map((e) => [e.id, e]))

            for (const rde of rdes ?? []) {
                if (!rde.id || !rde.exercise_id) continue
                const ex = exMap.get(rde.exercise_id)
                if (ex) {
                    exerciseNameMap.set(rde.id, {
                        name: ex.name ?? 'Ejercicio',
                        isCardio: ex.metric_type === 'time',
                    })
                }
            }
        }
    }

    // 5. Agrupar logs por sesión
    const logsBySession = new Map<string, typeof logs>()
    for (const log of logs) {
        if (!log.workout_session_id) continue
        if (!logsBySession.has(log.workout_session_id)) {
            logsBySession.set(log.workout_session_id, [])
        }
        logsBySession.get(log.workout_session_id)!.push(log)
    }

    // 6. Construir resultado
    const result = sessions.map((session) => {
        const sessionLogs = logsBySession.get(session.id) ?? []

        const exerciseGroups = new Map<string, {
            name: string
            isCardio: boolean
            weights: (number | null)[]
            reps: (number | null)[]
        }>()

        for (const log of sessionLogs) {
            if (!log.routine_day_exercise_id) continue
            const meta = exerciseNameMap.get(log.routine_day_exercise_id)
            if (!meta) continue

            if (!exerciseGroups.has(log.routine_day_exercise_id)) {
                exerciseGroups.set(log.routine_day_exercise_id, {
                    name: meta.name,
                    isCardio: meta.isCardio,
                    weights: [],
                    reps: [],
                })
            }

            const group = exerciseGroups.get(log.routine_day_exercise_id)!
            group.weights.push(log.weight ?? null)
            group.reps.push(log.reps ?? null)
        }

        const exercises: SessionExerciseSummary[] = []
        for (const [, group] of exerciseGroups) {
            const validWeights = group.weights.filter((w): w is number => w !== null)
            const validReps = group.reps.filter((r): r is number => r !== null)

            exercises.push({
                exerciseName: group.name,
                sets: group.weights.length,
                bestWeight: validWeights.length > 0 ? Math.max(...validWeights) : null,
                bestReps: validReps.length > 0 ? Math.max(...validReps) : null,
                isCardio: group.isCardio,
            })
        }

        return {
            sessionId: session.id,
            performedDate: session.performed_date ?? String(session.started_at ?? '').split('T')[0],
            startedAt: session.started_at ?? '',
            durationSeconds: session.duration_seconds ?? null,
            dayLabel: session.routine_day_id
                ? (dayLabelMap.get(session.routine_day_id) ?? 'Sesión')
                : 'Sesión',
            totalSets: sessionLogs.length,
            exercises,
        }
    })

    return result.filter(s => s.totalSets >= 1)
}
