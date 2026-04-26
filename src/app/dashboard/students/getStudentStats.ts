import { createClient } from '@/lib/supabase/server'

export type StudentStats = {
    lastWorkoutAt: string | null
    totalSessions: number
    totalPRs: number
    totalVolume: number
    last30DaysVolume: number
    status: 'active' | 'inactive' | 'new'
}

export async function getStudentStats(studentId: string): Promise<StudentStats> {
    const supabase = await createClient()

    const { data: logs, error: logsError } = await supabase
        .from('exercise_logs')
        .select('id, routine_day_exercise_id, weight, reps, created_at, performed_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true })

    if (logsError) {
        console.error('Error fetching exercise logs:', logsError)
    }

    const safeLogs = logs ?? []

    // Calcular días únicos de entrenamiento desde exercise_logs
    const uniqueTrainingDays = new Set(
        safeLogs
            .map((log) => {
                const date = log.performed_at ?? log.created_at
                if (!date) return null
                return String(date).split('T')[0]
            })
            .filter(Boolean)
    )

    const totalSessions = uniqueTrainingDays.size

    // Último entrenamiento: el más reciente de los logs
    const sortedLogs = [...safeLogs].sort((a, b) => {
        const dateA = new Date(a.performed_at ?? a.created_at ?? 0).getTime()
        const dateB = new Date(b.performed_at ?? b.created_at ?? 0).getTime()
        return dateB - dateA
    })
    const lastWorkoutAt = sortedLogs.length > 0
        ? (sortedLogs[0].performed_at ?? sortedLogs[0].created_at ?? null)
        : null

    const logsByExercise = new Map<
        string,
        Array<{
            id: string
            weight: number | null
            reps: number | null
            created_at: string
        }>
    >()

    let totalVolume = 0
    let last30DaysVolume = 0

    const now = new Date()
    const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30

    for (const log of safeLogs) {
        const key = String(log.routine_day_exercise_id)

        if (!logsByExercise.has(key)) {
            logsByExercise.set(key, [])
        }

        logsByExercise.get(key)!.push({
            id: log.id,
            weight: log.weight,
            reps: log.reps,
            created_at: log.created_at,
        })

        const weight = typeof log.weight === 'number' ? log.weight : 0
        const reps = typeof log.reps === 'number' ? log.reps : 0
        const logVolume = weight * reps

        totalVolume += logVolume

        const logDate = new Date(log.created_at)
        const diffMs = now.getTime() - logDate.getTime()

        if (diffMs <= THIRTY_DAYS_MS) {
            last30DaysVolume += logVolume
        }
    }

    let totalPRs = 0

    for (const [, exerciseLogs] of logsByExercise) {
        if (exerciseLogs.length <= 1) continue

        for (let i = 1; i < exerciseLogs.length; i++) {
            const currentLog = exerciseLogs[i]

            if (currentLog.weight == null) continue

            const previousLogs = exerciseLogs
                .slice(0, i)
                .filter((log) => log.weight != null)

            if (previousLogs.length === 0) continue

            const previousBest = Math.max(
                ...previousLogs.map((log) => log.weight as number)
            )

            // PR real: solo si supera el mejor peso anterior
            const isPR = currentLog.weight > previousBest

            if (isPR) {
                totalPRs++
            }
        }
    }

    let status: StudentStats['status'] = 'new'

    if (lastWorkoutAt) {
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
        totalVolume,
        last30DaysVolume,
        status,
    }
}