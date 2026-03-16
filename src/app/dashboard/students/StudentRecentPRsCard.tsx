import { formatWeight, type WeightUnit } from '@/lib/weight'

type PRItem = {
    exerciseName: string
    weight: number
    performedAt: string
}

export default function StudentRecentPRsCard({
    prs,
    weightUnit,
}: {
    prs: PRItem[]
    weightUnit: WeightUnit
}) {
    if (!prs.length) return null

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                PRs recientes
            </h2>

            <div className="space-y-3">
                {prs.map((pr, index) => (
                    <div
                        key={`${pr.exerciseName}-${pr.performedAt}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                    >
                        <div>
                            <p className="font-medium text-zinc-100">
                                🏆 {pr.exerciseName}
                            </p>
                            <p className="mt-1 text-sm text-zinc-400">
                                {String(pr.performedAt).slice(0, 10)}
                            </p>
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