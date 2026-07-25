import { createClient } from '@/lib/supabase/server'
import { calculateStudentRisk, type StudentRiskResult } from './student-risk'

type RiskMetricsRow = {
    student_id: string
    last_workout_at: string | null
    total_sessions: number
    adherence_rate: number | null
    stagnant_days: number | null
    progress_count: number | null
}

export function fallbackRisk(): StudentRiskResult {
    return calculateStudentRisk({
        lastWorkoutAt: null,
        adherenceRate: null,
        stagnantDays: null,
        progressCount30d: null,
        totalSessions: null,
        activeStatus: true,
    })
}

export async function getStudentsRiskBatch(
    studentIds: string[]
): Promise<Map<string, StudentRiskResult>> {
    const result = new Map<string, StudentRiskResult>()
    if (studentIds.length === 0) return result

    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_students_risk_metrics', {
        p_student_ids: studentIds,
    })

    if (error) {
        console.error('Error fetching students risk metrics:', error)
        return result
    }

    for (const row of (data ?? []) as RiskMetricsRow[]) {
        result.set(
            row.student_id,
            calculateStudentRisk({
                lastWorkoutAt: row.last_workout_at,
                adherenceRate: row.adherence_rate,
                stagnantDays: row.stagnant_days,
                progressCount30d: row.progress_count,
                totalSessions: row.total_sessions,
                activeStatus: true,
            })
        )
    }

    return result
}

export async function getStudentRisk(studentId: string): Promise<StudentRiskResult> {
    const batch = await getStudentsRiskBatch([studentId])
    return batch.get(studentId) ?? fallbackRisk()
}