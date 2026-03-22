import { cookies } from 'next/headers'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()
    const theme = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'

    return (
        <div
            className={`min-h-screen md:flex ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-950'
                }`}
        >
            <Sidebar theme={theme} />

            <main className="w-full flex-1 overflow-y-auto pt-16 pb-20 md:pt-0 md:pb-0">
                {children}
            </main>
        </div>
    )
}