'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Clock, Flame } from 'lucide-react'
import AppCard from '@/components/ui/app-card'
import { formatWeight, type WeightUnit } from '@/lib/weight'
import type { RecentWorkoutActivityItem } from './getRecentWorkoutActivity'

function formatTimeAgo(dateString: string | null) {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()

    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Hace instantes'
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays === 1) return 'Ayer'
    return `Hace ${diffDays}d`
}

export default function RecentWorkoutActivityCard({
    activity,
    weightUnit,
    theme,
}: {
    activity: RecentWorkoutActivityItem[]
    weightUnit: WeightUnit
    theme: 'light' | 'dark'
}) {
    const [expanded, setExpanded] = useState(false)

    const latest = activity[0]
    const rest = activity.slice(1)
    const visibleRest = expanded ? rest : rest.slice(0, 3)
    const hiddenCount = Math.max(0, rest.length - visibleRest.length)

    return (
        <AppCard className="p-5 md:p-6">
            <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-500">
                    <Clock className="h-5 w-5" />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        Actividad reciente
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Últimos entrenamientos registrados
                    </p>
                </div>
            </div>

            {activity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">
                    Todavía no hay actividad reciente.
                </div>
            ) : (
                <div className="space-y-4">
                    {latest ? (
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5 md:p-5">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                    <Flame className="h-4 w-4" />
                                </div>

                                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">
                                    Último entrenamiento
                                </span>
                            </div>

                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-lg font-semibold text-card-foreground">
                                        {latest.studentName}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {latest.exerciseName}
                                    </p>

                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {formatTimeAgo(latest.performedAt)}
                                    </p>
                                </div>

                                <div className="shrink-0 text-right">
                                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                                        {formatWeight(latest.weight, weightUnit)}
                                    </p>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {latest.reps ?? 0} reps
                                    </p>

                                    <Link
                                        href={`/dashboard/students/${latest.studentId}`}
                                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-500 transition hover:text-indigo-400"
                                    >
                                        Ver alumno
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {visibleRest.length > 0 ? (
                        <div className="space-y-2">
                            {visibleRest.map((item, i) => (
                                <div
                                    key={`${item.studentId}-${item.exerciseName}-${i}`}
                                    className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 transition hover:bg-muted/70 dark:bg-muted/30 dark:hover:bg-card/90"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-card-foreground">
                                            {item.studentName}
                                        </p>

                                        <p className="mt-1 truncate text-sm text-muted-foreground">
                                            {item.exerciseName}
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {formatTimeAgo(item.performedAt)}
                                        </p>
                                    </div>

                                    <div className="ml-4 shrink-0 text-right">
                                        <p className="text-sm font-semibold text-indigo-500">
                                            {formatWeight(item.weight, weightUnit)}
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {item.reps ?? 0} reps
                                        </p>

                                        <Link
                                            href={`/dashboard/students/${item.studentId}`}
                                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-500 transition hover:text-indigo-400"
                                        >
                                            Ver
                                            <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {hiddenCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setExpanded((prev) => !prev)}
                            className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
                        >
                            {expanded ? 'Ver menos' : `Ver más (${hiddenCount})`}
                        </button>
                    )}
                </div>
            )}
        </AppCard>
    )
}