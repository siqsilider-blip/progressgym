import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SidebarClient from './SidebarClient'

type SidebarProps = {
    theme?: 'dark' | 'light'
}

export default async function Sidebar({
    theme = 'dark',
}: SidebarProps) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    async function signOut() {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/login')
    }

    return <SidebarClient theme={theme} signOutAction={signOut} />
}