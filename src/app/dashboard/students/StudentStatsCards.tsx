type StudentStats = {
    lastWorkoutAt: string | null
    totalSessions: number
    totalPRs: number
    status: 'active' | 'inactive' | 'new'
}

function formatDate(date: string | null) {
    if (!date) return "Sin entrenamientos"

    return new Date(date).toLocaleDateString("es-AR")
}

export default function StudentStatsCards({ stats }: { stats: StudentStats }) {

    return (
        <div className="grid grid-cols-4 gap-4 mb-6">

            <div className="border rounded-xl p-4">
                <p className="text-sm text-gray-500">Último entrenamiento</p>
                <p className="text-xl font-semibold">
                    {formatDate(stats.lastWorkoutAt)}
                </p>
            </div>

            <div className="border rounded-xl p-4">
                <p className="text-sm text-gray-500">Sesiones</p>
                <p className="text-xl font-semibold">
                    {stats.totalSessions}
                </p>
            </div>

            <div className="border rounded-xl p-4">
                <p className="text-sm text-gray-500">PRs</p>
                <p className="text-xl font-semibold">
                    {stats.totalPRs}
                </p>
            </div>

            <div className="border rounded-xl p-4">
                <p className="text-sm text-gray-500">Estado</p>
                <p className="text-xl font-semibold">
                    {stats.status}
                </p>
            </div>

        </div>
    )
}