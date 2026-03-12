import { createClient } from '@/lib/supabase/server'

type StudentExercisePR = {
    exercise_name: string
    weight: number
    reps: number | null
    performed_at: string | null
}

export async function getStudentExercisePRs(
    studentId: string
): Promise<StudentExercisePR[]> {
    const supabase = await createClient()

    const { data: logs, error: logsError } = await supabase
        .from('exercise_logs')
        .select(`
      weight,
      reps,
      performed_at,
      routine_day_exercise_id
    `)
        .eq('student_id', studentId)
        .order('weight', { ascending: false })

    if (logsError) {
        console.error('Error fetching student PR logs:', logsError)
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

    if (rdeError) {
        console.error('Error fetching routine_day_exercises:', rdeError)
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

    if (exercisesError) {
        console.error('Error fetching exercises:', exercisesError)
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

    const bestByExercise = new Map<string, StudentExercisePR>()

    for (const log of logs ?? []) {
        const exerciseId = routineDayExerciseToExerciseId.get(
            log.routine_day_exercise_id
        )

        const exerciseName = exerciseId
            ? exerciseIdToName.get(exerciseId) ?? 'Ejercicio'
            : 'Ejercicio'

        const current = bestByExercise.get(exerciseName)

        if (!current || (log.weight ?? 0) > current.weight) {
            bestByExercise.set(exerciseName, {
                exercise_name: exerciseName,
                weight: log.weight ?? 0,
                reps: log.reps ?? 0,
                performed_at: log.performed_at ?? null,
            })
        }
    }

    return Array.from(bestByExercise.values()).sort((a, b) => b.weight - a.weight)
}