import Link from 'next/link'
import { ChevronRight, Clock, Dumbbell } from 'lucide-react'
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
    if (diffHours < 24) return `Hace ${diffHours} h`
    if (diffDays === 1) return 'Ayer'
    return `Hace ${diffDays} días`
}

export default function RecentWorkoutActivityCard({
    activity,
    weightUnit,
}: {
    activity: RecentWorkoutActivityItem[]
    weightUnit: WeightUnit
}) {
    const visibleActivity = activity.slice(0, 4)

    return (
        <section aria-labelledby="trainer-activity-heading" className="min-w-0 rounded-2xl border border-border bg-card p-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
            <div className="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 lg:mb-0 lg:border-b lg:border-border lg:pb-2">
                <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary lg:hidden">
                        <Clock className="size-4" aria-hidden="true" />
                    </div>

                    <div>
                        <h2 id="trainer-activity-heading" className="text-sm font-semibold text-foreground lg:font-[family-name:Georgia,'Times_New_Roman',serif] lg:text-[1.75rem] lg:leading-tight lg:font-normal lg:tracking-tight">
                            Actividad reciente
                        </h2>
                        <p className="text-[11px] text-muted-foreground lg:hidden">
                            Últimos registros
                        </p>
                    </div>
                </div>

                <Link
                    href="/dashboard/workouts"
                    className="rounded-sm text-[11px] font-medium text-primary transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:text-xs lg:text-brand-soft"
                >
                    Ver historial
                </Link>
            </div>

            {activity.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground lg:rounded-none lg:border-0 lg:border-b lg:border-solid lg:bg-transparent lg:px-0 lg:text-sm">
                    Todavía no hay actividad reciente.
                </div>
            ) : (
                <ul className="divide-y divide-border/70 rounded-xl border border-border bg-muted/20 lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent">
                    {visibleActivity.map((item, index) => (
                        <li key={`${item.studentId}-${item.exerciseName}-${index}`}>
                            <Link
                                href={`/dashboard/students/${item.studentId}`}
                                className="flex items-center gap-3 rounded-md px-3 py-2.5 transition hover:bg-accent/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring lg:min-h-[3.65rem] lg:px-0"
                            >
                                <span className="hidden size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground lg:grid">
                                    <Dumbbell className="size-3.5" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-xs font-semibold text-foreground lg:text-sm">
                                        {item.studentName}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-muted-foreground [overflow-wrap:anywhere] lg:text-xs">
                                        {item.exerciseName}
                                        <span className="lg:hidden"> · {formatTimeAgo(item.performedAt)}</span>
                                        <span className="hidden lg:inline"> · {item.reps ?? 0} reps</span>
                                    </span>
                                </span>
                                <span className="shrink-0 text-right tabular-nums">
                                    <span className="block text-xs font-semibold text-primary lg:text-foreground">
                                        {formatWeight(item.weight, weightUnit)}
                                    </span>
                                    <span className="block text-[10px] text-muted-foreground lg:hidden">
                                        {item.reps ?? 0} reps
                                    </span>
                                    {item.performedAt && (
                                        <time dateTime={item.performedAt} className="hidden text-[11px] text-muted-foreground lg:block">
                                            {formatTimeAgo(item.performedAt)}
                                        </time>
                                    )}
                                </span>
                                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
