import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentAppShell from './StudentAppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, student_id')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role === 'trainer') redirect('/dashboard')
    if (profile?.role !== 'student') redirect('/login')

    return (
        <StudentAppShell studentId={profile.student_id}>
            {children}
        </StudentAppShell>
    )
}
