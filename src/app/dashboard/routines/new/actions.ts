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

    // 1) Ver si ya existe una rutina para este alumno y este trainer
    const { data: existingRoutine, error: existingRoutineError } = await supabase
        .from('routines')
        .select('id')
        .eq('trainer_id', user.id)
        .eq('student_id', studentId)
        .maybeSingle()

    if (existingRoutineError) {
        throw new Error(existingRoutineError.message)
    }

    // Si ya existe, redirigir a esa rutina en vez de crear otra
    if (existingRoutine?.id) {
        redirect(`/dashboard/routines/${existingRoutine.id}`)
    }

    // 2) Crear la rutina
    const { data: routine, error } = await supabase
        .from('routines')
        .insert({
            name,
            trainer_id: user.id,
            student_id: studentId,
        })
        .select()
        .single()

    if (error || !routine) {
        throw new Error(error?.message || 'No se pudo crear la rutina.')
    }

    // 3) Crear los días automáticamente
    const days = Array.from({ length: daysCount }, (_, index) => ({
        routine_id: routine.id,
        day_number: index + 1,
        name: `Día ${index + 1}`,
    }))

    const { error: daysError } = await supabase.from('routine_days').insert(days)

    if (daysError) {
        throw new Error(daysError.message)
    }

    redirect(`/dashboard/routines/${routine.id}`)
}