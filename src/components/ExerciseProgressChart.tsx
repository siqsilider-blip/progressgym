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
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background p-3">
            <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                            stroke="var(--border)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDateLabel}
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={8}
                        />
                        <YAxis
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={4}
                            tickCount={4}
                            width={36}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--popover)',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                color: 'var(--popover-foreground)',
                                fontSize: 12,
                                padding: '6px 10px',
                            }}
                            labelFormatter={(label) => typeof label === 'string' ? formatDateLabel(label) : label}
                            labelStyle={{ color: 'var(--muted-foreground)', marginBottom: 2 }}
                            itemStyle={{ color: 'var(--popover-foreground)' }}
                            formatter={(value) => [`${value} kg`, '']}
                            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeOpacity: 0.5 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="var(--chart-1)"
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
                                        fill={isLast ? '#059669' : 'var(--chart-1)'}
                                        stroke={isLast ? 'var(--background)' : 'var(--chart-1)'}
                                        strokeWidth={isLast ? 2 : 1}
                                    />
                                )
                            }}
                            activeDot={{ r: 6, fill: 'var(--chart-1)', stroke: 'var(--background)', strokeWidth: 2 }}
                        />
                    </LineChart>
                ) : (
                    <div className="h-40 w-full animate-pulse rounded-lg bg-muted" />
                )}
            </div>
        </div>
    )
}
