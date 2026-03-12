import Link from 'next/link'
import type { TrainerAlert } from './getTrainerAlerts'

function getAlertStyle(type: TrainerAlert['type']) {
    switch (type) {
        case 'inactive':
            return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'
        case 'no_routine':
            return 'border-red-500/30 bg-red-500/10 text-red-300'
        case 'new_student':
            return 'border-blue-500/30 bg-blue-500/10 text-blue-300'
        default:
            return 'border-zinc-700 bg-zinc-800 text-zinc-200'
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

export default function TrainerAlertsCard({
    alerts,
}: {
    alerts: TrainerAlert[]
}) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">Alertas</h2>

            {alerts.length === 0 ? (
                <p className="text-sm text-zinc-400">
                    No hay alertas importantes por ahora.
                </p>
            ) : (
                <div className="space-y-3">
                    {alerts.slice(0, 6).map((alert) => (
                        <div
                            key={`${alert.type}-${alert.studentId}`}
                            className={`rounded-xl border p-4 ${getAlertStyle(alert.type)}`}
                        >
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                                        {getAlertLabel(alert.type)}
                                    </p>
                                    <p className="mt-1 text-sm">{alert.message}</p>
                                </div>

                                <Link
                                    href={`/dashboard/students/${alert.studentId}`}
                                    className="text-sm font-medium underline underline-offset-4"
                                >
                                    Ver alumno
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}