import { getAppearance } from '@/lib/serverAppearance'
import { AlertTriangle, Camera, ChevronDown, CircleStop, ClipboardX, Flag, HeartPulse, ListChecks, UserMinus, UserX } from 'lucide-react'
import AppBadge from '@/components/ui/app-badge'
import type { TrainerAlert } from './getTrainerAlerts'
import FollowUpActions from './FollowUpActions'

function getRiskMeta(alert: TrainerAlert, isLight: boolean) {
    const { type } = alert

    if (type === 'no_routine' && alert.stage === 'ready_for_program') {
        return {
            label: 'Ficha lista',
            badgeClassName: isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 text-emerald-300',
            icon: ListChecks,
            iconClassName: 'text-emerald-500',
            iconBgClassName: 'bg-emerald-500/10',
            cardClassName: isLight ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-500/20 bg-emerald-500/5',
        }
    }

    if (type === 'no_routine' && alert.stage === 'onboarding_pending') {
        return {
            label: 'Ficha pendiente',
            badgeClassName: isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/10 text-amber-300',
            icon: ClipboardX,
            iconClassName: 'text-amber-500',
            iconBgClassName: 'bg-amber-500/10',
            cardClassName: isLight ? 'border-amber-200 bg-amber-50' : 'border-amber-500/20 bg-amber-500/5',
        }
    }

    if (type === 'no_routine' && alert.stage === 'access_pending') {
        return {
            label: 'Acceso pendiente',
            badgeClassName: isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-500/10 text-sky-300',
            icon: UserX,
            iconClassName: 'text-sky-500',
            iconBgClassName: 'bg-sky-500/10',
            cardClassName: isLight ? 'border-sky-200 bg-sky-50' : 'border-sky-500/20 bg-sky-500/5',
        }
    }

    switch (type) {
        case 'missing_checkin':
            return {
                label: 'Falta control',
                badgeClassName: isLight
                    ? 'bg-primary/10 text-primary'
                    : 'bg-primary/10 text-brand-soft',
                icon: ClipboardX,
                iconClassName: 'text-brand-soft',
                iconBgClassName: 'bg-primary/10',
                cardClassName: isLight
                    ? 'border-primary bg-primary/10'
                    : 'border-primary/20 bg-primary/5',
            }
        case 'progress_photo_due':
            return {
                label: 'Fotos pendientes',
                badgeClassName: isLight
                    ? 'bg-cyan-100 text-cyan-700'
                    : 'bg-cyan-500/10 text-cyan-300',
                icon: Camera,
                iconClassName: 'text-cyan-500',
                iconBgClassName: 'bg-cyan-500/10',
                cardClassName: isLight
                    ? 'border-cyan-200 bg-cyan-50'
                    : 'border-cyan-500/20 bg-cyan-500/5',
            }
        case 'weekly_checkin':
            return {
                label: 'Check-in',
                badgeClassName: isLight
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-orange-500/10 text-orange-300',
                icon: HeartPulse,
                iconClassName: 'text-orange-500',
                iconBgClassName: 'bg-orange-500/10',
                cardClassName: isLight
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-orange-500/20 bg-orange-500/5',
            }
        case 'workout_pain':
            return {
                label: 'Molestia',
                badgeClassName: isLight ? 'bg-red-100 text-red-700' : 'bg-red-500/10 text-red-300',
                icon: HeartPulse,
                iconClassName: 'text-red-500',
                iconBgClassName: 'bg-red-500/10',
                cardClassName: isLight ? 'border-red-200 bg-red-50' : 'border-red-500/20 bg-red-500/5',
            }
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
                    ? 'bg-primary/10 text-primary'
                    : 'bg-primary/10 text-brand-soft',
                icon: CircleStop,
                iconClassName: 'text-brand-soft',
                iconBgClassName: 'bg-primary/10',
                cardClassName: isLight
                    ? 'border-primary bg-primary/10'
                    : 'border-primary/20 bg-primary/5',
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
    const isLight = await getAppearance() === 'light'

    const atRiskAlerts = alerts.slice(0, 3)
    const remainingAlerts = alerts.slice(3)

    function renderAlert(alert: TrainerAlert) {
        const meta = getRiskMeta(alert, isLight)
        const Icon = meta.icon
        const prefix = `${alert.studentName} `
        const hasNamePrefix = alert.message.startsWith(prefix)

        return (
            <li
                key={`${alert.type}-${alert.studentId}`}
                className={`rounded-xl border p-3 ${meta.cardClassName} lg:rounded-none lg:border-0 lg:border-b lg:border-border lg:bg-transparent lg:px-0 lg:py-3.5`}
            >
                <div className="flex min-w-0 items-start gap-2.5 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-3">
                    <div className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${meta.iconBgClassName} lg:mt-0 lg:rounded-full lg:p-2 ${alert.type === 'workout_pain' ? '' : 'lg:bg-primary/10'}`}>
                        <Icon
                            className={`size-3.5 ${meta.iconClassName} ${alert.type === 'workout_pain' ? '' : 'lg:text-brand-soft'}`}
                            aria-hidden="true"
                        />
                    </div>

                    <div className="min-w-0 lg:contents">
                        <div className="min-w-0">
                            <div className="lg:hidden">
                                <AppBadge className={meta.badgeClassName}>
                                    {meta.label}
                                </AppBadge>
                            </div>

                            <p className="hidden text-sm font-semibold text-foreground [overflow-wrap:anywhere] lg:block">
                                {alert.studentName}
                            </p>

                            <p className="mt-1.5 text-xs leading-5 text-card-foreground [overflow-wrap:anywhere] lg:mt-0.5 lg:text-muted-foreground lg:first-letter:uppercase">
                                {hasNamePrefix && <span className="lg:hidden">{prefix}</span>}
                                {hasNamePrefix ? alert.message.slice(prefix.length) : alert.message}
                            </p>
                        </div>

                        <FollowUpActions alert={alert} />
                    </div>
                </div>
            </li>
        )
    }

    return (
        <section aria-labelledby="trainer-priorities-heading" className="min-w-0 rounded-2xl border border-border bg-card p-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
            <div className="mb-3 flex min-h-11 items-center gap-2.5 lg:mb-0 lg:border-b lg:border-border lg:pb-2">
                <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500 lg:hidden">
                    <ListChecks className="size-4" aria-hidden="true" />
                </div>

                <div>
                    <h2 id="trainer-priorities-heading" className="text-sm font-semibold text-foreground lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-[1.75rem] lg:leading-tight lg:font-normal lg:tracking-tight">
                        Prioridades de hoy
                    </h2>

                    <p className="text-[11px] text-muted-foreground lg:hidden">
                        Solo lo que requiere atención
                    </p>
                </div>
            </div>

            {atRiskAlerts.length === 0 ? (
                <div
                    className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground lg:rounded-none lg:border-0 lg:border-b lg:border-solid lg:bg-transparent lg:px-0 lg:text-sm"
                >
                    No hay acciones pendientes por ahora.
                </div>
            ) : (
                <ul className="space-y-2 lg:space-y-0">
                    {atRiskAlerts.map(renderAlert)}
                </ul>
            )}

            {remainingAlerts.length > 0 && (
                <details className="group mt-2">
                    <summary className="flex min-h-9 cursor-pointer list-none items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-center text-[11px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:justify-start lg:text-xs [&::-webkit-details-marker]:hidden">
                        <span className="group-open:hidden">
                            Ver las {alerts.length} prioridades
                        </span>
                        <span className="hidden group-open:inline">Ver menos</span>
                        <ChevronDown className="size-3 shrink-0 group-open:rotate-180" aria-hidden="true" />
                    </summary>

                    <ul className="mt-2 space-y-2 lg:mt-0 lg:space-y-0">
                        {remainingAlerts.map(renderAlert)}
                    </ul>
                </details>
            )}
        </section>
    )
}
