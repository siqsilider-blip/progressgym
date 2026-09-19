import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
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
}: {
    activity: RecentWorkoutActivityItem[]
    weightUnit: WeightUnit
}) {
    const visibleActivity = activity.slice(0, 4)

    return (
        <section className="rounded-2xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
                        <Clock className="h-4 w-4" />
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-card-foreground">
                            Actividad reciente
                        </h2>
                        <p className="text-[11px] text-muted-foreground">
                            Últimos registros
                        </p>
                    </div>
                </div>

                <Link
                    href="/dashboard/workouts"
                    className="text-[11px] font-medium text-indigo-400 transition hover:text-indigo-300"
                >
                    Ver historial
                </Link>
            </div>

            {activity.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
                    Todavía no hay actividad reciente.
                </div>
            ) : (
                <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-muted/20">
                    {visibleActivity.map((item, index) => (
                        <Link
                            key={`${item.studentId}-${item.exerciseName}-${index}`}
                            href={`/dashboard/students/${item.studentId}`}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 transition hover:bg-muted/60"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-card-foreground">
                                    {item.studentName}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                    {item.exerciseName} · {formatTimeAgo(item.performedAt)}
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2 text-right">
                                <div>
                                    <p className="text-xs font-semibold text-indigo-400">
                                        {formatWeight(item.weight, weightUnit)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {item.reps ?? 0} reps
                                    </p>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-white/20" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}
