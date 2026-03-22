import Link from 'next/link'
import { AlertTriangle, ArrowRight, UserMinus, UserX } from 'lucide-react'
import type { TrainerAlert } from './getTrainerAlerts'

function getRiskMeta(type: TrainerAlert['type']) {
    switch (type) {
        case 'inactive':
            return {
                label: 'Inactivo',
                icon: AlertTriangle,
                badgeClassName:
                    'border-amber-500/20 bg-amber-500/10 text-amber-300',
                iconClassName: 'text-amber-400',
                iconBgClassName: 'bg-amber-500/10',
            }
        case 'no_routine':
            return {
                label: 'Sin rutina',
                icon: UserX,
                badgeClassName:
                    'border-rose-500/20 bg-rose-500/10 text-rose-300',
                iconClassName: 'text-rose-400',
                iconBgClassName: 'bg-rose-500/10',
            }
        case 'new_student':
            return {
                label: 'Sin registros',
                icon: UserMinus,
                badgeClassName:
                    'border-sky-500/20 bg-sky-500/10 text-sky-300',
                iconClassName: 'text-sky-400',
                iconBgClassName: 'bg-sky-500/10',
            }
        default:
            return {
                label: 'Alerta',
                icon: AlertTriangle,
                badgeClassName: 'border-zinc-700 bg-zinc-800 text-zinc-300',
                iconClassName: 'text-zinc-300',
                iconBgClassName: 'bg-zinc-800',
            }
    }
}

export default function AtRiskStudentsCard({
    alerts,
}: {
    alerts: TrainerAlert[]
}) {
    const atRiskAlerts = alerts.slice(0, 4)

    return (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-white">
                        Alumnos en riesgo
                    </h2>
                    <p className="text-sm text-zinc-400">
                        Casos que conviene revisar primero
                    </p>
                </div>
            </div>

            {atRiskAlerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 p-5 text-sm text-zinc-400">
                    No hay alumnos en riesgo por ahora.
                </div>
            ) : (
                <div className="space-y-3">
                    {atRiskAlerts.map((alert) => {
                        const meta = getRiskMeta(alert.type)
                        const Icon = meta.icon

                        return (
                            <div
                                key={`${alert.type}-${alert.studentId}`}
                                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/80"
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
                                            <span
                                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.badgeClassName}`}
                                            >
                                                {meta.label}
                                            </span>

                                            <p className="mt-3 text-sm leading-6 text-zinc-100">
                                                {alert.message}
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        href={`/dashboard/students/${alert.studentId}`}
                                        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
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
        </div>
    )
}