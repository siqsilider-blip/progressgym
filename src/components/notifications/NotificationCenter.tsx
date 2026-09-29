import Link from 'next/link'
import { Activity, Bell, Check, CheckCheck, ChevronRight, ClipboardCheck, MessageCircle, TriangleAlert } from 'lucide-react'
import { markAllInternalNotificationsRead } from '@/app/notifications/actions'

export type NotificationRow = {
    id: string
    type: string
    title: string
    body: string | null
    href: string | null
    read_at: string | null
    created_at: string
}

function notificationVisual(type: string, title: string) {
    if (type === 'coaching_message') {
        return { Icon: MessageCircle, color: 'text-violet-400', background: 'bg-violet-500/10' }
    }
    if (type === 'weekly_checkin') {
        const urgent = title.toLowerCase().includes('atención')
        return urgent
            ? { Icon: TriangleAlert, color: 'text-amber-400', background: 'bg-amber-500/10' }
            : { Icon: Check, color: 'text-emerald-400', background: 'bg-emerald-500/10' }
    }
    if (type === 'workout_feedback') {
        const urgent = title.toLowerCase().includes('molestia')
        return urgent
            ? { Icon: TriangleAlert, color: 'text-amber-400', background: 'bg-amber-500/10' }
            : { Icon: Activity, color: 'text-sky-400', background: 'bg-sky-500/10' }
    }
    if (type === 'student_onboarding') {
        return { Icon: ClipboardCheck, color: 'text-indigo-400', background: 'bg-indigo-500/10' }
    }
    return { Icon: Bell, color: 'text-violet-400', background: 'bg-violet-500/10' }
}

function formatNotificationDate(value: string) {
    const date = new Date(value)
    const now = new Date()
    const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000))

    if (elapsedMinutes < 1) return 'Ahora'
    if (elapsedMinutes < 60) return `Hace ${elapsedMinutes} min`
    if (elapsedMinutes < 24 * 60) return `Hace ${Math.floor(elapsedMinutes / 60)} h`

    return new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
    }).format(date)
}

function NotificationList({ items }: { items: NotificationRow[] }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {items.map((item, index) => {
                const { Icon, color, background } = notificationVisual(item.type, item.title)
                return (
                    <div
                        key={item.id}
                        className={index > 0 ? 'border-t border-border' : ''}
                    >
                        <Link
                            href={`/notifications/open?id=${encodeURIComponent(item.id)}`}
                            prefetch={false}
                            className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-white/[0.025]"
                        >
                            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${background} ${color}`}>
                                <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-start justify-between gap-2">
                                    <span className={`text-sm leading-5 text-foreground ${item.read_at ? 'font-semibold' : 'font-black'}`}>
                                        {item.title}
                                    </span>
                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                        {formatNotificationDate(item.created_at)}
                                    </span>
                                </span>
                                {item.body && (
                                    <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                                        {item.body}
                                    </span>
                                )}
                                <span className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-violet-400">
                                    Ver detalle <ChevronRight className="h-3 w-3" />
                                </span>
                            </span>
                            {!item.read_at && (
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-500" aria-label="Sin leer" />
                            )}
                        </Link>
                    </div>
                )
            })}
        </div>
    )
}

export default function NotificationCenter({ notifications }: { notifications: NotificationRow[] }) {
    const unread = notifications.filter((item) => !item.read_at)
    const previous = notifications.filter((item) => item.read_at)

    if (!notifications.length) {
        return (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
                    <Bell className="h-5 w-5" />
                </span>
                <h2 className="mt-3 text-sm font-black text-foreground">Todo al día</h2>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                    Los mensajes, controles y avisos importantes van a aparecer acá.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {unread.length > 0 && (
                <section>
                    <div className="mb-2 flex items-center justify-between gap-3 px-1">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-400">Nuevos</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{unread.length} pendiente{unread.length === 1 ? '' : 's'}</p>
                        </div>
                        <form action={markAllInternalNotificationsRead}>
                            <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[10px] font-bold text-foreground transition hover:bg-muted">
                                <CheckCheck className="h-3.5 w-3.5" />
                                Marcar todo leído
                            </button>
                        </form>
                    </div>
                    <NotificationList items={unread} />
                </section>
            )}

            {previous.length > 0 && (
                <section>
                    <div className="mb-2 px-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Anteriores</p>
                    </div>
                    <NotificationList items={previous} />
                </section>
            )}
        </div>
    )
}
