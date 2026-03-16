import { formatWeight, type WeightUnit } from '@/lib/weight'

type ExercisePR = {
    exercise_name: string
    weight: number
    reps: number | null
}

type StudentExercisePRsCardProps = {
    prs: ExercisePR[]
    weightUnit: WeightUnit
}

export default function StudentExercisePRsCard({
    prs,
    weightUnit,
}: StudentExercisePRsCardProps) {
    if (!prs.length) return null

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                PRs históricos por ejercicio
            </h2>

            <div className="space-y-3">
                {prs.map((pr, index) => (
                    <div
                        key={`${pr.exercise_name}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                    >
                        <div>
                            <p className="font-medium text-zinc-100">
                                {pr.exercise_name}
                            </p>

                            {pr.reps && (
                                <p className="mt-1 text-sm text-zinc-400">
                                    {pr.reps} reps
                                </p>
                            )}
                        </div>

                        <p className="text-lg font-semibold text-green-400">
                            {formatWeight(pr.weight, weightUnit)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}