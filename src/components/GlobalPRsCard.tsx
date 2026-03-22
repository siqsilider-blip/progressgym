'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Medal, Trophy } from 'lucide-react'
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

const INITIAL_VISIBLE = 5

export default function GlobalPRsCard({
    prs,
    weightUnit,
}: GlobalPRsCardProps) {
    const [expanded, setExpanded] = useState(false)

    const visiblePRs = useMemo(() => {
        if (expanded) return prs
        return prs.slice(0, INITIAL_VISIBLE)
    }, [expanded, prs])

    const hasMore = prs.length > INITIAL_VISIBLE

    return (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-400">
                    <Trophy className="h-5 w-5" />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-white">
                        Global PRs
                    </h2>
                    <p className="text-sm text-zinc-400">
                        Mejores marcas registradas entre todos tus alumnos
                    </p>
                </div>
            </div>

            {prs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 p-5 text-sm text-zinc-400">
                    Todavía no hay PRs globales.
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {visiblePRs.map((pr, i) => {
                            const isTop = i === 0

                            return (
                                <div
                                    key={`${pr.exerciseName}-${pr.studentName}-${i}`}
                                    className={`group flex items-center justify-between rounded-2xl border p-4 transition ${isTop
                                            ? 'border-amber-500/30 bg-amber-500/5'
                                            : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/80'
                                        }`}
                                >
                                    <div className="flex min-w-0 items-center gap-4">
                                        <div
                                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isTop
                                                    ? 'bg-amber-500 text-black'
                                                    : 'bg-zinc-800 text-zinc-300'
                                                }`}
                                        >
                                            {isTop ? (
                                                <Trophy className="h-4 w-4" />
                                            ) : (
                                                <Medal className="h-4 w-4" />
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-white">
                                                {pr.exerciseName}
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-400">
                                                {pr.studentName}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="ml-4 shrink-0 text-right">
                                        <p
                                            className={`text-xl font-bold ${isTop
                                                    ? 'text-amber-400'
                                                    : 'text-zinc-100'
                                                }`}
                                        >
                                            {formatWeight(pr.weight, weightUnit)}
                                        </p>

                                        <p className="mt-1 text-xs text-zinc-500">
                                            {pr.reps ?? 0} reps
                                        </p>

                                        {isTop && (
                                            <p className="mt-1 text-xs font-medium text-amber-400">
                                                Mejor marca
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {hasMore && (
                        <div className="mt-5 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setExpanded((prev) => !prev)}
                                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
                            >
                                {expanded ? (
                                    <>
                                        Ver menos
                                        <ChevronUp className="h-4 w-4" />
                                    </>
                                ) : (
                                    <>
                                        Ver todos
                                        <ChevronDown className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}