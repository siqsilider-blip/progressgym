import Link from 'next/link'
import TrainerAlertsCard from './TrainerAlertsCard'
import TrainerDashboardCards from './TrainerDashboardCards'
import TrainerProgressRankingCard from './TrainerProgressRankingCard'
import TrainerStudentLeaderboardCard from './TrainerStudentLeaderboardCard'
import { getTrainerDashboardStats } from './getTrainerDashboardStats'
import { getTrainerAlerts } from './getTrainerAlerts'
import { getTrainerProgressRanking } from './getTrainerProgressRanking'
import { getTrainerStudentLeaderboard } from './getTrainerStudentLeaderboard'
import GlobalPRsCard from '@/components/GlobalPRsCard'
import { getGlobalPRs } from '@/lib/getGlobalPRs'
import { getTrainerProfile } from '@/lib/getTrainerProfile'

export default async function DashboardPage() {
    const [
        stats,
        alerts,
        progressRanking,
        studentLeaderboard,
        globalPRs,
        trainerProfile,
    ] = await Promise.all([
        getTrainerDashboardStats(),
        getTrainerAlerts(),
        getTrainerProgressRanking(),
        getTrainerStudentLeaderboard(),
        getGlobalPRs(),
        getTrainerProfile(),
    ])

    return (
        <div className="space-y-6 p-6">
            <TrainerDashboardCards stats={stats} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <TrainerProgressRankingCard
                        ranking={progressRanking}
                        weightUnit={(trainerProfile?.weight_unit ?? 'kg') as 'kg' | 'lb'}
                    />
                </div>

                <div>
                    <TrainerAlertsCard alerts={alerts} />
                </div>
            </div>

            <TrainerStudentLeaderboardCard
                ranking={studentLeaderboard}
                weightUnit={(trainerProfile?.weight_unit ?? 'kg') as 'kg' | 'lb'}
            />

            <GlobalPRsCard
                prs={globalPRs}
                weightUnit={(trainerProfile?.weight_unit ?? 'kg') as 'kg' | 'lb'}
            />

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="text-lg font-semibold text-white">
                        Accesos rápidos
                    </h2>

                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                            href="/dashboard/students"
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                        >
                            Ver alumnos
                        </Link>

                        <Link
                            href="/dashboard/students/new"
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                        >
                            Agregar alumno
                        </Link>

                        <Link
                            href="/dashboard/exercises"
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                        >
                            Ver ejercicios
                        </Link>

                        <Link
                            href="/dashboard/routines"
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                        >
                            Ver rutinas
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="text-lg font-semibold text-white">
                        Próximamente
                    </h2>

                    <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                        <li>• objetivos por alumno</li>
                        <li>• resumen semanal</li>
                        <li>• evolución por grupo muscular</li>
                        <li>• comparativa mensual</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}