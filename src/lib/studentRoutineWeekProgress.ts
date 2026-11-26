import type { createClient } from '@/lib/supabase/server'
import { getBuenosAiresDateString, getCurrentBuenosAiresWeek } from '@/lib/buenosAiresDate'
import {
    getTodayWorkoutActivity,
    getRoutineDayProgress,
    type RoutineDayProgressStatus,
    type WorkoutSessionProgressRow,
} from '@/lib/trainingDomain'

export type { RoutineDayProgressStatus } from '@/lib/trainingDomain'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type RoutineWeekProgress = {
    statusByDayId: Map<string, RoutineDayProgressStatus>
    sessionIdByDayId: Map<string, string>
    recordedSetIndexesBySession: Map<string, Map<string, Set<number>>>
    completedDayIds: Set<string>
    inProgressDayIds: Set<string>
    partialDayIds: Set<string>
    todayActivityDayId: string | null
    todayActivitySessionId: string | null
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
    const sessionIdByDayId = new Map<string, string>()
    const recordedSetIndexesBySession = new Map<string, Map<string, Set<number>>>()
    const completedDayIds = new Set<string>()
    const inProgressDayIds = new Set<string>()
    const partialDayIds = new Set<string>()

    for (const dayId of routineDayIds) statusByDayId.set(dayId, 'pending')

    if (routineDayIds.length === 0) {
        return {
            statusByDayId,
            sessionIdByDayId,
            recordedSetIndexesBySession,
            completedDayIds,
            inProgressDayIds,
            partialDayIds,
            todayActivityDayId: null,
            todayActivitySessionId: null,
            weekStart,
            weekEnd,
        }
    }

    const sessionsResult = await supabase
        .from('workout_sessions')
        .select('id, routine_day_id, performed_date, started_at, status, completed_manually, completion_status')
        .eq('student_id', studentId)
        .in('status', ['in_progress', 'completed'])
        .gte('performed_date', weekStart)
        .lte('performed_date', weekEnd)
        .in('routine_day_id', routineDayIds)

    if (sessionsResult.error) throw sessionsResult.error

    const sessions = ((sessionsResult.data as WorkoutSessionProgressRow[] | null) ?? [])
    const sessionIds = sessions.map((session) => session.id).filter((id): id is string => Boolean(id))
    if (sessionIds.length > 0) {
        const { data: logs, error: logsError } = await supabase
            .from('exercise_logs')
            .select('workout_session_id, routine_day_exercise_id, set_index, reps')
            .in('workout_session_id', sessionIds)
            .gt('reps', 0)

        if (logsError) throw logsError

        for (const log of logs ?? []) {
            if (!log.workout_session_id || !log.routine_day_exercise_id || log.set_index == null || log.set_index < 0) continue
            const exercises = recordedSetIndexesBySession.get(log.workout_session_id) ?? new Map<string, Set<number>>()
            const indexes = exercises.get(log.routine_day_exercise_id) ?? new Set<number>()
            indexes.add(log.set_index)
            exercises.set(log.routine_day_exercise_id, indexes)
            recordedSetIndexesBySession.set(log.workout_session_id, exercises)
        }
    }

    const sessionsWithActivity: WorkoutSessionProgressRow[] = sessions.map((session) => {
        const exercises = session.id ? recordedSetIndexesBySession.get(session.id) : undefined
        const recordedSets = exercises
            ? Array.from(exercises.values()).reduce((total, indexes) => total + indexes.size, 0)
            : 0
        return { ...session, recorded_sets: recordedSets }
    })
    const todayActivity = getTodayWorkoutActivity({ sessions: sessionsWithActivity, today })

    for (const dayId of routineDayIds) {
        const progress = getRoutineDayProgress({
            dayId,
            sessions: sessionsWithActivity,
            today,
            weekStart,
            weekEnd,
        })
        const status = progress.status
        statusByDayId.set(dayId, status)
        if (progress.sessionId) sessionIdByDayId.set(dayId, progress.sessionId)
        if (status === 'completed') completedDayIds.add(dayId)
        if (status === 'partial') partialDayIds.add(dayId)
        if (status === 'in_progress') inProgressDayIds.add(dayId)
    }

    return {
        statusByDayId,
        sessionIdByDayId,
        recordedSetIndexesBySession,
        completedDayIds,
        inProgressDayIds,
        partialDayIds,
        todayActivityDayId: todayActivity?.dayId ?? null,
        todayActivitySessionId: todayActivity?.sessionId ?? null,
        weekStart,
        weekEnd,
    }
}
