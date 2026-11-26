import { redirect } from 'next/navigation'
import StudentHomeDashboard, { type StudentHomeTrainingDay } from '@/components/student/StudentHomeDashboard'
import { createClient } from '@/lib/supabase/server'
import { getRoutineSchedule } from '@/lib/getRoutineSchedule'
import { getStudentRoutineWeekProgress } from '@/lib/studentRoutineWeekProgress'
import { getBuenosAiresDateString, getCurrentBuenosAiresWeek, getElapsedProgramWeekIndex, getProgramWeekDateRange } from '@/lib/buenosAiresDate'
import { getActiveStudentRoutine } from '@/lib/getActiveStudentRoutine'
import { getStudentAppContext } from '@/lib/auth/student'
import { areValidUniqueIsoWeekdays, formatSpanishDayLabel, formatSpanishWeekRange, resolveWeekdayDateInProgramWeek } from '@/lib/routineCalendar'
import { compareRoutineExerciseOrder, getRoutineExerciseSetCount } from '@/lib/routineExerciseOrder'

const WEEKDAY_SHORT: Record<number, string> = {
    1: 'Lun',
    2: 'Mar',
    3: 'Mié',
    4: 'Jue',
    5: 'Vie',
    6: 'Sáb',
    7: 'Dom',
}

type NextSuggestion = { dateLabel: string; workoutName: string | null }
type HomeSession = {
    savedSets: number
    totalSets: number
    nextExercise: {
        name: string | null
        exerciseNumber: number
        setNumber: number
        exerciseSets: number
    } | null
}
type PlannedExercise = {
    id: string
    exercise_id: string | null
    sets: number | null
    position: number | null
    block: string | null
}

export default async function AppHomePage() {
    const supabase = await createClient()
    const context = await getStudentAppContext()
    if (!context) redirect('/login')
    const { profile } = context
    const studentId = profile.student_id
    if (!studentId) {
        redirect('/login/student?message=Tu acceso todavía no está vinculado a una ficha. Pedile una nueva invitación a tu entrenador.')
    }

    const today = getBuenosAiresDateString()
    const { weekStart: currentWeekStart } = getCurrentBuenosAiresWeek()
    const [studentResult, assignment, weeklyCheckinResult, latestPhotoResult, unreadNotificationsResult, onboardingResult] = await Promise.all([
        supabase
            .from('students')
            .select('first_name')
            .eq('id', studentId)
            .single(),
        getActiveStudentRoutine(supabase, studentId),
        supabase
            .from('student_weekly_checkins')
            .select('id')
            .eq('student_id', studentId)
            .eq('week_start', currentWeekStart)
            .maybeSingle(),
        supabase
            .from('student_progress_photos')
            .select('captured_on')
            .eq('student_id', studentId)
            .order('captured_on', { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase
            .from('internal_notifications')
            .select('id', { count: 'exact', head: true })
            .eq('recipient_user_id', profile.id)
            .is('read_at', null),
        supabase
            .from('student_onboarding_profiles')
            .select('completed_at')
            .eq('student_id', studentId)
            .maybeSingle(),
    ])
    if (studentResult.error) throw studentResult.error
    if (onboardingResult.error) throw onboardingResult.error
    const student = studentResult.data
    const weeklyCheckinCompleted = Boolean(weeklyCheckinResult.data)
    const latestPhotoDate = latestPhotoResult.data?.captured_on ?? null
    const unreadNotifications = unreadNotificationsResult.count ?? 0
    const onboardingCompleted = Boolean(onboardingResult.data?.completed_at)
    const programAgeWeeks = assignment?.programStartedOn
        ? getElapsedProgramWeekIndex(assignment.programStartedOn)
        : 0
    const photoAgeDays = latestPhotoDate
        ? daysBetween(latestPhotoDate, today)
        : null
    const progressPhotoDue = Boolean(assignment?.routineId) && (latestPhotoDate
        ? photoAgeDays !== null && photoAgeDays >= 35
        : programAgeWeeks >= 4)

    let routineName: string | null = null
    let selectedMonthId: string | null = null
    let selectedWeekId: string | null = null
    let completedDays = 0
    let totalTrainingDays = 0
    let weekCompleted = false
    let programWeekNumber = 0
    let totalProgramWeeks = 0
    let programDateRange: string | null = null
    let nextSuggestion: NextSuggestion | null = null
    let currentSession: HomeSession | null = null
    let homeTrainingDays: StudentHomeTrainingDay[] = []
    let selectedHomeDay: StudentHomeTrainingDay | null = null
    const suggestedTrainingDays = Array.from(new Set(assignment?.trainingWeekdays ?? []))
        .sort((left, right) => left - right)
        .map((weekday) => WEEKDAY_SHORT[weekday])
        .filter((weekday): weekday is string => Boolean(weekday))

    if (assignment?.routineId) {
        const [routineResult, schedule] = await Promise.all([
            supabase
                .from('routines')
                .select('id, name')
                .eq('id', assignment.routineId)
                .single(),
            getRoutineSchedule(supabase, assignment.routineId, {
                programStartedOn: assignment.programStartedOn,
            }),
        ])
        if (routineResult.error) throw routineResult.error
        const routine = routineResult.data

        if (routine) {
            routineName = routine.name
            selectedMonthId = schedule.selectedMonth?.id ?? null
            selectedWeekId = schedule.selectedWeek?.id ?? null
            programWeekNumber = schedule.programWeekNumber
            totalProgramWeeks = schedule.totalProgramWeeks
            if (assignment.programStartedOn && totalProgramWeeks > 0) {
                const firstWeek = getProgramWeekDateRange(assignment.programStartedOn, schedule.currentCycleStartWeekIndex)
                const lastWeek = getProgramWeekDateRange(
                    assignment.programStartedOn,
                    schedule.currentCycleStartWeekIndex + totalProgramWeeks - 1
                )
                if (firstWeek && lastWeek) {
                    programDateRange = formatSpanishWeekRange(firstWeek.weekStart, lastWeek.weekEnd)
                }
            }

            if (selectedWeekId) {
                const { data: days, error: daysError } = await supabase
                    .from('routine_days')
                    .select('id, name, title, day_index')
                    .eq('routine_week_id', selectedWeekId)
                    .order('day_index', { ascending: true })
                if (daysError) throw daysError

                if (days && days.length > 0) {
                    const dayIds = days.map((day) => day.id)
                    const { data: weekExercises, error: weekExercisesError } = await supabase
                        .from('routine_day_exercises')
                        .select('id, routine_day_id, exercise_id, sets, position, block')
                        .in('routine_day_id', dayIds)
                        .order('position', { ascending: true, nullsFirst: false })
                    if (weekExercisesError) throw weekExercisesError

                    const daysWithExercises = new Set(
                        (weekExercises ?? []).map((exercise) => exercise.routine_day_id).filter(Boolean)
                    )
                    const trainingDays = days.filter((day) => daysWithExercises.has(day.id))
                    totalTrainingDays = trainingDays.length

                    const progress = trainingDays.length > 0
                        ? await getStudentRoutineWeekProgress(
                            supabase,
                            studentId,
                            trainingDays.map((day) => day.id),
                            schedule.selectedWeekStart && schedule.selectedWeekEnd
                                ? {
                                    weekStart: schedule.selectedWeekStart,
                                    weekEnd: schedule.selectedWeekEnd,
                                }
                                : null
                        )
                        : null
                    homeTrainingDays = trainingDays.map((day, dayPosition) => {
                        const dayExercises = (weekExercises ?? []).filter(
                            (exercise) => exercise.routine_day_id === day.id
                        )
                        const dayName = day.name?.trim()
                            || day.title?.trim()
                            || `Entrenamiento ${dayPosition + 1}`
                        const status = progress?.statusByDayId.get(day.id) ?? 'pending'
                        const sessionId = progress?.sessionIdByDayId.get(day.id) ?? null
                        const todayActivityDayId = progress?.todayActivityDayId ?? null
                        const availability = status === 'completed'
                            ? 'review' as const
                            : todayActivityDayId && todayActivityDayId !== day.id
                                ? 'locked_today' as const
                                : status === 'in_progress'
                                    ? 'continue' as const
                                    : 'available' as const
                        const scheduleQuery = `${selectedMonthId ? `month=${selectedMonthId}&` : ''}week=${selectedWeekId}&day=${day.id}`
                        const href = sessionId && (status === 'partial' || status === 'completed')
                            ? `/app/train?session=${sessionId}&source=home&${scheduleQuery}`
                            : `/app/train?${scheduleQuery}`

                        return {
                            id: day.id,
                            name: dayName,
                            status,
                            availability,
                            exerciseCount: dayExercises.length,
                            href,
                        }
                    })

                    completedDays = homeTrainingDays.filter((day) => day.status === 'completed').length
                    weekCompleted = totalTrainingDays > 0 && completedDays === totalTrainingDays

                    const todayActivityDay = progress?.todayActivityDayId
                        ? homeTrainingDays.find((day) => day.id === progress.todayActivityDayId) ?? null
                        : null
                    const actionableDays = homeTrainingDays.filter((day) => (
                        day.availability === 'available' || day.availability === 'continue'
                    ))

                    selectedHomeDay = homeTrainingDays.find((day) => day.availability === 'continue')
                        ?? todayActivityDay
                        ?? (actionableDays.length === 1 ? actionableDays[0] : null)

                    if (selectedHomeDay?.availability === 'continue' && progress) {
                        const activeDayId = selectedHomeDay.id
                        const sessionId = progress.sessionIdByDayId.get(activeDayId)
                        if (sessionId) {
                            currentSession = await getHomeSession(
                                supabase,
                                (weekExercises ?? []).filter((exercise) => exercise.routine_day_id === activeDayId),
                                progress.recordedSetIndexesBySession.get(sessionId)
                            )
                        }
                    }

                    nextSuggestion = getNextSuggestion(
                        homeTrainingDays,
                        selectedHomeDay?.id ?? null,
                        assignment.trainingWeekdays,
                        schedule.selectedWeekStart,
                        today
                    )
                }
            }
        }
    }

    const firstName = student?.first_name ?? profile.name ?? 'Atleta'
    const routineHref = selectedWeekId
        ? `/app/rutina?${selectedMonthId ? `month=${selectedMonthId}&` : ''}week=${selectedWeekId}`
        : '/app/rutina'
    return (
        <StudentHomeDashboard
            firstName={firstName}
            today={today}
            routineName={routineName}
            routineHref={routineHref}
            unreadNotifications={unreadNotifications}
            onboardingCompleted={onboardingCompleted}
            weeklyCheckinCompleted={weeklyCheckinCompleted}
            progressPhotoDue={progressPhotoDue}
            trainingDays={homeTrainingDays}
            selectedDay={selectedHomeDay}
            suggestedTrainingDays={suggestedTrainingDays}
            completedDays={completedDays}
            totalTrainingDays={totalTrainingDays}
            weekCompleted={weekCompleted}
            programWeekNumber={programWeekNumber}
            totalProgramWeeks={totalProgramWeeks}
            programDateRange={programDateRange}
            nextSuggestion={nextSuggestion}
            currentSession={currentSession}
        />
    )
}

async function getHomeSession(
    supabase: Awaited<ReturnType<typeof createClient>>,
    exercises: PlannedExercise[],
    recordedByExercise: Map<string, Set<number>> | undefined
): Promise<HomeSession> {
    const ordered = exercises.sort(compareRoutineExerciseOrder).map((exercise, index) => {
        const saved = recordedByExercise?.get(exercise.id)
        let highestSetIndex = -1
        for (const setIndex of saved ?? []) highestSetIndex = Math.max(highestSetIndex, setIndex)

        return {
            exerciseId: exercise.exercise_id,
            exerciseNumber: index + 1,
            exerciseSets: getRoutineExerciseSetCount(exercise.sets, highestSetIndex),
            saved,
        }
    })
    const savedSets = ordered.reduce((total, exercise) => total + (exercise.saved?.size ?? 0), 0)
    const totalSets = ordered.reduce((total, exercise) => total + exercise.exerciseSets, 0)
    const next = ordered.find((exercise) => (exercise.saved?.size ?? 0) < exercise.exerciseSets)
    if (!next) return { savedSets, totalSets, nextExercise: null }

    let setIndex = 0
    while (next.saved?.has(setIndex)) setIndex += 1

    const exerciseResult = next.exerciseId
        ? await supabase.from('exercises').select('name').eq('id', next.exerciseId).maybeSingle()
        : null

    return {
        savedSets,
        totalSets,
        nextExercise: {
            name: exerciseResult?.data?.name?.trim() || null,
            exerciseNumber: next.exerciseNumber,
            setNumber: setIndex + 1,
            exerciseSets: next.exerciseSets,
        },
    }
}

function getNextSuggestion(
    days: StudentHomeTrainingDay[],
    selectedId: string | null,
    weekdays: readonly number[] | null,
    weekStart: string | null,
    today: string
): NextSuggestion | null {
    if (!weekStart || !weekdays || weekdays.length < days.length || !areValidUniqueIsoWeekdays(weekdays)) return null

    const remaining = days.filter((day) => day.id !== selectedId && (day.status === 'pending' || day.status === 'partial'))
    if (remaining.length === 0) return null

    const nextDate = weekdays.slice(0, days.length)
        .map((weekday) => resolveWeekdayDateInProgramWeek(weekStart, weekday))
        .sort()
        .find((date) => date > today)
    if (!nextDate) return null

    return {
        dateLabel: formatSpanishDayLabel(nextDate),
        workoutName: remaining.length === 1 ? remaining[0].name : null,
    }
}

function daysBetween(from: string, to: string) {
    const start = new Date(`${from}T00:00:00Z`)
    const end = new Date(`${to}T00:00:00Z`)
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
}
