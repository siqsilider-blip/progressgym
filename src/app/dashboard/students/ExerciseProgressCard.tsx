'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Dot } from 'recharts'
import type { ExerciseProgress } from './getStudentExerciseProgress'

type Props = {
    exercise: ExerciseProgress
    weightUnit: string
    rank: number
    collapsible?: boolean
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

export default function ExerciseProgressCard({ exercise, weightUnit, rank, collapsible = false }: Props) {
    const [open, setOpen] = useState(false)
    const style = RANK_STYLES[rank] ?? { border: 'border-border', glow: '', badge: 'bg-primary', icon: '💪' }
    const lastIndex = exercise.logs.length - 1

    const trendUp = exercise.logs.length >= 2 &&
        exercise.logs[lastIndex].weight >= exercise.logs[lastIndex - 1].weight
    const hasImprovement = exercise.progressKg > 0

    const header = (
        <div className={`flex items-center justify-between gap-3 p-3.5 ${collapsible ? '' : 'pb-1'}`}>
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">{style.icon}</span>
                    <h3 className="truncate text-sm font-bold text-card-foreground">
                        {exercise.exerciseName}
                    </h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {collapsible
                        ? `${exercise.totalSessions} registros · Mejor ${exercise.bestWeight}${weightUnit} · Último ${exercise.lastWeight}${weightUnit}`
                        : `${exercise.totalSessions} registros · ${exercise.firstWeight}${weightUnit} → ${exercise.bestWeight}${weightUnit}`}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                    <p className={`${collapsible ? 'text-base' : 'text-xl'} font-black ${hasImprovement ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        {hasImprovement ? `+${exercise.progressKg}${weightUnit}` : 'Sin mejora'}
                    </p>
                    <p className={`text-[11px] font-semibold ${hasImprovement && trendUp ? 'text-emerald-500' : 'text-zinc-400'}`}>
                        {hasImprovement ? `${trendUp ? '↑' : '→'} +${exercise.progressPercent}%` : 'Sin nueva marca'}
                    </p>
                </div>
                {collapsible && (
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                )}
            </div>
        </div>
    )

    const chart = (
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
                            backgroundColor: '#111111',
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
                        stroke="#c98796"
                        strokeWidth={exercise.logs.length > 1 ? 2 : 0}
                        dot={(props) => {
                            const { cx, cy, index } = props
                            const isLast = index === lastIndex
                            return (
                                <Dot
                                    key={index}
                                    cx={cx} cy={cy}
                                    r={isLast ? 6 : 3}
                                    fill={isLast ? '#10b981' : '#c98796'}
                                    stroke="#fff"
                                    strokeWidth={2}
                                />
                            )
                        }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )

    if (collapsible) {
        return (
            <details
                className={`group overflow-hidden rounded-xl border ${style.border} bg-white/[0.025] ${style.glow}`}
                onToggle={(event) => setOpen(event.currentTarget.open)}
            >
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    {header}
                </summary>
                {open && (
                    <div className="border-t border-border/70 pt-2">
                        {chart}
                    </div>
                )}
            </details>
        )
    }

    return (
        <div className={`overflow-hidden rounded-xl border ${style.border} bg-white/[0.025] ${style.glow}`}>
            {header}
            {chart}
        </div>
    )
}
