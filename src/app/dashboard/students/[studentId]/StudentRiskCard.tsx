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
        return { label: 'Contactar hoy', icon: Siren, tone: 'border-red-500/25 bg-red-500/[0.06] text-red-300' }
    }
    if (risk.level === 'high') {
        return { label: 'Necesita seguimiento', icon: AlertTriangle, tone: 'border-orange-500/25 bg-orange-500/[0.06] text-orange-300' }
    }
    if (risk.level === 'medium') {
        return { label: 'Revisar esta semana', icon: AlertTriangle, tone: 'border-amber-500/25 bg-amber-500/[0.05] text-amber-300' }
    }
    return { label: 'Seguimiento al día', icon: CheckCircle2, tone: 'border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-300' }
}

export default function StudentRiskCard({ risk }: Props) {
    if (!risk) {
        return (
            <AppCard className="flex items-center gap-3 p-3.5">
                <CircleHelp className="h-4 w-4 shrink-0 text-muted-foreground" />
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
        <AppCard className={`p-3.5 ${status.tone}`}>
            <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold">{status.label}</p>
                        <p className="text-[11px] font-medium opacity-80">
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
