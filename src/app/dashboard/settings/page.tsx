import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
    const cookieStore = await cookies()
    const theme = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    const { data: trainerProfile } = await supabase
        .from('trainer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    return (
        <SettingsClient
            email={user.email ?? ''}
            theme={theme as 'dark' | 'light'}
            initialSettings={{
                name: profile?.name ?? '',
                weight_unit: (profile?.weight_unit ?? 'kg') as 'kg' | 'lb',
                theme: (profile?.theme ?? theme) as 'system' | 'dark' | 'light',
                display_name: trainerProfile?.display_name ?? '',
                gym_name: trainerProfile?.gym_name ?? '',
                whatsapp: trainerProfile?.whatsapp ?? '',
                default_sets: trainerProfile?.default_sets ?? 3,
                default_reps: trainerProfile?.default_reps ?? 10,
                default_rest: trainerProfile?.default_rest ?? 60,
                show_prs: trainerProfile?.show_prs ?? true,
                show_charts: trainerProfile?.show_charts ?? true,
                notify_inactive: trainerProfile?.notify_inactive ?? true,
                notify_high_risk: trainerProfile?.notify_high_risk ?? true,
            }}
        />
    )
}
