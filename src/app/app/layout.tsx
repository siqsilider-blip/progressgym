'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart2, Clock, User, CalendarDays, Home, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [studentId, setStudentId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function check() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, student_id')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'student') { router.push('/dashboard'); return }
            if (!profile?.student_id) { setStudentId(null); setLoading(false); return }
            setStudentId(profile.student_id)
            setLoading(false)
        }
        check()
    }, [])

    const navItems = [
        { href: '/app', icon: Home, label: 'Inicio', exact: true },
        { href: '/app/rutina', icon: CalendarDays, label: 'Rutina', exact: false },
        { href: '/app/progress', icon: BarChart2, label: 'Progreso', exact: false },
        { href: '/app/history', icon: Clock, label: 'Historial', exact: false },
        { href: '/app/logros', icon: Trophy, label: 'Logros', exact: false },
        { href: '/app/profile', icon: User, label: 'Perfil', exact: false },
    ]

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
        )
    }

    if (!studentId) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-3xl">🏋️</div>
                <h1 className="mt-4 text-xl font-bold text-foreground">Cuenta no vinculada</h1>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    Tu cuenta todavía no está vinculada a ningún alumno. Pedile a tu entrenador que la vincule desde tu perfil.
                </p>
                <button
                    onClick={async () => {
                        await supabase.auth.signOut()
                        router.push('/login')
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
                <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-2">
                    {navItems.map(({ href, icon: Icon, label, exact }) => {
                        const isActive = exact ? pathname === href : pathname.startsWith(href)
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition ${
                                    isActive
                                        ? 'text-indigo-500'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                                <span className={`text-[9px] font-medium ${isActive ? 'font-bold' : ''}`}>
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
