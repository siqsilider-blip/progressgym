'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveTrainerProfile(formData: FormData) {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const displayName = String(formData.get('display_name') ?? '').trim()
    const gymName = String(formData.get('gym_name') ?? '').trim()
    const weightUnit = String(formData.get('weight_unit') ?? 'kg').trim()
    const defaultRoutineDays = Number(formData.get('default_routine_days') ?? 4)

    if (!['kg', 'lb'].includes(weightUnit)) {
        throw new Error('Unidad inválida.')
    }

    if (!Number.isInteger(defaultRoutineDays) || defaultRoutineDays < 1 || defaultRoutineDays > 6) {
        throw new Error('Los días por defecto deben estar entre 1 y 6.')
    }

    const { error } = await supabase
        .from('trainer_profiles')
        .upsert(
            {
                user_id: user.id,
                display_name: displayName || null,
                gym_name: gymName || null,
                weight_unit: weightUnit,
                default_routine_days: defaultRoutineDays,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
        )

    if (error) {
        throw new Error(error.message)
    }
}