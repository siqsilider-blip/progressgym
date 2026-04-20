type StudentStats = {
    lastWorkoutAt: string | null
    totalSessions: number
    totalPRs: number
    totalVolume: number
    last30DaysVolume: number
    status: 'active' | 'inactive' | 'new'
}

function formatDate(date: string | null) {
    if (!date) return 'Sin entrenamientos'
    return new Date(date).toLocaleDateString('es-AR')
}

function formatStatus(status: StudentStats['status']) {
    switch (status) {
        case 'active':
            return 'Activo'
        case 'inactive':
            return 'Inactivo'
        case 'new':
            return 'Nuevo'
        default:
            return status
    }
}

function formatVolume(value: number) {
    return new Intl.NumberFormat('es-AR').format(Math.round(value))
}

export default function StudentStatsCards({ stats }: { stats: StudentStats }) {
    return (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Último entrenamiento
                </p>
                <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-lg">
                    {formatDate(stats.lastWorkoutAt)}
                </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Sesiones
                </p>
                <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {stats.totalSessions}
                </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    PRs
                </p>
                <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {stats.totalPRs}
                </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Volumen total
                </p>
                <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatVolume(stats.totalVolume)} kg
                </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Volumen 30 días
                </p>
                <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {formatVolume(stats.last30DaysVolume)} kg
                </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 sm:col-span-2 xl:col-span-5">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Estado
                </p>
                <div className="mt-2">
                    <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${stats.status === 'active'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                : stats.status === 'inactive'
                                    ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                            }`}
                    >
                        {formatStatus(stats.status)}
                    </span>
                </div>
            </div>
        </div>
    )
}