export const WORKOUT_SESSION_STATUS = {
    inProgress: 'in_progress',
    completed: 'completed',
} as const

export const WORKOUT_COMPLETION_STATUS = {
    complete: 'complete',
    incomplete: 'incomplete',
} as const

export type WorkoutCompletionKind = 'complete' | 'partial' | null
export type RoutineDayProgressStatus = 'pending' | 'in_progress' | 'partial' | 'completed'
export type RoutineDayProgress = {
    status: RoutineDayProgressStatus
    sessionId: string | null
}

export type WorkoutSessionProgressRow = {
    id?: string | null
    routine_day_id: string | null
    performed_date: string | null
    started_at?: string | null
    status: string | null
    completed_manually?: boolean | null
    completion_status?: string | null
    recorded_sets?: number | null
}

/**
 * A training day is complete only when the student explicitly finished it and
 * every planned set was registered. Auto-closed or partially completed
 * sessions remain useful activity, but never become a completed day.
 */
export function getWorkoutCompletionKind(
    session: Pick<WorkoutSessionProgressRow, 'status' | 'completed_manually' | 'completion_status' | 'recorded_sets'>
): WorkoutCompletionKind {
    if (
        session.status === WORKOUT_SESSION_STATUS.completed
        && session.completed_manually === true
        && session.completion_status === WORKOUT_COMPLETION_STATUS.complete
    ) return 'complete'

    if (
        session.status === WORKOUT_SESSION_STATUS.completed
        && session.completed_manually === true
        && session.completion_status === WORKOUT_COMPLETION_STATUS.incomplete
    ) return 'partial'

    // Una serie realmente guardada es actividad, incluso cuando la sesión se
    // cerró automáticamente o quedó abierta al cambiar de día. Nunca completa
    // el plan por sí sola, pero tampoco debe desaparecer ni generar inactividad.
    if (
        (session.status === WORKOUT_SESSION_STATUS.completed || session.status === WORKOUT_SESSION_STATUS.inProgress)
        && (session.recorded_sets ?? 0) > 0
    ) return 'partial'
    return null
}

export function isCompletedWorkoutSession(
    session: Pick<WorkoutSessionProgressRow, 'status' | 'completed_manually' | 'completion_status' | 'recorded_sets'>
) {
    return getWorkoutCompletionKind(session) === 'complete'
}

export function hasMeaningfulWorkoutActivity(
    session: Pick<WorkoutSessionProgressRow, 'status' | 'completed_manually' | 'completion_status' | 'recorded_sets'>
) {
    return getWorkoutCompletionKind(session) !== null
}

export function getRoutineDayProgress(input: {
    dayId: string
    sessions: readonly WorkoutSessionProgressRow[]
    today: string
    weekStart: string
    weekEnd: string
}): RoutineDayProgress {
    const relevant = input.sessions.filter((session) => (
        session.routine_day_id === input.dayId
        && typeof session.performed_date === 'string'
        && session.performed_date >= input.weekStart
        && session.performed_date <= input.weekEnd
    ))

    const latest = (sessions: readonly WorkoutSessionProgressRow[]) => [...sessions]
        .sort((left, right) => {
            const dateDifference = String(right.performed_date ?? '').localeCompare(String(left.performed_date ?? ''))
            if (dateDifference !== 0) return dateDifference
            return String(right.started_at ?? '').localeCompare(String(left.started_at ?? ''))
        })[0]

    const active = latest(relevant.filter((session) => (
        session.status === WORKOUT_SESSION_STATUS.inProgress
        && session.performed_date === input.today
    )))

    if (active) {
        return { status: 'in_progress', sessionId: active.id ?? null }
    }

    const complete = latest(relevant.filter((session) => getWorkoutCompletionKind(session) === 'complete'))
    if (complete) {
        return { status: 'completed', sessionId: complete.id ?? null }
    }

    const partial = latest(relevant.filter((session) => getWorkoutCompletionKind(session) === 'partial'))
    if (partial) {
        return { status: 'partial', sessionId: partial.id ?? null }
    }

    return { status: 'pending', sessionId: null }
}

export function getRoutineDayProgressStatus(
    input: Parameters<typeof getRoutineDayProgress>[0]
): RoutineDayProgressStatus {
    return getRoutineDayProgress(input).status
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
