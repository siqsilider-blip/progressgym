import Link from 'next/link'
import { cookies } from 'next/headers'
import {
    AlertTriangle,
    ArrowRight,
    Trophy,
    Users,
    Zap,
} from 'lucide-react'
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
    const recentStudent = recentActivity?.[0]

    const headlineInsights = [
        {
            icon: Users,
            label: `${stats.activeStudents} activos`,
        },
        {
            icon: AlertTriangle,
            label: alerts.length === 1 ? '1 alerta' : `${alerts.length} alertas`,
        },
        {
            icon: Trophy,
            label: stats.totalPRs === 1 ? '1 PR' : `${stats.totalPRs} PRs`,
        },
    ]

    return (
        <div className="space-y-5 p-4 pb-24 md:space-y-8 md:p-8">
            <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                    <p className="text-xs font-medium text-indigo-500">
                        ProgressGym
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                        Dashboard
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground md:text-base">
                        Tu panel de trabajo para seguir alumnos, detectar alertas y registrar progreso.
                    </p>

                    <p className="mt-2 text-xs text-muted-foreground">
                        Mostrando pesos en {weightUnit.toUpperCase()}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {headlineInsights.map((item) => {
                            const Icon = item.icon

                            return (
                                <div
                                    key={item.label}
                                    className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] text-secondary-foreground"
                                >
                                    <Icon className="h-3 w-3 text-indigo-500" />
                                    {item.label}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:w-auto xl:min-w-[320px]">
                    <Link
                        href="/dashboard/students/new"
                        className="rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-indigo-500"
                    >
                        + Agregar alumno
                    </Link>

                    <Link
                        href="/dashboard/routines"
                        className="rounded-xl border border-border bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                    >
                        Ver rutinas
                    </Link>
                </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2">
                <Link
                    href={
                        recentStudent
                            ? `/dashboard/students/${recentStudent.studentId}/train`
                            : '/dashboard/students'
                    }
                    className="rounded-2xl border border-border bg-card p-4 transition hover:bg-muted/40"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-card-foreground">
                                Entrenar alumno
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Registrá una sesión rápido desde el panel
                            </p>
                        </div>
                        <Zap className="h-5 w-5 text-emerald-500" />
                    </div>
                </Link>

                <Link
                    href="/dashboard/students"
                    className="rounded-2xl border border-border bg-card p-4 transition hover:bg-muted/40"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-card-foreground">
                                Revisar alumnos
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Ver perfiles, progreso y estado general
                            </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-indigo-500" />
                    </div>
                </Link>
            </section>

            <TrainerDashboardCards stats={stats} />

            <section className="grid gap-5 xl:grid-cols-12">
                <div className="order-1 xl:col-span-8">
                    <AtRiskStudentsCard alerts={alerts} />
                </div>

                <div className="order-3 xl:order-2 xl:col-span-4">
                    <AppCard className="p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                            Alumno destacado
                        </p>

                        {featuredStudent ? (
                            <>
                                <h2 className="mt-2 text-2xl font-bold text-card-foreground">
                                    {featuredStudent.studentName}
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    {featuredStudent.bestExerciseName || 'Sin ejercicio destacado'}
                                </p>

                                <p className="mt-4 text-3xl font-bold text-emerald-500">
                                    +{formatWeight(featuredStudent.progressKg, weightUnit)}
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground">
                                    Mejor progreso del ranking actual
                                </p>

                                <div className="mt-5 flex gap-2">
                                    <Link
                                        href={`/dashboard/students/${featuredStudent.studentId}`}
                                        className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                                    >
                                        Ver perfil
                                    </Link>

                                    <Link
                                        href={`/dashboard/students/${featuredStudent.studentId}/train`}
                                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-emerald-500"
                                    >
                                        Entrenar
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <p className="mt-3 text-sm text-muted-foreground">
                                Todavía no hay datos suficientes para destacar un alumno.
                            </p>
                        )}
                    </AppCard>
                </div>

                <div className="order-2 xl:order-3 xl:col-span-12">
                    <RecentWorkoutActivityCard
                        activity={recentActivity ?? []}
                        weightUnit={weightUnit}
                        theme={theme}
                    />
                </div>
            </section>

            <div className="hidden xl:block">
                <TrainerAlertsCard alerts={alerts ?? []} />
            </div>

            <section className="hidden xl:grid gap-6 xl:grid-cols-12">
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

            <section className="hidden xl:grid gap-6 xl:grid-cols-2">
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
                            <p className="text-sm font-medium text-card-foreground">
                                Alertas activas
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {alerts.length === 0
                                    ? 'No hay alertas urgentes.'
                                    : `${alerts.length} alumno${alerts.length === 1 ? '' : 's'} para revisar.`}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/40 p-4">
                            <p className="text-sm font-medium text-card-foreground">
                                Actividad reciente
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {recentActivity.length === 0
                                    ? 'Todavía no hay entrenamientos recientes.'
                                    : `${recentActivity.length} registro${recentActivity.length === 1 ? '' : 's'} reciente${recentActivity.length === 1 ? '' : 's'} cargado${recentActivity.length === 1 ? '' : 's'}.`}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/40 p-4">
                            <p className="text-sm font-medium text-card-foreground">
                                PRs detectados
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {stats.totalPRs === 0
                                    ? 'Todavía no hay PRs detectados.'
                                    : `${stats.totalPRs} PR${stats.totalPRs === 1 ? '' : 's'} acumulado${stats.totalPRs === 1 ? '' : 's'} en el panel.`}
                            </p>
                        </div>
                    </div>
                </AppCard>
            </section>
        </div>
    )
}