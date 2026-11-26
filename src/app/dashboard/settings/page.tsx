import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'
import { getServerUser } from '@/lib/auth/server'
import AppearanceSelector from '@/components/appearance/AppearanceSelector'

export default async function SettingsPage() {
    const supabase = await createClient()
    const user = await getServerUser()
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
            appearance={<AppearanceSelector />}
            initialSettings={{
                name: profile?.name ?? '',
                weight_unit: (profile?.weight_unit ?? 'kg') as 'kg' | 'lb',
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
