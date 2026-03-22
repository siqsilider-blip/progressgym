'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
    CartesianGrid,
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
        return logs
            .filter((log) => log.weight !== null && log.performed_at)
            .map((log) => ({
                date: log.performed_at as string,
                weight: Number(log.weight),
            }))
            .reverse()
    }, [logs])

    if (data.length === 0) return null

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
                        height={192}
                        data={data}
                        margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            axisLine={{ stroke: '#3f3f46' }}
                            tickLine={{ stroke: '#3f3f46' }}
                        />
                        <YAxis
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            axisLine={{ stroke: '#3f3f46' }}
                            tickLine={{ stroke: '#3f3f46' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#09090b',
                                border: '1px solid #27272a',
                                borderRadius: 12,
                                color: '#fafafa',
                            }}
                            labelStyle={{ color: '#a1a1aa' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                ) : (
                    <div className="h-48 w-full animate-pulse rounded-lg bg-zinc-900" />
                )}
            </div>
        </div>
    )
}