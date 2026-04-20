'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type SettingsData = {
    name: string
    weight_unit: 'kg' | 'lb'
    theme: 'system' | 'dark' | 'light'
    display_name: string
    gym_name: string
    whatsapp: string
    default_sets: number
    default_reps: number
    default_rest: number
    show_prs: boolean
    show_charts: boolean
    notify_inactive: boolean
    notify_high_risk: boolean
}

export async function saveSettings(data: SettingsData): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect('/login')

    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            name: data.name,
            email: user.email ?? '',
            weight_unit: data.weight_unit,
            theme: data.theme === 'system' ? 'dark' : data.theme,
        })

    if (profileError) return { ok: false, error: profileError.message }

    const trainerPayload = {
        user_id: user.id,
        display_name: data.display_name || null,
        gym_name: data.gym_name || null,
        whatsapp: data.whatsapp || null,
        weight_unit: data.weight_unit,
        default_sets: Number(data.default_sets),
        default_reps: Number(data.default_reps),
        default_rest: Number(data.default_rest),
        show_prs: Boolean(data.show_prs),
        show_charts: Boolean(data.show_charts),
        notify_inactive: Boolean(data.notify_inactive),
        notify_high_risk: Boolean(data.notify_high_risk),
        updated_at: new Date().toISOString(),
    }

    console.log('[saveSettings] trainer payload:', JSON.stringify(trainerPayload))

    const { error: trainerError } = await supabase
        .from('trainer_profiles')
        .upsert(trainerPayload, { onConflict: 'user_id' })

    if (trainerError) {
        console.error('[saveSettings] trainerError:', JSON.stringify(trainerError))
        return { ok: false, error: `${trainerError.code}: ${trainerError.message} — ${trainerError.details ?? ''}` }
    }

    const cookieStore = await cookies()
    cookieStore.set('theme', data.theme === 'system' ? 'dark' : data.theme, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
    })

    return { ok: true }
}

export async function signOutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

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