import type { StudentBestProgress } from './getStudentBestProgress'

export default function StudentBestProgressCard({
    bestProgress,
}: {
    bestProgress: StudentBestProgress
}) {
    const hasProgress =
        bestProgress.exerciseName &&
        bestProgress.firstWeight !== null &&
        bestProgress.lastWeight !== null &&
        bestProgress.progressKg > 0

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                Mayor progreso
            </h2>

            {hasProgress ? (
                <div className="space-y-2">
                    <p className="text-xl font-semibold text-zinc-100">
                        {bestProgress.exerciseName}
                    </p>

                    <p className="text-2xl font-bold text-green-400">
                        +{bestProgress.progressKg} kg
                    </p>

                    <p className="text-sm text-zinc-400">
                        De {bestProgress.firstWeight} kg a {bestProgress.lastWeight} kg
                    </p>
                </div>
            ) : (
                <div>
                    <p className="text-sm text-zinc-400">
                        Todavía no hay suficiente historial para calcular progreso.
                    </p>
                </div>
            )}
        </div>
    )
}