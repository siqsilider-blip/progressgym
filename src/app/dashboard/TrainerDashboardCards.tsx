import { Activity, UserCheck, Users } from 'lucide-react'
import type { TrainerDashboardStats } from './getTrainerDashboardStats'

export default function TrainerDashboardCards({
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
            desktopHelper: 'Prioridades por revisar',
            icon: Activity,
            valueColor: riskCount > 0 ? 'text-amber-800 dark:text-amber-400' : 'text-foreground',
            iconColor: riskCount > 0 ? 'bg-amber-500/12 text-amber-800 dark:text-amber-400' : 'bg-muted text-muted-foreground',
            surface: riskCount > 0 ? 'border-amber-500/25 bg-amber-500/[0.06]' : 'border-border bg-card',
        },
        {
            label: 'Activos',
            desktopLabel: 'Alumnos activos',
            value: stats.activeStudents,
            helper: 'últimos 7 días',
            desktopHelper: 'Registraron actividad en los últimos 7 días',
            icon: UserCheck,
            valueColor: 'text-emerald-800 dark:text-emerald-400',
            iconColor: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-400',
            surface: 'border-emerald-500/20 bg-emerald-500/[0.06]',
        },
        {
            label: 'Alumnos',
            desktopLabel: 'Total de alumnos',
            value: stats.totalStudents,
            helper: `${stats.studentsWithRoutine} con programa`,
            desktopHelper: `${stats.studentsWithRoutine} con programa asignado`,
            icon: Users,
            valueColor: 'text-foreground',
            iconColor: 'bg-primary/12 text-primary',
            surface: 'border-border bg-primary/[0.06]',
        },
    ]

    return (
        <dl className="grid grid-cols-3 gap-2 lg:gap-0 lg:border-y lg:border-border">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <div
                        key={card.label}
                        className={`min-w-0 rounded-xl border p-3 ${card.surface} lg:rounded-none lg:border-0 lg:border-border lg:bg-transparent lg:px-5 lg:py-3.5 lg:first:pl-0 lg:[&:not(:first-child)]:border-l`}
                    >
                        <dt className="flex items-center justify-between gap-1 text-[10px] font-medium text-muted-foreground sm:text-xs lg:font-semibold lg:text-foreground">
                            <span className="truncate lg:hidden">{card.label}</span>
                            <span className="hidden lg:inline">{card.desktopLabel ?? card.label}</span>
                            <span className={`rounded-lg p-1.5 lg:hidden ${card.iconColor}`}>
                                <Icon className="h-3 w-3" aria-hidden="true" />
                            </span>
                        </dt>
                        <dd className={`mt-1 text-xl font-black tracking-tight sm:text-2xl ${card.valueColor} lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-4xl lg:font-normal ${card.label === 'Pendientes' && riskCount > 0 ? 'lg:text-brand-soft dark:lg:text-brand-soft' : 'lg:text-foreground dark:lg:text-foreground'}`}>
                            {card.value}
                        </dd>
                        <dd className="mt-0.5 text-[9px] text-muted-foreground sm:text-[10px] lg:text-xs">
                            <span className="block truncate lg:hidden">{card.helper}</span>
                            <span className="hidden lg:inline">{card.desktopHelper}</span>
                        </dd>
                    </div>
                )
            })}
        </dl>
    )
}
