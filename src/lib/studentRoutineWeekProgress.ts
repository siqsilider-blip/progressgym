import type { createClient } from '@/lib/supabase/server'
import { getBuenosAiresDateString, getCurrentBuenosAiresWeek } from '@/lib/buenosAiresDate'
import {
    getRoutineDayProgressStatus,
    type RoutineDayProgressStatus,
    type WorkoutSessionProgressRow,
} from '@/lib/trainingDomain'

export type { RoutineDayProgressStatus } from '@/lib/trainingDomain'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type RoutineWeekProgress = {
    statusByDayId: Map<string, RoutineDayProgressStatus>
    completedDayIds: Set<string>
    inProgressDayIds: Set<string>
    incompleteDayIds: Set<string>
    weekStart: string
    weekEnd: string
}

/**
 * Builds the student's progress for routine days during the current calendar
 * week. Only a session opened today can take precedence. Abandoned sessions
 * from previous days must never send the student back to an old workout.
 */
export async function getStudentRoutineWeekProgress(
    supabase: SupabaseServerClient,
    studentId: string,
    routineDayIds: string[],
    programWeekRange?: { weekStart: string; weekEnd: string } | null
): Promise<RoutineWeekProgress> {
    const { weekStart, weekEnd } = programWeekRange ?? getCurrentBuenosAiresWeek()
    const today = getBuenosAiresDateString()
    const statusByDayId = new Map<string, RoutineDayProgressStatus>()
    const completedDayIds = new Set<string>()
    const inProgressDayIds = new Set<string>()
    const incompleteDayIds = new Set<string>()

    for (const dayId of routineDayIds) statusByDayId.set(dayId, 'pending')

    if (routineDayIds.length === 0) {
        return { statusByDayId, completedDayIds, inProgressDayIds, incompleteDayIds, weekStart, weekEnd }
    }

    const [activeResult, completedResult] = await Promise.all([
        supabase
            .from('workout_sessions')
            .select('routine_day_id, performed_date, status, completed_manually, completion_status')
            .eq('student_id', studentId)
            .eq('status', 'in_progress')
            .eq('performed_date', today)
            .in('routine_day_id', routineDayIds),
        supabase
            .from('workout_sessions')
            .select('routine_day_id, performed_date, status, completed_manually, completion_status')
            .eq('student_id', studentId)
            .eq('status', 'completed')
            .eq('completed_manually', true)
            .gte('performed_date', weekStart)
            .lte('performed_date', weekEnd)
            .in('routine_day_id', routineDayIds),
    ])

    if (activeResult.error) throw activeResult.error
    if (completedResult.error) throw completedResult.error

    const sessions: WorkoutSessionProgressRow[] = [
        ...((completedResult.data as WorkoutSessionProgressRow[] | null) ?? []),
        ...((activeResult.data as WorkoutSessionProgressRow[] | null) ?? []),
    ]

    for (const dayId of routineDayIds) {
        const status = getRoutineDayProgressStatus({
            dayId,
            sessions,
            today,
            weekStart,
            weekEnd,
        })
        statusByDayId.set(dayId, status)
        if (status === 'completed') completedDayIds.add(dayId)
        if (status === 'incomplete') incompleteDayIds.add(dayId)
        if (status === 'in_progress') inProgressDayIds.add(dayId)
    }

    return { statusByDayId, completedDayIds, inProgressDayIds, incompleteDayIds, weekStart, weekEnd }
}
