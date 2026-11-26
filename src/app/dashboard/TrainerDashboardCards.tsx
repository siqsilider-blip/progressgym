import { Activity, UserCheck, Users } from 'lucide-react'
import type { TrainerDashboardStats } from './getTrainerDashboardStats'

export default async function TrainerDashboardCards({
    stats,
    riskCount,
}: {
    stats: TrainerDashboardStats
    riskCount: number
}) {
    const cards = [
        {
            label: 'Pendientes',
            value: riskCount,
            helper: riskCount === 1 ? 'acción' : 'acciones',
            icon: Activity,
            valueColor: riskCount > 0 ? 'text-amber-800 dark:text-amber-400' : 'text-foreground',
            iconColor: riskCount > 0 ? 'bg-amber-500/12 text-amber-800 dark:text-amber-400' : 'bg-muted text-muted-foreground',
            surface: riskCount > 0 ? 'border-amber-500/25 bg-amber-500/[0.06]' : 'border-border bg-card',
        },
        {
            label: 'Activos',
            value: stats.activeStudents,
            helper: 'últimos 7 días',
            icon: UserCheck,
            valueColor: 'text-emerald-800 dark:text-emerald-400',
            iconColor: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-400',
            surface: 'border-emerald-500/20 bg-emerald-500/[0.06]',
        },
        {
            label: 'Alumnos',
            value: stats.totalStudents,
            helper: `${stats.studentsWithRoutine} con programa`,
            icon: Users,
            valueColor: 'text-foreground',
            iconColor: 'bg-primary/12 text-primary',
            surface: 'border-border bg-primary/[0.06]',
        },
    ]

    return (
        <div className="grid grid-cols-3 gap-2">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <div
                        key={card.label}
                        className={`min-w-0 rounded-xl border p-3 transition ${card.surface}`}
                    >
                        <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-[10px] font-medium text-muted-foreground sm:text-xs">
                                {card.label}
                            </p>
                            <div className={`rounded-lg p-1.5 ${card.iconColor}`}>
                                <Icon className="h-3 w-3" />
                            </div>
                        </div>
                        <p className={`mt-1 text-xl font-black tracking-tight sm:text-2xl ${card.valueColor}`}>
                            {card.value}
                        </p>
                        <p className="mt-0.5 truncate text-[9px] text-muted-foreground sm:text-[10px]">
                            {card.helper}
                        </p>
                    </div>
                )
            })}
        </div>
    )
}
