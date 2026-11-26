import { expect, test } from '@playwright/test'
import { getStudentTrainingDates, getStudentTrainingRecommendation } from '../../src/lib/studentTrainingRecommendation'
import type { RoutineDayProgressStatus } from '../../src/lib/trainingDomain'

const weekStart = '2026-11-23'
const plannedDates = getStudentTrainingDates(weekStart, [5, 1, 3], 3)

function recommendation(
    today: string,
    statuses: RoutineDayProgressStatus[] = ['pending', 'pending', 'pending'],
    options: { todayActivityId?: string; plannedDates?: string[]; programStartedOn?: string } = {}
) {
    return getStudentTrainingRecommendation({
        days: statuses.map((status, index) => ({ id: `day-${index + 1}`, status })),
        today,
        todayActivityId: options.todayActivityId ?? null,
        plannedDates: options.plannedDates ?? plannedDates,
        programStartedOn: options.programStartedOn ?? weekStart,
    })
}

test('uses configured dates in their order within a non-Monday program week', () => {
    expect(getStudentTrainingDates('2026-11-25', [1, 3, 5], 3))
        .toEqual(['2026-11-25', '2026-11-27', '2026-11-30'])
    expect(getStudentTrainingDates(weekStart, [1], 3)).toEqual([])
})

test('assigns one workout in trainer order and shows the next planned date', () => {
    const result = recommendation(weekStart)
    expect(result.todayDay?.id).toBe('day-1')
    expect(result.next).toEqual({ day: { id: 'day-2', status: 'pending' }, date: '2026-11-25' })
})

test('shows rest after the previous session and catches up when it was missed', () => {
    const rest = recommendation('2026-11-24', ['completed', 'pending', 'pending'])
    expect(rest.todayDay).toBeNull()
    expect(rest.restDay).toBe(true)
    expect(rest.next?.day.id).toBe('day-2')
    expect(recommendation('2026-11-24').todayDay?.id).toBe('day-1')
})

test('preserves recorded activity and skips earlier partial or completed workouts for the next start', () => {
    const today = recommendation('2026-11-25', ['in_progress', 'completed', 'pending'], { todayActivityId: 'day-2' })
    expect(today.todayDay?.id).toBe('day-2')
    expect(recommendation('2026-11-27', ['partial', 'completed', 'pending']).todayDay?.id).toBe('day-3')
    expect(recommendation('2026-11-27', ['partial', 'completed', 'completed']).todayDay).toBeNull()
})

test('uses the first pending workout without scheduled days and respects a future program start', () => {
    expect(recommendation('2026-11-24', ['completed', 'pending', 'pending'], { plannedDates: [] }).todayDay?.id).toBe('day-2')
    const future = recommendation('2026-11-22')
    expect(future.todayDay).toBeNull()
    expect(future.programStartsLater).toBe(true)
})
