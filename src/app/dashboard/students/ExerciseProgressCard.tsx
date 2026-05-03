'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Dot } from 'recharts'
import type { ExerciseProgress } from './getStudentExerciseProgress'

type Props = {
    exercise: ExerciseProgress
    weightUnit: string
    rank: number
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

export default function ExerciseProgressCard({ exercise, weightUnit, rank }: Props) {
    const style = RANK_STYLES[rank] ?? { border: 'border-border', glow: '', badge: 'bg-indigo-600', icon: '💪' }
    const lastIndex = exercise.logs.length - 1

    const trendUp = exercise.logs.length >= 2 &&
        exercise.logs[lastIndex].weight >= exercise.logs[lastIndex - 1].weight

    return (
        <div className={`overflow-hidden rounded-2xl border ${style.border} bg-card shadow-lg ${style.glow}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 pb-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-base">{style.icon}</span>
                        <h3 className="truncate text-sm font-bold text-card-foreground">
                            {exercise.exerciseName}
                        </h3>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {exercise.totalSessions} registros · {exercise.firstWeight}{weightUnit} → {exercise.bestWeight}{weightUnit}
                    </p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-2xl font-black text-emerald-500">
                        +{exercise.progressKg}{weightUnit}
                    </p>
                    <p className={`text-[10px] font-semibold ${trendUp ? 'text-emerald-500' : 'text-zinc-400'}`}>
                        {trendUp ? '↑' : '→'} +{exercise.progressPercent}%
                    </p>
                </div>
            </div>

            {/* Gráfico */}
            <div className="px-2 pb-3">
                <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={exercise.logs} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <CartesianGrid stroke="#27272a" strokeOpacity={0.3} vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={{ fill: '#71717a', fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fill: '#71717a', fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                            tickCount={3}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#09090b',
                                border: '1px solid #27272a',
                                borderRadius: 8,
                                fontSize: 11,
                                padding: '4px 8px',
                            }}
                            formatter={(v) => [`${v}${weightUnit}`, '']}
                        />
                        <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="#6366f1"
                            strokeWidth={exercise.logs.length > 1 ? 2 : 0}
                            dot={(props) => {
                                const { cx, cy, index } = props
                                const isLast = index === lastIndex
                                return (
                                    <Dot
                                        key={index}
                                        cx={cx} cy={cy}
                                        r={isLast ? 6 : 3}
                                        fill={isLast ? '#10b981' : '#6366f1'}
                                        stroke="#fff"
                                        strokeWidth={2}
                                    />
                                )
                            }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
