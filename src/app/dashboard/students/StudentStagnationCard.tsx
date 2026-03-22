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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold text-zinc-100">
                Estancamiento
            </h2>

            <div className="mt-4 rounded-xl border border-amber-500/15 bg-zinc-950/60 p-4">
                <p className="text-sm font-medium text-zinc-100">
                    {stagnation.exerciseName}
                </p>

                <p className="mt-2 text-sm text-zinc-400">
                    {stagnation.daysWithoutImprovement} días sin mejorar la mejor carga.
                </p>

                {stagnation.lastBestWeight !== null && (
                    <p className="mt-3 text-sm text-amber-300">
                        Mejor marca actual: {stagnation.lastBestWeight}
                    </p>
                )}
            </div>
        </div>
    )
}