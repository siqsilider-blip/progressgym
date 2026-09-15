import type { createClient } from '@/lib/supabase/server'
import { getCurrentBuenosAiresWeek } from '@/lib/buenosAiresDate'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type RoutineDayProgressStatus = 'pending' | 'in_progress' | 'completed'

type WorkoutSessionRow = {
    routine_day_id: string | null
}

export type RoutineWeekProgress = {
    statusByDayId: Map<string, RoutineDayProgressStatus>
    completedDayIds: Set<string>
    inProgressDayIds: Set<string>
    weekStart: string
    weekEnd: string
}

/**
 * Builds the student's progress for routine days during the current calendar
 * week. An unfinished session always wins so the student can resume it even if
 * it was started before Monday.
 */
export async function getStudentRoutineWeekProgress(
    supabase: SupabaseServerClient,
    studentId: string,
    routineDayIds: string[]
): Promise<RoutineWeekProgress> {
    const { weekStart, weekEnd } = getCurrentBuenosAiresWeek()
    const statusByDayId = new Map<string, RoutineDayProgressStatus>()
    const completedDayIds = new Set<string>()
    const inProgressDayIds = new Set<string>()

    for (const dayId of routineDayIds) statusByDayId.set(dayId, 'pending')

    if (routineDayIds.length === 0) {
        return { statusByDayId, completedDayIds, inProgressDayIds, weekStart, weekEnd }
    }

    const [activeResult, completedResult] = await Promise.all([
        supabase
            .from('workout_sessions')
            .select('routine_day_id')
            .eq('student_id', studentId)
            .eq('status', 'in_progress')
            .in('routine_day_id', routineDayIds),
        supabase
            .from('workout_sessions')
            .select('routine_day_id')
            .eq('student_id', studentId)
            .eq('status', 'completed')
            .gte('performed_date', weekStart)
            .lte('performed_date', weekEnd)
            .in('routine_day_id', routineDayIds),
    ])

    for (const session of (completedResult.data as WorkoutSessionRow[] | null) ?? []) {
        if (!session.routine_day_id) continue
        completedDayIds.add(session.routine_day_id)
        statusByDayId.set(session.routine_day_id, 'completed')
    }

    for (const session of (activeResult.data as WorkoutSessionRow[] | null) ?? []) {
        if (!session.routine_day_id) continue
        inProgressDayIds.add(session.routine_day_id)
        statusByDayId.set(session.routine_day_id, 'in_progress')
    }

    return { statusByDayId, completedDayIds, inProgressDayIds, weekStart, weekEnd }
}
