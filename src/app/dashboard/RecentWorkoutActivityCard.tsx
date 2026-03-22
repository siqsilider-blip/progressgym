import Link from 'next/link'
import { ArrowRight, Clock, Flame } from 'lucide-react'
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
    const latest = activity[0]
    const rest = activity.slice(1)

    return (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-400">
                    <Clock className="h-5 w-5" />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-white">
                        Actividad reciente
                    </h2>
                    <p className="text-sm text-zinc-400">
                        Últimos entrenamientos registrados
                    </p>
                </div>
            </div>

            {activity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 p-5 text-sm text-zinc-400">
                    Todavía no hay actividad reciente.
                </div>
            ) : (
                <div className="space-y-4">
                    {latest ? (
                        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
                                    <Flame className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">
                                    Último entrenamiento
                                </span>
                            </div>

                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-lg font-semibold text-white">
                                        {latest.studentName}
                                    </p>

                                    <p className="mt-1 text-sm text-zinc-300">
                                        {latest.exerciseName}
                                    </p>

                                    <p className="mt-2 text-xs text-zinc-500">
                                        {formatTimeAgo(latest.performedAt)}
                                    </p>
                                </div>

                                <div className="shrink-0 text-right">
                                    <p className="text-xl font-bold text-indigo-300">
                                        {formatWeight(latest.weight, weightUnit)}
                                    </p>

                                    <p className="mt-1 text-xs text-zinc-500">
                                        {latest.reps ?? 0} reps
                                    </p>

                                    <Link
                                        href={`/dashboard/students/${latest.studentId}`}
                                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
                                    >
                                        Ver alumno
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {rest.length > 0 ? (
                        <div className="space-y-2">
                            {rest.map((item, i) => (
                                <div
                                    key={`${item.studentId}-${item.exerciseName}-${i}`}
                                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 transition hover:border-zinc-700 hover:bg-zinc-900/80"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-white">
                                            {item.studentName}
                                        </p>

                                        <p className="mt-1 truncate text-sm text-zinc-400">
                                            {item.exerciseName}
                                        </p>

                                        <p className="mt-1 text-xs text-zinc-500">
                                            {formatTimeAgo(item.performedAt)}
                                        </p>
                                    </div>

                                    <div className="ml-4 shrink-0 text-right">
                                        <p className="text-sm font-semibold text-zinc-100">
                                            {formatWeight(item.weight, weightUnit)}
                                        </p>

                                        <p className="mt-1 text-xs text-zinc-500">
                                            {item.reps ?? 0} reps
                                        </p>

                                        <Link
                                            href={`/dashboard/students/${item.studentId}`}
                                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-400 transition hover:text-indigo-300"
                                        >
                                            Ver
                                            <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}