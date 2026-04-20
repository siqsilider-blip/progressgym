'use client'

import { useState } from 'react'
import { formatWeight, type WeightUnit } from '@/lib/weight'

type PRItem = {
    exerciseName: string
    weight: number
    performedAt: string
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString('es-AR')
}

const INITIAL_VISIBLE = 3

export default function StudentRecentPRsCard({
    prs,
    weightUnit,
    showPrs = true,
}: {
    prs: PRItem[]
    weightUnit: WeightUnit
    showPrs?: boolean
}) {
    const [expanded, setExpanded] = useState(false)

    if (!showPrs || !prs.length) return null

    const visiblePrs = expanded ? prs : prs.slice(0, INITIAL_VISIBLE)
    const hasMore = prs.length > INITIAL_VISIBLE

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                PRs recientes
            </p>

            <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
                {visiblePrs.map((pr, index) => (
                    <div
                        key={`${pr.exerciseName}-${pr.performedAt}-${index}`}
                        className="flex items-center justify-between gap-4 py-2.5"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                🏆 {pr.exerciseName}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {formatDate(pr.performedAt)}
                            </p>
                        </div>

                        <p className="shrink-0 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatWeight(pr.weight, weightUnit)}
                        </p>
                    </div>
                ))}
            </div>

            {hasMore && (
                <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                    className="mt-2 flex w-full items-center justify-center gap-1 py-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                    {expanded ? (
                        <>Ver menos <span className="text-[10px]">▴</span></>
                    ) : (
                        <>Ver todos ({prs.length}) <span className="text-[10px]">▾</span></>
                    )}
                </button>
            )}
        </div>
    )
}
