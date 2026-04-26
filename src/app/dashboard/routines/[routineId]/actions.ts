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
    const weekId = formData.get('weekId') as string | null

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    if (!routineId || !exerciseId) {
        redirect('/dashboard/routines')
    }

    const buildUrl = () => {
        const p = new URLSearchParams()
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

export async function addRoutineWeek(formData: FormData) {
    console.log('ACTION OK — addRoutineWeek called')
    const supabase = await createClient()
    const routineId = formData.get('routineId') as string
    const monthId = (formData.get('monthId') as string) || null

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: routine } = await supabase
        .from('routines')
        .select('id, days_per_week')
        .eq('id', routineId)
        .eq('trainer_id', user.id)
        .single()

    if (!routine) redirect('/dashboard/routines')

    const { data: existingInMonth, error: existingError } = await supabase
        .from('routine_weeks')
        .select('id, week_number')
        .eq('routine_month_id', monthId ?? '')
        .order('week_number', { ascending: false })
        .limit(1)

    if (existingError) {
        console.error('[addRoutineWeek] select error:', existingError.message, existingError.code)
    }

    const nextNumber = (existingInMonth?.[0]?.week_number ?? 0) + 1
    console.log('[addRoutineWeek] inserting week_number:', nextNumber)

    const { data: newWeek, error: insertError } = await supabase
        .from('routine_weeks')
        .insert({ routine_id: routineId, week_number: nextNumber, routine_month_id: monthId })
        .select('id')
        .single()

    if (insertError) {
        console.error('[addRoutineWeek] insert error:', insertError.message, insertError.code)
    } else {
        console.log('[addRoutineWeek] created week id:', newWeek?.id)
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

        await supabase.from('routine_days').insert(
            daysToCopy.map((d) => ({
                routine_id: routineId,
                routine_week_id: newWeek.id,
                day_index: d.day_index,
                title: d.title,
            }))
        )

    }

    revalidatePath(`/dashboard/routines/${routineId}`)
    redirect(
        !insertError && newWeek
            ? `/dashboard/routines/${routineId}?${monthId ? `month=${monthId}&` : ''}week=${newWeek.id}`
            : `/dashboard/routines/${routineId}`
    )
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
    const { data: sourceWeekData } = await supabase
        .from('routine_weeks')
        .select('routine_month_id')
        .eq('id', sourceWeekId)
        .single()

    const targetMonthId = sourceWeekData?.routine_month_id ?? null

    const { data: existing } = await supabase
        .from('routine_weeks')
        .select('week_number')
        .eq('routine_month_id', targetMonthId ?? '')
        .order('week_number', { ascending: false })
        .limit(1)

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
            .select('exercise_id, sets, reps, rest_seconds, position')
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
    const monthParam = formData.get('monthId') as string | null
    redirect(`/dashboard/routines/${routineId}?month=${monthParam ?? ''}&week=${newWeek.id}`)
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
    redirect(`/dashboard/routines/${routineId}?month=${monthId}`)
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
