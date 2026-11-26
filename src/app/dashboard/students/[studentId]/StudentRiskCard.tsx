import { AlertTriangle, CheckCircle2, CircleHelp, Siren } from 'lucide-react'
import AppCard from '@/components/ui/app-card'
import { type StudentRiskResult } from './student-risk'

type Props = {
    risk: StudentRiskResult | null
}

function formatLastWorkout(days: number | null) {
    if (days === null) return 'Sin sesiones registradas'
    if (days === 0) return 'Entrenó hoy'
    if (days === 1) return 'Entrenó ayer'
    return `Último entrenamiento hace ${days} días`
}

function getStatus(risk: StudentRiskResult) {
    if (risk.level === 'critical') {
        return { label: 'Contactar hoy', icon: Siren, tone: 'border-red-500/25 bg-red-500/[0.06] text-red-800 dark:text-red-300' }
    }
    if (risk.level === 'high') {
        return { label: 'Necesita seguimiento', icon: AlertTriangle, tone: 'border-orange-500/25 bg-orange-500/[0.06] text-orange-800 dark:text-orange-300' }
    }
    if (risk.level === 'medium') {
        return { label: 'Revisar esta semana', icon: AlertTriangle, tone: 'border-amber-500/25 bg-amber-500/[0.05] text-amber-800 dark:text-amber-300' }
    }
    return { label: 'Seguimiento al día', icon: CheckCircle2, tone: 'border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-800 dark:text-emerald-300' }
}

export default function StudentRiskCard({ risk }: Props) {
    if (!risk) {
        return (
            <AppCard className="flex items-center gap-3 p-3.5 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:pt-0">
                <CircleHelp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Seguimiento sin calcular</p>
                    <p className="text-xs text-muted-foreground">No hay datos suficientes para mostrar una alerta confiable.</p>
                </div>
            </AppCard>
        )
    }

    const status = getStatus(risk)
    const Icon = status.icon
    const mainReason = risk.reasons.find((reason) => reason.points > 0)

    return (
        <AppCard className={`p-3.5 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-border lg:bg-transparent lg:px-0 lg:pt-0 ${status.tone}`}>
            <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold">{status.label}</p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                            {formatLastWorkout(risk.metrics.daysSinceLastWorkout)}
                        </p>
                    </div>
                    {mainReason ? (
                        <p className="mt-1 text-xs leading-relaxed text-foreground/65">{mainReason.description}</p>
                    ) : (
                        <p className="mt-1 text-xs text-foreground/65">Sin señales que requieran una acción inmediata.</p>
                    )}
                </div>
            </div>
        </AppCard>
    )
}
