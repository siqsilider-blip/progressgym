import { cookies } from 'next/headers'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, UserPlus, UserX } from 'lucide-react'
import AppBadge from '@/components/ui/app-badge'
import AppCard from '@/components/ui/app-card'
import type { TrainerAlert } from './getTrainerAlerts'

function getAlertStyle(type: TrainerAlert['type'], isLight: boolean) {
    switch (type) {
        case 'inactive':
            return {
                card: isLight
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-amber-500/20 bg-amber-500/5',
                iconWrap: 'bg-amber-500/10 text-amber-500',
                badgeClassName: isLight
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-amber-500/10 text-amber-300',
            }
        case 'no_routine':
            return {
                card: isLight
                    ? 'border-rose-200 bg-rose-50'
                    : 'border-rose-500/20 bg-rose-500/5',
                iconWrap: 'bg-rose-500/10 text-rose-500',
                badgeClassName: isLight
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-rose-500/10 text-rose-300',
            }
        case 'new_student':
            return {
                card: isLight
                    ? 'border-sky-200 bg-sky-50'
                    : 'border-sky-500/20 bg-sky-500/5',
                iconWrap: 'bg-sky-500/10 text-sky-500',
                badgeClassName: isLight
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-sky-500/10 text-sky-300',
            }
        default:
            return {
                card: isLight
                    ? 'border-border bg-card'
                    : 'border-border bg-muted/30',
                iconWrap: isLight
                    ? 'bg-muted text-zinc-600'
                    : 'bg-muted text-zinc-300',
                badgeClassName: isLight
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-secondary text-secondary-foreground',
            }
    }
}

function getAlertLabel(type: TrainerAlert['type']) {
    switch (type) {
        case 'inactive':
            return 'Inactividad'
        case 'no_routine':
            return 'Sin rutina'
        case 'new_student':
            return 'Sin registros'
        default:
            return 'Alerta'
    }
}

function getAlertIcon(type: TrainerAlert['type']) {
    switch (type) {
        case 'inactive':
            return AlertTriangle
        case 'no_routine':
            return UserX
        case 'new_student':
            return UserPlus
        default:
            return AlertTriangle
    }
}

export default async function TrainerAlertsCard({
    alerts,
}: {
    alerts: TrainerAlert[]
}) {
    const cookieStore = await cookies()
    const theme = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'
    const isLight = theme === 'light'

    return (
        <AppCard className="p-6">
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
                    <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        Alertas
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Situaciones que conviene revisar cuanto antes
                    </p>
                </div>
            </div>

            {alerts.length === 0 ? (
                <div
                    className={`rounded-2xl border border-dashed p-5 text-sm ${isLight
                            ? 'border-border bg-muted/50 text-muted-foreground'
                            : 'border-border bg-muted/30 text-muted-foreground'
                        }`}
                >
                    No hay alertas importantes por ahora.
                </div>
            ) : (
                <div className="space-y-3">
                    {alerts.slice(0, 6).map((alert) => {
                        const style = getAlertStyle(alert.type, isLight)
                        const Icon = getAlertIcon(alert.type)

                        return (
                            <div
                                key={`${alert.type}-${alert.studentId}`}
                                className={`rounded-2xl border p-4 transition ${style.card}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div
                                            className={`mt-0.5 rounded-xl p-2 ${style.iconWrap}`}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </div>

                                        <div className="min-w-0">
                                            <AppBadge
                                                className={`uppercase tracking-[0.14em] ${style.badgeClassName}`}
                                            >
                                                {getAlertLabel(alert.type)}
                                            </AppBadge>

                                            <p className="mt-3 text-sm leading-6 text-card-foreground">
                                                {alert.message}
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        href={`/dashboard/students/${alert.studentId}`}
                                        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-500 transition hover:text-indigo-400"
                                    >
                                        Ver alumno
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </AppCard>
    )
}