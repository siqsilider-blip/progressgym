import Link from 'next/link'
import { ClipboardList, MessageSquare, Users, Video } from 'lucide-react'
import TrainerDashboardCards from './TrainerDashboardCards'
import AtRiskStudentsCard from './AtRiskStudentsCard'
import { getTrainerDashboardStats } from './getTrainerDashboardStats'
import { getTrainerAlerts } from './getTrainerAlerts'
import { getRecentWorkoutActivity } from './getRecentWorkoutActivity'
import RecentWorkoutActivityCard from './RecentWorkoutActivityCard'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import type { WeightUnit } from '@/lib/weight'
import TrainerPageShell from '@/components/dashboard/TrainerPageShell'

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
        <TrainerPageShell className="space-y-3 md:space-y-4">
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
                    className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary"
                >
                    + Nuevo
                </Link>
            </section>

            <nav className="grid grid-cols-4 gap-2" aria-label="Accesos rápidos">
                {[
                    { href: '/dashboard/students', icon: Users, label: 'Alumnos', color: 'text-primary' },
                    { href: '/dashboard/routines', icon: ClipboardList, label: 'Rutinas', color: 'text-primary' },
                    { href: '/dashboard/messages', icon: MessageSquare, label: 'Mensajes', color: 'text-amber-400' },
                    { href: '/dashboard/technique-videos', icon: Video, label: 'Videos', color: 'text-primary' },
                ].map((item) => {
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] px-1 py-2.5 text-[10px] font-semibold text-white/65 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white sm:flex-row sm:gap-1.5 sm:px-2 sm:text-xs"
                        >
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${item.color}`} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <TrainerDashboardCards stats={stats} riskCount={alerts.length} />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] xl:items-start">
                <AtRiskStudentsCard alerts={alerts} />
                <RecentWorkoutActivityCard
                    activity={recentActivity ?? []}
                    weightUnit={weightUnit}
                />
            </div>
        </TrainerPageShell>
    )
}
