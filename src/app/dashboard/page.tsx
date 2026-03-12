import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TrainerDashboardCards from './TrainerDashboardCards'
import { getTrainerDashboardStats } from './getTrainerDashboardStats'
import TrainerAlertsCard from './TrainerAlertsCard'
import { getTrainerAlerts } from './getTrainerAlerts'
import TrainerProgressRankingCard from './TrainerProgressRankingCard'
import { getTrainerProgressRanking } from './getTrainerProgressRanking'
import { getGlobalPRs } from '@/lib/getGlobalPRs'
import GlobalPRsCard from '@/components/GlobalPRsCard'
import { getTrainerStudentLeaderboard } from './getTrainerStudentLeaderboard'
import TrainerStudentLeaderboardCard from './TrainerStudentLeaderboardCard'

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const stats = await getTrainerDashboardStats()
    const alerts = await getTrainerAlerts()
    const ranking = await getTrainerProgressRanking()
    const globalPRs = await getGlobalPRs()
    const studentLeaderboard = await getTrainerStudentLeaderboard()

    return (
        <div className="p-8 text-white">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="mt-2 text-sm text-zinc-400">
                    Resumen general de tu cuenta de entrenador
                </p>
            </div>

            <div className="mb-8">
                <TrainerDashboardCards stats={stats} />
            </div>

            <div className="mb-8">
                <TrainerAlertsCard alerts={alerts} />
            </div>

            <div className="mb-8">
                <TrainerProgressRankingCard ranking={ranking} />
            </div>

            <div className="mb-8">
                <GlobalPRsCard prs={globalPRs} />
            </div>

            <div className="mb-8">
                <TrainerStudentLeaderboardCard ranking={studentLeaderboard} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                        Accesos rápidos
                    </h2>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/dashboard/students"
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                        >
                            Ver alumnos
                        </Link>

                        <Link
                            href="/dashboard/students/new"
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
                        >
                            Agregar alumno
                        </Link>

                        <Link
                            href="/dashboard/exercises"
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
                        >
                            Ver ejercicios
                        </Link>

                        <Link
                            href="/dashboard/routines"
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800"
                        >
                            Ver rutinas
                        </Link>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                    <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                        Próximamente
                    </h2>

                    <ul className="space-y-2 text-sm text-zinc-300">
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