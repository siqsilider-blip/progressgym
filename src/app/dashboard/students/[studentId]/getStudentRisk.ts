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

type ActiveAssignmentRow = {
    student_id: string
    program_started_on: string | null
}

type ExerciseLogFallbackRow = {
    student_id: string
    performed_at: string | null
    created_at: string | null
}

async function buildRiskFallback(
    supabase: Awaited<ReturnType<typeof createClient>>,
    studentIds: string[],
    programStartByStudent: Map<string, string | null>
) {
    const fallback = new Map<string, StudentRiskResult>()
    const { data: logs, error } = await supabase
        .from('exercise_logs')
        .select('student_id, performed_at, created_at')
        .in('student_id', studentIds)

    if (error) {
        console.error('Error fetching fallback risk metrics:', error)
    }

    const sessionsByStudent = new Map<string, Set<string>>()
    const lastWorkoutByStudent = new Map<string, string>()

    for (const log of (logs ?? []) as ExerciseLogFallbackRow[]) {
        const workoutAt = log.performed_at ?? log.created_at
        if (!workoutAt) continue

        const sessionDate = workoutAt.slice(0, 10)
        const sessions = sessionsByStudent.get(log.student_id) ?? new Set<string>()
        sessions.add(sessionDate)
        sessionsByStudent.set(log.student_id, sessions)

        const previous = lastWorkoutByStudent.get(log.student_id)
        if (!previous || workoutAt > previous) {
            lastWorkoutByStudent.set(log.student_id, workoutAt)
        }
    }

    for (const studentId of studentIds) {
        fallback.set(studentId, calculateStudentRisk({
            lastWorkoutAt: lastWorkoutByStudent.get(studentId) ?? null,
            programStartedOn: programStartByStudent.get(studentId) ?? null,
            adherenceRate: null,
            stagnantDays: null,
            progressCount30d: null,
            totalSessions: sessionsByStudent.get(studentId)?.size ?? 0,
            activeStatus: true,
        }))
    }

    return fallback
}

export async function getStudentsRiskBatch(
    studentIds: string[]
): Promise<Map<string, StudentRiskResult>> {
    const result = new Map<string, StudentRiskResult>()
    if (studentIds.length === 0) return result

    const supabase = await createClient()

    const [{ data, error }, { data: assignments }] = await Promise.all([
        supabase.rpc('get_students_risk_metrics', {
            p_student_ids: studentIds,
        }),
        supabase
            .from('student_routines')
            .select('student_id, program_started_on')
            .in('student_id', studentIds)
            .eq('status', 'active'),
    ])

    const programStartByStudent = new Map(
        ((assignments as ActiveAssignmentRow[] | null) ?? [])
            .map((assignment) => [assignment.student_id, assignment.program_started_on])
    )

    if (error) {
        console.error('Error fetching students risk metrics:', error)
        return buildRiskFallback(supabase, studentIds, programStartByStudent)
    }

    for (const row of (data ?? []) as RiskMetricsRow[]) {
        result.set(
            row.student_id,
            calculateStudentRisk({
                lastWorkoutAt: row.last_workout_at,
                programStartedOn: programStartByStudent.get(row.student_id) ?? null,
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

export async function getStudentRisk(studentId: string): Promise<StudentRiskResult | null> {
    const batch = await getStudentsRiskBatch([studentId])
    return batch.get(studentId) ?? null
}
