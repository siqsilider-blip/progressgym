import { formatWeight, type WeightUnit } from '@/lib/weight'

type PRItem = {
    exerciseName: string
    weight: number
    performedAt: string
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString('es-AR')
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
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                PRs recientes
            </h2>

            <div className="space-y-3">
                {prs.map((pr, index) => (
                    <div
                        key={`${pr.exerciseName}-${pr.performedAt}-${index}`}
                        className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
                    >
                        <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                🏆 {pr.exerciseName}
                            </p>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                {formatDate(pr.performedAt)}
                            </p>
                        </div>

                        <p className="shrink-0 text-lg font-semibold text-emerald-600 dark:text-green-400">
                            {formatWeight(pr.weight, weightUnit)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}