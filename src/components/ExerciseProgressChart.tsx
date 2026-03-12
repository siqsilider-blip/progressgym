'use client'

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
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
    const data = logs
        .filter((log) => log.weight !== null && log.performed_at)
        .map((log) => ({
            date: log.performed_at as string,
            weight: Number(log.weight),
        }))
        .reverse()

    if (data.length === 0) return null

    return (
        <div className="mt-4 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                    <Tooltip />
                    <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#6366f1"
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}