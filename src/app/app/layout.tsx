import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import StudentAppShell from './StudentAppShell'
import StudentNavigationTracker from '@/components/student/StudentNavigationTracker'
import { getStudentAppContext } from '@/lib/auth/student'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const { profile } = context

    if (profile?.role === 'trainer') redirect('/dashboard')
    if (profile?.role !== 'student') redirect('/login')

    const supabase = await createClient()
    const { count: unreadNotifications } = await supabase
        .from('internal_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', profile.id)
        .is('read_at', null)

    return (
        <StudentAppShell studentId={profile.student_id} unreadNotifications={unreadNotifications ?? 0}>
            <Suspense fallback={null}>
                <StudentNavigationTracker />
            </Suspense>
            {children}
        </StudentAppShell>
    )
}
