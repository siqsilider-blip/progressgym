import Link from 'next/link'
import { redirect } from 'next/navigation'
import StudentPageHeader from '@/components/student/StudentPageHeader'
import StudentRoutinePlanner, {
    type RoutinePlannerExercise,
    type RoutinePlannerStatus,
    type RoutinePlannerWeek,
} from '@/components/student/StudentRoutinePlanner'
import { getStudentAppContext } from '@/lib/auth/student'
import { getBuenosAiresDateString, getProgramWeekDateRange } from '@/lib/buenosAiresDate'
import { getActiveStudentRoutine } from '@/lib/getActiveStudentRoutine'
import { getRoutineSchedule } from '@/lib/getRoutineSchedule'
import { resolveWeekdayDateInProgramWeek, type IsoWeekday } from '@/lib/routineCalendar'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
    searchParams?: Promise<{
        month?: string
        week?: string
        day?: string
        view?: string
    }>
}

type RoutineDayRow = {
    id: string
    name: string | null
    day_index: number | null
    routine_week_id: string | null
}

type RoutineDayExerciseRow = {
    routine_day_id: string | null
    sets: number | null
    reps: string | number | null
    exercise_id: string | null
}

type WorkoutSessionRow = {
    routine_day_id: string | null
    performed_date: string | null
    status: string | null
    completion_status: string | null
}

function statusForDay(
    dayId: string,
    weekStart: string | null,
    weekEnd: string | null,
    sessions: WorkoutSessionRow[],
    today: string
): RoutinePlannerStatus {
    const relevant = sessions.filter((session) => {
        if (session.routine_day_id !== dayId) return false
        if (!weekStart || !weekEnd || !session.performed_date) return true
        return session.performed_date >= weekStart && session.performed_date <= weekEnd
    })

    if (relevant.some((session) => session.status === 'in_progress' && session.performed_date === today)) return 'in_progress'
    if (relevant.some((session) => session.status === 'completed' && session.completion_status === 'complete')) return 'completed'
    if (relevant.some((session) => session.status === 'completed' && session.completion_status === 'incomplete')) return 'incomplete'
    return 'pending'
}

export default async function AppRoutinePage(props: PageProps) {
    const searchParams = await props.searchParams
    const supabase = await createClient()
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const studentId = context.profile.student_id
    if (!studentId) redirect('/app')

    const assignment = await getActiveStudentRoutine(supabase, studentId)

    if (!assignment?.routineId) {
        const { data: onboarding } = await supabase
            .from('student_onboarding_profiles')
            .select('completed_at')
            .eq('student_id', studentId)
            .maybeSingle()

        return (
            <div className="p-4 pb-24">
                <div className="mx-auto max-w-lg">
                    <div className="mb-4"><StudentPageHeader title="Rutina" subtitle="Tu programa actual" /></div>
                    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                        <p className="text-3xl">📋</p>
                        <p className="mt-3 text-sm font-semibold text-card-foreground">
                            {onboarding?.completed_at ? 'Tu entrenador está preparando tu programa' : 'Completá primero tu ficha inicial'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {onboarding?.completed_at
                                ? 'Ya recibió tu información. La rutina aparecerá acá cuando esté lista.'
                                : 'Así puede conocer tus objetivos, disponibilidad y cuidados antes de elegir la rutina.'}
                        </p>
                        {!onboarding?.completed_at && (
                            <Link href="/app/onboarding" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">
                                Completar ficha
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const [{ data: routine, error: routineError }, schedule, onboardingResult] = await Promise.all([
        supabase.from('routines').select('id, name').eq('id', assignment.routineId).single(),
        getRoutineSchedule(supabase, assignment.routineId, {
            requestedMonthId: searchParams?.month,
            requestedWeekId: searchParams?.week,
            programStartedOn: assignment.programStartedOn,
        }),
        supabase
            .from('student_onboarding_profiles')
            .select('preferred_training_weekdays')
            .eq('student_id', studentId)
            .maybeSingle(),
    ])

    if (routineError) throw routineError

    const weekIds = schedule.orderedWeeks.map((week) => week.id)
    const { data: dayRows, error: daysError } = weekIds.length > 0
        ? await supabase
            .from('routine_days')
            .select('id, name, day_index, routine_week_id')
            .in('routine_week_id', weekIds)
        : { data: [] as RoutineDayRow[], error: null }

    if (daysError) throw daysError
    const allDays = (dayRows ?? []) as RoutineDayRow[]
    const allDayIds = allDays.map((day) => day.id)
    let exerciseRows: RoutineDayExerciseRow[] = []

    if (allDayIds.length > 0) {
        const { data, error } = await supabase
            .from('routine_day_exercises')
            .select('routine_day_id, sets, reps, exercise_id')
            .in('routine_day_id', allDayIds)
            .order('position', { ascending: true, nullsFirst: false })
        if (error) throw error
        exerciseRows = (data ?? []) as RoutineDayExerciseRow[]
    }

    const exerciseIds = Array.from(new Set(exerciseRows.map((row) => row.exercise_id).filter((id): id is string => Boolean(id))))
    const exerciseNameById = new Map<string, string>()
    if (exerciseIds.length > 0) {
        const { data, error } = await supabase.from('exercises').select('id, name').in('id', exerciseIds)
        if (error) throw error
        for (const exercise of data ?? []) exerciseNameById.set(exercise.id, exercise.name ?? 'Ejercicio')
    }

    const exercisesByDay = new Map<string, RoutinePlannerExercise[]>()
    for (const row of exerciseRows) {
        if (!row.routine_day_id) continue
        const exercises = exercisesByDay.get(row.routine_day_id) ?? []
        exercises.push({
            name: row.exercise_id ? exerciseNameById.get(row.exercise_id) ?? 'Ejercicio' : 'Ejercicio',
            sets: row.sets ?? 3,
            reps: row.reps == null ? null : String(row.reps),
        })
        exercisesByDay.set(row.routine_day_id, exercises)
    }

    const trainingDaysByWeek = new Map<string, RoutineDayRow[]>()
    for (const week of schedule.orderedWeeks) {
        trainingDaysByWeek.set(week.id, allDays
            .filter((day) => day.routine_week_id === week.id && (exercisesByDay.get(day.id)?.length ?? 0) > 0)
            .sort((left, right) => (left.day_index ?? 0) - (right.day_index ?? 0)))
    }

    const requiredTrainingDays = Math.max(0, ...Array.from(trainingDaysByWeek.values()).map((days) => days.length))
    const allTrainingDayIds = Array.from(trainingDaysByWeek.values()).flat().map((day) => day.id)
    let sessions: WorkoutSessionRow[] = []

    if (allTrainingDayIds.length > 0) {
        const { data, error } = await supabase
            .from('workout_sessions')
            .select('routine_day_id, performed_date, status, completion_status')
            .eq('student_id', studentId)
            .in('routine_day_id', allTrainingDayIds)
        if (error) throw error
        sessions = (data ?? []) as WorkoutSessionRow[]
    }

    const today = getBuenosAiresDateString()
    const trainingWeekdays = assignment.trainingWeekdays
    const hasRealSchedule = Boolean(
        assignment.programStartedOn
        && trainingWeekdays
        && trainingWeekdays.length >= requiredTrainingDays
        && requiredTrainingDays > 0
    )

    const plannerWeeks: RoutinePlannerWeek[] = schedule.orderedWeeks.map((week, weekIndex) => {
        const range = assignment.programStartedOn ? getProgramWeekDateRange(assignment.programStartedOn, weekIndex) : null
        const weekDays = trainingDaysByWeek.get(week.id) ?? []
        return {
            id: week.id,
            monthId: week.routine_month_id,
            name: week.name || `Semana ${weekIndex + 1}`,
            programWeekNumber: weekIndex + 1,
            weekStart: range?.weekStart ?? null,
            weekEnd: range?.weekEnd ?? null,
            isCurrent: week.id === schedule.currentWeek?.id,
            days: weekDays.map((day, dayPosition) => {
                const weekday = hasRealSchedule ? trainingWeekdays?.[dayPosition] : null
                const scheduledDate = range && weekday
                    ? resolveWeekdayDateInProgramWeek(range.weekStart, weekday as IsoWeekday)
                    : null
                return {
                    id: day.id,
                    name: day.name?.trim() || `Entrenamiento ${dayPosition + 1}`,
                    dayIndex: dayPosition + 1,
                    scheduledDate,
                    status: statusForDay(day.id, range?.weekStart ?? null, range?.weekEnd ?? null, sessions, today),
                    exercises: exercisesByDay.get(day.id) ?? [],
                }
            }),
        }
    })

    const preferredWeekdays = !onboardingResult.error && Array.isArray(onboardingResult.data?.preferred_training_weekdays)
        ? onboardingResult.data.preferred_training_weekdays.filter((value): value is number => typeof value === 'number')
        : null

    if (plannerWeeks.length === 0 || requiredTrainingDays === 0) {
        return (
            <main className="mx-auto max-w-lg px-4 pb-28 pt-5">
                <StudentPageHeader title="Rutina" subtitle={routine?.name ?? 'Programa actual'} />
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-7 text-center">
                    <p className="text-sm font-bold text-foreground">El programa todavía no tiene entrenamientos</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Tu entrenador está terminando de prepararlo.</p>
                </div>
            </main>
        )
    }

    return (
        <main className="mx-auto max-w-lg px-4 pb-28 pt-5">
            <StudentRoutinePlanner
                routineName={routine?.name ?? 'Programa actual'}
                weeks={plannerWeeks}
                totalProgramWeeks={schedule.totalProgramWeeks}
                initialWeekId={schedule.selectedWeek?.id ?? null}
                initialDayId={searchParams?.day ?? null}
                initialView={searchParams?.view === 'month' ? 'month' : 'week'}
                today={today}
                trainingWeekdays={trainingWeekdays}
                preferredWeekdays={preferredWeekdays}
                requiredTrainingDays={requiredTrainingDays}
            />
        </main>
    )
}
