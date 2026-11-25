import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import StudentAppShell from './StudentAppShell'
import StudentNavigationTracker from '@/components/student/StudentNavigationTracker'
import { getStudentAppContext } from '@/lib/auth/student'
import { createClient } from '@/lib/supabase/server'
import { unreadTrainerMessagesQuery } from '@/lib/coaching/unreadTrainerMessages'

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
    const { data: student } = await supabase
        .from('students')
        .select('trainer_id')
        .eq('id', profile.student_id)
        .maybeSingle()
    const trainerId = student?.trainer_id ?? null
    const { count: unreadMessages } = trainerId
        ? await unreadTrainerMessagesQuery(supabase, profile.student_id, trainerId)
        : { count: 0 }

    return (
        <StudentAppShell
            key={`${profile.student_id}:${trainerId}`}
            studentId={profile.student_id}
            trainerId={trainerId}
            initialUnreadMessages={unreadMessages ?? 0}
        >
            <Suspense fallback={null}>
                <StudentNavigationTracker />
            </Suspense>
            {children}
        </StudentAppShell>
    )
}
