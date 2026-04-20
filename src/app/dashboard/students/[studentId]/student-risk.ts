export type StudentRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type StudentRiskReason = {
    key: string
    label: string
    points: number
    severity: 'info' | 'warning' | 'danger'
    description: string
}

export type StudentRiskMetrics = {
    lastWorkoutAt: string | null
    adherenceRate: number | null
    stagnantDays: number | null
    progressCount30d: number | null
    totalSessions: number | null
    activeStatus: boolean
}

export type StudentRiskResult = {
    score: number
    level: StudentRiskLevel
    title: string
    summary: string
    reasons: StudentRiskReason[]
    actions: string[]
    metrics: {
        daysSinceLastWorkout: number | null
        adherenceRate: number | null
        stagnantDays: number | null
        progressCount30d: number | null
        totalSessions: number | null
    }
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

function daysBetween(dateString: string | null) {
    if (!dateString) return null

    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return null

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function getRiskLevel(score: number): StudentRiskLevel {
    if (score >= 85) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 30) return 'medium'
    return 'low'
}

function getRiskTitle(level: StudentRiskLevel) {
    switch (level) {
        case 'critical':
            return 'Riesgo crítico'
        case 'high':
            return 'Riesgo alto'
        case 'medium':
            return 'Riesgo medio'
        case 'low':
        default:
            return 'Riesgo bajo'
    }
}

function getRiskSummary(level: StudentRiskLevel, score: number) {
    switch (level) {
        case 'critical':
            return `El alumno está en zona de abandono o desconexión fuerte. Score ${score}/100.`
        case 'high':
            return `El alumno requiere intervención rápida para evitar caída de continuidad. Score ${score}/100.`
        case 'medium':
            return `Hay señales tempranas de riesgo. Conviene actuar antes de que empeore. Score ${score}/100.`
        case 'low':
        default:
            return `El alumno está estable. Solo requiere seguimiento normal. Score ${score}/100.`
    }
}

export function calculateStudentRisk(metrics: StudentRiskMetrics): StudentRiskResult {
    const reasons: StudentRiskReason[] = []
    let score = 0

    const daysSinceLastWorkout = daysBetween(metrics.lastWorkoutAt)
    const adherenceRate = metrics.adherenceRate
    const stagnantDays = metrics.stagnantDays
    const progressCount30d = metrics.progressCount30d
    const totalSessions = metrics.totalSessions

    if (!metrics.activeStatus) {
        reasons.push({
            key: 'inactive_status',
            label: 'Alumno inactivo',
            points: 25,
            severity: 'danger',
            description: 'El alumno figura con estado inactivo.'
        })
        score += 25
    }

    if (daysSinceLastWorkout === null) {
        reasons.push({
            key: 'no_recent_training',
            label: 'Sin entrenamientos registrados',
            points: 30,
            severity: 'danger',
            description: 'No hay una última sesión registrada o el dato está vacío.'
        })
        score += 30
    } else if (daysSinceLastWorkout >= 21) {
        reasons.push({
            key: 'very_long_inactivity',
            label: 'Hace mucho que no entrena',
            points: 40,
            severity: 'danger',
            description: `Pasaron ${daysSinceLastWorkout} días desde el último entrenamiento.`
        })
        score += 40
    } else if (daysSinceLastWorkout >= 14) {
        reasons.push({
            key: 'long_inactivity',
            label: 'Lleva semanas sin entrenar',
            points: 30,
            severity: 'danger',
            description: `Pasaron ${daysSinceLastWorkout} días desde el último entrenamiento.`
        })
        score += 30
    } else if (daysSinceLastWorkout >= 8) {
        reasons.push({
            key: 'medium_inactivity',
            label: 'Varios días sin entrenar',
            points: 18,
            severity: 'warning',
            description: `Pasaron ${daysSinceLastWorkout} días desde el último entrenamiento.`
        })
        score += 18
    } else if (daysSinceLastWorkout >= 5) {
        reasons.push({
            key: 'early_inactivity',
            label: 'Empezó a entrenar menos seguido',
            points: 10,
            severity: 'warning',
            description: `Pasaron ${daysSinceLastWorkout} días desde el último entrenamiento.`
        })
        score += 10
    }

    if (adherenceRate !== null) {
        if (adherenceRate < 30) {
            reasons.push({
                key: 'very_low_adherence',
                label: 'Casi no cumple los entrenamientos',
                points: 50,
                severity: 'danger',
                description: `La adherencia está en ${Math.round(adherenceRate)}%.`
            })
            score += 50
        } else if (adherenceRate < 50) {
            reasons.push({
                key: 'low_adherence',
                label: 'Cumple pocos entrenamientos',
                points: 35,
                severity: 'danger',
                description: `La adherencia está en ${Math.round(adherenceRate)}%.`
            })
            score += 35
        } else if (adherenceRate < 70) {
            reasons.push({
                key: 'fair_adherence',
                label: 'Podría cumplir más entrenamientos',
                points: 20,
                severity: 'warning',
                description: `La adherencia está en ${Math.round(adherenceRate)}%.`
            })
            score += 20
        } else if (adherenceRate < 85) {
            reasons.push({
                key: 'slightly_low_adherence',
                label: 'Cumplimiento algo bajo',
                points: 8,
                severity: 'info',
                description: `La adherencia está en ${Math.round(adherenceRate)}%.`
            })
            score += 8
        }
    }

    if (stagnantDays !== null) {
        if (stagnantDays >= 60) {
            reasons.push({
                key: 'hard_stagnation',
                label: 'Mucho tiempo sin mejorar marcas',
                points: 18,
                severity: 'warning',
                description: `No hay progreso claro hace ${stagnantDays} días.`
            })
            score += 18
        } else if (stagnantDays >= 40) {
            reasons.push({
                key: 'medium_stagnation',
                label: 'Sin mejoras recientes en marcas',
                points: 10,
                severity: 'warning',
                description: `No hay progreso claro hace ${stagnantDays} días.`
            })
            score += 10
        }
    }

    if (progressCount30d !== null) {
        if (progressCount30d === 0) {
            reasons.push({
                key: 'no_progress_30d',
                label: 'Sin avances recientes',
                points: 8,
                severity: 'info',
                description: 'No se detectaron progresos destacados en los últimos 30 días.'
            })
            score += 8
        } else if (progressCount30d >= 4) {
            reasons.push({
                key: 'good_recent_progress',
                label: 'Tuvo avances recientes',
                points: -8,
                severity: 'info',
                description: `Se detectaron ${progressCount30d} progresos recientes, lo que baja el riesgo.`
            })
            score -= 8
        }
    }

    if (totalSessions !== null) {
        if (totalSessions <= 3) {
            reasons.push({
                key: 'very_low_history',
                label: 'Todavía entrena muy poco',
                points: 18,
                severity: 'warning',
                description: `El alumno tiene solo ${totalSessions} sesiones registradas.`
            })
            score += 18
        } else if (totalSessions <= 6) {
            reasons.push({
                key: 'low_history',
                label: 'Todavía entrena poco',
                points: 10,
                severity: 'info',
                description: `El alumno tiene ${totalSessions} sesiones registradas.`
            })
            score += 10
        } else if (totalSessions >= 20) {
            reasons.push({
                key: 'solid_history',
                label: 'Tiene historial sólido de entrenamientos',
                points: -6,
                severity: 'info',
                description: `El alumno ya acumuló ${totalSessions} sesiones, lo que reduce el riesgo.`
            })
            score -= 6
        }
    }

    if (
        adherenceRate !== null &&
        adherenceRate >= 80 &&
        daysSinceLastWorkout !== null &&
        daysSinceLastWorkout <= 3
    ) {
        reasons.push({
            key: 'strong_consistency',
            label: 'Entrena con constancia y buena adherencia',
            points: -10,
            severity: 'info',
            description: 'Entrena con buena frecuencia y buena adherencia.'
        })
        score -= 10
    }

    score = clamp(score, 0, 100)
    const level = getRiskLevel(score)

    const actions: string[] = []

    if (level === 'critical') {
        actions.push('Contactar hoy mismo con mensaje personalizado y propuesta concreta de regreso.')
        actions.push('Simplificar la rutina para bajar fricción y recuperar continuidad.')
        actions.push('Ofrecer una semana de reinicio o un objetivo corto de reenganche.')
    } else if (level === 'high') {
        actions.push('Escribir hoy o mañana para frenar la caída de adherencia.')
        actions.push('Revisar si la rutina es demasiado larga, exigente o poco clara.')
        actions.push('Definir una meta simple para los próximos 7 días.')
    } else if (level === 'medium') {
        actions.push('Escribir seguimiento breve y reforzar objetivo de la semana.')
        actions.push('Chequear adherencia y ajustar volumen si viene justo de tiempo.')
        actions.push('Buscar un progreso rápido visible para recuperar motivación.')
    } else {
        actions.push('Mantener seguimiento normal.')
        actions.push('Seguir marcando progresos y consistencia.')
        actions.push('Usar este alumno como perfil saludable del sistema.')
    }

    return {
        score,
        level,
        title: getRiskTitle(level),
        summary: getRiskSummary(level, score),
        reasons: reasons.sort((a, b) => b.points - a.points),
        actions,
        metrics: {
            daysSinceLastWorkout,
            adherenceRate,
            stagnantDays,
            progressCount30d,
            totalSessions
        }
    }
}