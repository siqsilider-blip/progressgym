import Link from 'next/link'
import { Activity, CalendarCheck, MessageCircle, Ruler } from 'lucide-react'
import type { ReactNode } from 'react'

type StudentMonthlySummaryCardProps = {
    studentId: string
    sessions: number
    previousSessions: number
    checkins: number
    weightChange: number | null
    waistChange: number | null
    painReports: number
}

export default function StudentMonthlySummaryCard({
    studentId,
    sessions,
    previousSessions,
    checkins,
    weightChange,
    waistChange,
    painReports,
}: StudentMonthlySummaryCardProps) {
    const sessionDelta = sessions - previousSessions
    const hasMeasurements = weightChange !== null || waistChange !== null

    return (
        <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Resumen de seguimiento</p>
                    <h2 className="mt-1 text-sm font-bold text-foreground">Últimos 28 días</h2>
                </div>
                <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${painReports > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {painReports > 0 ? `${painReports} alerta${painReports === 1 ? '' : 's'}` : 'Sin alertas'}
                </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
                <SummaryMetric
                    icon={<Activity className="h-4 w-4" />}
                    label="Entrenamientos"
                    value={String(sessions)}
                    detail={previousSessions > 0
                        ? `${sessionDelta >= 0 ? '+' : ''}${sessionDelta} vs. período anterior`
                        : 'Sin período anterior'}
                />
                <SummaryMetric
                    icon={<CalendarCheck className="h-4 w-4" />}
                    label="Controles enviados"
                    value={String(checkins)}
                    detail={checkins >= 4 ? 'Seguimiento al día' : 'Conviene reforzar el hábito'}
                />
                <SummaryMetric
                    icon={<Ruler className="h-4 w-4" />}
                    label="Peso"
                    value={formatChange(weightChange, 'kg')}
                    detail={weightChange === null ? 'Sin dos registros' : 'Cambio en el período'}
                />
                <SummaryMetric
                    icon={<Ruler className="h-4 w-4" />}
                    label="Cintura"
                    value={formatChange(waistChange, 'cm')}
                    detail={waistChange === null ? 'Sin dos registros' : 'Cambio en el período'}
                />
            </div>

            {!hasMeasurements && (
                <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Las variaciones aparecen cuando el alumno registra al menos dos mediciones dentro del período.</p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                <Link href={`/dashboard/students/${studentId}/history`} className="flex min-h-9 items-center justify-center rounded-xl border border-border bg-background text-[10px] font-bold text-foreground">
                    Ver historial
                </Link>
                <Link href={`/dashboard/messages?student=${studentId}`} className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-[10px] font-bold text-white">
                    <MessageCircle className="h-3.5 w-3.5" /> Seguimiento
                </Link>
            </div>
        </section>
    )
}

function SummaryMetric({
    icon,
    label,
    value,
    detail,
}: {
    icon: ReactNode
    label: string
    value: string
    detail: string
}) {
    return (
        <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center gap-1.5 text-indigo-400">
                {icon}
                <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
            <p className="mt-2 text-lg font-black text-foreground">{value}</p>
            <p className="mt-0.5 text-[9px] leading-3 text-muted-foreground">{detail}</p>
        </div>
    )
}

function formatChange(value: number | null, unit: string) {
    if (value === null) return '—'
    if (Math.abs(value) < 0.05) return `0 ${unit}`
    return `${value > 0 ? '+' : ''}${value.toFixed(1)} ${unit}`
}
