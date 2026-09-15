function datePartsInBuenosAires(date: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date)

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hour: Number(values.hour),
    }
}

function formatUtcDate(date: Date) {
    return date.toISOString().slice(0, 10)
}

export function getBuenosAiresDateString(now = new Date()) {
    const local = datePartsInBuenosAires(now)
    return [
        String(local.year).padStart(4, '0'),
        String(local.month).padStart(2, '0'),
        String(local.day).padStart(2, '0'),
    ].join('-')
}

export function getBuenosAiresHour(now = new Date()) {
    return datePartsInBuenosAires(now).hour
}

/** Returns the Monday-to-Sunday range for the current week in Buenos Aires. */
export function getCurrentBuenosAiresWeek(now = new Date()) {
    const local = datePartsInBuenosAires(now)
    const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day))
    const daysSinceMonday = (localDate.getUTCDay() + 6) % 7

    const monday = new Date(localDate)
    monday.setUTCDate(monday.getUTCDate() - daysSinceMonday)

    const sunday = new Date(monday)
    sunday.setUTCDate(sunday.getUTCDate() + 6)

    return {
        weekStart: formatUtcDate(monday),
        weekEnd: formatUtcDate(sunday),
    }
}
