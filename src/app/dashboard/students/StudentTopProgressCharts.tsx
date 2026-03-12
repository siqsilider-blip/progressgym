type Chart = {
    exerciseName: string
    firstWeight: number
    bestWeight: number
    progressKg: number
    points: { label: string; weight: number }[]
}

function buildPath(points: { weight: number }[]) {
    const width = 260
    const height = 90

    const weights = points.map((p) => p.weight)
    const min = Math.min(...weights)
    const max = Math.max(...weights)
    const range = max - min || 1

    return points
        .map((point, index) => {
            const x = (index / (points.length - 1)) * width
            const y = height - ((point.weight - min) / range) * height
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
        })
        .join(' ')
}

export default function StudentTopProgressCharts({
    charts,
}: {
    charts: Chart[]
}) {
    if (!charts.length) {
        return null
    }

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold">Progreso de ejercicios</h2>

            <div className="grid gap-4 lg:grid-cols-3">
                {charts.map((chart) => {
                    const path = buildPath(chart.points)

                    return (
                        <div
                            key={chart.exerciseName}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                        >
                            <p className="font-medium">{chart.exerciseName}</p>

                            <p className="text-sm text-zinc-400">
                                {chart.firstWeight} kg → {chart.bestWeight} kg
                            </p>

                            <p className="text-green-400 font-semibold">
                                +{chart.progressKg} kg
                            </p>

                            <svg viewBox="0 0 260 90" className="mt-3 h-20 w-full">
                                <path
                                    d={path}
                                    fill="none"
                                    stroke="rgb(99 102 241)"
                                    strokeWidth="3"
                                />
                            </svg>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}