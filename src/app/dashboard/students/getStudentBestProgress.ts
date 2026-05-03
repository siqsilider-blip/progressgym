import { createClient } from '@/lib/supabase/server'

export type StudentBestProgress = {
    exerciseName: string | null
    progressKg: number
    firstWeight: number | null
    bestWeight: number | null
}

export async function getStudentBestProgress(
    studentId: string
): Promise<StudentBestProgress> {
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
        console.error('Error fetching best progress:', logsError)
        return {
            exerciseName: null,
            progressKg: 0,
            firstWeight: null,
            bestWeight: null,
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
            progressKg: 0,
            firstWeight: null,
            bestWeight: null,
        }
    }

    const { data: routineDayExercises, error: rdeError } = await supabase
        .from('routine_day_exercises')
        .select('id, exercise_id')
        .in('id', routineDayExerciseIds)

    if (rdeError) {
        console.error('Error fetching routine_day_exercises for best progress:', rdeError)
        return {
            exerciseName: null,
            progressKg: 0,
            firstWeight: null,
            bestWeight: null,
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
            progressKg: 0,
            firstWeight: null,
            bestWeight: null,
        }
    }

    const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exerciseIds)

    if (exercisesError) {
        console.error('Error fetching exercises for best progress:', exercisesError)
        return {
            exerciseName: null,
            progressKg: 0,
            firstWeight: null,
            bestWeight: null,
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
            firstWeight: number
            bestWeight: number
        }
    >()

    for (const log of logs ?? []) {
        if (log.weight == null || !log.routine_day_exercise_id) continue

        const exerciseId = routineDayExerciseToExerciseId.get(log.routine_day_exercise_id)
        if (!exerciseId) continue

        const key = exerciseId
        const exerciseName = exerciseIdToName.get(exerciseId) ?? 'Ejercicio'

        if (!grouped.has(key)) {
            grouped.set(key, {
                exerciseName,
                firstWeight: Number(log.weight),
                bestWeight: Number(log.weight),
            })
        } else {
            const current = grouped.get(key)!
            const w = Number(log.weight)
            // firstWeight = el peso más bajo histórico (punto de partida)
            current.firstWeight = Math.min(current.firstWeight, w)
            // bestWeight = el peso más alto histórico (mejor marca)
            current.bestWeight = Math.max(current.bestWeight, w)
            grouped.set(key, current)
        }
    }

    let bestExerciseName: string | null = null
    let bestProgressKg = 0
    let bestFirstWeight: number | null = null
    let bestLastWeight: number | null = null

    for (const [, value] of grouped) {
        const progress = value.bestWeight - value.firstWeight
        if (progress <= 0) continue

        if (progress > bestProgressKg) {
            bestProgressKg = progress
            bestExerciseName = value.exerciseName
            bestFirstWeight = value.firstWeight
            bestLastWeight = value.bestWeight
        }
    }

    return {
        exerciseName: bestExerciseName,
        progressKg: bestProgressKg,
        firstWeight: bestFirstWeight,
        bestWeight: bestLastWeight,
    }
}
