import { createClient } from '@/lib/supabase/server'

export type StudentStagnationItem = {
    exerciseId: string
    exerciseName: string
    bestWeight: number
    lastWeight: number
    lastPerformedAt: string | null
    sessionsWithoutImprovement: number
    stagnated: boolean
}

type SessionBest = {
    performedAt: string
    bestWeight: number
}

export async function getStudentStagnation(
    studentId: string
): Promise<StudentStagnationItem[]> {
    const supabase = await createClient()

    const { data: logs, error } = await supabase
        .from('exercise_logs')
        .select(`
            id,
            weight,
            performed_at,
            routine_day_exercise_id,
            routine_day_exercises (
                id,
                exercise_id,
                exercises!fk_rde_exercise (
                    id,
                    name
                )
            )
        `)
        .eq('student_id', studentId)
        .not('weight', 'is', null)
        .order('performed_at', { ascending: true })

    if (error) {
        console.error('Error fetching stagnation logs:', error)
        return []
    }

    const safeLogs = logs ?? []

    const sessionsByExercise = new Map<
        string,
        {
            exerciseName: string
            sessions: Map<string, SessionBest>
        }
    >()

    for (const log of safeLogs as any[]) {
        const exercise = log?.routine_day_exercises?.exercises
        const exerciseId = String(exercise?.id ?? '')
        const exerciseName = String(exercise?.name ?? 'Ejercicio')
        const performedAt = String(log?.performed_at ?? '')
        const weight = Number(log?.weight ?? 0)

        if (!exerciseId || !performedAt || !Number.isFinite(weight) || weight <= 0) {
            continue
        }

        if (!sessionsByExercise.has(exerciseId)) {
            sessionsByExercise.set(exerciseId, {
                exerciseName,
                sessions: new Map<string, SessionBest>(),
            })
        }

        const exerciseEntry = sessionsByExercise.get(exerciseId)!
        const existingSession = exerciseEntry.sessions.get(performedAt)

        if (!existingSession || weight > existingSession.bestWeight) {
            exerciseEntry.sessions.set(performedAt, {
                performedAt,
                bestWeight: weight,
            })
        }
    }

    const results: StudentStagnationItem[] = []

    for (const [exerciseId, entry] of sessionsByExercise.entries()) {
        const orderedSessions = Array.from(entry.sessions.values()).sort(
            (a, b) =>
                new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()
        )

        if (orderedSessions.length < 4) {
            continue
        }

        const bestWeightOverall = Math.max(
            ...orderedSessions.map((session) => session.bestWeight)
        )

        let sessionsWithoutImprovement = 0

        for (let i = orderedSessions.length - 1; i >= 0; i--) {
            const current = orderedSessions[i]
            const previousSessions = orderedSessions.slice(0, i)

            if (previousSessions.length === 0) {
                break
            }

            const previousBest = Math.max(
                ...previousSessions.map((session) => session.bestWeight)
            )

            if (current.bestWeight > previousBest) {
                break
            }

            sessionsWithoutImprovement++
        }

        const lastSession = orderedSessions[orderedSessions.length - 1]
        const last4Sessions = orderedSessions.slice(-4)

        let stagnated = false

        if (last4Sessions.length === 4) {
            const sessionIndexStart = orderedSessions.length - 4
            const previousToWindow = orderedSessions.slice(0, sessionIndexStart)

            if (previousToWindow.length > 0) {
                const bestBeforeWindow = Math.max(
                    ...previousToWindow.map((session) => session.bestWeight)
                )

                const improvedInsideWindow = last4Sessions.some(
                    (session) => session.bestWeight > bestBeforeWindow
                )

                stagnated = !improvedInsideWindow
            } else {
                const firstWindowBest = last4Sessions[0].bestWeight
                const improvedInsideWindow = last4Sessions.some(
                    (session) => session.bestWeight > firstWindowBest
                )

                stagnated = !improvedInsideWindow
            }
        }

        results.push({
            exerciseId,
            exerciseName: entry.exerciseName,
            bestWeight: bestWeightOverall,
            lastWeight: lastSession.bestWeight,
            lastPerformedAt: lastSession.performedAt,
            sessionsWithoutImprovement,
            stagnated,
        })
    }

    return results
        .filter((item) => item.stagnated || item.sessionsWithoutImprovement >= 4)
        .sort((a, b) => {
            if (b.sessionsWithoutImprovement !== a.sessionsWithoutImprovement) {
                return b.sessionsWithoutImprovement - a.sessionsWithoutImprovement
            }

            return b.bestWeight - a.bestWeight
        })
        .slice(0, 5)
}
