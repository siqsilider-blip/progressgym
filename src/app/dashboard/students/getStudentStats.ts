import { createClient } from '@/lib/supabase/server'

export type StudentStats = {
    lastWorkoutAt: string | null
    totalSessions: number
    totalPRs: number
    status: 'active' | 'inactive' | 'new'
}

export async function getStudentStats(studentId: string): Promise<StudentStats> {
    const supabase = await createClient()

    const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

    if (workoutsError) {
        console.error('Error fetching workouts:', workoutsError)
    }

    const { data: logs, error: logsError } = await supabase
        .from('exercise_logs')
        .select('id, routine_day_exercise_id, weight, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true })

    if (logsError) {
        console.error('Error fetching exercise logs:', logsError)
    }

    const safeWorkouts = workouts ?? []
    const safeLogs = logs ?? []

    const lastWorkoutAt =
        safeWorkouts.length > 0 ? safeWorkouts[0].created_at : null

    const totalSessions = safeWorkouts.length

    const logsByExercise = new Map<
        string,
        Array<{
            id: string
            weight: number | null
            created_at: string
        }>
    >()

    for (const log of safeLogs) {
        const key = String(log.routine_day_exercise_id)

        if (!logsByExercise.has(key)) {
            logsByExercise.set(key, [])
        }

        logsByExercise.get(key)!.push({
            id: log.id,
            weight: log.weight,
            created_at: log.created_at,
        })
    }

    let totalPRs = 0

    for (const [, exerciseLogs] of logsByExercise) {
        if (exerciseLogs.length <= 1) continue

        for (let i = 1; i < exerciseLogs.length; i++) {
            const currentLog = exerciseLogs[i]

            if (currentLog.weight == null) continue

            const previousLogs = exerciseLogs.slice(0, i)
            const previousBest = Math.max(
                ...previousLogs.map((log) => log.weight || 0),
                0
            )

            const isPR = currentLog.weight === previousBest || currentLog.weight > previousBest

            if (isPR) {
                totalPRs++
            }
        }
    }

    let status: StudentStats['status'] = 'new'

    if (lastWorkoutAt) {
        const now = new Date()
        const last = new Date(lastWorkoutAt)

        const diffDays = Math.floor(
            (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (diffDays <= 7) {
            status = 'active'
        } else {
            status = 'inactive'
        }
    }

    return {
        lastWorkoutAt,
        totalSessions,
        totalPRs,
        status,
    }
}