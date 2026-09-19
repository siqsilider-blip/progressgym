import Link from 'next/link'
import { ClipboardList, MessageSquare, Users, Zap } from 'lucide-react'
import TrainerDashboardCards from './TrainerDashboardCards'
import AtRiskStudentsCard from './AtRiskStudentsCard'
import { getTrainerDashboardStats } from './getTrainerDashboardStats'
import { getTrainerAlerts } from './getTrainerAlerts'
import { getRecentWorkoutActivity } from './getRecentWorkoutActivity'
import RecentWorkoutActivityCard from './RecentWorkoutActivityCard'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import type { WeightUnit } from '@/lib/weight'

export default async function DashboardPage() {
    const [
        stats,
        alerts,
        trainerProfile,
        recentActivity,
    ] = await Promise.all([
        getTrainerDashboardStats(),
        getTrainerAlerts(),
        getTrainerProfile(),
        getRecentWorkoutActivity(),
    ])

    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit

    return (
        <div className="mx-auto max-w-6xl space-y-3 p-4 pb-24 md:space-y-4 md:p-6">
            <section className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">
                        Inicio
                    </h1>
                    <p className="mt-0.5 text-xs text-white/35">
                        {alerts.length > 0
                            ? `${alerts.length} ${alerts.length === 1 ? 'prioridad pendiente' : 'prioridades pendientes'}`
                            : 'Todo al día'}
                    </p>
                </div>

                <Link
                    href="/dashboard/new"
                    className="shrink-0 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
                >
                    + Nuevo
                </Link>
            </section>

            <nav className="grid grid-cols-4 gap-2" aria-label="Accesos rápidos">
                {[
                    { href: '/dashboard/train', icon: Zap, label: 'Entrenar', color: 'text-emerald-400' },
                    { href: '/dashboard/students', icon: Users, label: 'Alumnos', color: 'text-violet-400' },
                    { href: '/dashboard/routines', icon: ClipboardList, label: 'Rutinas', color: 'text-indigo-400' },
                    { href: '/dashboard/contacts', icon: MessageSquare, label: 'Contactos', color: 'text-amber-400' },
                ].map((item) => {
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2 py-2.5 text-xs font-semibold text-white/65 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
                        >
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${item.color}`} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <TrainerDashboardCards stats={stats} riskCount={alerts.length} />

            <AtRiskStudentsCard alerts={alerts} />

            <RecentWorkoutActivityCard
                activity={recentActivity ?? []}
                weightUnit={weightUnit}
            />
        </div>
    )
}
