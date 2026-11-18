import { expect, test } from '@playwright/test'
import {
    getProgramCyclePosition,
    getRoutineDayProgress,
    getRoutineDayProgressStatus,
    getTodayWorkoutActivity,
    getWorkoutCompletionKind,
    hasMeaningfulWorkoutActivity,
    isCompletedWorkoutSession,
    type WorkoutSessionProgressRow,
} from '../../src/lib/trainingDomain'

const dayId = 'day-1'
const weekStart = '2026-11-09'
const weekEnd = '2026-11-15'
const today = '2026-11-15'

function statusFor(sessions: WorkoutSessionProgressRow[]) {
    return getRoutineDayProgressStatus({ dayId, sessions, today, weekStart, weekEnd })
}

test.describe('training completion domain', () => {
    test('only explicit full completion counts as complete', () => {
        expect(getWorkoutCompletionKind({
            status: 'completed',
            completed_manually: true,
            completion_status: 'complete',
            recorded_sets: 12,
        })).toBe('complete')
        expect(isCompletedWorkoutSession({
            status: 'completed',
            completed_manually: true,
            completion_status: 'complete',
            recorded_sets: 12,
        })).toBe(true)
    })

    test('an empty auto-closed session remains not started', () => {
        expect(statusFor([{
            routine_day_id: dayId,
            performed_date: today,
            status: 'completed',
            completed_manually: false,
            completion_status: 'complete',
            recorded_sets: 0,
        }])).toBe('pending')
    })

    test('an auto-closed session with saved sets becomes partial activity', () => {
        const session = {
            routine_day_id: dayId,
            performed_date: today,
            status: 'completed',
            completed_manually: false,
            completion_status: null,
            recorded_sets: 8,
        }

        expect(statusFor([session])).toBe('partial')
        expect(getWorkoutCompletionKind(session)).toBe('partial')
        expect(hasMeaningfulWorkoutActivity(session)).toBe(true)
    })

    test('an explicitly incomplete session remains partial', () => {
        expect(statusFor([{
            routine_day_id: dayId,
            performed_date: today,
            status: 'completed',
            completed_manually: true,
            completion_status: 'incomplete',
            recorded_sets: 8,
        }])).toBe('partial')
    })

    test('a full completion takes precedence over an earlier incomplete session', () => {
        expect(statusFor([
            {
                routine_day_id: dayId,
                performed_date: '2026-11-10',
                status: 'completed',
                completed_manually: true,
                completion_status: 'incomplete',
                recorded_sets: 8,
            },
            {
                routine_day_id: dayId,
                performed_date: '2026-11-14',
                status: 'completed',
                completed_manually: true,
                completion_status: 'complete',
                recorded_sets: 12,
            },
        ])).toBe('completed')
    })

    test('a session currently open today takes precedence in the UI', () => {
        expect(statusFor([
            {
                routine_day_id: dayId,
                performed_date: '2026-11-10',
                status: 'completed',
                completed_manually: true,
                completion_status: 'complete',
                recorded_sets: 12,
            },
            {
                routine_day_id: dayId,
                performed_date: today,
                status: 'in_progress',
                completed_manually: false,
                completion_status: null,
                recorded_sets: 1,
            },
        ])).toBe('in_progress')
    })

    test('sessions outside the selected week do not affect it', () => {
        expect(statusFor([{
            routine_day_id: dayId,
            performed_date: '2026-11-08',
            status: 'completed',
            completed_manually: true,
            completion_status: 'complete',
            recorded_sets: 12,
        }])).toBe('pending')
    })

    test('a previous-day open session with saved sets is partial, not current', () => {
        expect(statusFor([{
            id: 'old-open-session',
            routine_day_id: dayId,
            performed_date: '2026-11-14',
            started_at: '2026-11-14T20:00:00.000Z',
            status: 'in_progress',
            completed_manually: false,
            completion_status: null,
            recorded_sets: 3,
        }])).toBe('partial')
    })

    test('returns the exact session that explains the day status', () => {
        expect(getRoutineDayProgress({
            dayId,
            today,
            weekStart,
            weekEnd,
            sessions: [{
                id: 'partial-session',
                routine_day_id: dayId,
                performed_date: today,
                started_at: '2026-11-15T12:00:00.000Z',
                status: 'completed',
                completed_manually: false,
                completion_status: null,
                recorded_sets: 2,
            }],
        })).toEqual({ status: 'partial', sessionId: 'partial-session' })
    })

    test('a session without saved sets is not meaningful activity', () => {
        expect(hasMeaningfulWorkoutActivity({
            status: 'completed',
            completed_manually: false,
            completion_status: null,
            recorded_sets: 0,
        })).toBe(false)
    })
})

test.describe('daily workout selection', () => {
    test('keeps every routine available when there is no meaningful activity today', () => {
        expect(getTodayWorkoutActivity({
            today,
            sessions: [{
                id: 'empty-session',
                routine_day_id: 'day-2',
                performed_date: today,
                started_at: '2026-11-15T12:00:00.000Z',
                status: 'in_progress',
                completed_manually: false,
                completion_status: null,
                recorded_sets: 0,
            }],
        })).toBeNull()
    })

    test('selects the routine that received a saved set today', () => {
        expect(getTodayWorkoutActivity({
            today,
            sessions: [{
                id: 'active-session',
                routine_day_id: 'day-3',
                performed_date: today,
                started_at: '2026-11-15T12:00:00.000Z',
                status: 'in_progress',
                completed_manually: false,
                completion_status: null,
                recorded_sets: 1,
            }],
        })).toEqual({ dayId: 'day-3', sessionId: 'active-session' })
    })

    test('does not carry yesterday selection into the next day', () => {
        expect(getTodayWorkoutActivity({
            today,
            sessions: [{
                id: 'yesterday-session',
                routine_day_id: 'day-1',
                performed_date: '2026-11-14',
                started_at: '2026-11-14T12:00:00.000Z',
                status: 'completed',
                completed_manually: true,
                completion_status: 'complete',
                recorded_sets: 12,
            }],
        })).toBeNull()
    })

    test('an explicit manual completion consumes today even without recorded set metadata', () => {
        expect(getTodayWorkoutActivity({
            today,
            sessions: [{
                id: 'completed-session',
                routine_day_id: 'day-1',
                performed_date: today,
                started_at: '2026-11-15T12:00:00.000Z',
                status: 'completed',
                completed_manually: true,
                completion_status: 'complete',
                recorded_sets: 0,
            }],
        })).toEqual({ dayId: 'day-1', sessionId: 'completed-session' })
    })

    test('an empty opening can be changed, but the first saved set locks the daily choice', () => {
        const date = '2026-11-12'
        const emptyOpening: WorkoutSessionProgressRow = {
            id: 'empty-day-1',
            routine_day_id: 'day-1',
            performed_date: date,
            started_at: '2026-11-12T12:00:00.000Z',
            status: 'in_progress',
            completed_manually: false,
            completion_status: null,
            recorded_sets: 0,
        }

        expect(getTodayWorkoutActivity({ today: date, sessions: [emptyOpening] })).toBeNull()

        const firstSavedSet: WorkoutSessionProgressRow = {
            id: 'chosen-day-2',
            routine_day_id: 'day-2',
            performed_date: date,
            started_at: '2026-11-12T12:05:00.000Z',
            status: 'in_progress',
            completed_manually: false,
            completion_status: null,
            recorded_sets: 1,
        }

        const selected = getTodayWorkoutActivity({
            today: date,
            sessions: [emptyOpening, firstSavedSet],
        })

        expect(selected).toEqual({ dayId: 'day-2', sessionId: 'chosen-day-2' })
        expect(['day-1', 'day-2', 'day-3'].filter((candidate) => candidate !== selected?.dayId))
            .toEqual(['day-1', 'day-3'])
    })

    test('the following day unlocks only the remaining workouts in the program week', () => {
        const firstDay = '2026-11-12'
        const nextDay = '2026-11-13'
        const sessions: WorkoutSessionProgressRow[] = [{
            id: 'completed-day-2',
            routine_day_id: 'day-2',
            performed_date: firstDay,
            started_at: '2026-11-12T12:00:00.000Z',
            status: 'completed',
            completed_manually: true,
            completion_status: 'complete',
            recorded_sets: 12,
        }]

        expect(getTodayWorkoutActivity({ today: nextDay, sessions })).toBeNull()

        const statuses = new Map(['day-1', 'day-2', 'day-3'].map((routineDayId) => [
            routineDayId,
            getRoutineDayProgressStatus({
                dayId: routineDayId,
                sessions,
                today: nextDay,
                weekStart: '2026-11-09',
                weekEnd: '2026-11-15',
            }),
        ]))

        expect(statuses.get('day-2')).toBe('completed')
        expect([...statuses].filter(([, status]) => status === 'pending').map(([routineDayId]) => routineDayId))
            .toEqual(['day-1', 'day-3'])
    })

    test('a partially recorded workout cannot become a new pending choice again that week', () => {
        const sessions: WorkoutSessionProgressRow[] = [{
            id: 'partial-day-1',
            routine_day_id: 'day-1',
            performed_date: '2026-11-10',
            started_at: '2026-11-10T12:00:00.000Z',
            status: 'completed',
            completed_manually: false,
            completion_status: null,
            recorded_sets: 1,
        }]

        expect(getRoutineDayProgressStatus({
            dayId: 'day-1',
            sessions,
            today: '2026-11-13',
            weekStart: '2026-11-09',
            weekEnd: '2026-11-15',
        })).toBe('partial')
    })
})

test.describe('program week cycle', () => {
    test('cycles from the last structural week back to the first', () => {
        expect(getProgramCyclePosition(3, 0)).toEqual({
            currentCycleStartWeekIndex: 0,
            currentWeekIndex: 0,
            programWeekNumber: 1,
        })
        expect(getProgramCyclePosition(3, 2).programWeekNumber).toBe(3)
        expect(getProgramCyclePosition(3, 3)).toEqual({
            currentCycleStartWeekIndex: 3,
            currentWeekIndex: 0,
            programWeekNumber: 1,
        })
        expect(getProgramCyclePosition(3, 7)).toEqual({
            currentCycleStartWeekIndex: 6,
            currentWeekIndex: 1,
            programWeekNumber: 2,
        })
    })

    test('handles routines without structural weeks safely', () => {
        expect(getProgramCyclePosition(0, 12)).toEqual({
            currentCycleStartWeekIndex: 0,
            currentWeekIndex: -1,
            programWeekNumber: 0,
        })
    })
})
