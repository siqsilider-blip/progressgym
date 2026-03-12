import Link from 'next/link'
import type { TrainerProgressRankingItem } from './getTrainerProgressRanking'

export default function TrainerProgressRankingCard({
    ranking,
}: {
    ranking: TrainerProgressRankingItem[]
}) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                Ranking de progreso
            </h2>

            {ranking.length === 0 ? (
                <p className="text-sm text-zinc-400">
                    Todavía no hay progresos registrados.
                    Registrá algunos entrenamientos para generar el ranking.
                </p>
            ) : (
                <div className="space-y-3">
                    {ranking.map((item, index) => (
                        <div
                            key={`${item.studentId}-${item.exerciseName}`}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                        >
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-zinc-100">
                                        {index + 1}. {item.studentName}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-400">
                                        {item.exerciseName}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        De {item.firstWeight} kg a {item.bestWeight} kg
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <p className="text-lg font-bold text-green-400">
                                        +{item.progressKg} kg
                                    </p>

                                    <Link
                                        href={`/dashboard/students/${item.studentId}`}
                                        className="text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
                                    >
                                        Ver alumno →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}