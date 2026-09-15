import type { createClient } from '@/lib/supabase/server'

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
}

/**
 * Selects a routine period without assuming that every routine has a mesocycle.
 * Older templates and intentionally simple routines can have weeks directly
 * under the routine (`routine_month_id = null`).
 */
export async function getRoutineSchedule(
    supabase: SupabaseServerClient,
    routineId: string,
    requestedMonthId?: string,
    requestedWeekId?: string
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
    const requestedWeek = allWeeks.find((week) => week.id === requestedWeekId) ?? null

    const selectedMonth = months.find((month) => month.id === requestedMonthId)
        ?? (requestedWeek?.routine_month_id
            ? months.find((month) => month.id === requestedWeek.routine_month_id)
            : null)
        ?? months[0]
        ?? null

    const weeks = selectedMonth
        ? allWeeks.filter((week) => week.routine_month_id === selectedMonth.id)
        : months.length === 0
            ? allWeeks
            : allWeeks.filter((week) => week.routine_month_id === null)

    const selectedWeek = weeks.find((week) => week.id === requestedWeekId)
        ?? weeks[0]
        ?? null

    return { months, weeks, selectedMonth, selectedWeek }
}
