type Stagnation = {
    exerciseName: string | null
    daysWithoutImprovement: number
    lastBestWeight: number | null
    detected: boolean
} | null

type Props = {
    stagnation: Stagnation
}

export default function StudentStagnationCard({ stagnation }: Props) {
    const hasData =
        !!stagnation &&
        stagnation.detected &&
        !!stagnation.exerciseName &&
        stagnation.daysWithoutImprovement > 0

    if (!hasData || !stagnation) {
        return null
    }

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Estancamiento
            </p>

            <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
                {stagnation.exerciseName}
            </p>

            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {stagnation.daysWithoutImprovement} días sin mejorar
                {stagnation.lastBestWeight !== null
                    ? ` · Mejor: ${stagnation.lastBestWeight}`
                    : ''}
            </p>
        </div>
    )
}
