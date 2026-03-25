import { formatWeight, type WeightUnit } from '@/lib/weight'

type BestProgress = {
    exerciseName?: string | null
    firstWeight?: number | null
    bestWeight?: number | null
    progressKg?: number | null
    reps?: number | null
} | null

type Props = {
    bestProgress: BestProgress
    weightUnit: WeightUnit
}

export default function StudentBestProgressCard({
    bestProgress,
    weightUnit,
}: Props) {
    const hasData =
        !!bestProgress &&
        typeof bestProgress.progressKg === 'number' &&
        bestProgress.progressKg > 0

    if (!hasData || !bestProgress) {
        return null
    }

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Mayor progreso
            </h2>

            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/15 dark:bg-zinc-950/60">
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    Ejercicio
                </p>

                <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {bestProgress.exerciseName || 'Ejercicio'}
                </p>

                <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatWeight(bestProgress.progressKg ?? 0, weightUnit)}
                </p>

                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    De {formatWeight(bestProgress.firstWeight ?? 0, weightUnit)} a{' '}
                    {formatWeight(bestProgress.bestWeight ?? 0, weightUnit)}
                    {bestProgress.reps ? ` • ${bestProgress.reps} reps` : ''}
                </p>
            </div>
        </div>
    )
}