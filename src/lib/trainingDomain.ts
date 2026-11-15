export const WORKOUT_SESSION_STATUS = {
    inProgress: 'in_progress',
    completed: 'completed',
} as const

export const WORKOUT_COMPLETION_STATUS = {
    complete: 'complete',
    incomplete: 'incomplete',
} as const

export type WorkoutCompletionKind = 'complete' | 'incomplete' | null
export type RoutineDayProgressStatus = 'pending' | 'in_progress' | 'incomplete' | 'completed'

export type WorkoutSessionProgressRow = {
    routine_day_id: string | null
    performed_date: string | null
    status: string | null
    completed_manually?: boolean | null
    completion_status?: string | null
}

/**
 * A training day is complete only when the student explicitly finished it and
 * every planned set was registered. Auto-closed or partially completed
 * sessions remain useful activity, but never become a completed day.
 */
export function getWorkoutCompletionKind(
    session: Pick<WorkoutSessionProgressRow, 'status' | 'completed_manually' | 'completion_status'>
): WorkoutCompletionKind {
    if (
        session.status !== WORKOUT_SESSION_STATUS.completed
        || session.completed_manually !== true
    ) {
        return null
    }

    if (session.completion_status === WORKOUT_COMPLETION_STATUS.complete) return 'complete'
    if (session.completion_status === WORKOUT_COMPLETION_STATUS.incomplete) return 'incomplete'
    return null
}

export function isCompletedWorkoutSession(
    session: Pick<WorkoutSessionProgressRow, 'status' | 'completed_manually' | 'completion_status'>
) {
    return getWorkoutCompletionKind(session) === 'complete'
}

export function getRoutineDayProgressStatus(input: {
    dayId: string
    sessions: readonly WorkoutSessionProgressRow[]
    today: string
    weekStart: string
    weekEnd: string
}): RoutineDayProgressStatus {
    const relevant = input.sessions.filter((session) => (
        session.routine_day_id === input.dayId
        && typeof session.performed_date === 'string'
        && session.performed_date >= input.weekStart
        && session.performed_date <= input.weekEnd
    ))

    if (relevant.some((session) => (
        session.status === WORKOUT_SESSION_STATUS.inProgress
        && session.performed_date === input.today
    ))) {
        return 'in_progress'
    }

    if (relevant.some((session) => getWorkoutCompletionKind(session) === 'complete')) {
        return 'completed'
    }

    if (relevant.some((session) => getWorkoutCompletionKind(session) === 'incomplete')) {
        return 'incomplete'
    }

    return 'pending'
}

export type ProgramCyclePosition = {
    currentCycleStartWeekIndex: number
    currentWeekIndex: number
    programWeekNumber: number
}

/** Resolves an endless N-week program cycle: 1 → ... → N → 1. */
export function getProgramCyclePosition(
    totalProgramWeeks: number,
    elapsedProgramWeekIndex: number
): ProgramCyclePosition {
    if (!Number.isInteger(totalProgramWeeks) || totalProgramWeeks <= 0) {
        return {
            currentCycleStartWeekIndex: 0,
            currentWeekIndex: -1,
            programWeekNumber: 0,
        }
    }

    const elapsedWeekIndex = Number.isFinite(elapsedProgramWeekIndex)
        ? Math.max(0, Math.floor(elapsedProgramWeekIndex))
        : 0
    const currentWeekIndex = elapsedWeekIndex % totalProgramWeeks

    return {
        currentCycleStartWeekIndex: Math.floor(elapsedWeekIndex / totalProgramWeeks) * totalProgramWeeks,
        currentWeekIndex,
        programWeekNumber: currentWeekIndex + 1,
    }
}
