import Link from 'next/link'
import { redirect } from 'next/navigation'
import { StudentNotebookHeader, notebookPage } from '@/components/student/StudentNotebook'
import StudentRoutinePlanner, {
    type RoutinePlannerExercise,
    type RoutinePlannerStatus,
    type RoutinePlannerWeek,
} from '@/components/student/StudentRoutinePlanner'
import { getStudentAppContext } from '@/lib/auth/student'
import { getBuenosAiresDateString, getProgramWeekDateRange } from '@/lib/buenosAiresDate'
import { getActiveStudentRoutine } from '@/lib/getActiveStudentRoutine'
import { getRoutineSchedule } from '@/lib/getRoutineSchedule'
import { formatSpanishDayLabel } from '@/lib/routineCalendar'
import { getStudentTrainingDates, getStudentTrainingRecommendation } from '@/lib/studentTrainingRecommendation'
import { compareRoutineExerciseOrder, getRoutineExerciseSetCount } from '@/lib/routineExerciseOrder'
import { EXERCISE_METRIC_SUFFIXES, getExerciseMetric, type ExerciseMetricFields } from '@/lib/exerciseMetric'
import { createClient } from '@/lib/supabase/server'
import { getStudentRoutineWeekProgress } from '@/lib/studentRoutineWeekProgress'
import { getRoutineDayProgress, getWorkoutCompletionKind, type WorkoutSessionProgressRow } from '@/lib/trainingDomain'

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
    block: string | null
    position: number | null
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
            <main className={notebookPage}>
                <StudentNotebookHeader title="Mi programa" section="Rutina" />
                    <section className="border-t border-border pt-4">
                        <p className="text-sm font-semibold text-foreground">
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
                    </section>
            </main>
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
            .select('routine_day_id, sets, reps, exercise_id, block, position')
            .in('routine_day_id', allDayIds)
            .order('position', { ascending: true, nullsFirst: false })
        if (error) throw error
        exerciseRows = (data ?? []) as RoutineDayExerciseRow[]
    }

    const exerciseIds = Array.from(new Set(exerciseRows.map((row) => row.exercise_id).filter((id): id is string => Boolean(id))))
    const exerciseById = new Map<string, { name: string | null } & ExerciseMetricFields>()
    if (exerciseIds.length > 0) {
        const { data, error } = await supabase.from('exercises').select('id, name, metric_type, duration_unit').in('id', exerciseIds)
        if (error) throw error
        for (const exercise of data ?? []) exerciseById.set(exercise.id, exercise)
    }

    const exercisesByDay = new Map<string, RoutinePlannerExercise[]>()
    for (const row of exerciseRows.sort(compareRoutineExerciseOrder)) {
        if (!row.routine_day_id) continue
        const exercises = exercisesByDay.get(row.routine_day_id) ?? []
        const exercise = row.exercise_id ? exerciseById.get(row.exercise_id) : undefined
        exercises.push({
            name: exercise?.name ?? 'Ejercicio',
            sets: getRoutineExerciseSetCount(row.sets),
            target: row.reps == null ? null : `${row.reps} ${EXERCISE_METRIC_SUFFIXES[getExerciseMetric(exercise)]}`,
        })
        exercisesByDay.set(row.routine_day_id, exercises)
    }

    const trainingDaysByWeek = new Map<string, RoutineDayRow[]>()
    for (const week of schedule.orderedWeeks) {
        trainingDaysByWeek.set(week.id, allDays
            .filter((day) => day.routine_week_id === week.id && (exercisesByDay.get(day.id)?.length ?? 0) > 0)
            .sort((left, right) => ((left.day_index ?? Number.MAX_SAFE_INTEGER) - (right.day_index ?? Number.MAX_SAFE_INTEGER)) || left.id.localeCompare(right.id)))
    }

    const requiredTrainingDays = Math.max(0, ...Array.from(trainingDaysByWeek.values()).map((days) => days.length))
    const allTrainingDayIds = Array.from(trainingDaysByWeek.values()).flat().map((day) => day.id)
    let sessions: WorkoutSessionProgressRow[] = []

    if (allTrainingDayIds.length > 0) {
        const { data, error } = await supabase
            .from('workout_sessions')
            .select('id, routine_day_id, performed_date, started_at, status, completed_manually, completion_status')
            .eq('student_id', studentId)
            .in('status', ['in_progress', 'completed'])
            .in('routine_day_id', allTrainingDayIds)
        if (error) throw error
        sessions = (data ?? []) as WorkoutSessionProgressRow[]

        const sessionIds = sessions.map((session) => session.id).filter((id): id is string => Boolean(id))
        if (sessionIds.length > 0) {
            const { data: logs, error: logsError } = await supabase
                .from('exercise_logs')
                .select('workout_session_id, routine_day_exercise_id, set_index, reps')
                .in('workout_session_id', sessionIds)
                .gt('reps', 0)
            if (logsError) throw logsError

            const recordedSetKeysBySession = new Map<string, Set<string>>()
            for (const log of logs ?? []) {
                if (!log.workout_session_id || !log.routine_day_exercise_id || log.set_index == null || log.set_index < 0) continue
                const keys = recordedSetKeysBySession.get(log.workout_session_id) ?? new Set<string>()
                keys.add(`${log.routine_day_exercise_id}:${log.set_index}`)
                recordedSetKeysBySession.set(log.workout_session_id, keys)
            }
            sessions = sessions.map((session) => ({
                ...session,
                recorded_sets: session.id ? (recordedSetKeysBySession.get(session.id)?.size ?? 0) : 0,
            }))
        }
    }

    const today = getBuenosAiresDateString()
    const trainingWeekdays = assignment.trainingWeekdays

    const currentWeekIndex = schedule.orderedWeeks.findIndex((week) => week.id === schedule.currentWeek?.id)
    const currentWeekRange = assignment.programStartedOn && currentWeekIndex >= 0
        ? getProgramWeekDateRange(
            assignment.programStartedOn,
            schedule.currentCycleStartWeekIndex + currentWeekIndex
        )
        : null
    const currentWeekDayIds = currentWeekIndex >= 0
        ? (trainingDaysByWeek.get(schedule.orderedWeeks[currentWeekIndex]?.id) ?? []).map((day) => day.id)
        : []
    const currentWeekProgress = currentWeekDayIds.length > 0
        ? await getStudentRoutineWeekProgress(
            supabase,
            studentId,
            currentWeekDayIds,
            currentWeekRange
        )
        : null
    const todayActivityDayId = currentWeekProgress?.todayActivityDayId ?? null

    const plannerWeeks: RoutinePlannerWeek[] = schedule.orderedWeeks.map((week, weekIndex) => {
        const range = assignment.programStartedOn
            ? getProgramWeekDateRange(
                assignment.programStartedOn,
                schedule.currentCycleStartWeekIndex + weekIndex
            )
            : null
        const weekDays = trainingDaysByWeek.get(week.id) ?? []
        const weekDayIds = new Set(weekDays.map((day) => day.id))
        const plannedDates = getStudentTrainingDates(range?.weekStart ?? null, trainingWeekdays, weekDays.length)
        const isCurrent = week.id === schedule.currentWeek?.id
        const daysWithProgress = weekDays.map((day, index) => {
            const progress = range
                ? getRoutineDayProgress({ dayId: day.id, sessions, today, weekStart: range.weekStart, weekEnd: range.weekEnd })
                : {
                    status: (isCurrent ? currentWeekProgress?.statusByDayId.get(day.id) : null) ?? 'pending' as const,
                    sessionId: (isCurrent ? currentWeekProgress?.sessionIdByDayId.get(day.id) : null) ?? null,
                }
            return {
                id: day.id, name: day.name?.trim() || `Entrenamiento ${index + 1}`, dayIndex: index + 1,
                status: progress.status, sessionId: progress.sessionId,
                exercises: exercisesByDay.get(day.id) ?? [],
            }
        })
        const recommendation = isCurrent ? getStudentTrainingRecommendation({
            days: daysWithProgress,
            today,
            todayActivityId: todayActivityDayId,
            plannedDates,
            programStartedOn: assignment.programStartedOn,
        }) : null
        const sessionsForWeek = range
            ? sessions.filter((session) => (
                Boolean(session.routine_day_id && weekDayIds.has(session.routine_day_id))
                && Boolean(session.performed_date)
                && session.performed_date! >= range.weekStart
                && session.performed_date! <= range.weekEnd
            ))
            : []
        const actualDates = sessionsForWeek
            .filter((session) => (
                (session.status === 'in_progress' && session.performed_date === today)
                || getWorkoutCompletionKind(session) !== null
            ))
            .map((session) => session.performed_date)
            .filter((date): date is string => Boolean(date))
        const plannedWorkoutByDate = new Map<string, string>()
        if (isCurrent) {
            const recommended = recommendation?.todayDay
            if (recommended?.status === 'pending') plannedWorkoutByDate.set(today, recommended.id)
            const futureDates = plannedDates.filter((date) => date > today)
            daysWithProgress.filter((day) => day.status === 'pending' && day.id !== recommended?.id)
                .forEach((day, index) => {
                    const date = futureDates[index]
                    if (date) plannedWorkoutByDate.set(date, day.id)
                })
        } else {
            plannedDates.forEach((date, index) => {
                const day = daysWithProgress[index]
                if (day) plannedWorkoutByDate.set(date, day.id)
            })
        }
        const scheduledDates: RoutinePlannerWeek['scheduledDates'] = Array.from(new Set([...plannedDates, ...actualDates, ...plannedWorkoutByDate.keys()]))
            .sort()
            .map((date) => {
                const datedSessions = sessionsForWeek
                    .filter((session) => session.performed_date === date)
                    .sort((left, right) => String(right.started_at ?? '').localeCompare(String(left.started_at ?? '')))
                const active = datedSessions.find((session) => session.status === 'in_progress' && date === today)
                const completed = datedSessions.find((session) => getWorkoutCompletionKind(session) === 'complete')
                const partial = datedSessions.find((session) => getWorkoutCompletionKind(session) === 'partial')
                const explainingSession = active ?? completed ?? partial ?? null
                const status: RoutinePlannerStatus = active
                    ? 'in_progress'
                    : completed
                        ? 'completed'
                        : partial
                            ? 'partial'
                            : 'pending'

                return {
                    date,
                    status,
                    dayId: explainingSession?.routine_day_id ?? plannedWorkoutByDate.get(date) ?? null,
                    suggested: plannedDates.includes(date),
                }
            })
        return {
            id: week.id,
            monthId: week.routine_month_id,
            name: week.name || `Semana ${weekIndex + 1}`,
            programWeekNumber: weekIndex + 1,
            weekStart: range?.weekStart ?? null,
            weekEnd: range?.weekEnd ?? null,
            isCurrent,
            scheduledDates,
            days: daysWithProgress.map((day) => {
                const isToday = day.id === recommendation?.todayDay?.id
                const date = scheduledDates.find((slot) => slot.date >= today && slot.dayId === day.id)?.date
                return {
                    ...day,
                    isToday,
                    canStart: isToday && day.status !== 'completed',
                    blockedReason: !isCurrent ? 'Disponible en su semana'
                        : date ? `Programado para ${formatSpanishDayLabel(date).toLocaleLowerCase('es-AR')}`
                            : 'Consultá Inicio para ver tu próximo entrenamiento',
                }
            }),
        }
    })

    const preferredWeekdays = !onboardingResult.error && Array.isArray(onboardingResult.data?.preferred_training_weekdays)
        ? onboardingResult.data.preferred_training_weekdays.filter((value): value is number => typeof value === 'number')
        : null

    if (plannerWeeks.length === 0 || requiredTrainingDays === 0) {
        return (
            <main className={notebookPage}>
                <StudentNotebookHeader title="Mi programa" section="Rutina" subtitle={routine?.name ?? 'Programa actual'} />
                <div className="border-t border-border pt-4">
                    <p className="text-sm font-bold text-foreground">El programa todavía no tiene entrenamientos</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Tu entrenador está terminando de prepararlo.</p>
                </div>
            </main>
        )
    }

    return (
        <main className={notebookPage}>
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
