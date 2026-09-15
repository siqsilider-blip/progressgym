import type { createClient } from '@/lib/supabase/server'
import { getElapsedProgramWeekIndex, getProgramWeekDateRange } from '@/lib/buenosAiresDate'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type RoutineScheduleMonth = {
    id: string
    month_number: number
    name: string | null
}

export type RoutineScheduleWeek = {
    id: string
    week_number: number
    name: string | null
    routine_month_id: string | null
}

type ScheduleSelection = {
    months: RoutineScheduleMonth[]
    weeks: RoutineScheduleWeek[]
    selectedMonth: RoutineScheduleMonth | null
    selectedWeek: RoutineScheduleWeek | null
    currentWeek: RoutineScheduleWeek | null
    programWeekNumber: number
    totalProgramWeeks: number
    selectedProgramWeekNumber: number
    selectedWeekStart: string | null
    selectedWeekEnd: string | null
}

type RoutineScheduleOptions = {
    requestedMonthId?: string
    requestedWeekId?: string
    programStartedOn?: string | null
}

/**
 * Selects a routine period without assuming that every routine has a mesocycle.
 * Older templates and intentionally simple routines can have weeks directly
 * under the routine (`routine_month_id = null`).
 */
export async function getRoutineSchedule(
    supabase: SupabaseServerClient,
    routineId: string,
    options: RoutineScheduleOptions = {}
): Promise<ScheduleSelection> {
    const [monthsResult, weeksResult] = await Promise.all([
        supabase
            .from('routine_months')
            .select('id, month_number, name')
            .eq('routine_id', routineId)
            .order('month_number', { ascending: true }),
        supabase
            .from('routine_weeks')
            .select('id, week_number, name, routine_month_id')
            .eq('routine_id', routineId)
            .order('week_number', { ascending: true }),
    ])

    const months = (monthsResult.data ?? []) as RoutineScheduleMonth[]
    const allWeeks = (weeksResult.data ?? []) as RoutineScheduleWeek[]
    const requestedWeek = allWeeks.find((week) => week.id === options.requestedWeekId) ?? null
    const requestedMonth = months.find((month) => month.id === options.requestedMonthId) ?? null
    const orderedWeeks = months.length > 0
        ? months.flatMap((month) => allWeeks.filter((week) => week.routine_month_id === month.id))
        : allWeeks
    const elapsedWeekIndex = options.programStartedOn
        ? getElapsedProgramWeekIndex(options.programStartedOn)
        : 0
    const currentWeek = orderedWeeks.length > 0
        ? orderedWeeks[Math.min(elapsedWeekIndex, orderedWeeks.length - 1)]
        : null

    const selectedMonth = requestedWeek?.routine_month_id
        ? months.find((month) => month.id === requestedWeek.routine_month_id) ?? null
        : requestedMonth
            ?? (currentWeek?.routine_month_id
                ? months.find((month) => month.id === currentWeek.routine_month_id) ?? null
                : null)
            ?? months[0]
            ?? null

    const weeks = selectedMonth
        ? allWeeks.filter((week) => week.routine_month_id === selectedMonth.id)
        : months.length === 0
            ? allWeeks
            : allWeeks.filter((week) => week.routine_month_id === null)

    const selectedWeek = weeks.find((week) => week.id === requestedWeek?.id)
        ?? (!requestedMonth ? weeks.find((week) => week.id === currentWeek?.id) : null)
        ?? weeks[0]
        ?? null
    const selectedWeekIndex = selectedWeek
        ? orderedWeeks.findIndex((week) => week.id === selectedWeek.id)
        : -1
    const selectedWeekRange = options.programStartedOn && selectedWeekIndex >= 0
        ? getProgramWeekDateRange(options.programStartedOn, selectedWeekIndex)
        : null

    return {
        months,
        weeks,
        selectedMonth,
        selectedWeek,
        currentWeek,
        programWeekNumber: orderedWeeks.length > 0
            ? Math.min(elapsedWeekIndex + 1, orderedWeeks.length)
            : 0,
        totalProgramWeeks: orderedWeeks.length,
        selectedProgramWeekNumber: selectedWeekIndex >= 0 ? selectedWeekIndex + 1 : 0,
        selectedWeekStart: selectedWeekRange?.weekStart ?? null,
        selectedWeekEnd: selectedWeekRange?.weekEnd ?? null,
    }
}
