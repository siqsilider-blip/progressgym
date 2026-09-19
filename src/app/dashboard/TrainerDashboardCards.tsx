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
            valueColor: riskCount > 0 ? 'text-amber-400' : 'text-white',
            iconColor: riskCount > 0 ? 'text-amber-400' : 'text-white/40',
            iconBg: riskCount > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)',
            glow: riskCount > 0 ? 'rgba(245,158,11,0.06)' : 'transparent',
            border: riskCount > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)',
        },
        {
            label: 'Activos',
            value: stats.activeStudents,
            helper: 'últimos 7 días',
            icon: UserCheck,
            valueColor: 'text-emerald-400',
            iconColor: 'text-emerald-400',
            iconBg: 'rgba(16,185,129,0.12)',
            glow: 'rgba(16,185,129,0.06)',
            border: 'rgba(16,185,129,0.15)',
        },
        {
            label: 'Alumnos',
            value: stats.totalStudents,
            helper: `${stats.studentsWithRoutine} con programa`,
            icon: Users,
            valueColor: 'text-white',
            iconColor: 'text-violet-400',
            iconBg: 'rgba(124,58,237,0.12)',
            glow: 'rgba(124,58,237,0.06)',
            border: 'rgba(255,255,255,0.07)',
        },
    ]

    return (
        <div className="grid grid-cols-3 gap-2">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <div
                        key={card.label}
                        className="min-w-0 rounded-xl border p-3 transition"
                        style={{
                            background: card.glow,
                            borderColor: card.border,
                        }}
                    >
                        <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-[10px] font-medium text-white/40 sm:text-xs">
                                {card.label}
                            </p>
                            <div className="rounded-lg p-1.5" style={{ background: card.iconBg }}>
                                <Icon className={`h-3 w-3 ${card.iconColor}`} />
                            </div>
                        </div>
                        <p className={`mt-1 text-xl font-black tracking-tight sm:text-2xl ${card.valueColor}`}>
                            {card.value}
                        </p>
                        <p className="mt-0.5 truncate text-[9px] text-white/25 sm:text-[10px]">
                            {card.helper}
                        </p>
                    </div>
                )
            })}
        </div>
    )
}
