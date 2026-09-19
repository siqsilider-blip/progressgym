import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Sidebar from '@/components/Sidebar'
import DashboardNavigationTracker from '@/components/dashboard/DashboardNavigationTracker'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getServerUser()

    if (!user) redirect('/login')

    const supabase = await createClient()

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role === 'student') redirect('/app')
    if (profile?.role !== 'trainer') redirect('/login')

    return (
        <div className="trainer-shell min-h-screen bg-[#07070a] md:flex">
            <Suspense fallback={null}>
                <DashboardNavigationTracker />
            </Suspense>
            <Sidebar />
            <main className="w-full flex-1 overflow-y-auto pt-14 pb-20 md:pt-0 md:pb-0">
                {children}
            </main>
        </div>
    )
}
