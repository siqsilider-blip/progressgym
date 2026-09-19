import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server'

export type TrainerProfile = {
    display_name: string | null
    gym_name: string | null
    weight_unit: string | null
    default_routine_days: number | null
    default_sets: number
    default_reps: number
    default_rest: number
    show_prs: boolean
    show_charts: boolean
}

export async function getTrainerProfile(): Promise<TrainerProfile | null> {
    const supabase = await createClient()

    const user = await getServerUser()

    if (!user) {
        return null
    }

    const [{ data: trainerProfile, error: trainerError }, { data: profile, error: profileError }] =
        await Promise.all([
            supabase
                .from('trainer_profiles')
                .select('display_name, gym_name, default_routine_days, default_sets, default_reps, default_rest, show_prs, show_charts')
                .eq('user_id', user.id)
                .maybeSingle(),
            supabase
                .from('profiles')
                .select('weight_unit')
                .eq('id', user.id)
                .maybeSingle(),
        ])

    if (trainerError) {
        console.error('Error fetching trainer profile:', trainerError)
    }

    if (profileError) {
        console.error('Error fetching profile weight unit:', profileError)
    }

    return {
        display_name: trainerProfile?.display_name ?? null,
        gym_name: trainerProfile?.gym_name ?? null,
        default_routine_days: trainerProfile?.default_routine_days ?? null,
        weight_unit: profile?.weight_unit ?? 'kg',
        default_sets: trainerProfile?.default_sets ?? 3,
        default_reps: trainerProfile?.default_reps ?? 10,
        default_rest: trainerProfile?.default_rest ?? 60,
        show_prs: trainerProfile?.show_prs ?? true,
        show_charts: trainerProfile?.show_charts ?? true,
    }
}
