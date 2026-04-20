import { cookies } from 'next/headers'
import {
    Activity,
    ClipboardList,
    UserCheck,
    Users,
} from 'lucide-react'
import AppCard from '@/components/ui/app-card'
import type { TrainerDashboardStats } from './getTrainerDashboardStats'

export default async function TrainerDashboardCards({
    stats,
    riskCount,
}: {
    stats: TrainerDashboardStats
    riskCount: number
}) {
    const cookieStore = await cookies()
    const theme = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'
    const isLight = theme === 'light'

    const cards = [
        {
            label: 'Alumnos',
            value: stats.totalStudents,
            helper: 'Total registrados',
            icon: Users,
            valueClassName: 'text-foreground',
            iconClassName: isLight ? 'text-zinc-700' : 'text-zinc-300',
            iconBgClassName: isLight ? 'bg-muted' : 'bg-muted/80',
        },
        {
            label: 'En riesgo',
            value: riskCount,
            helper: 'Requieren atención',
            icon: Activity,
            valueClassName: riskCount > 0 ? 'text-amber-500' : 'text-foreground',
            iconClassName: riskCount > 0 ? 'text-amber-500' : 'text-zinc-400',
            iconBgClassName: riskCount > 0
                ? (isLight ? 'bg-amber-50' : 'bg-amber-500/10')
                : (isLight ? 'bg-muted' : 'bg-muted/80'),
        },
        {
            label: 'Con rutina',
            value: stats.studentsWithRoutine,
            helper: 'Asignados',
            icon: ClipboardList,
            valueClassName: 'text-foreground',
            iconClassName: 'text-cyan-500',
            iconBgClassName: isLight ? 'bg-cyan-50' : 'bg-cyan-500/10',
        },
        {
            label: 'Activos 7 días',
            value: stats.activeStudents,
            helper: 'Entrenaron esta semana',
            icon: UserCheck,
            valueClassName: 'text-emerald-500',
            iconClassName: 'text-emerald-500',
            iconBgClassName: isLight ? 'bg-emerald-50' : 'bg-emerald-500/10',
        },
    ] as const

    return (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon

                return (
                    <AppCard
                        key={card.label}
                        className={`p-4 transition md:p-5 ${isLight
                                ? 'hover:border-zinc-300 hover:bg-muted/40'
                                : 'hover:border-zinc-700 hover:bg-card/90'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground md:text-sm">
                                    {card.label}
                                </p>

                                <p
                                    className={`mt-2 text-3xl font-bold tracking-tight ${card.valueClassName}`}
                                >
                                    {card.value}
                                </p>

                                <p className="mt-1 text-[11px] text-muted-foreground md:text-sm">
                                    {card.helper}
                                </p>
                            </div>

                            <div
                                className={`rounded-2xl p-2.5 md:p-3 ${card.iconBgClassName}`}
                            >
                                <Icon
                                    className={`h-4 w-4 md:h-5 md:w-5 ${card.iconClassName}`}
                                />
                            </div>
                        </div>
                    </AppCard>
                )
            })}
        </div>
    )
}