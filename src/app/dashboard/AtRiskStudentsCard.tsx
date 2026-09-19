import { cookies } from 'next/headers'
import Link from 'next/link'
import { AlertTriangle, CircleStop, Flag, ListChecks, UserMinus, UserX } from 'lucide-react'
import AppBadge from '@/components/ui/app-badge'
import type { TrainerAlert } from './getTrainerAlerts'
import FollowUpActions from './FollowUpActions'

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
        case 'unfinished_session':
            return {
                label: 'Sesión abierta',
                badgeClassName: isLight
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-violet-500/10 text-violet-300',
                icon: CircleStop,
                iconClassName: 'text-violet-500',
                iconBgClassName: 'bg-violet-500/10',
                cardClassName: isLight
                    ? 'border-violet-200 bg-violet-50'
                    : 'border-violet-500/20 bg-violet-500/5',
            }
        case 'program_ending':
            return {
                label: 'Programa por terminar',
                badgeClassName: isLight
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-emerald-500/10 text-emerald-300',
                icon: Flag,
                iconClassName: 'text-emerald-500',
                iconBgClassName: 'bg-emerald-500/10',
                cardClassName: isLight
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-emerald-500/20 bg-emerald-500/5',
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

    const atRiskAlerts = alerts.slice(0, 3)

    return (
        <section className="rounded-2xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="mb-3 flex items-center gap-2.5">
                <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
                    <ListChecks className="h-4 w-4" />
                </div>

                <div>
                    <h2 className="text-sm font-semibold text-card-foreground">
                        Prioridades de hoy
                    </h2>

                    <p className="text-[11px] text-muted-foreground">
                        Solo lo que requiere atención
                    </p>
                </div>
            </div>

            {atRiskAlerts.length === 0 ? (
                <div
                    className={`rounded-xl border border-dashed p-4 text-xs ${isLight
                            ? 'border-border bg-muted/50 text-muted-foreground'
                            : 'border-border bg-muted/30 text-muted-foreground'
                        }`}
                >
                    No hay acciones pendientes por ahora.
                </div>
            ) : (
                <div className="space-y-2">
                    {atRiskAlerts.map((alert) => {
                        const meta = getRiskMeta(alert.type, isLight)
                        const Icon = meta.icon

                        return (
                            <div
                                key={`${alert.type}-${alert.studentId}`}
                                className={`rounded-xl border p-3 transition ${meta.cardClassName}`}
                            >
                                <div className="flex min-w-0 items-start gap-2.5">
                                        <div
                                            className={`mt-0.5 rounded-lg p-1.5 ${meta.iconBgClassName}`}
                                        >
                                            <Icon
                                                className={`h-3.5 w-3.5 ${meta.iconClassName}`}
                                            />
                                        </div>

                                        <div className="min-w-0">
                                            <AppBadge className={meta.badgeClassName}>
                                                {meta.label}
                                            </AppBadge>

                                            <p className="mt-1.5 text-xs leading-5 text-card-foreground">
                                                {alert.message}
                                            </p>

                                            <FollowUpActions alert={alert} />
                                        </div>
                                    </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {alerts.length > atRiskAlerts.length && (
                <Link
                    href="/dashboard/students"
                    className="mt-3 block text-center text-[11px] font-medium text-white/35 transition hover:text-white/70"
                >
                    Ver las {alerts.length} prioridades
                </Link>
            )}
        </section>
    )
}
