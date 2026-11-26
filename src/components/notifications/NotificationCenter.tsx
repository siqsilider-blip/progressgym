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
        return { Icon: MessageCircle, color: 'text-primary', background: 'bg-primary/10' }
    }
    if (type === 'weekly_checkin') {
        const urgent = title.toLowerCase().includes('atención')
        return urgent
            ? { Icon: TriangleAlert, color: 'text-amber-800 dark:text-amber-400', background: 'bg-amber-500/10' }
            : { Icon: Check, color: 'text-emerald-800 dark:text-emerald-400', background: 'bg-emerald-500/10' }
    }
    if (type === 'workout_feedback') {
        const urgent = title.toLowerCase().includes('molestia')
        return urgent
            ? { Icon: TriangleAlert, color: 'text-amber-800 dark:text-amber-400', background: 'bg-amber-500/10' }
            : { Icon: Activity, color: 'text-sky-800 dark:text-sky-400', background: 'bg-sky-500/10' }
    }
    if (type === 'student_onboarding') {
        return { Icon: ClipboardCheck, color: 'text-primary', background: 'bg-primary/10' }
    }
    return { Icon: Bell, color: 'text-primary', background: 'bg-primary/10' }
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

function NotificationList({ items, notebook }: { items: NotificationRow[]; notebook: boolean }) {
    return (
        <ul className={`divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card ${notebook ? 'lg:overflow-visible lg:rounded-none lg:border-x-0 lg:bg-transparent' : ''}`}>
            {items.map((item) => {
                const { Icon, color, background } = notificationVisual(item.type, item.title)
                return (
                    <li key={item.id}>
                        <Link
                            href={`/notifications/open?id=${encodeURIComponent(item.id)}`}
                            prefetch={false}
                            className={`relative flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${notebook ? 'lg:items-center lg:gap-4 lg:py-3.5 lg:pr-8 lg:pl-2' : ''}`}
                        >
                            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${background} ${color} ${notebook ? 'lg:mt-0 lg:size-8 lg:rounded-full' : ''}`}>
                                <Icon aria-hidden="true" className="h-4 w-4" />
                            </span>
                            <span className={`min-w-0 flex-1 ${notebook ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_8rem_7rem] lg:items-center lg:gap-x-4' : ''}`}>
                                <span className={`flex items-start justify-between gap-2 ${notebook ? 'lg:col-span-2 lg:grid lg:grid-cols-[minmax(0,1fr)_8rem] lg:gap-x-4' : ''}`}>
                                    <span className={`text-sm leading-5 text-foreground ${item.read_at ? 'font-semibold' : 'font-black'}`}>
                                        {item.title}
                                    </span>
                                    <time dateTime={item.created_at} className={`shrink-0 text-[10px] text-muted-foreground ${notebook ? 'lg:text-right lg:text-xs' : ''}`}>
                                        {formatNotificationDate(item.created_at)}
                                    </time>
                                </span>
                                {item.body && (
                                    <span className={`mt-0.5 block line-clamp-2 text-xs leading-5 text-muted-foreground ${notebook ? 'lg:col-start-1 lg:row-start-2 lg:[overflow-wrap:anywhere]' : ''}`}>
                                        {item.body}
                                    </span>
                                )}
                                <span className={`mt-1.5 flex items-center gap-1 text-[10px] font-bold text-primary ${notebook ? 'lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:justify-end lg:text-xs lg:font-semibold lg:text-brand-soft' : ''}`}>
                                    Ver detalle <ChevronRight aria-hidden="true" className="h-3 w-3" />
                                </span>
                            </span>
                            {!item.read_at && (
                                <>
                                    <span aria-hidden="true" className={`mt-1 size-2 shrink-0 rounded-full bg-primary ${notebook ? 'lg:absolute lg:top-1/2 lg:right-2 lg:mt-0 lg:-translate-y-1/2' : ''}`} />
                                    <span className="sr-only">Sin leer</span>
                                </>
                            )}
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}

export default function NotificationCenter({ notifications, notebook = false }: { notifications: NotificationRow[]; notebook?: boolean }) {
    const unread = notifications.filter((item) => !item.read_at)
    const previous = notifications.filter((item) => item.read_at)

    if (!notifications.length) {
        return (
            <div className={`rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center ${notebook ? 'lg:rounded-none lg:border-x-0 lg:border-solid lg:bg-transparent lg:px-0 lg:py-6 lg:text-left' : ''}`}>
                <span aria-hidden="true" className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ${notebook ? 'lg:hidden' : ''}`}>
                    <Bell className="h-5 w-5" />
                </span>
                <h2 className={`mt-3 text-sm font-black text-foreground ${notebook ? "lg:mt-0 lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-2xl lg:font-normal" : ''}`}>Todo al día</h2>
                <p className={`mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground ${notebook ? 'lg:mx-0 lg:max-w-none lg:text-sm' : ''}`}>
                    Los mensajes, controles y avisos importantes van a aparecer acá.
                </p>
            </div>
        )
    }

    const headingClass = notebook
        ? "lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-[1.75rem] lg:leading-tight lg:font-normal lg:normal-case lg:tracking-tight lg:text-foreground"
        : ''

    return (
        <div className={`space-y-5 ${notebook ? 'lg:space-y-7' : ''}`}>
            {unread.length > 0 && (
                <section>
                    <div className={`mb-2 flex items-center justify-between gap-3 px-1 ${notebook ? 'lg:mb-2.5 lg:px-0' : ''}`}>
                        <div className={notebook ? 'lg:flex lg:items-baseline lg:gap-3' : undefined}>
                            <h2 className={`text-[10px] font-black uppercase tracking-[0.16em] text-primary ${headingClass}`}>Nuevos</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {unread.length} {notebook ? 'sin leer' : unread.length === 1 ? 'pendiente' : 'pendientes'}
                            </p>
                        </div>
                        <form action={markAllInternalNotificationsRead}>
                            <button type="submit" className={`inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[10px] font-bold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${notebook ? 'lg:rounded-md lg:bg-transparent lg:text-xs lg:font-semibold' : ''}`}>
                                <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
                                Marcar todo leído
                            </button>
                        </form>
                    </div>
                    <NotificationList notebook={notebook} items={unread} />
                </section>
            )}

            {previous.length > 0 && (
                <section>
                    <div className={`mb-2 px-1 ${notebook ? 'lg:mb-2.5 lg:px-0' : ''}`}>
                        <h2 className={`text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground ${headingClass}`}>Anteriores</h2>
                    </div>
                    <NotificationList notebook={notebook} items={previous} />
                </section>
            )}
        </div>
    )
}
