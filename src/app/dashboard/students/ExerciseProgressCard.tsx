'use client'

import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Dot } from 'recharts'
import { convertWeightFromKgForInput, formatPreciseWeight, type WeightUnit } from '@/lib/weight'
import type { ExerciseProgress } from './getStudentExerciseProgress'

type Props = {
    exercise: ExerciseProgress
    weightUnit: WeightUnit
    rank?: number
    studentDisclosure?: {
        open: boolean
        onToggle: () => void
    }
}

function formatDate(dateStr: string) {
    const [, month, day] = dateStr.split('-')
    return `${day}/${month}`
}

const RANK_STYLES = [
    { border: 'border-amber-400/40', glow: 'shadow-amber-500/10', badge: 'bg-amber-500', icon: '🥇' },
    { border: 'border-zinc-400/30', glow: 'shadow-zinc-500/10', badge: 'bg-zinc-400', icon: '🥈' },
    { border: 'border-amber-700/30', glow: 'shadow-amber-700/10', badge: 'bg-amber-700', icon: '🥉' },
]

export default function ExerciseProgressCard({ exercise, weightUnit, rank = -1, studentDisclosure }: Props) {
    const detailId = useId()
    const style = RANK_STYLES[rank] ?? { border: 'border-border', glow: '', badge: 'bg-primary', icon: '💪' }
    const lastIndex = exercise.logs.length - 1

    const trendUp = exercise.logs.length >= 2 &&
        exercise.logs[lastIndex].weight >= exercise.logs[lastIndex - 1].weight
    const hasImprovement = exercise.progressKg > 0

    const header = (
        <div className="flex items-center justify-between gap-3 p-3.5 pb-1">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">{style.icon}</span>
                    <h3 className="truncate text-sm font-bold text-card-foreground">
                        {exercise.exerciseName}
                    </h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {`${exercise.totalSessions} registros · ${exercise.firstWeight}${weightUnit} → ${exercise.bestWeight}${weightUnit}`}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                    <p className={`text-xl font-black ${hasImprovement ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {hasImprovement ? `+${exercise.progressKg}${weightUnit}` : 'Sin mejora'}
                    </p>
                    <p className={`text-[11px] font-semibold ${hasImprovement && trendUp ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {hasImprovement ? `${trendUp ? '↑' : '→'} +${exercise.progressPercent}%` : 'Sin nueva marca'}
                    </p>
                </div>
            </div>
        </div>
    )

    const chart = (
        <div className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={100}>
                <LineChart data={exercise.logs} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        tickFormatter={studentDisclosure ? (weight) => String(convertWeightFromKgForInput(weight, weightUnit)) : undefined}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        tickCount={3}
                        domain={['auto', 'auto']}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--popover)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            color: 'var(--popover-foreground)',
                            fontSize: 11,
                            padding: '4px 8px',
                        }}
                        itemStyle={{ color: 'var(--popover-foreground)' }}
                        cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.5 }}
                        formatter={(v) => [studentDisclosure ? formatPreciseWeight(Number(v), weightUnit) : `${v}${weightUnit}`, '']}
                    />
                    <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="var(--chart-1)"
                        strokeWidth={exercise.logs.length > 1 ? 2 : 0}
                        dot={(props) => {
                            const { cx, cy, index } = props
                            const isLast = index === lastIndex
                            return (
                                <Dot
                                    key={index}
                                    cx={cx} cy={cy}
                                    r={isLast ? 6 : 3}
                                    fill={isLast ? '#059669' : 'var(--chart-1)'}
                                    stroke="var(--card)"
                                    strokeWidth={2}
                                />
                            )
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )

    if (studentDisclosure) {
        const { open, onToggle } = studentDisclosure
        return (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                <h3>
                    <button
                        type="button"
                        aria-controls={detailId}
                        aria-expanded={open}
                        aria-labelledby={`${detailId}-title`}
                        aria-describedby={`${detailId}-summary`}
                        onClick={onToggle}
                        className="flex min-h-14 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                    >
                        <span className="min-w-0">
                            <span id={`${detailId}-title`} className="block break-words text-sm font-bold leading-5 text-foreground">{exercise.exerciseName}</span>
                            <span id={`${detailId}-summary`} className="mt-0.5 flex flex-wrap gap-x-2 text-xs font-normal text-muted-foreground">
                                <span>Mejor {formatPreciseWeight(exercise.bestWeight, weightUnit)}</span>
                                <span>Último {formatPreciseWeight(exercise.lastWeight, weightUnit)}</span>
                            </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                            {hasImprovement && (
                                <span className="rounded-md bg-emerald-500/10 px-1.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    +{formatPreciseWeight(Number(exercise.progressKg.toFixed(2)), weightUnit)}
                                </span>
                            )}
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </span>
                    </button>
                </h3>
                <div id={detailId} hidden={!open} className="border-t border-border/70 pt-2">
                    {open && (
                        <>
                            <p className="px-3 pb-1 text-xs text-muted-foreground">
                                {exercise.totalSessions} registros · Primera carga: {formatPreciseWeight(exercise.firstWeight, weightUnit)}
                            </p>
                            {chart}
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={`overflow-hidden rounded-xl border ${style.border} bg-card ${style.glow}`}>
            {header}
            {chart}
        </div>
    )
}
