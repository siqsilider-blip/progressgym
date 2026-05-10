import Link from 'next/link'
import { cookies } from 'next/headers'
import { ClipboardList, MessageSquare, Users, Zap, AlertTriangle, Trophy, TrendingUp } from 'lucide-react'
import TrainerAlertsCard from './TrainerAlertsCard'
import TrainerDashboardCards from './TrainerDashboardCards'
import TrainerProgressRankingCard from './TrainerProgressRankingCard'
import TrainerStudentLeaderboardCard from './TrainerStudentLeaderboardCard'
import WeeklyActivityChart from './WeeklyActivityChart'
import AtRiskStudentsCard from './AtRiskStudentsCard'
import { getTrainerDashboardStats } from './getTrainerDashboardStats'
import { getTrainerAlerts } from './getTrainerAlerts'
import { getTrainerProgressRanking } from './getTrainerProgressRanking'
import { getTrainerStudentLeaderboard } from './getTrainerStudentLeaderboard'
import { getRecentWorkoutActivity } from './getRecentWorkoutActivity'
import { getWeeklyActivity } from './getWeeklyActivity'
import RecentWorkoutActivityCard from './RecentWorkoutActivityCard'
import GlobalPRsCard from '@/components/GlobalPRsCard'
import { getGlobalPRs } from '@/lib/getGlobalPRs'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { formatWeight, type WeightUnit } from '@/lib/weight'

export default async function DashboardPage() {
    const cookieStore = await cookies()
    const theme = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'

    const [
        stats,
        alerts,
        progressRanking,
        studentLeaderboard,
        globalPRs,
        trainerProfile,
        recentActivity,
        weeklyActivity,
    ] = await Promise.all([
        getTrainerDashboardStats(),
        getTrainerAlerts(),
        getTrainerProgressRanking(),
        getTrainerStudentLeaderboard(),
        getGlobalPRs(),
        getTrainerProfile(),
        getRecentWorkoutActivity(),
        getWeeklyActivity(),
    ])

    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit
    const featuredStudent = studentLeaderboard?.[0]

    return (
        <div className="space-y-4 p-4 pb-24 md:space-y-5 md:p-8">

            {/* ── Header ── */}
            <section className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">
                        Progrezzia
                    </p>
                    <h1 className="mt-0.5 text-2xl font-black tracking-tight text-white md:text-3xl">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-white/40">
                        Resumen del día y prioridades
                    </p>
                </div>

                <Link
                    href="/dashboard/new"
                    className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                >
                    + Alumno
                </Link>
            </section>

            {/* ── Quick actions ── */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {[
                    { href: '/dashboard/train', icon: Zap, label: 'Entrenar', color: 'text-emerald-400' },
                    { href: '/dashboard/students', icon: Users, label: 'Alumnos', color: 'text-violet-400' },
                    { href: '/dashboard/routines', icon: ClipboardList, label: 'Rutinas', color: 'text-indigo-400' },
                    { href: '/dashboard/contacts', icon: MessageSquare, label: 'Contactos', color: 'text-white/40' },
                ].map((item) => {
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium text-white/70 transition hover:text-white hover:border-white/15 hover:bg-white/[0.06]"
                            style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
                        >
                            <Icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                            {item.label}
                        </Link>
                    )
                })}
            </div>

            {/* ── Headline stats ── */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Alumnos activos', value: stats.activeStudents, icon: Users, color: 'text-violet-400', glow: 'rgba(124,58,237,0.15)' },
                    { label: 'Alertas', value: alerts.length, icon: AlertTriangle, color: 'text-amber-400', glow: 'rgba(245,158,11,0.12)' },
                    { label: 'PRs', value: stats.totalPRs, icon: Trophy, color: 'text-emerald-400', glow: 'rgba(16,185,129,0.12)' },
                ].map((s) => {
                    const Icon = s.icon
                    return (
                        <div
                            key={s.label}
                            className="rounded-2xl border p-3 text-center"
                            style={{ borderColor: 'rgba(255,255,255,0.07)', background: s.glow }}
                        >
                            <Icon className={`mx-auto h-4 w-4 ${s.color} mb-1.5`} />
                            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                            <p className="mt-0.5 text-[9px] font-medium text-white/30">{s.label}</p>
                        </div>
                    )
                })}
            </div>

            {/* ── Métricas ── */}
            <TrainerDashboardCards stats={stats} riskCount={alerts.length} />

            {/* ── Alumnos en riesgo ── */}
            <AtRiskStudentsCard alerts={alerts} />

            {/* ── Actividad reciente + Mejor progreso ── */}
            <section className="grid gap-4 xl:grid-cols-12">
                <div className="order-1 xl:col-span-8">
                    <RecentWorkoutActivityCard
                        activity={recentActivity ?? []}
                        weightUnit={weightUnit}
                        theme={theme}
                    />
                </div>

                <div className="order-2 xl:col-span-4">
                    <div
                        className="rounded-2xl border p-5"
                        style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                    >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                            Mejor progreso del mes
                        </p>

                        {featuredStudent ? (
                            <>
                                <h2 className="mt-2 text-lg font-black text-white">
                                    {featuredStudent.studentName}
                                </h2>
                                <p className="mt-0.5 text-xs text-white/40">
                                    {featuredStudent.bestExerciseName || 'Sin ejercicio destacado'}
                                </p>
                                <p className="mt-4 text-3xl font-black text-emerald-400">
                                    +{formatWeight(featuredStudent.progressKg, weightUnit)}
                                </p>
                                <p className="mt-1 text-xs text-white/30">
                                    Mayor avance en el ranking actual
                                </p>
                                <div className="mt-4 flex gap-2">
                                    <Link
                                        href={`/dashboard/students/${featuredStudent.studentId}`}
                                        className="flex-1 rounded-xl border px-3 py-2.5 text-center text-xs font-semibold text-white/60 transition hover:text-white hover:bg-white/[0.06]"
                                        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                                    >
                                        Ver perfil
                                    </Link>
                                    <Link
                                        href={`/dashboard/students/${featuredStudent.studentId}/train`}
                                        className="flex-1 rounded-xl px-3 py-2.5 text-center text-xs font-bold text-white transition hover:opacity-90"
                                        style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                                    >
                                        Entrenar
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <p className="mt-3 text-sm text-white/30">
                                Todavía no hay datos suficientes.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* ── xl only ── */}
            <div className="hidden xl:block">
                <TrainerAlertsCard alerts={alerts ?? []} />
            </div>

            <section className="hidden gap-5 xl:grid xl:grid-cols-12">
                <div className="xl:col-span-7">
                    <TrainerProgressRankingCard ranking={progressRanking ?? []} weightUnit={weightUnit} />
                </div>
                <div className="xl:col-span-5">
                    <TrainerStudentLeaderboardCard ranking={studentLeaderboard ?? []} weightUnit={weightUnit} />
                </div>
            </section>

            <div className="hidden xl:block">
                <GlobalPRsCard prs={globalPRs ?? []} weightUnit={weightUnit} />
            </div>

            <section className="hidden gap-5 xl:grid xl:grid-cols-2">
                <WeeklyActivityChart data={weeklyActivity ?? []} />

                <div
                    className="rounded-2xl border p-5"
                    style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                        Resumen del panel
                    </p>
                    <h2 className="mt-2 text-lg font-black text-white">Lo importante hoy</h2>

                    <div className="mt-4 space-y-2.5">
                        {[
                            {
                                label: 'Alertas activas',
                                value: alerts.length === 0 ? 'No hay alertas urgentes.' : `${alerts.length} alumno${alerts.length === 1 ? '' : 's'} para revisar.`,
                            },
                            {
                                label: 'Actividad reciente',
                                value: recentActivity.length === 0 ? 'Sin entrenamientos recientes.' : `${recentActivity.length} registro${recentActivity.length === 1 ? '' : 's'} cargado${recentActivity.length === 1 ? '' : 's'}.`,
                            },
                            {
                                label: 'PRs detectados',
                                value: stats.totalPRs === 0 ? 'Sin PRs detectados todavía.' : `${stats.totalPRs} PR${stats.totalPRs === 1 ? '' : 's'} acumulado${stats.totalPRs === 1 ? '' : 's'}.`,
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="rounded-xl border p-3.5"
                                style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}
                            >
                                <p className="text-xs font-bold text-white/60">{item.label}</p>
                                <p className="mt-1 text-xs text-white/35">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}