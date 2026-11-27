import { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export async function getRoutineExerciseNameMap(
    supabase: SupabaseServerClient,
    routineDayExerciseIds: Array<string | null | undefined>
) {
    const ids = [...new Set(
        routineDayExerciseIds.filter((id): id is string => Boolean(id))
    )]
    const namesByRoutineExercise = new Map<string, string>()

    if (ids.length === 0) return namesByRoutineExercise

    const { data: routineExercises, error: routineExerciseError } = await supabase
        .from('routine_day_exercises')
        .select('id, exercise:exercises!routine_day_exercises_exercise_id_fkey(name)')
        .in('id', ids)

    if (routineExerciseError) {
        console.error('[getRoutineExerciseNameMap] routine exercises:', routineExerciseError)
        return namesByRoutineExercise
    }

    for (const routineExercise of routineExercises ?? []) {
        const exercise = Array.isArray(routineExercise.exercise)
            ? routineExercise.exercise[0]
            : routineExercise.exercise
        if (exercise?.name) namesByRoutineExercise.set(routineExercise.id, exercise.name)
    }

    return namesByRoutineExercise
}
