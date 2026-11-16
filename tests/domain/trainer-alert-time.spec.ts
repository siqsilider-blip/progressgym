import { expect, test } from '@playwright/test'
import { formatOpenSessionAge, getSessionActivityAt, isStaleOpenSession } from '../../src/lib/trainerAlertTime'

const now = new Date('2026-11-15T21:00:00.000Z')

test.describe('trainer open-session alerts', () => {
    test('alerts only after the six-hour threshold', () => {
        expect(isStaleOpenSession('2026-11-15T15:00:01.000Z', now)).toBe(false)
        expect(isStaleOpenSession('2026-11-15T15:00:00.000Z', now)).toBe(true)
    })

    test('uses the last saved set instead of the session start', () => {
        const recentActivity = getSessionActivityAt(
            '2026-11-15T11:00:00.000Z',
            '2026-11-15T19:00:00.000Z'
        )
        expect(isStaleOpenSession(recentActivity, now)).toBe(false)

        const staleActivity = getSessionActivityAt(
            '2026-11-15T09:00:00.000Z',
            '2026-11-15T15:00:00.000Z'
        )
        expect(isStaleOpenSession(staleActivity, now)).toBe(true)
    })

    test('falls back to the start when the last activity timestamp is invalid', () => {
        const fallback = getSessionActivityAt('2026-11-15T14:00:00.000Z', 'invalid-date')
        expect(fallback).toBe('2026-11-15T14:00:00.000Z')
        expect(formatOpenSessionAge(fallback, now)).toBe('hace 7 horas')
    })

    test('shows the real elapsed hours instead of the threshold', () => {
        expect(formatOpenSessionAge('2026-11-15T12:20:00.000Z', now)).toBe('hace 8 horas')
        expect(formatOpenSessionAge('2026-11-15T14:20:00.000Z', now)).toBe('hace 6 horas')
    })

    test('uses clearer copy for sessions from previous days', () => {
        expect(formatOpenSessionAge('2026-11-14T20:00:00.000Z', now)).toBe('desde ayer')
        expect(formatOpenSessionAge('2026-11-12T08:00:00.000Z', now)).toBe('hace 3 días')
    })

    test('handles invalid timestamps without exposing a broken value', () => {
        expect(isStaleOpenSession('invalid-date', now)).toBe(false)
        expect(formatOpenSessionAge('invalid-date', now)).toBe('hace varias horas')
    })
})
