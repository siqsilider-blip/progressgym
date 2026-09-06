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

    // La creación de la rutina, la Semana 1 y sus días iniciales es atómica
    // a través de la RPC create_template en Postgres.
    const { data: templateId, error } = await supabase.rpc('create_template', {
        p_name: name.trim(),
        p_days_per_week: daysCount,
    })

    if (error || !templateId) {
        throw new Error(error?.message || 'No se pudo crear el template.')
    }

    redirect(`/dashboard/routines/${templateId}`)
}
