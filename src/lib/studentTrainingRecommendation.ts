import { areValidUniqueIsoWeekdays, orderWeekdaysForProgramWeek, resolveWeekdayDateInProgramWeek } from './routineCalendar'
import type { RoutineDayProgressStatus } from './trainingDomain'

export function getStudentTrainingDates(weekStart: string | null, weekdays: readonly number[] | null, workoutCount: number) {
    if (!weekStart || !weekdays || workoutCount === 0 || weekdays.length < workoutCount || !areValidUniqueIsoWeekdays(weekdays)) return []
    return orderWeekdaysForProgramWeek(weekStart, weekdays)
        .slice(0, workoutCount)
        .map((weekday) => resolveWeekdayDateInProgramWeek(weekStart, weekday))
}

export function getStudentTrainingRecommendation<Day extends { id: string; status: RoutineDayProgressStatus }>({
    days, today, todayActivityId, plannedDates, programStartedOn,
}: {
    days: readonly Day[]
    today: string
    todayActivityId: string | null
    plannedDates: readonly string[]
    programStartedOn: string | null
}) {
    const recordedToday = days.find((day) => day.id === todayActivityId)
        ?? days.find((day) => day.status === 'in_progress')
        ?? null
    const remaining = days.filter((day) => day.status === 'pending')
    const programStartsLater = Boolean(programStartedOn && programStartedOn > today)
    const missedSlot = plannedDates.filter((date) => date < today).length > days.length - remaining.length
    const isTrainingDay = !programStartsLater && (!plannedDates.length || plannedDates.includes(today) || missedSlot)
    const todayDay = recordedToday ?? (isTrainingDay ? remaining[0] ?? null : null)
    const nextDay = remaining.find((day) => day.id !== todayDay?.id) ?? null
    const nextDate = plannedDates.find((date) => date > today) ?? null

    return {
        todayDay,
        next: nextDay && nextDate ? { day: nextDay, date: nextDate } : null,
        programStartsLater,
        restDay: !todayDay && !programStartsLater && remaining.length > 0 && !isTrainingDay,
    }
}
