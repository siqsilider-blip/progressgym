import { cookies } from 'next/headers'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, UserMinus, UserX } from 'lucide-react'
import AppBadge from '@/components/ui/app-badge'
import AppCard from '@/components/ui/app-card'
import type { TrainerAlert } from './getTrainerAlerts'

function getRiskMeta(type: TrainerAlert['type'], isLight: boolean) {
    switch (type) {
        case 'inactive':
            return {
                label: 'Inactivo',
                badgeClassName: isLight
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-amber-500/10 text-amber-300',
                icon: AlertTriangle,
                iconClassName: 'text-amber-500',
                iconBgClassName: 'bg-amber-500/10',
                cardClassName: isLight
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-amber-500/20 bg-amber-500/5',
            }
        case 'no_routine':
            return {
                label: 'Sin rutina',
                badgeClassName: isLight
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-rose-500/10 text-rose-300',
                icon: UserX,
                iconClassName: 'text-rose-500',
                iconBgClassName: 'bg-rose-500/10',
                cardClassName: isLight
                    ? 'border-rose-200 bg-rose-50'
                    : 'border-rose-500/20 bg-rose-500/5',
            }
        case 'new_student':
            return {
                label: 'Sin registros',
                badgeClassName: isLight
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-sky-500/10 text-sky-300',
                icon: UserMinus,
                iconClassName: 'text-sky-500',
                iconBgClassName: 'bg-sky-500/10',
                cardClassName: isLight
                    ? 'border-sky-200 bg-sky-50'
                    : 'border-sky-500/20 bg-sky-500/5',
            }
        default:
            return {
                label: 'Alerta',
                badgeClassName: 'bg-secondary text-secondary-foreground',
                icon: AlertTriangle,
                iconClassName: isLight ? 'text-zinc-600' : 'text-zinc-300',
                iconBgClassName: 'bg-secondary',
                cardClassName: isLight
                    ? 'border-border bg-muted/50'
                    : 'border-border bg-muted/30',
            }
    }
}

export default async function AtRiskStudentsCard({
    alerts,
}: {
    alerts: TrainerAlert[]
}) {
    const cookieStore = await cookies()
    const theme = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'
    const isLight = theme === 'light'

    const atRiskAlerts = alerts.slice(0, 4)

    return (
        <AppCard className="p-6">
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
                    <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        Alumnos en riesgo
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Casos que conviene revisar primero
                    </p>
                </div>
            </div>

            {atRiskAlerts.length === 0 ? (
                <div
                    className={`rounded-2xl border border-dashed p-5 text-sm ${isLight
                            ? 'border-border bg-muted/50 text-muted-foreground'
                            : 'border-border bg-muted/30 text-muted-foreground'
                        }`}
                >
                    No hay alumnos en riesgo por ahora.
                </div>
            ) : (
                <div className="space-y-3">
                    {atRiskAlerts.map((alert) => {
                        const meta = getRiskMeta(alert.type, isLight)
                        const Icon = meta.icon

                        return (
                            <div
                                key={`${alert.type}-${alert.studentId}`}
                                className={`rounded-2xl border p-4 transition ${meta.cardClassName}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div
                                            className={`rounded-xl p-2 ${meta.iconBgClassName}`}
                                        >
                                            <Icon
                                                className={`h-4 w-4 ${meta.iconClassName}`}
                                            />
                                        </div>

                                        <div className="min-w-0">
                                            <AppBadge className={meta.badgeClassName}>
                                                {meta.label}
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
                                        Ver
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