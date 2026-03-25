'use client'

import AppCard from '@/components/ui/app-card'

export default function WeeklyActivityChart({
    data,
}: {
    data: { date: string; count: number }[] | null | undefined
}) {
    const safeData = data ?? []

    const max = Math.max(...safeData.map((d) => d.count), 1)

    return (
        <AppCard className="p-6">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">
                Actividad semanal
            </h2>

            {safeData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Sin actividad
                </p>
            ) : (
                <div className="flex h-40 items-end gap-2">
                    {safeData.map((d) => {
                        const height = (d.count / max) * 100

                        return (
                            <div
                                key={d.date}
                                className="flex-1 bg-indigo-500 rounded"
                                style={{ height: `${height}%` }}
                            />
                        )
                    })}
                </div>
            )}
        </AppCard>
    )
}