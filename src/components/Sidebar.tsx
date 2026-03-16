import { createClient } from '@/lib/supabase/server'
import SidebarClient from './SidebarClient'

export default async function Sidebar() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    let profile: {
        display_name: string | null
        gym_name: string | null
    } | null = null

    if (user) {
        const { data } = await supabase
            .from('trainer_profiles')
            .select('display_name, gym_name')
            .eq('user_id', user.id)
            .maybeSingle()

        profile = data
    }

    return <SidebarClient profile={profile} />
}