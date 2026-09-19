import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import StudentAppShell from './StudentAppShell'
import StudentNavigationTracker from '@/components/student/StudentNavigationTracker'
import { getStudentAppContext } from '@/lib/auth/student'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const { profile } = context

    if (profile?.role === 'trainer') redirect('/dashboard')
    if (profile?.role !== 'student') redirect('/login')

    return (
        <StudentAppShell studentId={profile.student_id}>
            <Suspense fallback={null}>
                <StudentNavigationTracker />
            </Suspense>
            {children}
        </StudentAppShell>
    )
}
