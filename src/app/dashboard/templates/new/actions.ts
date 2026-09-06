'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createTemplate(formData: FormData) {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const daysCountRaw = formData.get('days_count') as string
    const daysCount = Number(daysCountRaw)

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (!name || !name.trim()) {
        throw new Error('Falta el nombre del template.')
    }

    if (!Number.isInteger(daysCount) || daysCount < 1 || daysCount > 6) {
        throw new Error('La cantidad de días debe estar entre 1 y 6.')
    }

    // A diferencia de createRoutine (programas), acá NO se inserta ningún
    // routine_day de entrada -- el template nace vacío y el entrenador lo
    // arma con el mismo editor de meses/semanas/días/ejercicios que ya
    // existe para programas (addRoutineMonth / addRoutineWeek, que ya
    // auto-genera los días de la primera semana usando days_per_week).
    const { data: template, error } = await supabase
        .from('routines')
        .insert({
            name: name.trim(),
            trainer_id: user.id,
            student_id: null,
            days_per_week: daysCount,
            routine_kind: 'template',
        })
        .select('id')
        .single()

    if (error || !template) {
        throw new Error(error?.message || 'No se pudo crear el template.')
    }

    redirect(`/dashboard/routines/${template.id}`)
}
