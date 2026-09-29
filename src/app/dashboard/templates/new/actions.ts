'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
    TEMPLATE_EQUIPMENT,
    TEMPLATE_EXPERIENCE,
    TEMPLATE_GOALS,
    TEMPLATE_LOCATIONS,
} from '@/lib/templateMatching'

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

    const targetGoals = getAllowedValues(formData, 'target_goals', TEMPLATE_GOALS)
    const targetExperience = getAllowedValues(formData, 'target_experience_levels', TEMPLATE_EXPERIENCE)
    const targetLocations = getAllowedValues(formData, 'target_locations', TEMPLATE_LOCATIONS)
    const requiredEquipment = getAllowedValues(formData, 'required_equipment', TEMPLATE_EQUIPMENT)
    const sessionMinutesRaw = String(formData.get('target_session_minutes') ?? '')
    const sessionMinutes = sessionMinutesRaw ? Number(sessionMinutesRaw) : null

    if (sessionMinutes !== null && (!Number.isInteger(sessionMinutes) || sessionMinutes < 15 || sessionMinutes > 180)) {
        throw new Error('La duración estimada no es válida.')
    }

    // La creación de la rutina, sus criterios, la Semana 1 y los días
    // iniciales es atómica a través de la RPC create_template_v2.
    const { data: templateId, error } = await supabase.rpc('create_template_v2', {
        p_name: name.trim(),
        p_days_per_week: daysCount,
        p_target_goals: targetGoals,
        p_target_experience_levels: targetExperience,
        p_target_locations: targetLocations,
        p_required_equipment: requiredEquipment,
        p_target_session_minutes: sessionMinutes,
    })

    if (error || !templateId) {
        const migrationPending = error?.code === 'PGRST202' || error?.message?.includes('create_template_v2')
        throw new Error(migrationPending
            ? 'Falta aplicar la migración de recomendaciones de templates.'
            : error?.message || 'No se pudo crear el template.')
    }

    redirect(`/dashboard/routines/${templateId}`)
}

function getAllowedValues(
    formData: FormData,
    field: string,
    allowed: Record<string, string>,
) {
    return formData.getAll(field).map(String).filter((value) => value in allowed)
}
