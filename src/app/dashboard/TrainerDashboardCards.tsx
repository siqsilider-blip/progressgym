import type { TrainerDashboardStats } from './getTrainerDashboardStats'

export default function TrainerDashboardCards({
    stats,
}: {
    stats: TrainerDashboardStats
}) {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <p className="text-sm text-zinc-400">Alumnos</p>
                <p className="mt-2 text-3xl font-bold text-zinc-100">
                    {stats.totalStudents}
                </p>
                <p className="mt-1 text-sm text-zinc-500">Total registrados</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <p className="text-sm text-zinc-400">Activos</p>
                <p className="mt-2 text-3xl font-bold text-green-400">
                    {stats.activeStudents}
                </p>
                <p className="mt-1 text-sm text-zinc-500">Entrenaron en 7 días</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <p className="text-sm text-zinc-400">Inactivos</p>
                <p className="mt-2 text-3xl font-bold text-yellow-400">
                    {stats.inactiveStudents}
                </p>
                <p className="mt-1 text-sm text-zinc-500">Sin entrenar en 7 días</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <p className="text-sm text-zinc-400">PRs</p>
                <p className="mt-2 text-3xl font-bold text-indigo-400">
                    {stats.totalPRs}
                </p>
                <p className="mt-1 text-sm text-zinc-500">Totales detectados</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <p className="text-sm text-zinc-400">Con rutina</p>
                <p className="mt-2 text-3xl font-bold text-zinc-100">
                    {stats.studentsWithRoutine}
                </p>
                <p className="mt-1 text-sm text-zinc-500">Alumnos asignados</p>
            </div>
        </div>
    )
}