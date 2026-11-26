import { expect, test } from '@playwright/test'
import { appearanceCookieName, isAppearance, resolveAppearance } from '../../src/lib/appearance'

test('the old dark theme and unknown values use Progrezzia', () => {
    expect(resolveAppearance(undefined, 'dark')).toBe('brand')
    expect(resolveAppearance('invalid', 'system')).toBe('brand')
    expect(resolveAppearance(undefined)).toBe('brand')
    expect(isAppearance('dark')).toBe(false)
})

test('an explicit choice takes precedence over the old account preference', () => {
    expect(resolveAppearance(undefined, 'light')).toBe('light')
    expect(resolveAppearance('neutral-dark', 'light')).toBe('neutral-dark')
    expect(resolveAppearance('brand', 'light')).toBe('brand')
    expect(appearanceCookieName('person-a')).not.toBe(appearanceCookieName('person-b'))
})
