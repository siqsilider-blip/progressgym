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
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Estancamiento
            </h2>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/15 dark:bg-zinc-950/60">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {stagnation.exerciseName}
                </p>

                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {stagnation.daysWithoutImprovement} días sin mejorar la mejor carga.
                </p>

                {stagnation.lastBestWeight !== null && (
                    <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                        Mejor marca actual: {stagnation.lastBestWeight}
                    </p>
                )}
            </div>
        </div>
    )
}