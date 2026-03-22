'use client'

function getWeekInsight(data: { date: string; count: number }[]) {
    const total = data.reduce((acc, item) => acc + item.count, 0)
    const lastThree = data.slice(-3).reduce((acc, item) => acc + item.count, 0)
    const firstFour = data.slice(0, 4).reduce((acc, item) => acc + item.count, 0)

    if (total === 0) {
        return {
            label: 'Sin actividad esta semana',
            tone: 'text-zinc-400',
            badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        }
    }

    if (lastThree > firstFour) {
        return {
            label: '📈 Repunte reciente de actividad',
            tone: 'text-emerald-400',
            badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        }
    }

    if (total >= 8) {
        return {
            label: '🔥 Semana activa',
            tone: 'text-indigo-300',
            badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
        }
    }

    return {
        label: '⚠️ Actividad baja esta semana',
        tone: 'text-amber-400',
        badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    }
}

export default function WeeklyActivityChart({
    data,
}: {
    data: { date: string; count: number }[]
}) {
    const max = Math.max(...data.map((d) => d.count), 1)
    const total = data.reduce((acc, item) => acc + item.count, 0)

    const topDay =
        data.length > 0
            ? data.reduce((prev, current) =>
                current.count > prev.count ? current : prev
            )
            : null

    const insight = getWeekInsight(data)

    return (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        Actividad semanal
                    </h2>
                    <p className="text-sm text-zinc-400">
                        Entrenamientos registrados en los últimos 7 días
                    </p>
                </div>

                <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${insight.badge}`}
                >
                    {insight.label}
                </span>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <p className="text-sm text-zinc-400">Total semanal</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                        {total}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                        entrenamientos cargados
                    </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <p className="text-sm text-zinc-400">Día más activo</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                        {topDay
                            ? new Date(topDay.date).toLocaleDateString('es-AR', {
                                weekday: 'short',
                            })
                            : '—'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                        {topDay ? `${topDay.count} registros` : 'sin datos'}
                    </p>
                </div>
            </div>

            <div className="flex items-end gap-3 h-48">
                {data.map((d) => {
                    const height = (d.count / max) * 100

                    return (
                        <div
                            key={d.date}
                            className="flex flex-1 flex-col items-center gap-2"
                        >
                            <div className="flex h-full w-full items-end">
                                <div
                                    className="w-full rounded-lg bg-indigo-500 transition-all"
                                    style={{
                                        height: `${height}%`,
                                        minHeight: d.count > 0 ? '6px' : '2px',
                                    }}
                                    title={`${d.count} entrenamientos`}
                                />
                            </div>

                            <span className="text-xs text-zinc-500">
                                {new Date(d.date).toLocaleDateString('es-AR', {
                                    weekday: 'short',
                                })}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}