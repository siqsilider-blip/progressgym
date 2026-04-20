import Link from 'next/link'
import { cookies } from 'next/headers'
import { ClipboardList, MessageSquare, Users, Zap } from 'lucide-react'
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
import AppCard from '@/components/ui/app-card'

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
        <div className="space-y-5 p-4 pb-24 md:space-y-6 md:p-8">

            {/* ── Header ── */}
            <section className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Resumen del día y prioridades
                    </p>
                </div>

                <Link
                    href="/dashboard/new"
                    className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                    + Agregar alumno
                </Link>
            </section>

            {/* ── Quick actions (grid 2×2 en mobile) ── */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Link
                    href="/dashboard/train"
                    className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                >
                    <Zap className="h-4 w-4 shrink-0 text-emerald-500" />
                    Entrenar
                </Link>
                <Link
                    href="/dashboard/students"
                    className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                >
                    <Users className="h-4 w-4 shrink-0 text-indigo-500" />
                    Alumnos
                </Link>
                <Link
                    href="/dashboard/routines"
                    className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                >
                    <ClipboardList className="h-4 w-4 shrink-0 text-cyan-500" />
                    Rutinas
                </Link>
                <Link
                    href="/dashboard/contacts"
                    className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                >
                    <MessageSquare className="h-4 w-4 shrink-0 text-zinc-400" />
                    Contactos
                </Link>
            </div>

            {/* ── Métricas (4 cards) ── */}
            <TrainerDashboardCards stats={stats} riskCount={alerts.length} />

            {/* ── Alumnos en riesgo (bloque protagonista) ── */}
            <AtRiskStudentsCard alerts={alerts} />

            {/* ── Actividad reciente + Mejor progreso del mes ── */}
            <section className="grid gap-5 xl:grid-cols-12">
                <div className="order-1 xl:col-span-8">
                    <RecentWorkoutActivityCard
                        activity={recentActivity ?? []}
                        weightUnit={weightUnit}
                        theme={theme}
                    />
                </div>

                <div className="order-2 xl:col-span-4">
                    <AppCard className="p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                            Mejor progreso del mes
                        </p>

                        {featuredStudent ? (
                            <>
                                <h2 className="mt-2 text-xl font-bold text-card-foreground">
                                    {featuredStudent.studentName}
                                </h2>

                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {featuredStudent.bestExerciseName || 'Sin ejercicio destacado'}
                                </p>

                                <p className="mt-4 text-3xl font-bold text-emerald-500">
                                    +{formatWeight(featuredStudent.progressKg, weightUnit)}
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground">
                                    Mayor avance en el ranking actual
                                </p>

                                <div className="mt-5 flex gap-2">
                                    <Link
                                        href={`/dashboard/students/${featuredStudent.studentId}`}
                                        className="flex-1 rounded-xl border border-border bg-secondary px-4 py-2.5 text-center text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                                    >
                                        Ver perfil
                                    </Link>

                                    <Link
                                        href={`/dashboard/students/${featuredStudent.studentId}/train`}
                                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-emerald-500"
                                    >
                                        Entrenar
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <p className="mt-3 text-sm text-muted-foreground">
                                Todavía no hay datos suficientes para mostrar un alumno destacado.
                            </p>
                        )}
                    </AppCard>
                </div>
            </section>

            {/* ── xl only ── */}
            <div className="hidden xl:block">
                <TrainerAlertsCard alerts={alerts ?? []} />
            </div>

            <section className="hidden gap-6 xl:grid xl:grid-cols-12">
                <div className="xl:col-span-7">
                    <TrainerProgressRankingCard
                        ranking={progressRanking ?? []}
                        weightUnit={weightUnit}
                    />
                </div>

                <div className="xl:col-span-5">
                    <TrainerStudentLeaderboardCard
                        ranking={studentLeaderboard ?? []}
                        weightUnit={weightUnit}
                    />
                </div>
            </section>

            <div className="hidden xl:block">
                <GlobalPRsCard prs={globalPRs ?? []} weightUnit={weightUnit} />
            </div>

            <section className="hidden gap-6 xl:grid xl:grid-cols-2">
                <WeeklyActivityChart data={weeklyActivity ?? []} />

                <AppCard className="p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                        Resumen del panel
                    </p>

                    <h2 className="mt-2 text-xl font-semibold text-card-foreground">
                        Lo importante hoy
                    </h2>

                    <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-border bg-muted/40 p-4">
                            <p className="text-sm font-medium text-card-foreground">Alertas activas</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {alerts.length === 0
                                    ? 'No hay alertas urgentes.'
                                    : `${alerts.length} alumno${alerts.length === 1 ? '' : 's'} para revisar.`}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/40 p-4">
                            <p className="text-sm font-medium text-card-foreground">Actividad reciente</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {recentActivity.length === 0
                                    ? 'Todavía no hay entrenamientos recientes.'
                                    : `${recentActivity.length} registro${recentActivity.length === 1 ? '' : 's'} reciente${recentActivity.length === 1 ? '' : 's'}.`}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/40 p-4">
                            <p className="text-sm font-medium text-card-foreground">PRs detectados</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {stats.totalPRs === 0
                                    ? 'Todavía no hay PRs detectados.'
                                    : `${stats.totalPRs} PR${stats.totalPRs === 1 ? '' : 's'} acumulado${stats.totalPRs === 1 ? '' : 's'}.`}
                            </p>
                        </div>
                    </div>
                </AppCard>
            </section>
        </div>
    )
}
