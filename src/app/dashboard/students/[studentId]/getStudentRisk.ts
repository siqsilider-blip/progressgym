import { calculateStudentRisk, type StudentRiskResult } from './student-risk'
import { getStudentStats } from '../getStudentStats'
import { getStudentAdherence } from '../getStudentAdherence'
import { getStudentStagnation } from '../getStudentStagnation'
import { getStudentTopProgress } from '../getStudentTopProgress'

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value

    if (typeof value === 'string' && value.trim() !== '') {
        const normalized = value.replace('%', '').replace(',', '.').trim()
        const parsed = Number(normalized)
        if (!Number.isNaN(parsed)) return parsed
    }

    return null
}

function pickFirstNumber(...values: unknown[]) {
    for (const value of values) {
        const parsed = asNumber(value)
        if (parsed !== null) return parsed
    }
    return null
}

function pickFirstString(...values: unknown[]) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim() !== '') return value
    }
    return null
}

export async function getStudentRisk(studentId: string): Promise<StudentRiskResult> {
    const [statsRaw, adherenceRaw, stagnationRaw, topProgressRaw] = await Promise.all([
        getStudentStats(studentId),
        getStudentAdherence(studentId),
        getStudentStagnation(studentId),
        getStudentTopProgress(studentId),
    ])

    const stats = (statsRaw ?? {}) as Record<string, unknown>
    const adherence = (adherenceRaw ?? {}) as Record<string, unknown>

    const stagnationArray = Array.isArray(stagnationRaw) ? stagnationRaw : []
    const stagnationFirst =
        stagnationArray.length > 0
            ? (stagnationArray[0] as Record<string, unknown>)
            : {}

    const topProgressArray = Array.isArray(topProgressRaw) ? topProgressRaw : []

    const lastWorkoutAt = pickFirstString(
        stats.lastWorkoutAt,
        stats.last_workout_at,
        stats.lastWorkoutDate,
        stats.last_workout_date,
        stats.lastSessionAt,
        stats.last_session_at
    )

    const totalSessions = pickFirstNumber(
        stats.totalSessions,
        stats.total_sessions,
        stats.sessions,
        stats.sessionsCount,
        stats.sessions_count
    )

    const completedSessions = pickFirstNumber(
        adherence.sessionsThisWeek
    )

    const expectedSessions = pickFirstNumber(
        adherence.expected
    )

    let adherenceRate = pickFirstNumber(
        adherence.adherence
    )

    if (adherenceRate === null && completedSessions !== null && expectedSessions !== null && expectedSessions > 0) {
        adherenceRate = (completedSessions / expectedSessions) * 100
    }

    const stagnantDays = pickFirstNumber(
        stagnationFirst.daysWithoutProgress,
        stagnationFirst.days_without_progress,
        stagnationFirst.stagnantDays,
        stagnationFirst.stagnant_days,
        stagnationFirst.days,
        stagnationFirst.daysSinceProgress,
        stagnationFirst.days_since_progress
    )

    const progressCount30d = topProgressArray.length

    return calculateStudentRisk({
        lastWorkoutAt,
        adherenceRate,
        stagnantDays,
        progressCount30d,
        totalSessions,
        activeStatus: true,
    })
}