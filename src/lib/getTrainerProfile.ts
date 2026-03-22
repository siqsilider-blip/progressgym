import { createClient } from '@/lib/supabase/server'

export type TrainerProfile = {
    display_name: string | null
    gym_name: string | null
    weight_unit: string | null
    default_routine_days: number | null
}

export async function getTrainerProfile(): Promise<TrainerProfile | null> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return null
    }

    const [{ data: trainerProfile, error: trainerError }, { data: profile, error: profileError }] =
        await Promise.all([
            supabase
                .from('trainer_profiles')
                .select('display_name, gym_name, default_routine_days')
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
    }
}