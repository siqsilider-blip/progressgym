import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SidebarClient from './SidebarClient'
import { getServerUser } from '@/lib/auth/server'

export default async function Sidebar() {
    const user = await getServerUser()

    if (!user) {
        redirect('/login')
    }

    const supabase = await createClient()

    async function signOut() {
        'use server'
        const actionSupabase = await createClient()
        await actionSupabase.auth.signOut()
        redirect('/login')
    }

    const { count: unreadNotifications } = await supabase
        .from('internal_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', user.id)
        .is('read_at', null)

    return <SidebarClient signOutAction={signOut} unreadNotifications={unreadNotifications ?? 0} />
}
