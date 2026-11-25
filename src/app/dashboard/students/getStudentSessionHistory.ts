import { createClient } from '@/lib/supabase/server'

export type SessionExerciseSummary = {
    routineDayExerciseId: string
    position: number
    exerciseName: string
    sets: number
    bestWeight: number | null
    bestReps: number | null
    avgRpe: number | null
    isCardio: boolean
}

export type SessionHistoryItem = {
    sessionId: string
    canReview: boolean
    performedDate: string
    startedAt: string
    durationSeconds: number | null
    completionStatus: 'complete' | 'incomplete'
    dayLabel: string
    totalSets: number
    note: string | null
    exercises: SessionExerciseSummary[]
}

export type StudentSessionHistoryResult = {
    sessions: SessionHistoryItem[]
    error: string | null
}

export async function getStudentSessionHistoryResult(
    studentId: string,
    limit = 20
): Promise<StudentSessionHistoryResult> {
    const supabase = await createClient()
    const sessionFetchLimit = Math.max(limit * 4, 100)

    // Traer primero las sesiones recientes. Antes se descargaba el índice
    // completo de logs solo para descubrir IDs, algo que empeoraba a medida
    // que crecía el historial del alumno.
    const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, performed_date, started_at, finished_at, duration_seconds, routine_day_id, notes, completed_manually, completion_status')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .order('performed_date', { ascending: false })
        .order('started_at', { ascending: false })
        .limit(sessionFetchLimit)

    if (sessionsError) {
        console.error('No se pudo cargar el historial de sesiones:', sessionsError)
        return { sessions: [], error: 'No pudimos cargar las sesiones en este momento.' }
    }
    if (!sessions || sessions.length === 0) return { sessions: [], error: null }

    const sessionIds = sessions.map((s) => s.id)
    const routineDayIds = [...new Set(sessions.map((s) => s.routine_day_id).filter(Boolean))]

    // Traer labels y logs en paralelo.
    const dayLabelMap = new Map<string, string>()
    const [daysResult, logsResult] = await Promise.all([
        routineDayIds.length > 0
            ? supabase
                .from('routine_days')
                .select('id, name, title, day_index')
                .in('id', routineDayIds)
            : Promise.resolve({
                data: [] as Array<{
                    id: string
                    name: string | null
                    title: string | null
                    day_index: number | null
                }>,
                error: null,
            }),
        supabase
            .from('exercise_logs')
            .select('workout_session_id, routine_day_exercise_id, weight, reps, rpe, set_index')
            .in('workout_session_id', sessionIds)
            .eq('student_id', studentId),
    ])

    if (daysResult.error) {
        console.error('No se pudieron cargar los días del historial:', daysResult.error)
        return { sessions: [], error: 'No pudimos completar los datos del historial.' }
    }

    for (const day of daysResult.data ?? []) {
        dayLabelMap.set(
            day.id,
            day.name?.trim() || day.title?.trim() || `Día ${day.day_index}`
        )
    }

    const logs = logsResult.data
    if (logsResult.error) {
        console.error('No se pudieron cargar las series del historial:', logsResult.error)
        return { sessions: [], error: 'No pudimos cargar las series del historial.' }
    }
    if (!logs) return { sessions: [], error: 'No pudimos cargar las series del historial.' }

    // Traer routine_day_exercises + exercises para nombres.
    const rdeIds = [...new Set(logs.map((l) => l.routine_day_exercise_id).filter(Boolean))]
    const exerciseNameMap = new Map<string, { name: string; isCardio: boolean; position: number }>()

    if (rdeIds.length > 0) {
        const { data: rdes, error: rdesError } = await supabase
            .from('routine_day_exercises')
            .select('id, exercise_id, position')
            .in('id', rdeIds)

        if (rdesError) {
            console.error('No se pudo resolver el orden de ejercicios del historial:', rdesError)
            return { sessions: [], error: 'No pudimos completar los ejercicios del historial.' }
        }

        const exerciseIds = [...new Set((rdes ?? []).map((r) => r.exercise_id).filter(Boolean))]

        if (exerciseIds.length > 0) {
            const { data: exercises, error: exercisesError } = await supabase
                .from('exercises')
                .select('id, name, metric_type')
                .in('id', exerciseIds)

            if (exercisesError) {
                console.error('No se pudieron resolver los ejercicios del historial:', exercisesError)
                return { sessions: [], error: 'No pudimos completar los ejercicios del historial.' }
            }

            const exMap = new Map((exercises ?? []).map((e) => [e.id, e]))

            for (const rde of rdes ?? []) {
                if (!rde.id || !rde.exercise_id) continue
                const ex = exMap.get(rde.exercise_id)
                if (ex) {
                    exerciseNameMap.set(rde.id, {
                        name: ex.name ?? 'Ejercicio',
                        isCardio: ex.metric_type === 'time',
                        position: rde.position ?? Number.MAX_SAFE_INTEGER,
                    })
                }
            }
        }
    }

    // Agrupar logs por sesión.
    const logsBySession = new Map<string, typeof logs>()
    for (const log of logs) {
        if (!log.workout_session_id) continue
        if (!logsBySession.has(log.workout_session_id)) {
            logsBySession.set(log.workout_session_id, [])
        }
        logsBySession.get(log.workout_session_id)!.push(log)
    }

    // Las sesiones sin series no forman parte del historial visible, igual
    // que antes, pero ya no condicionan la consulta inicial.
    const history = sessions
        .filter((session) => logsBySession.has(session.id))
        .map((session) => {
        const sessionLogs = logsBySession.get(session.id) ?? []

        // Agrupar por ejercicio dentro de la sesión
        const exerciseGroups = new Map<string, {
            id: string
            name: string
            isCardio: boolean
            position: number
            weights: (number | null)[]
            reps: (number | null)[]
            rpes: (number | null)[]
        }>()

        for (const log of sessionLogs) {
            if (!log.routine_day_exercise_id) continue
            const meta = exerciseNameMap.get(log.routine_day_exercise_id)
            if (!meta) continue

            if (!exerciseGroups.has(log.routine_day_exercise_id)) {
                exerciseGroups.set(log.routine_day_exercise_id, {
                    id: log.routine_day_exercise_id,
                    name: meta.name,
                    isCardio: meta.isCardio,
                    position: meta.position,
                    weights: [],
                    reps: [],
                    rpes: [],
                })
            }

            const group = exerciseGroups.get(log.routine_day_exercise_id)!
            group.weights.push(log.weight ?? null)
            group.reps.push(log.reps ?? null)
            group.rpes.push(log.rpe ?? null)
        }

        const exercises: SessionExerciseSummary[] = []
        for (const [, group] of exerciseGroups) {
            const validWeights = group.weights.filter((w): w is number => w !== null)
            const validReps = group.reps.filter((r): r is number => r !== null)
            const validRpes = group.rpes.filter((r): r is number => r !== null)

            exercises.push({
                routineDayExerciseId: group.id,
                position: group.position,
                exerciseName: group.name,
                sets: group.weights.length,
                bestWeight: validWeights.length > 0 ? Math.max(...validWeights) : null,
                bestReps: validReps.length > 0 ? Math.max(...validReps) : null,
                avgRpe: validRpes.length > 0
                    ? Math.round((validRpes.reduce((a, b) => a + b, 0) / validRpes.length) * 10) / 10
                    : null,
                isCardio: group.isCardio,
            })
        }

        exercises.sort((a, b) => a.position - b.position)

        return {
            sessionId: session.id,
            canReview: Boolean(session.routine_day_id && dayLabelMap.has(session.routine_day_id))
                && exercises.some((exercise) => (exercise.bestReps ?? 0) > 0),
            performedDate: session.performed_date ?? String(session.started_at ?? '').split('T')[0],
            startedAt: session.started_at ?? '',
            durationSeconds: session.duration_seconds ?? null,
            completionStatus: session.completed_manually === true && session.completion_status === 'complete'
                ? 'complete' as const
                : 'incomplete' as const,
            dayLabel: session.routine_day_id
                ? (dayLabelMap.get(session.routine_day_id) ?? 'Sesión')
                : 'Sesión',
            totalSets: exercises.reduce((total, exercise) => total + exercise.sets, 0),
            note: session.notes ?? null,
            exercises,
        }
        })
        .slice(0, limit)

    return { sessions: history, error: null }
}

export async function getStudentSessionHistory(
    studentId: string,
    limit = 20
): Promise<SessionHistoryItem[]> {
    const result = await getStudentSessionHistoryResult(studentId, limit)
    return result.sessions
}
