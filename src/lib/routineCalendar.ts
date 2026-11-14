export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type RoutineMonthGridDay = {
    date: string
    dayNumber: number
    isoWeekday: IsoWeekday
    isCurrentMonth: boolean
}

export type RoutineMonthGrid = {
    monthStart: string
    monthEnd: string
    gridStart: string
    gridEnd: string
    weeks: RoutineMonthGridDay[][]
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MILLISECONDS_PER_DAY = 86_400_000
const SPANISH_LOCALE = 'es-AR'

function formatUtcDate(date: Date) {
    return date.toISOString().slice(0, 10)
}

function parseDateOnly(value: string) {
    const match = DATE_ONLY_PATTERN.exec(value)
    if (!match) throw new RangeError(`Fecha inválida: ${value}`)

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))

    if (
        !Number.isFinite(date.getTime())
        || date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month - 1
        || date.getUTCDate() !== day
    ) {
        throw new RangeError(`Fecha inválida: ${value}`)
    }

    return date
}

function capitalize(value: string) {
    return value.length > 0 ? value.charAt(0).toLocaleUpperCase(SPANISH_LOCALE) + value.slice(1) : value
}

function shortMonth(date: Date) {
    return new Intl.DateTimeFormat(SPANISH_LOCALE, {
        month: 'short',
        timeZone: 'UTC',
    }).format(date).replace('.', '')
}

export function isValidDateOnly(value: string) {
    try {
        parseDateOnly(value)
        return true
    } catch {
        return false
    }
}

/** ISO weekday: Monday = 1, Sunday = 7. */
export function getIsoWeekday(dateOnly: string): IsoWeekday {
    const sundayFirstWeekday = parseDateOnly(dateOnly).getUTCDay()
    return (sundayFirstWeekday === 0 ? 7 : sundayFirstWeekday) as IsoWeekday
}

export function addDateOnlyDays(dateOnly: string, days: number) {
    if (!Number.isInteger(days)) throw new RangeError('La cantidad de días debe ser un número entero.')

    const date = parseDateOnly(dateOnly)
    date.setUTCDate(date.getUTCDate() + days)
    return formatUtcDate(date)
}

/** Returns every date in the inclusive range. */
export function enumerateDateRange(startDate: string, endDate: string) {
    const start = parseDateOnly(startDate)
    const end = parseDateOnly(endDate)
    if (start.getTime() > end.getTime()) {
        throw new RangeError('La fecha inicial no puede ser posterior a la fecha final.')
    }

    const length = Math.floor((end.getTime() - start.getTime()) / MILLISECONDS_PER_DAY) + 1
    return Array.from({ length }, (_, index) => addDateOnlyDays(startDate, index))
}

export function areValidUniqueIsoWeekdays(values: readonly number[]): values is readonly IsoWeekday[] {
    return values.length <= 7
        && values.every((value) => Number.isInteger(value) && value >= 1 && value <= 7)
        && new Set(values).size === values.length
}

/**
 * Resolves a weekday to its only occurrence inside a seven-day program week.
 * The program week may start on any weekday; it is deliberately not forced
 * to Monday.
 */
export function resolveWeekdayDateInProgramWeek(weekStart: string, weekday: IsoWeekday) {
    if (!areValidUniqueIsoWeekdays([weekday])) throw new RangeError(`Día de la semana inválido: ${weekday}`)

    const startWeekday = getIsoWeekday(weekStart)
    const offset = (weekday - startWeekday + 7) % 7
    return addDateOnlyDays(weekStart, offset)
}

/** Orders selected weekdays by when they occur inside the given program week. */
export function orderWeekdaysForProgramWeek(weekStart: string, weekdays: readonly number[]) {
    if (!areValidUniqueIsoWeekdays(weekdays)) {
        throw new RangeError('Los días de entrenamiento deben ser únicos y estar entre 1 y 7.')
    }

    return [...weekdays].sort((left, right) => {
        const leftDate = resolveWeekdayDateInProgramWeek(weekStart, left)
        const rightDate = resolveWeekdayDateInProgramWeek(weekStart, right)
        return leftDate.localeCompare(rightDate)
    })
}

/** Builds a complete Monday-first grid for the month containing `dateInMonth`. */
export function buildMondayFirstMonthGrid(dateInMonth: string): RoutineMonthGrid {
    const selectedDate = parseDateOnly(dateInMonth)
    const year = selectedDate.getUTCFullYear()
    const month = selectedDate.getUTCMonth()
    const monthStart = formatUtcDate(new Date(Date.UTC(year, month, 1)))
    const monthEnd = formatUtcDate(new Date(Date.UTC(year, month + 1, 0)))
    const gridStart = addDateOnlyDays(monthStart, -(getIsoWeekday(monthStart) - 1))
    const gridEnd = addDateOnlyDays(monthEnd, 7 - getIsoWeekday(monthEnd))
    const dates = enumerateDateRange(gridStart, gridEnd)
    const weeks: RoutineMonthGridDay[][] = []

    for (let index = 0; index < dates.length; index += 7) {
        weeks.push(dates.slice(index, index + 7).map((date) => {
            const parsed = parseDateOnly(date)
            return {
                date,
                dayNumber: parsed.getUTCDate(),
                isoWeekday: getIsoWeekday(date),
                isCurrentMonth: parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month,
            }
        }))
    }

    return { monthStart, monthEnd, gridStart, gridEnd, weeks }
}

export function formatSpanishWeekdayLabel(dateOnly: string, style: 'short' | 'long' = 'short') {
    const label = new Intl.DateTimeFormat(SPANISH_LOCALE, {
        weekday: style,
        timeZone: 'UTC',
    }).format(parseDateOnly(dateOnly)).replace('.', '')

    return capitalize(label)
}

/** Example: `Mié 18`. */
export function formatSpanishDayLabel(dateOnly: string) {
    const date = parseDateOnly(dateOnly)
    return `${formatSpanishWeekdayLabel(dateOnly)} ${date.getUTCDate()}`
}

/** Example: `miércoles 18 de noviembre`. */
export function formatSpanishLongDateLabel(dateOnly: string) {
    return new Intl.DateTimeFormat(SPANISH_LOCALE, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    }).format(parseDateOnly(dateOnly))
}

/** Example: `Noviembre 2026`. */
export function formatSpanishMonthLabel(dateOnly: string) {
    const label = new Intl.DateTimeFormat(SPANISH_LOCALE, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(parseDateOnly(dateOnly))

    return capitalize(label)
}

/** Examples: `16–22 nov`, `30 nov–6 dic`, `30 dic 2026–5 ene 2027`. */
export function formatSpanishWeekRange(startDate: string, endDate: string) {
    const start = parseDateOnly(startDate)
    const end = parseDateOnly(endDate)
    if (start.getTime() > end.getTime()) {
        throw new RangeError('La fecha inicial no puede ser posterior a la fecha final.')
    }

    const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
    const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth()

    if (sameMonth) {
        return `${start.getUTCDate()}–${end.getUTCDate()} ${shortMonth(end)}`
    }

    if (sameYear) {
        return `${start.getUTCDate()} ${shortMonth(start)}–${end.getUTCDate()} ${shortMonth(end)}`
    }

    return `${start.getUTCDate()} ${shortMonth(start)} ${start.getUTCFullYear()}–${end.getUTCDate()} ${shortMonth(end)} ${end.getUTCFullYear()}`
}
