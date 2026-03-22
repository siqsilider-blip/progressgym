'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createRoutine(formData: FormData) {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const studentId = formData.get('studentId') as string
    const daysCountRaw = formData.get('days_count') as string

    const daysCount = Number(daysCountRaw)

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (!name || !studentId) {
        throw new Error('Faltan datos para crear la rutina.')
    }

    if (!Number.isInteger(daysCount) || daysCount < 1 || daysCount > 6) {
        throw new Error('La cantidad de días debe estar entre 1 y 6.')
    }

    const { data: existingRoutine, error: existingRoutineError } = await supabase
        .from('routines')
        .select('id')
        .eq('trainer_id', user.id)
        .eq('student_id', studentId)
        .maybeSingle()

    if (existingRoutineError) {
        throw new Error(existingRoutineError.message)
    }

    if (existingRoutine?.id) {
        const routineId = existingRoutine.id

        const { data: existingDays, error: existingDaysError } = await supabase
            .from('routine_days')
            .select('id, day_number')
            .eq('routine_id', routineId)

        if (existingDaysError) {
            throw new Error(existingDaysError.message)
        }

        const existingDayNumbers = new Set(
            (existingDays ?? [])
                .map((day) => day.day_number)
                .filter((value) => value !== null)
        )

        const missingDays = Array.from({ length: daysCount }, (_, index) => ({
            routine_id: routineId,
            day_index: index + 1,
            day_number: index + 1,
            title: `Día ${index + 1}`,
            name: `Día ${index + 1}`,
        })).filter((day) => !existingDayNumbers.has(day.day_number))

        if (missingDays.length > 0) {
            const { error: missingDaysError } = await supabase
                .from('routine_days')
                .insert(missingDays)

            if (missingDaysError) {
                throw new Error(missingDaysError.message)
            }
        }

        const { data: existingAssignment, error: existingAssignmentError } =
            await supabase
                .from('student_routines')
                .select('id')
                .eq('student_id', studentId)
                .maybeSingle()

        if (existingAssignmentError) {
            throw new Error(existingAssignmentError.message)
        }

        if (existingAssignment?.id) {
            const { error: updateError } = await supabase
                .from('student_routines')
                .update({
                    routine_id: routineId,
                    assigned_at: new Date().toISOString(),
                })
                .eq('id', existingAssignment.id)

            if (updateError) {
                throw new Error(updateError.message)
            }
        } else {
            const { error: insertError } = await supabase
                .from('student_routines')
                .insert({
                    student_id: studentId,
                    routine_id: routineId,
                    assigned_at: new Date().toISOString(),
                })

            if (insertError) {
                throw new Error(insertError.message)
            }
        }

        redirect(`/dashboard/routines/${routineId}`)
    }

    const { data: routine, error } = await supabase
        .from('routines')
        .insert({
            name,
            trainer_id: user.id,
            student_id: studentId,
            days_per_week: daysCount,
        })
        .select('id')
        .single()

    if (error || !routine) {
        throw new Error(error?.message || 'No se pudo crear la rutina.')
    }

    const days = Array.from({ length: daysCount }, (_, index) => ({
        routine_id: routine.id,
        day_index: index + 1,
        day_number: index + 1,
        title: `Día ${index + 1}`,
        name: `Día ${index + 1}`,
    }))

    const { error: daysError } = await supabase.from('routine_days').insert(days)

    if (daysError) {
        throw new Error(daysError.message)
    }

    const { data: existingAssignment, error: existingAssignmentError } =
        await supabase
            .from('student_routines')
            .select('id')
            .eq('student_id', studentId)
            .maybeSingle()

    if (existingAssignmentError) {
        throw new Error(existingAssignmentError.message)
    }

    if (existingAssignment?.id) {
        const { error: updateError } = await supabase
            .from('student_routines')
            .update({
                routine_id: routine.id,
                assigned_at: new Date().toISOString(),
            })
            .eq('id', existingAssignment.id)

        if (updateError) {
            throw new Error(updateError.message)
        }
    } else {
        const { error: insertError } = await supabase
            .from('student_routines')
            .insert({
                student_id: studentId,
                routine_id: routine.id,
                assigned_at: new Date().toISOString(),
            })

        if (insertError) {
            throw new Error(insertError.message)
        }
    }

    redirect(`/dashboard/routines/${routine.id}`)
}