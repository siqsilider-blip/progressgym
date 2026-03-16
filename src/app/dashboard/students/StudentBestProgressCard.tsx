import type { StudentBestProgress } from './getStudentBestProgress'
import { convertWeightFromKg, type WeightUnit } from '@/lib/weight'

type Props = {
    bestProgress: StudentBestProgress
    weightUnit: WeightUnit
}

export default function StudentBestProgressCard({
    bestProgress,
    weightUnit,
}: Props) {
    const hasProgress =
        bestProgress.exerciseName &&
        bestProgress.firstWeight != null &&
        bestProgress.lastWeight != null &&
        bestProgress.progressKg > 0

    const progress = convertWeightFromKg(bestProgress.progressKg, weightUnit)
    const firstWeight =
        bestProgress.firstWeight != null
            ? convertWeightFromKg(bestProgress.firstWeight, weightUnit)
            : null

    const lastWeight =
        bestProgress.lastWeight != null
            ? convertWeightFromKg(bestProgress.lastWeight, weightUnit)
            : null

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
                        +{progress} {weightUnit}
                    </p>

                    <p className="text-sm text-zinc-400">
                        De {firstWeight} {weightUnit} a {lastWeight} {weightUnit}
                    </p>
                </div>
            ) : (
                <p className="text-sm text-zinc-400">
                    Todavía no hay suficiente historial para calcular progreso.
                </p>
            )}
        </div>
    )
}