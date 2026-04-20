import { AlertTriangle, ShieldAlert, ShieldCheck, Siren, TrendingUp } from 'lucide-react'
import AppCard from '@/components/ui/app-card'
import { type StudentRiskResult } from './student-risk'

type Props = {
    risk: StudentRiskResult | null
}

function getLevelStyles(level: StudentRiskResult['level']) {
    switch (level) {
        case 'critical':
            return {
                badge: 'bg-red-500/15 text-red-400 border border-red-500/30',
                score: 'text-red-400',
                dot: 'bg-red-400',
                icon: <Siren className="h-4 w-4 text-red-400" />,
            }
        case 'high':
            return {
                badge: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
                score: 'text-orange-400',
                dot: 'bg-orange-400',
                icon: <ShieldAlert className="h-4 w-4 text-orange-400" />,
            }
        case 'medium':
            return {
                badge: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
                score: 'text-yellow-300',
                dot: 'bg-yellow-300',
                icon: <AlertTriangle className="h-4 w-4 text-yellow-300" />,
            }
        case 'low':
        default:
            return {
                badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
                score: 'text-emerald-400',
                dot: 'bg-emerald-400',
                icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
            }
    }
}

function getReasonDot(severity: 'info' | 'warning' | 'danger') {
    switch (severity) {
        case 'danger': return 'bg-red-400'
        case 'warning': return 'bg-yellow-300'
        default: return 'bg-zinc-400'
    }
}

function formatImpact(points: number): { label: string; className: string } {
    if (points <= -8) {
        return { label: 'Ayuda a bajar el riesgo', className: 'text-emerald-500 dark:text-emerald-400' }
    }
    if (points < 0) {
        return { label: 'Baja un poco el riesgo', className: 'text-emerald-500 dark:text-emerald-400' }
    }
    if (points >= 25) {
        return { label: 'Sube mucho el riesgo', className: 'text-red-400' }
    }
    if (points >= 15) {
        return { label: 'Sube bastante el riesgo', className: 'text-orange-400' }
    }
    return { label: 'Sube un poco el riesgo', className: 'text-zinc-400' }
}

function formatDaysSince(days: number | null): string {
    if (days === null) return '—'
    if (days === 0) return 'Hoy'
    if (days === 1) return 'Ayer'
    return `Hace ${days}d`
}

export default function StudentRiskCard({ risk }: Props) {
    if (!risk) {
        return (
            <AppCard className="p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Riesgo de abandono
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            Sin datos suficientes
                        </h3>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-zinc-400" />
                </div>
            </AppCard>
        )
    }

    const styles = getLevelStyles(risk.level)

    return (
        <AppCard className="p-4">
            {/* ── Header: title + badge + score ── */}
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Riesgo de abandono
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            {risk.title}
                        </h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles.badge}`}>
                            {risk.level.toUpperCase()}
                        </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                        Mientras más alto, mayor riesgo de abandono
                    </p>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-1">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Riesgo actual</p>
                    <div className="flex h-12 w-14 flex-col items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900">
                        <div className={`text-xl font-bold leading-none ${styles.score}`}>
                            {risk.score}
                        </div>
                        <div className="text-[9px] uppercase tracking-wide text-zinc-500">/100</div>
                    </div>
                    <div>{styles.icon}</div>
                </div>
            </div>

            {/* ── 4 metrics (borderless) ── */}
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
                <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Último entrenamiento
                    </p>
                    <p className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatDaysSince(risk.metrics.daysSinceLastWorkout)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Entrenamientos completados
                    </p>
                    <p className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {risk.metrics.adherenceRate !== null
                            ? `${Math.round(risk.metrics.adherenceRate)}%`
                            : '—'}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Días sin mejorar marcas
                    </p>
                    <p className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {risk.metrics.stagnantDays ?? '—'}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Avances en 30 días
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        <TrendingUp className="h-3.5 w-3.5 text-zinc-400" />
                        {risk.metrics.progressCount30d ?? '—'}
                    </p>
                </div>
            </div>

            {/* ── Factores de riesgo (compact) ── */}
            {risk.reasons.length > 0 && (
                <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Qué influye en este riesgo
                    </p>
                    <div className="space-y-1.5">
                        {risk.reasons.map((reason) => (
                            <div key={reason.key} className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${getReasonDot(reason.severity)}`} />
                                <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                                    {reason.label}
                                </span>
                                <span className={`shrink-0 text-xs font-medium ${formatImpact(reason.points).className}`}>
                                    {formatImpact(reason.points).label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {risk.reasons.length === 0 && (
                <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        Sin señales de riesgo detectadas.
                    </p>
                </div>
            )}
        </AppCard>
    )
}
