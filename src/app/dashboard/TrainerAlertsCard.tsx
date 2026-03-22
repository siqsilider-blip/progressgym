import { cookies } from 'next/headers'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, UserPlus, UserX } from 'lucide-react'
import type { TrainerAlert } from './getTrainerAlerts'

function getAlertStyle(type: TrainerAlert['type'], isLight: boolean) {
    switch (type) {
        case 'inactive':
            return {
                card: isLight
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-amber-500/20 bg-amber-500/5',
                iconWrap: 'bg-amber-500/10 text-amber-500',
                badge: isLight
                    ? 'border-amber-200 bg-amber-100 text-amber-700'
                    : 'border-amber-500/20 bg-amber-500/10 text-amber-300',
            }
        case 'no_routine':
            return {
                card: isLight
                    ? 'border-rose-200 bg-rose-50'
                    : 'border-rose-500/20 bg-rose-500/5',
                iconWrap: 'bg-rose-500/10 text-rose-500',
                badge: isLight
                    ? 'border-rose-200 bg-rose-100 text-rose-700'
                    : 'border-rose-500/20 bg-rose-500/10 text-rose-300',
            }
        case 'new_student':
            return {
                card: isLight
                    ? 'border-sky-200 bg-sky-50'
                    : 'border-sky-500/20 bg-sky-500/5',
                iconWrap: 'bg-sky-500/10 text-sky-500',
                badge: isLight
                    ? 'border-sky-200 bg-sky-100 text-sky-700'
                    : 'border-sky-500/20 bg-sky-500/10 text-sky-300',
            }
        default:
            return {
                card: isLight
                    ? 'border-zinc-200 bg-white'
                    : 'border-zinc-800 bg-zinc-950/60',
                iconWrap: isLight
                    ? 'bg-zinc-100 text-zinc-600'
                    : 'bg-zinc-800 text-zinc-300',
                badge: isLight
                    ? 'border-zinc-200 bg-zinc-100 text-zinc-700'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300',
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
        <div
            className={`rounded-3xl border p-6 ${isLight
                    ? 'border-zinc-200 bg-white'
                    : 'border-zinc-800 bg-zinc-900/60'
                }`}
        >
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
                    <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                    <h2
                        className={`text-lg font-semibold ${isLight ? 'text-zinc-900' : 'text-zinc-100'
                            }`}
                    >
                        Alertas
                    </h2>

                    <p
                        className={`text-sm ${isLight ? 'text-zinc-600' : 'text-zinc-400'
                            }`}
                    >
                        Situaciones que conviene revisar cuanto antes
                    </p>
                </div>
            </div>

            {alerts.length === 0 ? (
                <div
                    className={`rounded-2xl border border-dashed p-5 text-sm ${isLight
                            ? 'border-zinc-300 bg-zinc-50 text-zinc-600'
                            : 'border-zinc-700 bg-zinc-950/50 text-zinc-400'
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
                                            <span
                                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${style.badge}`}
                                            >
                                                {getAlertLabel(alert.type)}
                                            </span>

                                            <p
                                                className={`mt-3 text-sm leading-6 ${isLight
                                                        ? 'text-zinc-800'
                                                        : 'text-zinc-100'
                                                    }`}
                                            >
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
        </div>
    )
}