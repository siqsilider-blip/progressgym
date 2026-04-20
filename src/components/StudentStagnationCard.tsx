type StagnationItem = {
    exerciseId: string
    exerciseName: string
    bestWeight: number
    lastWeight: number
    sessionsWithoutImprovement: number
    stagnated?: boolean
}

function getRecommendation(items: StagnationItem[]) {
    if (!items || items.length === 0) {
        return {
            title: 'Mantener progresión actual',
            description:
                'No se detectan mesetas. Conviene sostener la progresión y seguir acumulando sesiones de calidad.',
            tone: 'success' as const,
        }
    }

    const worst = items[0]

    if (worst.sessionsWithoutImprovement >= 6) {
        return {
            title: 'Revisar carga y estrategia',
            description: `Hay una meseta marcada en ${worst.exerciseName}. Conviene ajustar carga, volumen o rango de repeticiones.`,
            tone: 'warning' as const,
        }
    }

    return {
        title: 'Ajuste fino recomendado',
        description: `Se detecta freno en ${worst.exerciseName}. Podría servir bajar carga, cambiar reps o reducir fatiga acumulada.`,
        tone: 'info' as const,
    }
}

export default function StudentStagnationCard({
    items,
}: {
    items: StagnationItem[]
}) {
    const hasStagnation = Array.isArray(items) && items.length > 0
    const recommendation = getRecommendation(items)

    return (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    Estado de progreso
                </h2>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${hasStagnation
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        }`}
                >
                    {hasStagnation ? 'Alerta' : 'OK'}
                </span>
            </div>

            {hasStagnation ? (
                <div className="mt-4 space-y-3">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Se detectaron ejercicios con varias sesiones sin mejora.
                    </p>

                    {items.map((item) => (
                        <div
                            key={item.exerciseId}
                            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                        {item.exerciseName}
                                    </p>

                                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                        {item.sessionsWithoutImprovement} sesiones sin mejorar
                                    </p>
                                </div>

                                <div className="shrink-0 text-right">
                                    <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                        Último
                                    </p>
                                    <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                                        {item.lastWeight} kg
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    Mejor marca: {item.bestWeight} kg
                                </span>

                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                    Revisar carga o progresión
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/15 dark:bg-emerald-500/10">
                    <p className="text-base font-semibold text-emerald-700 dark:text-emerald-300">
                        Sin estancamientos detectados
                    </p>

                    <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-300/80">
                        El alumno viene progresando o todavía no acumula suficientes sesiones sin mejora.
                    </p>
                </div>
            )}

            <div
                className={`mt-4 rounded-2xl p-4 ${recommendation.tone === 'success'
                        ? 'border border-emerald-200 bg-emerald-50 dark:border-emerald-500/15 dark:bg-emerald-500/10'
                        : recommendation.tone === 'warning'
                            ? 'border border-amber-200 bg-amber-50 dark:border-amber-500/15 dark:bg-amber-500/10'
                            : 'border border-indigo-200 bg-indigo-50 dark:border-indigo-500/15 dark:bg-indigo-500/10'
                    }`}
            >
                <p
                    className={`text-sm font-semibold ${recommendation.tone === 'success'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : recommendation.tone === 'warning'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-indigo-700 dark:text-indigo-300'
                        }`}
                >
                    Recomendación automática
                </p>

                <p
                    className={`mt-1 text-sm ${recommendation.tone === 'success'
                            ? 'text-emerald-700/80 dark:text-emerald-300/80'
                            : recommendation.tone === 'warning'
                                ? 'text-amber-700/80 dark:text-amber-300/80'
                                : 'text-indigo-700/80 dark:text-indigo-300/80'
                        }`}
                >
                    <span className="font-medium">{recommendation.title}:</span>{' '}
                    {recommendation.description}
                </p>
            </div>
        </div>
    )
}