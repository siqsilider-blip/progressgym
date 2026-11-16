import { expect, test } from '@playwright/test'
import { formatOpenSessionAge, isStaleOpenSession } from '../../src/lib/trainerAlertTime'

const now = new Date('2026-11-15T21:00:00.000Z')

test.describe('trainer open-session alerts', () => {
    test('alerts only after the six-hour threshold', () => {
        expect(isStaleOpenSession('2026-11-15T15:00:01.000Z', now)).toBe(false)
        expect(isStaleOpenSession('2026-11-15T15:00:00.000Z', now)).toBe(true)
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
