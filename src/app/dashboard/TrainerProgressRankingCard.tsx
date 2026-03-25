'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, TrendingUp } from 'lucide-react'
import AppCard from '@/components/ui/app-card'
import type { TrainerProgressRankingItem } from './getTrainerProgressRanking'
import { formatWeight, type WeightUnit } from '@/lib/weight'

export default function TrainerProgressRankingCard({
    ranking,
    weightUnit,
}: {
    ranking: TrainerProgressRankingItem[] | null | undefined
    weightUnit: WeightUnit
}) {
    const [expanded, setExpanded] = useState(false)

    const safeRanking = ranking ?? []

    const collapsedCount = 4

    const visibleRanking = expanded
        ? safeRanking
        : safeRanking.slice(0, collapsedCount)

    const hiddenCount = Math.max(
        0,
        safeRanking.length - visibleRanking.length
    )

    return (
        <AppCard className="p-4 md:p-6">
            <div className="mb-5 flex items-center gap-3 md:mb-6">
                <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-500">
                    <TrendingUp className="h-5 w-5" />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        Ranking de progreso
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Ejercicios con mayor mejora registrada
                    </p>
                </div>
            </div>

            {safeRanking.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-5 text-sm text-muted-foreground">
                    Todavía no hay progresos registrados.
                </div>
            ) : (
                <div className="space-y-3">
                    {visibleRanking.map((item, index) => {
                        const isTop = index === 0

                        return (
                            <div
                                key={`${item.studentId}-${item.exerciseName}`}
                                className="rounded-2xl border border-border bg-muted/40 p-3"
                            >
                                <div className="flex justify-between">
                                    <div>
                                        <p className="font-semibold text-card-foreground">
                                            {item.studentName}
                                        </p>

                                        <p className="text-sm text-muted-foreground">
                                            {item.exerciseName}
                                        </p>

                                        <p className="text-xs text-muted-foreground mt-1">
                                            De{' '}
                                            {formatWeight(
                                                item.firstWeight,
                                                weightUnit
                                            )}{' '}
                                            a{' '}
                                            {formatWeight(
                                                item.bestWeight,
                                                weightUnit
                                            )}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-emerald-500 font-bold">
                                            +
                                            {formatWeight(
                                                item.progressKg,
                                                weightUnit
                                            )}
                                        </p>

                                        <Link
                                            href={`/dashboard/students/${item.studentId}`}
                                            className="text-xs text-indigo-500"
                                        >
                                            Ver →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {hiddenCount > 0 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="w-full rounded-xl border border-border py-2 text-sm"
                        >
                            {expanded
                                ? 'Ver menos'
                                : `Ver más (${hiddenCount})`}
                        </button>
                    )}
                </div>
            )}
        </AppCard>
    )
}