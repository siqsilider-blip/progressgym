import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowRight, TrendingUp } from 'lucide-react'
import type { TrainerProgressRankingItem } from './getTrainerProgressRanking'
import { formatWeight, type WeightUnit } from '@/lib/weight'

export default async function TrainerProgressRankingCard({
    ranking,
    weightUnit,
}: {
    ranking: TrainerProgressRankingItem[]
    weightUnit: WeightUnit
}) {
    const cookieStore = await cookies()
    const theme = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark'
    const isLight = theme === 'light'

    return (
        <div
            className={`rounded-3xl border p-4 md:p-6 ${isLight
                    ? 'border-zinc-200 bg-white'
                    : 'border-zinc-800 bg-zinc-900/60'
                }`}
        >
            <div className="mb-5 flex items-center gap-3 md:mb-6">
                <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-500">
                    <TrendingUp className="h-5 w-5" />
                </div>

                <div>
                    <h2
                        className={`text-lg font-semibold ${isLight ? 'text-zinc-900' : 'text-zinc-100'
                            }`}
                    >
                        Ranking de progreso
                    </h2>

                    <p
                        className={`text-sm ${isLight ? 'text-zinc-600' : 'text-zinc-400'
                            }`}
                    >
                        Ejercicios con mayor mejora registrada
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
                    Todavía no hay progresos registrados. Registrá algunos
                    entrenamientos para generar el ranking.
                </div>
            ) : (
                <div className="space-y-3">
                    {ranking.map((item, index) => {
                        const isTop = index === 0

                        return (
                            <div
                                key={`${item.studentId}-${item.exerciseName}`}
                                className={`group rounded-2xl border p-3 transition md:p-4 ${isTop
                                        ? isLight
                                            ? 'border-indigo-200 bg-indigo-50'
                                            : 'border-indigo-500/30 bg-indigo-500/5'
                                        : isLight
                                            ? 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white'
                                            : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/80'
                                    }`}
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold md:h-11 md:w-11 ${isTop
                                                    ? 'bg-indigo-500 text-white'
                                                    : isLight
                                                        ? 'bg-zinc-200 text-zinc-700'
                                                        : 'bg-zinc-800 text-zinc-200'
                                                }`}
                                        >
                                            {index + 1}
                                        </div>

                                        <div className="min-w-0">
                                            <p
                                                className={`font-semibold ${isLight
                                                        ? 'text-zinc-900'
                                                        : 'text-zinc-100'
                                                    }`}
                                            >
                                                {item.studentName}
                                            </p>

                                            <p
                                                className={`mt-1 text-sm ${isLight
                                                        ? 'text-zinc-600'
                                                        : 'text-zinc-400'
                                                    }`}
                                            >
                                                {item.exerciseName}
                                            </p>

                                            <p
                                                className={`mt-2 text-sm ${isLight
                                                        ? 'text-zinc-500'
                                                        : 'text-zinc-500'
                                                    }`}
                                            >
                                                De{' '}
                                                <span
                                                    className={
                                                        isLight
                                                            ? 'text-zinc-700'
                                                            : 'text-zinc-300'
                                                    }
                                                >
                                                    {formatWeight(
                                                        item.firstWeight,
                                                        weightUnit
                                                    )}
                                                </span>{' '}
                                                a{' '}
                                                <span
                                                    className={`font-medium ${isLight
                                                            ? 'text-zinc-900'
                                                            : 'text-zinc-100'
                                                        }`}
                                                >
                                                    {formatWeight(
                                                        item.bestWeight,
                                                        weightUnit
                                                    )}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 lg:justify-end">
                                        <div className="text-right">
                                            <p
                                                className={`text-lg font-bold md:text-xl ${isTop
                                                        ? 'text-indigo-500'
                                                        : 'text-emerald-500'
                                                    }`}
                                            >
                                                +
                                                {formatWeight(
                                                    item.progressKg,
                                                    weightUnit
                                                )}
                                            </p>

                                            <p
                                                className={`mt-1 text-xs ${isLight
                                                        ? 'text-zinc-500'
                                                        : 'text-zinc-500'
                                                    }`}
                                            >
                                                {isTop
                                                    ? 'Mayor mejora'
                                                    : 'Progreso'}
                                            </p>
                                        </div>

                                        <Link
                                            href={`/dashboard/students/${item.studentId}`}
                                            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-500 transition hover:text-indigo-400"
                                        >
                                            Ver alumno
                                            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}