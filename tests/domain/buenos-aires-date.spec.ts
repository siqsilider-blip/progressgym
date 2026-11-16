import { expect, test } from '@playwright/test'
import { getBuenosAiresDateString, getCurrentBuenosAiresWeek } from '../../src/lib/buenosAiresDate'

test.describe('Buenos Aires training dates', () => {
    test('changes day at midnight in Buenos Aires, not at UTC midnight', () => {
        expect(getBuenosAiresDateString(new Date('2026-11-16T02:59:59.000Z'))).toBe('2026-11-15')
        expect(getBuenosAiresDateString(new Date('2026-11-16T03:00:00.000Z'))).toBe('2026-11-16')
    })

    test('changes the weekly range exactly between Sunday and Monday locally', () => {
        expect(getCurrentBuenosAiresWeek(new Date('2026-11-16T02:59:59.000Z'))).toEqual({
            weekStart: '2026-11-09',
            weekEnd: '2026-11-15',
        })
        expect(getCurrentBuenosAiresWeek(new Date('2026-11-16T03:00:00.000Z'))).toEqual({
            weekStart: '2026-11-16',
            weekEnd: '2026-11-22',
        })
    })
})
