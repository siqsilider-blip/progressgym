import { Activity, AlertTriangle, Trophy, Users } from 'lucide-react'

export default function WeeklySummaryCard({
    activeStudents,
    alertsCount,
    totalPRs,
    recentWorkoutsCount,
}: {
    activeStudents: number
    alertsCount: number
    totalPRs: number
    recentWorkoutsCount: number
}) {
    const items = [
        {
            label: 'Activos',
            value: activeStudents,
            helper: 'Entrenaron en 7 días',
            icon: Users,
            iconClassName: 'text-emerald-400',
            iconBgClassName: 'bg-emerald-500/10',
            valueClassName: 'text-emerald-400',
        },
        {
            label: 'Alertas',
            value: alertsCount,
            helper: 'Pendientes de revisar',
            icon: AlertTriangle,
            iconClassName: 'text-amber-400',
            iconBgClassName: 'bg-amber-500/10',
            valueClassName: 'text-amber-400',
        },
        {
            label: 'PRs',
            value: totalPRs,
            helper: 'Detectados en total',
            icon: Trophy,
            iconClassName: 'text-indigo-400',
            iconBgClassName: 'bg-indigo-500/10',
            valueClassName: 'text-indigo-400',
        },
        {
            label: 'Actividad',
            value: recentWorkoutsCount,
            helper: 'Entrenamientos recientes',
            icon: Activity,
            iconClassName: 'text-cyan-400',
            iconBgClassName: 'bg-cyan-500/10',
            valueClassName: 'text-cyan-400',
        },
    ] as const

    return (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">
                    Resumen semanal
                </h2>
                <p className="text-sm text-zinc-400">
                    Panorama rápido del estado actual del panel
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {items.map((item) => {
                    const Icon = item.icon

                    return (
                        <div
                            key={item.label}
                            className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm text-zinc-400">
                                        {item.label}
                                    </p>
                                    <p
                                        className={`mt-2 text-2xl font-bold ${item.valueClassName}`}
                                    >
                                        {item.value}
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {item.helper}
                                    </p>
                                </div>

                                <div
                                    className={`rounded-2xl p-2.5 ${item.iconBgClassName}`}
                                >
                                    <Icon
                                        className={`h-4 w-4 ${item.iconClassName}`}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}