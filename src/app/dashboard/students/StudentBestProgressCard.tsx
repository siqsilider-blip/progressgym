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
    showPrs?: boolean
}

export default function StudentBestProgressCard({
    bestProgress,
    weightUnit,
    showPrs = true,
}: Props) {
    const hasData =
        !!bestProgress &&
        typeof bestProgress.progressKg === 'number' &&
        bestProgress.progressKg > 0

    if (!showPrs || !hasData || !bestProgress) {
        return null
    }

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Mayor progreso
            </p>

            <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
                {bestProgress.exerciseName || 'Ejercicio'}
            </p>

            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                +{formatWeight(bestProgress.progressKg ?? 0, weightUnit)}
            </p>

            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                De {formatWeight(bestProgress.firstWeight ?? 0, weightUnit)} a{' '}
                {formatWeight(bestProgress.bestWeight ?? 0, weightUnit)}
                {bestProgress.reps ? ` · ${bestProgress.reps} reps` : ''}
            </p>
        </div>
    )
}
