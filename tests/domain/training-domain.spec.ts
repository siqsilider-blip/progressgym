import { expect, test } from '@playwright/test'
import {
    getProgramCyclePosition,
    getRoutineDayProgress,
    getRoutineDayProgressStatus,
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
