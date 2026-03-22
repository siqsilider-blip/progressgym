import { cookies } from 'next/headers'
import Link from 'next/link'
import { formatWeight, type WeightUnit } from '@/lib/weight'
import { ArrowRight, Trophy } from 'lucide-react'

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
        <div
            className={`rounded-3xl border p-6 ${isLight
                    ? 'border-zinc-200 bg-white'
                    : 'border-zinc-800 bg-zinc-900/60'
                }`}
        >
            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
                    <Trophy className="h-5 w-5" />
                </div>

                <div>
                    <h2
                        className={`text-lg font-semibold ${isLight ? 'text-zinc-900' : 'text-white'
                            }`}
                    >
                        Ranking de alumnos
                    </h2>

                    <p
                        className={`text-sm ${isLight ? 'text-zinc-600' : 'text-zinc-400'
                            }`}
                    >
                        Mejores progresos recientes
                    </p>
                </div>
            </div>

            {ranking.length === 0 ? (
                <div
                    className={`rounded-2xl border border-dashed p-5 text-sm ${isLight
                            ? 'border-zinc-300 bg-zinc-50 text-zinc-600'
                            : 'border-zinc-700 bg-zinc-950/50 text-zinc-400'
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
                                            ? 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white'
                                            : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${isTop
                                                ? 'bg-emerald-500 text-white'
                                                : isLight
                                                    ? 'bg-zinc-200 text-zinc-700'
                                                    : 'bg-zinc-800 text-zinc-200'
                                            }`}
                                    >
                                        {index + 1}
                                    </div>

                                    <div>
                                        <p
                                            className={`font-semibold ${isLight ? 'text-zinc-900' : 'text-white'
                                                }`}
                                        >
                                            {item.studentName}
                                        </p>

                                        <p
                                            className={`mt-1 text-sm ${isLight ? 'text-zinc-600' : 'text-zinc-400'
                                                }`}
                                        >
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
                                                : isLight
                                                    ? 'text-zinc-900'
                                                    : 'text-zinc-100'
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
        </div>
    )
}