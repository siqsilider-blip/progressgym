'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addExerciseToRoutineDay(formData: FormData) {
    const supabase = await createClient()

    const routineId = formData.get('routineId') as string
    const routineDayId = formData.get('routineDayId') as string
    const dayId = (formData.get('dayId') as string) || routineDayId

    const exerciseName = (formData.get('exercise_name') as string)?.trim()
    const sets = formData.get('sets') as string
    const reps = formData.get('reps') as string
    const restSecondsRaw = formData.get('rest_seconds') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { ok: false, error: 'No autenticado' }
    }

    if (!routineId || !routineDayId || !exerciseName) {
        return { ok: false, error: 'Faltan datos para agregar el ejercicio' }
    }

    const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select('id')
        .eq('name', exerciseName)
        .single()

    if (exerciseError || !exercise) {
        return { ok: false, error: 'No se encontró el ejercicio seleccionado' }
    }

    const { data: existingExercises, error: existingError } = await supabase
        .from('routine_day_exercises')
        .select('position')
        .eq('routine_day_id', routineDayId)
        .order('position', { ascending: false })
        .limit(1)

    if (existingError) {
        return { ok: false, error: existingError.message }
    }

    const nextPosition =
        existingExercises && existingExercises.length > 0
            ? (existingExercises[0].position ?? 0) + 1
            : 1

    const setsNum = sets ? parseInt(sets, 10) : null
    const repsNum = reps ? parseInt(reps, 10) : null
    const restSecondsNum = restSecondsRaw ? parseInt(restSecondsRaw, 10) : null

    if ((setsNum !== null && isNaN(setsNum)) || (repsNum !== null && isNaN(repsNum))) {
        return { ok: false, error: 'Sets y reps inválidos' }
    }

    const { error: insertError } = await supabase
        .from('routine_day_exercises')
        .insert({
            routine_day_id: routineDayId,
            exercise_id: exercise.id,
            sets: setsNum,
            reps: repsNum,
            rest_seconds: restSecondsNum,
            position: nextPosition,
        })

    if (insertError) {
        return { ok: false, error: insertError.message }
    }

    revalidatePath('/dashboard/routines')
    revalidatePath(`/dashboard/routines/${routineId}`)

    return {
        ok: true,
        routineId,
        dayId,
    }
}

export async function deleteExerciseFromRoutineDay(formData: FormData) {
    const supabase = await createClient()

    const routineId = formData.get('routineId') as string
    const exerciseId = formData.get('exerciseId') as string
    const dayId = formData.get('dayId') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

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

export async function updateRoutineName(input: {
    routineId: string
    name: string
}) {
    const supabase = await createClient()

    const routineId = input.routineId
    const name = input.name.trim()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { ok: false, error: 'No autenticado' }
    }

    if (!routineId) {
        return { ok: false, error: 'Rutina inválida' }
    }

    if (!name) {
        return { ok: false, error: 'El nombre no puede estar vacío' }
    }

    const { error } = await supabase
        .from('routines')
        .update({ name })
        .eq('id', routineId)
        .eq('trainer_id', user.id)

    if (error) {
        return { ok: false, error: error.message }
    }

    revalidatePath('/dashboard/routines')
    revalidatePath(`/dashboard/routines/${routineId}`)

    return { ok: true }
}