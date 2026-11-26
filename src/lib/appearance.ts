export const APPEARANCES = {
    brand: { label: 'Progrezzia', background: '#111111', surface: '#1a1a1a', accent: '#c98796' },
    light: { label: 'Claro', background: '#ffffff', surface: '#f4f4f5', accent: '#27272a' },
    'neutral-dark': { label: 'Oscuro', background: '#101114', surface: '#191a1f', accent: '#d4d4d8' },
} as const

export type Appearance = keyof typeof APPEARANCES

export function isAppearance(value: unknown): value is Appearance {
    return value === 'brand' || value === 'light' || value === 'neutral-dark'
}

export function appearanceCookieName(userId: string) {
    return `progrezzia-appearance-${userId}`
}

export function resolveAppearance(preference: unknown, legacyTheme?: unknown): Appearance {
    if (isAppearance(preference)) return preference
    return legacyTheme === 'light' ? 'light' : 'brand'
}
