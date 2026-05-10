import { Activity, ClipboardList, UserCheck, Users } from 'lucide-react'
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
            label: 'Alumnos',
            value: stats.totalStudents,
            helper: 'Total registrados',
            icon: Users,
            valueColor: 'text-white',
            iconColor: 'text-white/40',
            iconBg: 'rgba(255,255,255,0.06)',
            glow: 'rgba(124,58,237,0.08)',
            border: 'rgba(255,255,255,0.07)',
        },
        {
            label: 'En riesgo',
            value: riskCount,
            helper: 'Requieren atención',
            icon: Activity,
            valueColor: riskCount > 0 ? 'text-amber-400' : 'text-white',
            iconColor: riskCount > 0 ? 'text-amber-400' : 'text-white/40',
            iconBg: riskCount > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)',
            glow: riskCount > 0 ? 'rgba(245,158,11,0.06)' : 'transparent',
            border: riskCount > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)',
        },
        {
            label: 'Con rutina',
            value: stats.studentsWithRoutine,
            helper: 'Asignados',
            icon: ClipboardList,
            valueColor: 'text-white',
            iconColor: 'text-indigo-400',
            iconBg: 'rgba(99,102,241,0.12)',
            glow: 'transparent',
            border: 'rgba(255,255,255,0.07)',
        },
        {
            label: 'Activos 7 días',
            value: stats.activeStudents,
            helper: 'Entrenaron esta semana',
            icon: UserCheck,
            valueColor: 'text-emerald-400',
            iconColor: 'text-emerald-400',
            iconBg: 'rgba(16,185,129,0.12)',
            glow: 'rgba(16,185,129,0.06)',
            border: 'rgba(16,185,129,0.15)',
        },
    ]

    return (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <div
                        key={card.label}
                        className="rounded-2xl border p-4 transition"
                        style={{
                            background: card.glow,
                            borderColor: card.border,
                        }}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-white/40">{card.label}</p>
                            <div className="rounded-xl p-2" style={{ background: card.iconBg }}>
                                <Icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                            </div>
                        </div>
                        <p className={`mt-2 text-3xl font-black tracking-tight ${card.valueColor}`}>
                            {card.value}
                        </p>
                        <p className="mt-1 text-[10px] text-white/25">{card.helper}</p>
                    </div>
                )
            })}
        </div>
    )
}