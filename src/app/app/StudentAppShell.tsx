'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart2, CalendarDays, Clock, Home, MessageCircle, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const navItems = [
    { href: '/app', icon: Home, label: 'Inicio', exact: true },
    { href: '/app/rutina', icon: CalendarDays, label: 'Rutina', exact: false },
    { href: '/app/progress', icon: BarChart2, label: 'Progreso', exact: false },
    { href: '/app/history', icon: Clock, label: 'Historial', exact: false },
    { href: '/app/messages', icon: MessageCircle, label: 'Mensajes', exact: false },
    { href: '/app/profile', icon: User, label: 'Perfil', exact: false },
]

export default function StudentAppShell({
    children,
    studentId,
    unreadMessages,
}: {
    children: React.ReactNode
    studentId: string | null
    unreadMessages: number
}) {
    const pathname = usePathname()
    const router = useRouter()

    if (!studentId) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-3xl">🏋️</div>
                <h1 className="mt-4 text-xl font-bold text-foreground">Cuenta no vinculada</h1>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    Tu cuenta todavía no está vinculada a ningún alumno. Pedile a tu entrenador que la vincule desde tu perfil.
                </p>
                <button
                    type="button"
                    onClick={async () => {
                        await supabase.auth.signOut()
                        router.replace('/login')
                        router.refresh()
                    }}
                    className="mt-6 rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                >
                    Cerrar sesión
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {children}

            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur">
                <div className="mx-auto grid max-w-lg grid-cols-6 items-center px-1 py-2">
                    {navItems.map(({ href, icon: Icon, label, exact }) => {
                        const isActive = exact ? pathname === href : pathname.startsWith(href)
                        return (
                            <Link
                                key={href}
                                href={href}
                                prefetch={true}
                                className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition ${
                                    isActive
                                        ? 'text-indigo-500'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <span className="relative">
                                    <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                                    {label === 'Mensajes' && unreadMessages > 0 && (
                                        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black text-white">
                                            {Math.min(unreadMessages, 9)}
                                        </span>
                                    )}
                                </span>
                                <span className={`max-w-full truncate text-[8px] font-medium ${isActive ? 'font-bold' : ''}`}>
                                    {label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
