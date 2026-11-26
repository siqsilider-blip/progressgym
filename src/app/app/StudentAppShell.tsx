'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart2, CalendarDays, Home, MessageCircle, User } from 'lucide-react'
import { StudentUnreadMessagesContext } from '@/components/student/StudentHomeUnreadMessages'
import { COACHING_MESSAGES_READ_EVENT, unreadTrainerMessagesQuery } from '@/lib/coaching/unreadTrainerMessages'
import { supabase } from '@/lib/supabase/client'

const MESSAGES_HREF = '/app/messages'
const UNREAD_REFRESH_INTERVAL_MS = 25_000

const navItems = [
    { href: '/app', icon: Home, label: 'Inicio' },
    { href: '/app/rutina', icon: CalendarDays, label: 'Rutina' },
    { href: '/app/progress', icon: BarChart2, label: 'Progreso' },
    { href: MESSAGES_HREF, icon: MessageCircle, label: 'Mensajes' },
    { href: '/app/profile', icon: User, label: 'Perfil' },
]

function activeSection(pathname: string) {
    if (pathname.startsWith('/app/train') || pathname.startsWith('/app/rutina')) return '/app/rutina'
    if (pathname.startsWith('/app/progress') || pathname.startsWith('/app/history') || pathname.startsWith('/app/check-in') || pathname.startsWith('/app/logros')) return '/app/progress'
    if (pathname.startsWith(MESSAGES_HREF)) return MESSAGES_HREF
    if (pathname.startsWith('/app/profile') || pathname.startsWith('/app/notifications') || pathname.startsWith('/app/onboarding')) return '/app/profile'
    return '/app'
}

export default function StudentAppShell({
    children,
    studentId,
    trainerId,
    initialUnreadMessages,
}: {
    children: React.ReactNode
    studentId: string | null
    trainerId: string | null
    initialUnreadMessages: number
}) {
    const pathname = usePathname()
    const router = useRouter()
    const currentSection = activeSection(pathname)
    const inChat = currentSection === MESSAGES_HREF
    const [liveUnreadMessages, setLiveUnreadMessages] = useState<number | null>(null)
    const refreshHomeAfterTraining = useRef(false)
    const unreadMessages = liveUnreadMessages ?? initialUnreadMessages
    const unreadDescription = unreadMessages === 1 ? '1 mensaje sin leer' : `${unreadMessages} mensajes sin leer`

    useEffect(() => {
        if (pathname === '/app/train') {
            refreshHomeAfterTraining.current = true
        } else if (pathname === '/app' && refreshHomeAfterTraining.current) {
            // Inicio can be cached by the router while sets are being saved.
            refreshHomeAfterTraining.current = false
            router.refresh()
        }
    }, [pathname, router])

    useEffect(() => {
        if (!studentId || !trainerId) return
        let request: AbortController | null = null

        const syncUnread = async () => {
            if (document.visibilityState !== 'visible' || request) return

            const controller = new AbortController()
            request = controller
            const { count, error } = await unreadTrainerMessagesQuery(supabase, studentId, trainerId)
                .abortSignal(controller.signal)

            if (request !== controller) return
            request = null
            if (error || count === null) return

            setLiveUnreadMessages(count)
            if (inChat && count > 0) router.refresh()
        }

        const onRead = () => {
            request?.abort()
            request = null
            if (inChat && document.visibilityState === 'visible') router.refresh()
            void syncUnread()
        }

        const interval = window.setInterval(syncUnread, UNREAD_REFRESH_INTERVAL_MS)
        void syncUnread()
        window.addEventListener('focus', syncUnread)
        window.addEventListener('online', syncUnread)
        document.addEventListener('visibilitychange', syncUnread)
        window.addEventListener(COACHING_MESSAGES_READ_EVENT, onRead)

        return () => {
            request?.abort()
            request = null
            window.clearInterval(interval)
            window.removeEventListener('focus', syncUnread)
            window.removeEventListener('online', syncUnread)
            document.removeEventListener('visibilitychange', syncUnread)
            window.removeEventListener(COACHING_MESSAGES_READ_EVENT, onRead)
        }
    }, [studentId, trainerId, inChat, router])

    if (!studentId) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">🏋️</div>
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
            <StudentUnreadMessagesContext.Provider value={unreadMessages}>
                {children}
            </StudentUnreadMessagesContext.Provider>

            <nav aria-label="Navegación del alumno" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur">
                <span role="status" className="sr-only">
                    {!inChat && unreadMessages > 0 ? `Mensajes: ${unreadDescription}` : ''}
                </span>
                <div className="mx-auto grid max-w-lg grid-cols-5 items-center px-2 pt-1.5" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
                    {navItems.map(({ href, icon: Icon, label }) => {
                        const isActive = currentSection === href
                        const hasUnread = href === MESSAGES_HREF && unreadMessages > 0
                        const tabStyle = hasUnread
                            ? 'bg-primary/15 text-foreground'
                            : isActive ? 'text-brand-soft' : 'text-muted-foreground hover:text-foreground'
                        return (
                            <Link
                                key={href}
                                href={href}
                                prefetch={href !== MESSAGES_HREF}
                                aria-current={isActive ? 'page' : undefined}
                                aria-label={hasUnread ? `${label}, ${unreadDescription}` : undefined}
                                className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition ${tabStyle}`}
                            >
                                <span className="relative">
                                    <Icon aria-hidden="true" className={`h-5 w-5 ${isActive || hasUnread ? 'stroke-[2.5]' : ''}`} />
                                    {hasUnread && (
                                        <span aria-hidden="true" className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1 text-[11px] font-bold tabular-nums text-white ring-2 ring-background">
                                            {unreadMessages > 9 ? '9+' : unreadMessages}
                                        </span>
                                    )}
                                </span>
                                <span className={`max-w-full truncate text-[11px] sm:text-xs ${isActive || hasUnread ? 'font-bold' : 'font-medium'}`}>
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
