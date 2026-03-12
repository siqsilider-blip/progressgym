import Link from 'next/link'

type LeaderboardItem = {
    studentId: string
    studentName: string
    progressKg: number
    bestExerciseName: string | null
}

export default function TrainerStudentLeaderboardCard({
    ranking,
}: {
    ranking: LeaderboardItem[]
}) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                Ranking de alumnos
            </h2>

            {ranking.length === 0 ? (
                <p className="text-sm text-zinc-400">
                    Todavía no hay suficiente progreso registrado.
                </p>
            ) : (
                <div className="space-y-3">
                    {ranking.map((item, index) => (
                        <div
                            key={item.studentId}
                            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                        >
                            <div>
                                <p className="font-medium text-zinc-100">
                                    {index + 1}. {item.studentName}
                                </p>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Mejor ejercicio: {item.bestExerciseName ?? 'Ejercicio'}
                                </p>
                                <Link
                                    href={`/dashboard/students/${item.studentId}`}
                                    className="mt-2 inline-block text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
                                >
                                    Ver perfil →
                                </Link>
                            </div>

                            <p className="text-lg font-semibold text-green-400">
                                +{item.progressKg} kg
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}