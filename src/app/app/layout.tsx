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
    if (!profile.student_id) {
        redirect('/login/student?message=Tu acceso todavía no está vinculado a una ficha. Pedile una nueva invitación a tu entrenador.')
    }

    const supabase = await createClient()
    const { count: unreadMessages } = await supabase
        .from('internal_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', profile.id)
        .eq('type', 'coaching_message')
        .is('read_at', null)

    return (
        <StudentAppShell
            studentId={profile.student_id}
            unreadMessages={unreadMessages ?? 0}
        >
            <Suspense fallback={null}>
                <StudentNavigationTracker />
            </Suspense>
            {children}
        </StudentAppShell>
    )
}
