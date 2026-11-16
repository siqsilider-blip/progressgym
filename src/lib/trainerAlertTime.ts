const HOUR_MS = 60 * 60 * 1000

export function getSessionActivityAt(startedAt: string | Date, lastActivityAt?: string | Date | null) {
    if (lastActivityAt) {
        const activityMs = lastActivityAt instanceof Date
            ? lastActivityAt.getTime()
            : new Date(lastActivityAt).getTime()
        if (Number.isFinite(activityMs)) return lastActivityAt
    }
    return startedAt
}

function elapsedMilliseconds(startedAt: string | Date, now: Date) {
    const startedAtMs = startedAt instanceof Date
        ? startedAt.getTime()
        : new Date(startedAt).getTime()

    if (!Number.isFinite(startedAtMs)) return null
    return Math.max(0, now.getTime() - startedAtMs)
}

export function isStaleOpenSession(
    startedAt: string | Date,
    now = new Date(),
    staleAfterHours = 6
) {
    const elapsedMs = elapsedMilliseconds(startedAt, now)
    return elapsedMs !== null && elapsedMs >= staleAfterHours * HOUR_MS
}

/**
 * Human-readable time since the last meaningful session activity. The stale
 * threshold is kept out of the copy so alerts never all say “hace 6 horas”.
 */
export function formatOpenSessionAge(startedAt: string | Date, now = new Date()) {
    const elapsedMs = elapsedMilliseconds(startedAt, now)
    if (elapsedMs === null) return 'hace varias horas'

    const elapsedHours = Math.floor(elapsedMs / HOUR_MS)
    if (elapsedHours < 1) return 'hace menos de una hora'
    if (elapsedHours < 24) {
        return `hace ${elapsedHours} ${elapsedHours === 1 ? 'hora' : 'horas'}`
    }

    const elapsedDays = Math.floor(elapsedHours / 24)
    if (elapsedDays === 1) return 'desde ayer'
    return `hace ${elapsedDays} días`
}
