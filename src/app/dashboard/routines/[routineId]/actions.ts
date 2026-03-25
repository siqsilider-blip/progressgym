'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addExerciseToRoutineDay(formData: FormData) {
    const supabase = await createClient()

    const routineId = formData.get('routineId') as string
    const routineDayId = formData.get('routineDayId') as string
    const dayId = (formData.get('dayId') as string) || routineDayId

    const exerciseName = formData.get('exercise_name') as string
    const sets = formData.get('sets') as string
    const reps = formData.get('reps') as string
    const restSecondsRaw = formData.get('rest_seconds') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (!routineId || !routineDayId || !exerciseName) {
        redirect(`/dashboard/routines/${routineId}?day=${dayId}`)
    }

    const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select('id')
        .eq('name', exerciseName)
        .single()

    if (exerciseError || !exercise) {
        redirect(`/dashboard/routines/${routineId}?day=${dayId}`)
    }

    const { data: existingExercises, error: existingExercisesError } =
        await supabase
            .from('routine_day_exercises')
            .select('position')
            .eq('routine_day_id', routineDayId)
            .order('position', { ascending: false })
            .limit(1)

    if (existingExercisesError) {
        redirect(`/dashboard/routines/${routineId}?day=${dayId}`)
    }

    const nextPosition =
        existingExercises && existingExercises.length > 0
            ? (existingExercises[0].position ?? 0) + 1
            : 1

    const { error: insertError } = await supabase
        .from('routine_day_exercises')
        .insert({
            routine_day_id: routineDayId,
            exercise_id: exercise.id,
            sets: sets ? Number(sets) : null,
            reps: reps ? Number(reps) : null,
            rest_seconds: restSecondsRaw ? Number(restSecondsRaw) : null,
            position: nextPosition,
        })

    if (insertError) {
        redirect(`/dashboard/routines/${routineId}?day=${dayId}`)
    }

    revalidatePath(`/dashboard/routines/${routineId}`)
    redirect(`/dashboard/routines/${routineId}?day=${dayId}`)
}

export async function deleteExerciseFromRoutineDay(formData: FormData) {
    const supabase = await createClient()

    const routineId = formData.get('routineId') as string
    const exerciseId = formData.get('exerciseId') as string
    const dayId = formData.get('dayId') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (!routineId || !exerciseId) {
        redirect('/dashboard/routines')
    }

    const { error: deleteError } = await supabase
        .from('routine_day_exercises')
        .delete()
        .eq('id', exerciseId)

    if (deleteError) {
        redirect(
            dayId
                ? `/dashboard/routines/${routineId}?day=${dayId}`
                : `/dashboard/routines/${routineId}`
        )
    }

    revalidatePath(`/dashboard/routines/${routineId}`)

    redirect(
        dayId
            ? `/dashboard/routines/${routineId}?day=${dayId}`
            : `/dashboard/routines/${routineId}`
    )
}