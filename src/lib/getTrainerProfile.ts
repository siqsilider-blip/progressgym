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

    const { data, error } = await supabase
        .from('trainer_profiles')
        .select('display_name, gym_name, weight_unit, default_routine_days')
        .eq('user_id', user.id)
        .maybeSingle()

    if (error) {
        console.error('Error fetching trainer profile:', error)
        return null
    }

    return (data as TrainerProfile | null) ?? null
}