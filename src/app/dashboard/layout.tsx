import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role === 'student') redirect('/app')
    if (profile?.role !== 'trainer') redirect('/login')

    const cookieStore = await cookies()
    const theme = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'

    return (
        <div className="min-h-screen bg-[#07070a] md:flex">
            <Sidebar theme={theme} />
            <main className="w-full flex-1 overflow-y-auto pt-16 pb-20 md:pt-0 md:pb-0">
                {children}
            </main>
        </div>
    )
}
