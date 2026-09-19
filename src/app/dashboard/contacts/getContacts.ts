import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server'

export async function getContacts() {
    const supabase = await createClient()

    const user = await getServerUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('trainer_id', user.id)
        .eq('is_archived', false)
        .order('next_follow_up_at', { ascending: true })

    if (error) {
        console.error(error)
        return []
    }

    return data
}
