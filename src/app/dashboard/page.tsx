import Link from 'next/link'
import { cookies } from 'next/headers'
import {
    AlertTriangle,
    Trophy,
    Users,
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

export default async function DashboardPage() {
    const cookieStore = await cookies()
    const theme = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'
    const isLight = theme === 'light'

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
    const featuredStudent = studentLeaderboard[0]

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
        <div className="space-y-6 p-4 md:space-y-8 md:p-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-medium text-indigo-500">
                        ProgressGym
                    </p>

                    <h1
                        className={`mt-1 text-2xl font-bold md:text-4xl ${isLight ? 'text-zinc-900' : 'text-white'
                            }`}
                    >
                        Dashboard
                    </h1>

                    <p
                        className={`mt-2 hidden text-sm md:block ${isLight ? 'text-zinc-600' : 'text-zinc-400'
                            }`}
                    >
                        Vista general del progreso de tus alumnos
                    </p>

                    <p
                        className={`mt-2 text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-500'
                            }`}
                    >
                        Mostrando pesos en {weightUnit.toUpperCase()}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {headlineInsights.map((item) => {
                            const Icon = item.icon

                            return (
                                <div
                                    key={item.label}
                                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] ${isLight
                                            ? 'border-zinc-200 bg-white text-zinc-700'
                                            : 'border-zinc-800 bg-zinc-900 text-zinc-300'
                                        }`}
                                >
                                    <Icon className="h-3 w-3 text-indigo-500" />
                                    {item.label}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
                    <Link
                        href="/dashboard/students/new"
                        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm text-white transition hover:bg-indigo-500"
                    >
                        + Agregar alumno
                    </Link>

                    <Link
                        href="/dashboard/routines"
                        className={`w-full rounded-xl border px-4 py-3 text-center text-sm transition ${isLight
                                ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                                : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                            }`}
                    >
                        Ver rutinas
                    </Link>
                </div>
            </div>

            <TrainerDashboardCards stats={stats} />

            <div className="block xl:hidden">
                <RecentWorkoutActivityCard
                    activity={recentActivity}
                    weightUnit={weightUnit}
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
                <div className="xl:col-span-8">
                    <TrainerProgressRankingCard
                        ranking={progressRanking}
                        weightUnit={weightUnit}
                    />
                </div>

                <div className="xl:col-span-4">
                    <TrainerAlertsCard alerts={alerts} />
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
                <div className="xl:col-span-4">
                    <div
                        className={`rounded-xl border p-5 ${isLight
                                ? 'border-zinc-200 bg-white'
                                : 'border-zinc-800 bg-zinc-900/40'
                            }`}
                    >
                        <p className="text-xs text-indigo-500">Destacado</p>

                        {featuredStudent && (
                            <>
                                <h3
                                    className={`mt-2 text-xl ${isLight ? 'text-zinc-900' : 'text-white'
                                        }`}
                                >
                                    {featuredStudent.studentName}
                                </h3>

                                <p
                                    className={`text-sm ${isLight ? 'text-zinc-600' : 'text-zinc-400'
                                        }`}
                                >
                                    {featuredStudent.bestExerciseName}
                                </p>

                                <p className="mt-2 text-2xl text-emerald-500">
                                    +{formatWeight(featuredStudent.progressKg, weightUnit)}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                <div className="xl:col-span-8">
                    <TrainerStudentLeaderboardCard
                        ranking={studentLeaderboard}
                        weightUnit={weightUnit}
                    />
                </div>
            </div>

            <GlobalPRsCard prs={globalPRs} weightUnit={weightUnit} />

            <div className="grid gap-6 xl:grid-cols-3">
                <AtRiskStudentsCard alerts={alerts} />
                <WeeklyActivityChart data={weeklyActivity} />

                <div className="hidden xl:block">
                    <RecentWorkoutActivityCard
                        activity={recentActivity}
                        weightUnit={weightUnit}
                    />
                </div>
            </div>
        </div>
    )
}