'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { convertWeightToKg, type WeightUnit } from '@/lib/weight'

export async function addExerciseToRoutineDay(formData: FormData) {
    const supabase = await createClient()

    const routineId = formData.get('routineId') as string
    const routineDayId = formData.get('routineDayId') as string
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
        throw new Error('Faltan datos para agregar el ejercicio.')
    }

    const { data: routine, error: routineError } = await supabase
        .from('routines')
        .select('id, trainer_id')
        .eq('id', routineId)
        .eq('trainer_id', user.id)
        .single()

    if (routineError || !routine) {
        throw new Error('No tenés acceso a esta rutina.')
    }

    const { data: existingExercises } = await supabase
        .from('routine_day_exercises')
        .select('position')
        .eq('routine_day_id', routineDayId)
        .order('position', { ascending: false })
        .limit(1)

    const nextPosition =
        existingExercises && existingExercises.length > 0
            ? (existingExercises[0].position || 0) + 1
            : 1

    const restSeconds =
        restSecondsRaw && restSecondsRaw.trim() !== ''
            ? Number(restSecondsRaw)
            : null

    const parsedSets =
        sets && sets.trim() !== '' ? Number(sets) : null

    const parsedReps =
        reps && reps.trim() !== '' ? Number(reps) : null

    const { data: exercise, error: exerciseError } = await supabase
        .from('exercises')
        .select('id, metric_type')
        .eq('name', exerciseName)
        .maybeSingle()

    if (exerciseError) {
        throw new Error(exerciseError.message)
    }

    if (!exercise) {
        throw new Error('No se encontró el ejercicio seleccionado.')
    }

    const isTimeExercise = exercise.metric_type === 'time'

    const { error } = await supabase.from('routine_day_exercises').insert({
        routine_day_id: routineDayId,
        exercise_id: exercise.id,
        position: nextPosition,
        sets:
            parsedSets !== null && Number.isFinite(parsedSets) ? parsedSets : null,
        reps:
            parsedReps !== null && Number.isFinite(parsedReps) ? parsedReps : null,
        rest_seconds: Number.isFinite(restSeconds) ? restSeconds : null,
    })

    if (error) {
        throw new Error(error.message)
    }

    redirect(`/dashboard/routines/${routineId}`)
}

export async function deleteExerciseFromRoutineDay(formData: FormData) {
    const supabase = await createClient()

    const routineId = formData.get('routineId') as string
    const exerciseId = formData.get('exerciseId') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (!routineId || !exerciseId) {
        throw new Error('Faltan datos para eliminar el ejercicio.')
    }

    const { data: routine, error: routineError } = await supabase
        .from('routines')
        .select('id, trainer_id')
        .eq('id', routineId)
        .eq('trainer_id', user.id)
        .single()

    if (routineError || !routine) {
        throw new Error('No tenés acceso a esta rutina.')
    }

    const { error } = await supabase
        .from('routine_day_exercises')
        .delete()
        .eq('id', exerciseId)

    if (error) {
        throw new Error(error.message)
    }

    redirect(`/dashboard/routines/${routineId}`)
}

export async function addExerciseLog(formData: FormData) {
    const supabase = await createClient()

    const routineId = formData.get('routineId') as string
    const studentId = formData.get('studentId') as string
    const routineDayExerciseId = formData.get('routineDayExerciseId') as string
    const weightRaw = formData.get('weight') as string
    const repsRaw = formData.get('performed_reps') as string
    const performedAt = formData.get('performed_at') as string
    const weightUnit = (
        (formData.get('weight_unit') as string) || 'kg'
    ) as WeightUnit

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (!routineId || !studentId || !routineDayExerciseId) {
        throw new Error('Faltan datos para registrar la carga.')
    }

    const { data: routine, error: routineError } = await supabase
        .from('routines')
        .select('id, trainer_id, student_id')
        .eq('id', routineId)
        .eq('trainer_id', user.id)
        .single()

    if (routineError || !routine) {
        throw new Error('No tenés acceso a esta rutina.')
    }

    const { data: routineExercise, error: routineExerciseError } = await supabase
        .from('routine_day_exercises')
        .select(`
            id,
            exercise_id,
            exercises (
                metric_type
            )
        `)
        .eq('id', routineDayExerciseId)
        .maybeSingle()

    if (routineExerciseError) {
        throw new Error(routineExerciseError.message)
    }

    if (!routineExercise) {
        throw new Error('No se encontró el ejercicio de la rutina.')
    }

    const exerciseRelation = Array.isArray(routineExercise.exercises)
        ? routineExercise.exercises[0]
        : routineExercise.exercises

    const isTimeExercise = exerciseRelation?.metric_type === 'time'

    const weightInput =
        weightRaw && weightRaw.trim() !== '' ? Number(weightRaw) : null

    const repsInput =
        repsRaw && repsRaw.trim() !== '' ? Number(repsRaw) : null

    if (
        weightInput !== null &&
        (!Number.isFinite(weightInput) || weightInput < 0)
    ) {
        throw new Error('Peso inválido.')
    }

    if (repsInput !== null && (!Number.isFinite(repsInput) || repsInput < 0)) {
        throw new Error(isTimeExercise ? 'Duración inválida.' : 'Repeticiones inválidas.')
    }

    const weight =
        !isTimeExercise &&
            weightInput !== null &&
            Number.isFinite(weightInput)
            ? convertWeightToKg(weightInput, weightUnit)
            : null

    const reps =
        repsInput !== null && Number.isFinite(repsInput) ? repsInput : null

    const performedDate = performedAt || new Date().toISOString().slice(0, 10)

    const startOfDay = `${performedDate}T00:00:00.000Z`
    const endOfDay = `${performedDate}T23:59:59.999Z`

    const { data: existingWorkout, error: existingWorkoutError } = await supabase
        .from('workouts')
        .select('id')
        .eq('student_id', studentId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .maybeSingle()

    if (existingWorkoutError) {
        throw new Error(existingWorkoutError.message)
    }

    if (!existingWorkout) {
        const { error: workoutInsertError } = await supabase
            .from('workouts')
            .insert({
                trainer_id: user.id,
                student_id: studentId,
                name: 'Entrenamiento',
                created_at: startOfDay,
            })

        if (workoutInsertError) {
            throw new Error(workoutInsertError.message)
        }
    }

    const { error } = await supabase.from('exercise_logs').insert({
        student_id: studentId,
        routine_day_exercise_id: routineDayExerciseId,
        weight,
        reps,
        performed_at: performedDate,
    })

    if (error) {
        throw new Error(error.message)
    }

    redirect(`/dashboard/routines/${routineId}`)
}