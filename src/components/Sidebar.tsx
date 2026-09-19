import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SidebarClient from './SidebarClient'
import { getServerUser } from '@/lib/auth/server'

export default async function Sidebar() {
    const user = await getServerUser()

    if (!user) {
        redirect('/login')
    }

    async function signOut() {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/login')
    }

    return <SidebarClient signOutAction={signOut} />
}
