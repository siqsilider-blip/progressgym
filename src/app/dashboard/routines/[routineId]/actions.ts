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

    const rawBlock = formData.get('block') as string | null
    const block: 'activation' | 'main' | 'closing' =
        rawBlock === 'activation' || rawBlock === 'closing' ? rawBlock : 'main'

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
            block,
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
    const weekId = formData.get('weekId') as string | null
    const monthId = formData.get('monthId') as string | null

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    if (!routineId || !exerciseId) {
        redirect('/dashboard/routines')
    }

    const buildUrl = () => {
        const p = new URLSearchParams()
        if (monthId) p.set('month', monthId)
        if (weekId) p.set('week', weekId)
        if (dayId) p.set('day', dayId)
        const qs = p.toString()
        return qs ? `/dashboard/routines/${routineId}?${qs}` : `/dashboard/routines/${routineId}`
    }

    const { error: deleteError } = await supabase
        .from('routine_day_exercises')
        .delete()
        .eq('id', exerciseId)

    if (deleteError) {
        redirect(buildUrl())
    }

    revalidatePath(`/dashboard/routines/${routineId}`)
    redirect(buildUrl())
}

export async function updateExerciseInRoutineDay(formData: FormData) {
    const supabase = await createClient()

    const exerciseRowId = formData.get('exerciseRowId') as string
    const routineId = formData.get('routineId') as string

    const sets = formData.get('sets') as string
    const reps = formData.get('reps') as string
    const restSecondsRaw = formData.get('rest_seconds') as string
    const rawBlock = formData.get('block') as string | null
    const replacementExerciseId = formData.get('replacementExerciseId') as string | null
    const block: 'activation' | 'main' | 'closing' =
        rawBlock === 'activation' || rawBlock === 'closing' ? rawBlock : 'main'

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { ok: false, error: 'No autenticado' }
    }

    if (!routineId || !exerciseRowId) {
        return { ok: false, error: 'Faltan campos obligatorios' }
    }

    if (!replacementExerciseId) {
        return { ok: false, error: 'Seleccioná un ejercicio válido de la lista' }
    }

    const { data: replacementExercise } = await supabase
        .from('exercises')
        .select('id')
        .eq('id', replacementExerciseId)
        .single()

    if (!replacementExercise) {
        return { ok: false, error: 'El ejercicio seleccionado no está disponible' }
    }

    const setsNum = sets ? parseInt(sets, 10) : null
    const repsNum = reps ? parseInt(reps, 10) : null
    const restSecondsNum = restSecondsRaw ? parseInt(restSecondsRaw, 10) : null

    const { error: updateError } = await supabase
        .from('routine_day_exercises')
        .update({
            exercise_id: replacementExercise.id,
            sets: setsNum,
            reps: repsNum,
            rest_seconds: restSecondsNum,
            block,
        })
        .eq('id', exerciseRowId)

    if (updateError) {
        console.error('[updateExerciseInRoutineDay] error:', updateError.message)
        return { ok: false, error: 'No se pudo actualizar el ejercicio' }
    }

    revalidatePath('/dashboard/routines')
    revalidatePath(`/dashboard/routines/${routineId}`)

    return { ok: true }
}

export async function createExerciseFromRoutine(input: {
    routineId: string
    name: string
    category?: string
    metricType?: 'reps' | 'time'
}): Promise<{
    ok: boolean
    exercise?: {
        id: string
        name: string
        muscle_group: string | null
        category: string | null
        metric_type: 'reps' | 'time' | null
    }
    error?: string
}> {
    const supabase = await createClient()
    const name = input.name.trim()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Tu sesión venció.' }

    if (!name) return { ok: false, error: 'Escribí el nombre del ejercicio.' }
    if (name.length > 80) return { ok: false, error: 'Usá un nombre de hasta 80 caracteres.' }

    const { data: routine } = await supabase
        .from('routines')
        .select('id')
        .eq('id', input.routineId)
        .eq('trainer_id', user.id)
        .single()

    if (!routine) return { ok: false, error: 'Rutina no encontrada.' }

    const { data: existing } = await supabase
        .from('exercises')
        .select('id, name, muscle_group, category, metric_type')
        .ilike('name', name)
        .limit(1)
        .maybeSingle()

    if (existing) {
        return { ok: true, exercise: existing as NonNullable<Awaited<ReturnType<typeof createExerciseFromRoutine>>['exercise']> }
    }

    const metricType = input.metricType === 'time' ? 'time' : 'reps'
    const category = input.category?.trim() || null

    const { data: created, error } = await supabase
        .from('exercises')
        .insert({
            trainer_id: user.id,
            name,
            category,
            muscle_group: category,
            metric_type: metricType,
        })
        .select('id, name, muscle_group, category, metric_type')
        .single()

    if (error || !created) {
        return { ok: false, error: 'No se pudo crear el ejercicio.' }
    }

    revalidatePath('/dashboard/exercises')
    revalidatePath(`/dashboard/routines/${input.routineId}`)
    return { ok: true, exercise: created as NonNullable<Awaited<ReturnType<typeof createExerciseFromRoutine>>['exercise']> }
}

export async function moveExerciseInRoutineDay(formData: FormData): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    const routineId = formData.get('routineId') as string
    const exerciseRowId = formData.get('exerciseRowId') as string
    const direction = formData.get('direction') as string

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Tu sesión venció.' }

    if (!routineId || !exerciseRowId || !['up', 'down'].includes(direction)) {
        return { ok: false, error: 'No se pudo determinar el nuevo orden.' }
    }

    const { data: moved, error } = await supabase.rpc('move_routine_day_exercise', {
        p_exercise_row_id: exerciseRowId,
        p_direction: direction,
    })

    if (error) {
        console.error('[moveExerciseInRoutineDay] error:', error.message)
        return { ok: false, error: 'No se pudo cambiar el orden.' }
    }

    if (!moved) {
        return { ok: false, error: 'El ejercicio ya está en ese extremo del bloque.' }
    }

    revalidatePath(`/dashboard/routines/${routineId}`)
    return { ok: true }
}

export async function renameRoutineDay(input: {
    routineId: string
    dayId: string
    title: string
}): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()
    const title = input.title.trim()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Tu sesión venció.' }

    if (!input.routineId || !input.dayId || !title) {
        return { ok: false, error: 'El nombre del día no puede estar vacío.' }
    }

    if (title.length > 60) {
        return { ok: false, error: 'Usá un nombre de hasta 60 caracteres.' }
    }

    const { data: routine } = await supabase
        .from('routines')
        .select('id')
        .eq('id', input.routineId)
        .eq('trainer_id', user.id)
        .single()

    if (!routine) return { ok: false, error: 'Rutina no encontrada.' }

    const { data: updatedDay, error } = await supabase
        .from('routine_days')
        .update({ title })
        .eq('id', input.dayId)
        .eq('routine_id', input.routineId)
        .select('id')
        .single()

    if (error || !updatedDay) {
        return { ok: false, error: 'No se pudo cambiar el nombre del día.' }
    }

    revalidatePath(`/dashboard/routines/${input.routineId}`)
    return { ok: true }
}

export async function duplicateRoutineDay(input: {
    routineId: string
    dayId: string
}): Promise<{ ok: boolean; newDayId?: string; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Tu sesión venció.' }

    if (!input.routineId || !input.dayId) {
        return { ok: false, error: 'No se pudo identificar el día.' }
    }

    const { data: routine } = await supabase
        .from('routines')
        .select('id')
        .eq('id', input.routineId)
        .eq('trainer_id', user.id)
        .single()

    if (!routine) return { ok: false, error: 'Rutina no encontrada.' }

    const { data: sourceDay, error: sourceError } = await supabase
        .from('routine_days')
        .select('id, routine_week_id, title')
        .eq('id', input.dayId)
        .eq('routine_id', input.routineId)
        .single()

    if (sourceError || !sourceDay?.routine_week_id) {
        return { ok: false, error: 'No se encontró el día para copiar.' }
    }

    const { data: lastDay, error: lastDayError } = await supabase
        .from('routine_days')
        .select('day_index')
        .eq('routine_week_id', sourceDay.routine_week_id)
        .order('day_index', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (lastDayError) {
        return { ok: false, error: 'No se pudo calcular la posición del nuevo día.' }
    }

    const nextDayIndex = (lastDay?.day_index ?? 0) + 1
    const sourceTitle = sourceDay.title?.trim() || 'Día'
    const copyTitle = `${sourceTitle} copia`.slice(0, 60)

    const { data: newDay, error: insertDayError } = await supabase
        .from('routine_days')
        .insert({
            routine_id: input.routineId,
            routine_week_id: sourceDay.routine_week_id,
            day_index: nextDayIndex,
            title: copyTitle,
        })
        .select('id')
        .single()

    if (insertDayError || !newDay) {
        return { ok: false, error: 'No se pudo crear la copia del día.' }
    }

    const { data: sourceExercises, error: exercisesError } = await supabase
        .from('routine_day_exercises')
        .select('exercise_id, sets, reps, rest_seconds, position, block')
        .eq('routine_day_id', sourceDay.id)
        .order('position', { ascending: true })

    if (exercisesError) {
        await supabase.from('routine_days').delete().eq('id', newDay.id)
        return { ok: false, error: 'No se pudieron leer los ejercicios del día.' }
    }

    if (sourceExercises && sourceExercises.length > 0) {
        const { error: copyError } = await supabase
            .from('routine_day_exercises')
            .insert(sourceExercises.map((exercise) => ({
                routine_day_id: newDay.id,
                exercise_id: exercise.exercise_id,
                sets: exercise.sets,
                reps: exercise.reps,
                rest_seconds: exercise.rest_seconds,
                position: exercise.position,
                block: exercise.block ?? 'main',
            })))

        if (copyError) {
            await supabase.from('routine_day_exercises').delete().eq('routine_day_id', newDay.id)
            await supabase.from('routine_days').delete().eq('id', newDay.id)
            return { ok: false, error: 'No se pudieron copiar los ejercicios.' }
        }
    }

    revalidatePath(`/dashboard/routines/${input.routineId}`)
    return { ok: true, newDayId: newDay.id }
}

export async function moveRoutineDay(input: {
    routineId: string
    dayId: string
    direction: 'left' | 'right'
}): Promise<{ ok: boolean; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Tu sesión venció.' }

    if (!input.routineId || !input.dayId || !['left', 'right'].includes(input.direction)) {
        return { ok: false, error: 'No se pudo identificar el movimiento.' }
    }

    const { data: moved, error } = await supabase.rpc('move_template_routine_day', {
        p_day_id: input.dayId,
        p_direction: input.direction,
    })

    if (error) {
        console.error('[moveRoutineDay] error:', error.message)
        const migrationPending = error.code === 'PGRST202' || error.message.includes('move_template_routine_day')
        return {
            ok: false,
            error: migrationPending
                ? 'Falta aplicar la actualización de días en la base de datos.'
                : 'No se pudo cambiar el orden del día.',
        }
    }

    if (!moved) {
        return { ok: false, error: 'El día ya está en ese extremo.' }
    }

    revalidatePath(`/dashboard/routines/${input.routineId}`)
    return { ok: true }
}

export async function deleteRoutineDay(input: {
    routineId: string
    dayId: string
}): Promise<{ ok: boolean; nextDayId?: string; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Tu sesión venció.' }

    if (!input.routineId || !input.dayId) {
        return { ok: false, error: 'No se pudo identificar el día.' }
    }

    const { data: nextDayId, error } = await supabase.rpc('delete_template_routine_day', {
        p_day_id: input.dayId,
    })

    if (error) {
        console.error('[deleteRoutineDay] error:', error.message)
        const migrationPending = error.code === 'PGRST202' || error.message.includes('delete_template_routine_day')
        const isLastDay = error.message.includes('al menos un día')
        return {
            ok: false,
            error: migrationPending
                ? 'Falta aplicar la actualización de días en la base de datos.'
                : isLastDay
                    ? 'La semana debe conservar al menos un día.'
                    : 'No se pudo eliminar el día.',
        }
    }

    if (typeof nextDayId !== 'string' || !nextDayId) {
        return { ok: false, error: 'No se pudo determinar el siguiente día.' }
    }

    revalidatePath(`/dashboard/routines/${input.routineId}`)
    return { ok: true, nextDayId }
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

export async function addRoutineWeek(formData: FormData): Promise<{ ok: boolean; newWeekId?: string; error?: string }> {
    const supabase = await createClient()
    const routineId = formData.get('routineId') as string
    const monthId = (formData.get('monthId') as string) || null

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'No autenticado' }

    const { data: routine } = await supabase
        .from('routines')
        .select('id, days_per_week')
        .eq('id', routineId)
        .eq('trainer_id', user.id)
        .single()

    if (!routine) return { ok: false, error: 'Rutina no encontrada' }

    let existingWeeksQuery = supabase
        .from('routine_weeks')
        .select('id, week_number')
        .eq('routine_id', routineId)

    existingWeeksQuery = monthId
        ? existingWeeksQuery.eq('routine_month_id', monthId)
        : existingWeeksQuery.is('routine_month_id', null)

    const { data: existingInMonth, error: existingError } = await existingWeeksQuery
        .order('week_number', { ascending: false })
        .limit(1)

    if (existingError) {
        return { ok: false, error: 'No se pudieron consultar las semanas existentes' }
    }

    const nextNumber = (existingInMonth?.[0]?.week_number ?? 0) + 1

    const { data: newWeek, error: insertError } = await supabase
        .from('routine_weeks')
        .insert({ routine_id: routineId, week_number: nextNumber, routine_month_id: monthId })
        .select('id')
        .single()

    if (insertError) {
        return { ok: false, error: 'No se pudo crear la semana' }
    }

    if (!newWeek) {
        return { ok: false, error: 'No se pudo crear la semana' }
    }

    if (newWeek) {
        const prevWeekId = existingInMonth?.[0]?.id ?? null

        let daysToCopy: { day_index: number; title: string | null }[] = []

        if (prevWeekId) {
            const { data: prevDays } = await supabase
                .from('routine_days')
                .select('day_index, title')
                .eq('routine_week_id', prevWeekId)
                .order('day_index', { ascending: true })

            if (prevDays && prevDays.length > 0) {
                daysToCopy = prevDays
            }
        }

        if (daysToCopy.length === 0) {
            const daysCount = routine.days_per_week ?? 4
            daysToCopy = Array.from({ length: daysCount }, (_, i) => ({
                day_index: i + 1,
                title: `Día ${i + 1}`,
            }))
        }

        const { error: daysError } = await supabase.from('routine_days').insert(
            daysToCopy.map((d) => ({
                routine_id: routineId,
                routine_week_id: newWeek.id,
                day_index: d.day_index,
                title: d.title,
            }))
        )

        if (daysError) {
            return { ok: false, error: 'La semana se creó, pero no se pudieron crear sus días' }
        }
    }

    revalidatePath(`/dashboard/routines/${routineId}`)
    return { ok: true, newWeekId: newWeek.id }
}

export async function duplicateRoutineWeek(formData: FormData) {
    const supabase = await createClient()
    const routineId = formData.get('routineId') as string
    const sourceWeekId = formData.get('sourceWeekId') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: routine } = await supabase
        .from('routines')
        .select('id')
        .eq('id', routineId)
        .eq('trainer_id', user.id)
        .single()

    if (!routine) redirect('/dashboard/routines')

    // Step 1: get source days by routine_week_id
    const { data: byWeek } = await supabase
        .from('routine_days')
        .select('id, day_index, title')
        .eq('routine_week_id', sourceWeekId)
        .order('day_index', { ascending: true })

    console.log('[dup] byWeek result:', byWeek?.length, 'sourceWeekId:', sourceWeekId)

    // Step 2: fallback to legacy days with routine_week_id IS NULL
    let sourceDays = byWeek && byWeek.length > 0 ? byWeek : null

    if (!sourceDays || sourceDays.length === 0) {
        const { data: byRoutine } = await supabase
            .from('routine_days')
            .select('id, day_index, title')
            .eq('routine_id', routineId)
            .is('routine_week_id', null)
            .order('day_index', { ascending: true })
        sourceDays = byRoutine && byRoutine.length > 0 ? byRoutine : null
    }

    console.log('[dup] final sourceDays count:', sourceDays?.length)

    // Step 3: if still no days, abort
    if (!sourceDays || sourceDays.length === 0) {
        revalidatePath(`/dashboard/routines/${routineId}`)
        redirect(`/dashboard/routines/${routineId}?error=no-days`)
    }

    // Step 4: get which month the source week belongs to, then max week_number within that month
    const { data: sourceWeekData, error: sourceWeekError } = await supabase
        .from('routine_weeks')
        .select('routine_month_id')
        .eq('id', sourceWeekId)
        .eq('routine_id', routineId)
        .single()

    if (sourceWeekError || !sourceWeekData) {
        revalidatePath(`/dashboard/routines/${routineId}`)
        redirect(`/dashboard/routines/${routineId}?error=source-week`)
    }

    const targetMonthId = sourceWeekData?.routine_month_id ?? null

    let existingWeeksQuery = supabase
        .from('routine_weeks')
        .select('week_number')
        .eq('routine_id', routineId)

    existingWeeksQuery = targetMonthId
        ? existingWeeksQuery.eq('routine_month_id', targetMonthId)
        : existingWeeksQuery.is('routine_month_id', null)

    const { data: existing, error: existingWeeksError } = await existingWeeksQuery
        .order('week_number', { ascending: false })
        .limit(1)

    if (existingWeeksError) {
        revalidatePath(`/dashboard/routines/${routineId}`)
        redirect(`/dashboard/routines/${routineId}?error=weeks-query`)
    }

    const nextNumber = (existing?.[0]?.week_number ?? 0) + 1

    // Step 5: insert new week in same month
    const { data: newWeek, error: weekError } = await supabase
        .from('routine_weeks')
        .insert({ routine_id: routineId, week_number: nextNumber, routine_month_id: targetMonthId })
        .select('id')
        .single()

    if (weekError || !newWeek) {
        console.error('[duplicateRoutineWeek] insert week error:', weekError?.message)
        revalidatePath(`/dashboard/routines/${routineId}`)
        redirect(`/dashboard/routines/${routineId}?error=duplicate`)
    }

    // Step 6: insert new days
    console.log('[dup] inserting days:', sourceDays?.map(d => d.id))
    const { data: newDays, error: newDaysError } = await supabase
        .from('routine_days')
        .insert(
            sourceDays.map((day) => ({
                routine_id: routineId,
                routine_week_id: newWeek.id,
                day_index: day.day_index,
                title: day.title,
            }))
        )
        .select('id, day_index')

    console.log('[dup] newDays result:', newDays?.length, 'error:', newDaysError?.message)

    if (newDaysError || !newDays || newDays.length === 0) {
        console.error('[duplicateRoutineWeek] insert days error:', newDaysError?.message)
        revalidatePath(`/dashboard/routines/${routineId}`)
        redirect(`/dashboard/routines/${routineId}?error=duplicate`)
    }

    // Step 7: map day IDs and copy exercises
    const dayIdMap = new Map<string, string>()
    for (const src of sourceDays) {
        const dst = newDays.find((d) => d.day_index === src.day_index)
        if (dst) dayIdMap.set(src.id, dst.id)
    }

    console.log('[dup] sourceDays IDs:', sourceDays?.map(d => d.id))
    console.log('[dup] dayIdMap:', [...dayIdMap.entries()])

    for (const sourceDay of sourceDays) {
        const newDayId = dayIdMap.get(sourceDay.id)
        if (!newDayId) {
            console.log('[dup] no mapping for sourceDay:', sourceDay.id)
            continue
        }

        const { data: exercises, error: exFetchError } = await supabase
            .from('routine_day_exercises')
            .select('exercise_id, sets, reps, rest_seconds, position, block')
            .eq('routine_day_id', sourceDay.id)
            .order('position', { ascending: true })

        if (exFetchError) {
            console.error('[dup] fetch exercises error for day', sourceDay.id, exFetchError.message)
            continue
        }

        console.log('[dup] day', sourceDay.id, '→ exercises found:', exercises?.length)

        if (!exercises || exercises.length === 0) continue

        const { error: exInsertError } = await supabase
            .from('routine_day_exercises')
            .insert(
                exercises.map((ex) => ({
                    routine_day_id: newDayId,
                    exercise_id: ex.exercise_id,
                    sets: ex.sets,
                    reps: ex.reps,
                    rest_seconds: ex.rest_seconds,
                    position: ex.position,
                    block: ex.block ?? 'main',
                }))
            )

        if (exInsertError) {
            console.error('[dup] insert exercises error for day', sourceDay.id, exInsertError.message)
        } else {
            console.log('[dup] inserted', exercises.length, 'exercises for new day', newDayId)
        }
    }

    // Step 8: revalidate and redirect to new week
    revalidatePath(`/dashboard/routines/${routineId}`)
    redirect(`/dashboard/routines/${routineId}?week=${newWeek.id}${targetMonthId ? `&month=${targetMonthId}` : ''}`)
}

export async function deleteRoutineWeek(formData: FormData) {
    const supabase = await createClient()
    const routineId = formData.get('routineId') as string
    const weekId = formData.get('weekId') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: routine } = await supabase
        .from('routines')
        .select('id')
        .eq('id', routineId)
        .eq('trainer_id', user.id)
        .single()

    if (!routine) redirect('/dashboard/routines')

    const { count } = await supabase
        .from('routine_weeks')
        .select('id', { count: 'exact', head: true })
        .eq('routine_id', routineId)

    if (!count || count <= 1) {
        revalidatePath(`/dashboard/routines/${routineId}`)
        redirect(`/dashboard/routines/${routineId}?error=last-week`)
    }

    const { error: deleteError } = await supabase
        .from('routine_weeks')
        .delete()
        .eq('id', weekId)

    if (deleteError) {
        console.error('[deleteRoutineWeek] delete error:', deleteError.message)
    }

    revalidatePath(`/dashboard/routines/${routineId}`)
    const monthParam = formData.get('monthId') as string | null
    const redirectUrl = monthParam
        ? `/dashboard/routines/${routineId}?month=${monthParam}`
        : `/dashboard/routines/${routineId}`
    redirect(redirectUrl)
}

export async function renameRoutineWeek(formData: FormData) {
    const supabase = await createClient()
    const routineId = formData.get('routineId') as string
    const weekId = formData.get('weekId') as string
    const name = (formData.get('name') as string)?.trim() || null

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    await supabase
        .from('routine_weeks')
        .update({ name })
        .eq('id', weekId)

    revalidatePath(`/dashboard/routines/${routineId}`)
    redirect(`/dashboard/routines/${routineId}?week=${weekId}`)
}

export async function addRoutineMonth(formData: FormData) {
    const supabase = await createClient()
    const routineId = formData.get('routineId') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: existing } = await supabase
        .from('routine_months')
        .select('month_number')
        .eq('routine_id', routineId)
        .order('month_number', { ascending: false })
        .limit(1)

    const nextNumber = (existing?.[0]?.month_number ?? 0) + 1

    const { data: newMonth } = await supabase
        .from('routine_months')
        .insert({ routine_id: routineId, month_number: nextNumber })
        .select('id')
        .single()

    if (!newMonth) {
        revalidatePath(`/dashboard/routines/${routineId}`)
        redirect(`/dashboard/routines/${routineId}`)
    }

    const { data: routineData } = await supabase
        .from('routines')
        .select('days_per_week')
        .eq('id', routineId)
        .single()

    const daysCount = routineData?.days_per_week ?? 4

    for (let w = 0; w < 4; w++) {
        const { data: newWeek } = await supabase
            .from('routine_weeks')
            .insert({
                routine_id: routineId,
                routine_month_id: newMonth.id,
                week_number: w + 1,
            })
            .select('id')
            .single()

        if (newWeek) {
            await supabase.from('routine_days').insert(
                Array.from({ length: daysCount }, (_, i) => ({
                    routine_id: routineId,
                    routine_week_id: newWeek.id,
                    day_index: i + 1,
                    title: `Día ${i + 1}`,
                }))
            )
        }
    }

    revalidatePath(`/dashboard/routines/${routineId}`)
    redirect(`/dashboard/routines/${routineId}`)
}

export async function renameRoutineMonth(formData: FormData) {
    const supabase = await createClient()
    const routineId = formData.get('routineId') as string
    const monthId = formData.get('monthId') as string
    const weekId = formData.get('weekId') as string | null
    const dayId = formData.get('dayId') as string | null
    const name = (formData.get('name') as string)?.trim() || null

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    await supabase
        .from('routine_months')
        .update({ name })
        .eq('id', monthId)

    revalidatePath(`/dashboard/routines/${routineId}`)
    redirect(`/dashboard/routines/${routineId}?month=${monthId}${weekId ? `&week=${weekId}` : ''}${dayId ? `&day=${dayId}` : ''}`)
}

export async function deleteRoutineMonth(formData: FormData) {
    const supabase = await createClient()
    const routineId = formData.get('routineId') as string
    const monthId = formData.get('monthId') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { count } = await supabase
        .from('routine_months')
        .select('id', { count: 'exact', head: true })
        .eq('routine_id', routineId)

    if (!count || count <= 1) {
        revalidatePath(`/dashboard/routines/${routineId}`)
        redirect(`/dashboard/routines/${routineId}?error=last-month`)
    }

    const { data: weeksInMonth } = await supabase
        .from('routine_weeks')
        .select('id')
        .eq('routine_month_id', monthId)

    if (weeksInMonth && weeksInMonth.length > 0) {
        await supabase
            .from('routine_weeks')
            .delete()
            .in('id', weeksInMonth.map((w) => w.id))
    }

    await supabase
        .from('routine_months')
        .delete()
        .eq('id', monthId)

    revalidatePath(`/dashboard/routines/${routineId}`)
    redirect(`/dashboard/routines/${routineId}`)
}

export async function deleteTemplate(formData: FormData) {
    const supabase = await createClient()

    const routineId = formData.get('routineId') as string

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    if (!routineId) {
        redirect('/dashboard/templates')
    }

    // Doble chequeo intencional: la policy trainer_delete_own_templates ya
    // exige routine_kind='template' a nivel de base de datos, pero
    // confirmarlo también acá da un mensaje de error claro en vez de un
    // error genérico de Postgres si alguien intenta borrar un program
    // usando esta acción (por ejemplo, manipulando el formulario).
    const { data: routine } = await supabase
        .from('routines')
        .select('id, routine_kind')
        .eq('id', routineId)
        .eq('trainer_id', user.id)
        .single()

    if (!routine || routine.routine_kind !== 'template') {
        redirect('/dashboard/templates')
    }

    const { error: deleteError } = await supabase
        .from('routines')
        .delete()
        .eq('id', routineId)
        .eq('trainer_id', user.id)
        .eq('routine_kind', 'template')

    if (deleteError) {
        redirect(`/dashboard/routines/${routineId}`)
    }

    revalidatePath('/dashboard/templates')
    redirect('/dashboard/templates')
}

