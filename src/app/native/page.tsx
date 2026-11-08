import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'

export default async function NativeEntryPage() {
    const user = await getServerUser()
    if (!user) redirect('/login')

    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role === 'trainer') redirect('/dashboard')
    if (profile?.role === 'student') redirect('/app')
    redirect('/login')
}
