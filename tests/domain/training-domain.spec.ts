import { expect, test } from '@playwright/test'
import {
    getProgramCyclePosition,
    getRoutineDayProgressStatus,
    getWorkoutCompletionKind,
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
        })).toBe('complete')
        expect(isCompletedWorkoutSession({
            status: 'completed',
            completed_manually: true,
            completion_status: 'complete',
        })).toBe(true)
    })

    test('an auto-closed session never completes the training day', () => {
        expect(statusFor([{
            routine_day_id: dayId,
            performed_date: today,
            status: 'completed',
            completed_manually: false,
            completion_status: 'complete',
        }])).toBe('pending')
    })

    test('an explicitly incomplete session remains incomplete', () => {
        expect(statusFor([{
            routine_day_id: dayId,
            performed_date: today,
            status: 'completed',
            completed_manually: true,
            completion_status: 'incomplete',
        }])).toBe('incomplete')
    })

    test('a full completion takes precedence over an earlier incomplete session', () => {
        expect(statusFor([
            {
                routine_day_id: dayId,
                performed_date: '2026-11-10',
                status: 'completed',
                completed_manually: true,
                completion_status: 'incomplete',
            },
            {
                routine_day_id: dayId,
                performed_date: '2026-11-14',
                status: 'completed',
                completed_manually: true,
                completion_status: 'complete',
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
            },
            {
                routine_day_id: dayId,
                performed_date: today,
                status: 'in_progress',
                completed_manually: false,
                completion_status: null,
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
        }])).toBe('pending')
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
