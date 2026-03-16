import { formatWeight, type WeightUnit } from '@/lib/weight'

type GlobalPR = {
    weight: number
    reps: number | null
    performed_at?: string | null
    exerciseName: string
    studentName: string
}

type GlobalPRsCardProps = {
    prs: GlobalPR[]
    weightUnit: WeightUnit
}

export default function GlobalPRsCard({
    prs,
    weightUnit,
}: GlobalPRsCardProps) {
    return (
        <div className="bg-zinc-900 rounded-2xl p-4">
            <h2 className="text-lg font-bold mb-4">🏆 Global PRs</h2>

            <div className="space-y-3">
                {prs.length === 0 ? (
                    <p className="text-sm text-zinc-400">
                        Todavía no hay PRs globales.
                    </p>
                ) : (
                    prs.map((pr, i) => (
                        <div
                            key={i}
                            className="flex justify-between border-b border-zinc-800 pb-2"
                        >
                            <div>
                                <p className="font-medium">{pr.exerciseName}</p>
                                <p className="text-sm text-zinc-400">{pr.studentName}</p>
                            </div>

                            <div className="text-right">
                                <p className="font-bold">
                                    {formatWeight(pr.weight, weightUnit)}
                                </p>
                                <p className="text-sm text-zinc-400">
                                    {pr.reps ?? 0} reps
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}