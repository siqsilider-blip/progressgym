import { createClient } from '@/lib/supabase/server'

export type StudentRecentPR = {
    exerciseName: string
    weight: number
    performedAt: string
}

export async function getStudentRecentPRs(
    studentId: string
): Promise<StudentRecentPR[]> {
    const supabase = await createClient()

    const { data: logs, error } = await supabase
        .from('exercise_logs')
        .select(`
      weight,
      performed_at,
      routine_day_exercise_id
    `)
        .eq('student_id', studentId)
        .not('weight', 'is', null)
        .order('performed_at', { ascending: false })
        .limit(10)

    if (error || !logs) {
        console.error('Error fetching recent PRs:', error)
        return []
    }

    const routineDayExerciseIds = Array.from(
        new Set(
            logs
                .map((log) => log.routine_day_exercise_id)
                .filter((id) => id !== null)
        )
    )

    if (routineDayExerciseIds.length === 0) {
        return []
    }

    const { data: routineDayExercises, error: routineDayExercisesError } =
        await supabase
            .from('routine_day_exercises')
            .select('id, exercise_id')
            .in('id', routineDayExerciseIds)

    if (routineDayExercisesError || !routineDayExercises) {
        console.error(
            'Error fetching routine_day_exercises for recent PRs:',
            routineDayExercisesError
        )
        return []
    }

    const exerciseIds = Array.from(
        new Set(
            routineDayExercises
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
        console.error('Error fetching exercises for recent PRs:', exercisesError)
        return []
    }

    const routineDayExerciseToExerciseId = new Map<string, string>()
    for (const item of routineDayExercises) {
        if (item.id && item.exercise_id) {
            routineDayExerciseToExerciseId.set(item.id, item.exercise_id)
        }
    }

    const exerciseIdToName = new Map<string, string>()
    for (const exercise of exercises) {
        if (exercise.id) {
            exerciseIdToName.set(exercise.id, exercise.name ?? 'Ejercicio')
        }
    }

    const result: StudentRecentPR[] = []

    for (const log of logs as any[]) {
        const exerciseId = routineDayExerciseToExerciseId.get(
            log.routine_day_exercise_id
        )

        const exerciseName = exerciseId
            ? exerciseIdToName.get(exerciseId) ?? 'Ejercicio'
            : 'Ejercicio'

        result.push({
            exerciseName,
            weight: Number(log.weight ?? 0),
            performedAt: log.performed_at ?? '',
        })
    }

    return result
}