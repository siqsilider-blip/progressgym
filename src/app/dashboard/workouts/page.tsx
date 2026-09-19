import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import { getRecentWorkoutActivity } from '../getRecentWorkoutActivity'
import { getTrainerProfile } from '@/lib/getTrainerProfile'
import { formatWeight, type WeightUnit } from '@/lib/weight'

function formatDate(value: string | null) {
    if (!value) return 'Sin fecha'
    return new Date(value).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default async function WorkoutsPage() {
    const [activity, trainerProfile] = await Promise.all([
        getRecentWorkoutActivity(50),
        getTrainerProfile(),
    ])
    const weightUnit = (trainerProfile?.weight_unit ?? 'kg') as WeightUnit

    return (
        <div className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:p-6">
            <DashboardPageHeader
                title="Actividad"
                subtitle={`${activity.length} registros recientes`}
                backHref="/dashboard"
            />

            {activity.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-5 text-center">
                    <Clock className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-sm font-semibold text-card-foreground">
                        Todavía no hay actividad
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Los ejercicios registrados aparecerán acá.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025]">
                    {activity.map((item, index) => (
                        <Link
                            key={`${item.studentId}-${item.exerciseName}-${item.performedAt}-${index}`}
                            href={`/dashboard/students/${item.studentId}`}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 transition hover:bg-white/[0.04]"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-card-foreground">
                                    {item.studentName}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                    {item.exerciseName} · {formatDate(item.performedAt)}
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
        </div>
    )
}
