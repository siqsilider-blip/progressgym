import { createClient } from '@/lib/supabase/server'

export type StudentStagnation = {
    exerciseName: string | null
    daysWithoutImprovement: number
    lastBestWeight: number | null
    detected: boolean
}

export async function getStudentStagnation(
    studentId: string
): Promise<StudentStagnation> {
    const supabase = await createClient()

    const { data: logs, error: logsError } = await supabase
        .from('exercise_logs')
        .select(`
      routine_day_exercise_id,
      weight,
      created_at
    `)
        .eq('student_id', studentId)
        .not('weight', 'is', null)
        .order('created_at', { ascending: true })

    if (logsError) {
        console.error('Error fetching stagnation:', logsError)
        return {
            exerciseName: null,
            daysWithoutImprovement: 0,
            lastBestWeight: null,
            detected: false,
        }
    }

    const routineDayExerciseIds = Array.from(
        new Set(
            (logs ?? [])
                .map((log) => log.routine_day_exercise_id)
                .filter((id) => id !== null)
        )
    )

    if (routineDayExerciseIds.length === 0) {
        return {
            exerciseName: null,
            daysWithoutImprovement: 0,
            lastBestWeight: null,
            detected: false,
        }
    }

    const { data: routineDayExercises, error: rdeError } = await supabase
        .from('routine_day_exercises')
        .select('id, exercise_id')
        .in('id', routineDayExerciseIds)

    if (rdeError) {
        console.error('Error fetching routine_day_exercises for stagnation:', rdeError)
        return {
            exerciseName: null,
            daysWithoutImprovement: 0,
            lastBestWeight: null,
            detected: false,
        }
    }

    const exerciseIds = Array.from(
        new Set(
            (routineDayExercises ?? [])
                .map((item) => item.exercise_id)
                .filter((id) => id !== null)
        )
    )

    if (exerciseIds.length === 0) {
        return {
            exerciseName: null,
            daysWithoutImprovement: 0,
            lastBestWeight: null,
            detected: false,
        }
    }

    const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exerciseIds)

    if (exercisesError) {
        console.error('Error fetching exercises for stagnation:', exercisesError)
        return {
            exerciseName: null,
            daysWithoutImprovement: 0,
            lastBestWeight: null,
            detected: false,
        }
    }

    const routineDayExerciseToExerciseId = new Map<string, string>()
    for (const item of routineDayExercises ?? []) {
        if (item.id && item.exercise_id) {
            routineDayExerciseToExerciseId.set(item.id, item.exercise_id)
        }
    }

    const exerciseIdToName = new Map<string, string>()
    for (const exercise of exercises ?? []) {
        if (exercise.id) {
            exerciseIdToName.set(exercise.id, exercise.name ?? 'Ejercicio')
        }
    }

    const grouped = new Map<
        string,
        {
            exerciseName: string
            maxWeight: number
            maxWeightLastSeenAt: string
            totalLogs: number
        }
    >()

    for (const log of logs ?? []) {
        if (log.weight == null || !log.routine_day_exercise_id) continue

        const exerciseId = routineDayExerciseToExerciseId.get(log.routine_day_exercise_id)
        if (!exerciseId) continue

        const key = exerciseId
        const weight = Number(log.weight)
        const createdAt = String(log.created_at)
        const exerciseName = exerciseIdToName.get(exerciseId) ?? 'Ejercicio'

        if (!grouped.has(key)) {
            grouped.set(key, {
                exerciseName,
                maxWeight: weight,
                maxWeightLastSeenAt: createdAt,
                totalLogs: 1,
            })
        } else {
            const current = grouped.get(key)!

            current.totalLogs += 1

            if (weight > current.maxWeight) {
                current.maxWeight = weight
                current.maxWeightLastSeenAt = createdAt
            } else if (weight === current.maxWeight) {
                current.maxWeightLastSeenAt = createdAt
            }

            grouped.set(key, current)
        }
    }

    let stagnatedExerciseName: string | null = null
    let stagnatedDays = 0
    let stagnatedBestWeight: number | null = null

    const now = new Date()

    for (const [, value] of grouped) {
        if (value.totalLogs < 2) continue

        const bestDate = new Date(value.maxWeightLastSeenAt)
        const diffDays = Math.floor(
            (now.getTime() - bestDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (diffDays > stagnatedDays) {
            stagnatedDays = diffDays
            stagnatedExerciseName = value.exerciseName
            stagnatedBestWeight = value.maxWeight
        }
    }

    const detected = stagnatedExerciseName !== null && stagnatedDays >= 14

    return {
        exerciseName: stagnatedExerciseName,
        daysWithoutImprovement: stagnatedDays,
        lastBestWeight: stagnatedBestWeight,
        detected,
    }
}