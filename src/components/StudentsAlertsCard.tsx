type Alert = {
    id: string
    name: string
    level: 'critical' | 'high'
    score: number
}

export default function StudentsAlertsCard({ alerts }: { alerts: Alert[] }) {
    if (alerts.length === 0) return null

    return (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
                {alerts.length === 1
                    ? '1 alumno en riesgo alto — revisalo hoy'
                    : `${alerts.length} alumnos en riesgo alto — revisalos hoy`}
            </p>
        </div>
    )
}
