'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
    CartesianGrid,
    Dot,
    Line,
    LineChart,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

type Log = {
    performed_at: string | null
    weight: number | null
}

type Props = {
    logs: Log[]
}

function formatDateLabel(dateStr: string) {
    const [, month, day] = dateStr.split('-')
    return `${day}/${month}`
}

export default function ExerciseProgressChart({ logs }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [width, setWidth] = useState(0)

    useEffect(() => {
        const element = containerRef.current
        if (!element) return

        const updateWidth = () => {
            const nextWidth = Math.floor(element.getBoundingClientRect().width)
            setWidth(nextWidth > 0 ? nextWidth : 0)
        }

        updateWidth()

        const observer = new ResizeObserver(() => {
            updateWidth()
        })

        observer.observe(element)
        window.addEventListener('resize', updateWidth)

        return () => {
            observer.disconnect()
            window.removeEventListener('resize', updateWidth)
        }
    }, [])

    const data = useMemo(() => {
        const byDate = logs.reduce<Record<string, number>>((acc, log) => {
            if (log.weight === null || !log.performed_at) return acc
            const date = log.performed_at.split('T')[0]
            acc[date] = Math.max(acc[date] ?? 0, Number(log.weight))
            return acc
        }, {})

        return Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-30)
            .map(([date, weight]) => ({ date, weight }))
    }, [logs])

    if (data.length === 0) return null

    const lastIndex = data.length - 1

    return (
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Progreso de carga
                </p>
            </div>

            <div ref={containerRef} className="w-full min-w-0">
                {width > 0 ? (
                    <LineChart
                        width={width}
                        height={160}
                        data={data}
                        margin={{ top: 8, right: 8, left: -24, bottom: 4 }}
                    >
                        <CartesianGrid
                            stroke="#27272a"
                            strokeOpacity={0.35}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDateLabel}
                            tick={{ fill: '#a1a1aa', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={8}
                        />
                        <YAxis
                            tick={{ fill: '#a1a1aa', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={4}
                            tickCount={4}
                            width={36}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#09090b',
                                border: '1px solid #27272a',
                                borderRadius: 10,
                                color: '#fafafa',
                                fontSize: 12,
                                padding: '6px 10px',
                            }}
                            labelFormatter={(label) => typeof label === 'string' ? formatDateLabel(label) : label}
                            labelStyle={{ color: '#a1a1aa', marginBottom: 2 }}
                            formatter={(value) => [`${value} kg`, '']}
                            cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            dot={(props) => {
                                const { cx, cy, index } = props
                                const isLast = index === lastIndex
                                return (
                                    <Dot
                                        key={`dot-${index}`}
                                        cx={cx}
                                        cy={cy}
                                        r={isLast ? 5 : 3}
                                        fill={isLast ? '#10b981' : '#6366f1'}
                                        stroke={isLast ? '#ffffff' : '#6366f1'}
                                        strokeWidth={isLast ? 2 : 1}
                                    />
                                )
                            }}
                            activeDot={{ r: 6, fill: '#a5b4fc', stroke: '#6366f1', strokeWidth: 2 }}
                        />
                    </LineChart>
                ) : (
                    <div className="h-40 w-full animate-pulse rounded-lg bg-zinc-900" />
                )}
            </div>
        </div>
    )
}
