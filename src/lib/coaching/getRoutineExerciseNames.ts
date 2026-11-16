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
        .select('id, exercise_id')
        .in('id', ids)

    if (routineExerciseError) {
        console.error('[getRoutineExerciseNameMap] routine exercises:', routineExerciseError)
        return namesByRoutineExercise
    }

    const exerciseIds = [...new Set(
        (routineExercises ?? [])
            .map((row) => row.exercise_id)
            .filter((id): id is string => Boolean(id))
    )]

    if (exerciseIds.length === 0) return namesByRoutineExercise

    const { data: exercises, error: exerciseError } = await supabase
        .from('exercises')
        .select('id, name')
        .in('id', exerciseIds)

    if (exerciseError) {
        console.error('[getRoutineExerciseNameMap] exercises:', exerciseError)
        return namesByRoutineExercise
    }

    const exerciseNames = new Map(
        (exercises ?? []).map((exercise) => [exercise.id, exercise.name])
    )

    for (const routineExercise of routineExercises ?? []) {
        const name = exerciseNames.get(routineExercise.exercise_id)
        if (name) namesByRoutineExercise.set(routineExercise.id, name)
    }

    return namesByRoutineExercise
}
