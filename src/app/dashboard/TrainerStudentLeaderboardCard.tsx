import { cookies } from 'next/headers'
import Link from 'next/link'
import { formatWeight, type WeightUnit } from '@/lib/weight'
import { ArrowRight, Trophy } from 'lucide-react'
import AppCard from '@/components/ui/app-card'

type LeaderboardItem = {
    studentId: string
    studentName: string
    progressKg: number
    bestExerciseName: string | null
}

export default async function TrainerStudentLeaderboardCard({
    ranking,
    weightUnit,
}: {
    ranking: LeaderboardItem[]
    weightUnit: WeightUnit
}) {
    const cookieStore = await cookies()
    const theme = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'
    const isLight = theme === 'light'

    return (
        <AppCard className="p-6">
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
                    <Trophy className="h-5 w-5" />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-card-foreground">
                        Ranking de alumnos
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Mejores progresos recientes
                    </p>
                </div>
            </div>

            {ranking.length === 0 ? (
                <div
                    className={`rounded-2xl border border-dashed p-5 text-sm ${isLight
                            ? 'border-border bg-muted/50 text-muted-foreground'
                            : 'border-border bg-muted/30 text-muted-foreground'
                        }`}
                >
                    Todavía no hay suficiente progreso registrado.
                </div>
            ) : (
                <div className="space-y-3">
                    {ranking.map((item, index) => {
                        const isTop = index === 0

                        return (
                            <div
                                key={item.studentId}
                                className={`group flex items-center justify-between rounded-2xl border p-4 transition ${isTop
                                        ? isLight
                                            ? 'border-emerald-200 bg-emerald-50'
                                            : 'border-emerald-500/30 bg-emerald-500/5'
                                        : isLight
                                            ? 'border-border bg-muted/50 hover:border-zinc-300 hover:bg-card'
                                            : 'border-border bg-muted/30 hover:border-zinc-700 hover:bg-card/90'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${isTop
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-secondary text-secondary-foreground'
                                            }`}
                                    >
                                        {index + 1}
                                    </div>

                                    <div>
                                        <p className="font-semibold text-card-foreground">
                                            {item.studentName}
                                        </p>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {item.bestExerciseName
                                                ? `Mejor ejercicio: ${item.bestExerciseName}`
                                                : 'Sin datos de ejercicio'}
                                        </p>

                                        <Link
                                            href={`/dashboard/students/${item.studentId}`}
                                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-500 transition hover:text-indigo-400"
                                        >
                                            Ver perfil
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p
                                        className={`text-xl font-bold ${isTop
                                                ? 'text-emerald-500'
                                                : 'text-card-foreground'
                                            }`}
                                    >
                                        +{formatWeight(item.progressKg, weightUnit)}
                                    </p>

                                    {isTop && (
                                        <p className="text-xs text-emerald-500">
                                            Top progreso
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </AppCard>
    )
}