import { convertWeightFromKg, formatWeight, type WeightUnit } from '@/lib/weight'

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

    if (points.length === 1) {
        const y = height / 2
        return `M 0 ${y} L ${width} ${y}`
    }

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
    weightUnit,
}: {
    charts: Chart[]
    weightUnit: WeightUnit
}) {
    if (!charts.length) {
        return null
    }

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold">Progreso de ejercicios</h2>

            <div className="grid gap-4 lg:grid-cols-3">
                {charts.map((chart) => {
                    const convertedPoints = chart.points.map((point) => ({
                        ...point,
                        weight: convertWeightFromKg(point.weight, weightUnit),
                    }))

                    const path = buildPath(convertedPoints)

                    return (
                        <div
                            key={chart.exerciseName}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                        >
                            <p className="font-medium">{chart.exerciseName}</p>

                            <p className="text-sm text-zinc-400">
                                {formatWeight(chart.firstWeight, weightUnit)} →{' '}
                                {formatWeight(chart.bestWeight, weightUnit)}
                            </p>

                            <p className="font-semibold text-green-400">
                                +{formatWeight(chart.progressKg, weightUnit)}
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