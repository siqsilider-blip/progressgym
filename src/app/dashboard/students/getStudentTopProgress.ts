import { createClient } from '@/lib/supabase/server'

export type StudentTopProgress = {
    exerciseName: string
    progressKg: number
    firstWeight: number
    bestWeight: number
}

export async function getStudentTopProgress(
    studentId: string
): Promise<StudentTopProgress[]> {
    const supabase = await createClient()

    const { data: logs, error: logsError } = await supabase
        .from('exercise_logs')
        .select(`
      weight,
      created_at,
      routine_day_exercise_id
    `)
        .eq('student_id', studentId)
        .not('weight', 'is', null)
        .order('created_at', { ascending: true })

    if (logsError || !logs) {
        console.error('Error fetching student top progress:', logsError)
        return []
    }

    const routineDayExerciseIds = Array.from(
        new Set(
            (logs ?? [])
                .map((log) => log.routine_day_exercise_id)
                .filter((id) => id !== null)
        )
    )

    if (routineDayExerciseIds.length === 0) {
        return []
    }

    const { data: routineDayExercises, error: rdeError } = await supabase
        .from('routine_day_exercises')
        .select('id, exercise_id')
        .in('id', routineDayExerciseIds)

    if (rdeError || !routineDayExercises) {
        console.error('Error fetching routine_day_exercises for top progress:', rdeError)
        return []
    }

    const exerciseIds = Array.from(
        new Set(
            (routineDayExercises ?? [])
                .map((item) => item.exercise_id)
                .filter((id) => id !== null)
        )
    )

    if (exerciseIds.length === 0) {
        return []
    }

    const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exerciseIds)

    if (exercisesError || !exercises) {
        console.error('Error fetching exercises for top progress:', exercisesError)
        return []
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

    for (const log of logs as any[]) {
        const routineDayExerciseId = log.routine_day_exercise_id
        if (!routineDayExerciseId || log.weight == null) continue

        const exerciseId = routineDayExerciseToExerciseId.get(routineDayExerciseId)
        if (!exerciseId) continue

        const exerciseName = exerciseIdToName.get(exerciseId) ?? 'Ejercicio'
        const weight = Number(log.weight)

        if (!grouped.has(exerciseId)) {
            grouped.set(exerciseId, {
                exerciseName,
                firstWeight: weight,
                bestWeight: weight,
            })
        } else {
            const current = grouped.get(exerciseId)!
            current.bestWeight = Math.max(current.bestWeight, weight)
            grouped.set(exerciseId, current)
        }
    }

    const progressList: StudentTopProgress[] = []

    for (const [, value] of grouped) {
        const progressKg = value.bestWeight - value.firstWeight

        if (progressKg > 0) {
            progressList.push({
                exerciseName: value.exerciseName,
                progressKg,
                firstWeight: value.firstWeight,
                bestWeight: value.bestWeight,
            })
        }
    }

    return progressList
        .sort((a, b) => b.progressKg - a.progressKg)
        .slice(0, 5)
}