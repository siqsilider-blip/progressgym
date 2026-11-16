import { redirect } from 'next/navigation'
import StudentHomeDashboard, { type StudentHomeTrainingDay } from '@/components/student/StudentHomeDashboard'
import { createClient } from '@/lib/supabase/server'
import { getRoutineSchedule } from '@/lib/getRoutineSchedule'
import { getStudentRoutineWeekProgress } from '@/lib/studentRoutineWeekProgress'
import { getBuenosAiresDateString, getBuenosAiresHour, getCurrentBuenosAiresWeek, getElapsedProgramWeekIndex } from '@/lib/buenosAiresDate'
import { getActiveStudentRoutine } from '@/lib/getActiveStudentRoutine'
import { getStudentAppContext } from '@/lib/auth/student'
import { resolveWeekdayDateInProgramWeek, type IsoWeekday } from '@/lib/routineCalendar'

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
    let homeTrainingDays: StudentHomeTrainingDay[] = []
    let selectedHomeDay: StudentHomeTrainingDay | null = null
    let selectedExercises: { name: string; sets: number; reps: string | null }[] = []

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
                        .select('routine_day_id, sets, reps, exercise_id')
                        .in('routine_day_id', dayIds)
                        .order('position', { ascending: true })
                    if (weekExercisesError) throw weekExercisesError

                    const daysWithExercises = new Set(
                        (weekExercises ?? []).map((exercise) => exercise.routine_day_id).filter(Boolean)
                    )
                    const trainingDays = days.filter((day) => daysWithExercises.has(day.id))
                    totalTrainingDays = trainingDays.length

                    const exerciseIds = [
                        ...new Set((weekExercises ?? []).map((exercise) => exercise.exercise_id).filter(Boolean)),
                    ]
                    const [progress, exercisesResult] = await Promise.all([
                        trainingDays.length > 0
                            ? getStudentRoutineWeekProgress(
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
                            : Promise.resolve(null),
                        exerciseIds.length > 0
                            ? supabase
                                .from('exercises')
                                .select('id, name')
                                .in('id', exerciseIds)
                            : Promise.resolve({ data: [] }),
                    ])
                    if ('error' in exercisesResult && exercisesResult.error) throw exercisesResult.error

                    const exMap = new Map(
                        (exercisesResult.data ?? []).map((exercise) => [exercise.id, exercise.name])
                    )
                    const trainingWeekdays = assignment.trainingWeekdays
                    const hasRealSchedule = Boolean(
                        trainingWeekdays && trainingWeekdays.length >= trainingDays.length
                    )

                    homeTrainingDays = trainingDays.map((day, dayPosition) => {
                        const dayExercises = (weekExercises ?? []).filter(
                            (exercise) => exercise.routine_day_id === day.id
                        )
                        const weekday = hasRealSchedule ? trainingWeekdays?.[dayPosition] : undefined
                        const scheduledDate = schedule.selectedWeekStart && weekday
                            ? resolveWeekdayDateInProgramWeek(
                                schedule.selectedWeekStart,
                                weekday as IsoWeekday
                            )
                            : null
                        const dayName = day.name?.trim()
                            || day.title?.trim()
                            || `Entrenamiento ${dayPosition + 1}`
                        const status = progress?.statusByDayId.get(day.id) ?? 'pending'
                        const sessionId = progress?.sessionIdByDayId.get(day.id) ?? null
                        const scheduleQuery = `${selectedMonthId ? `month=${selectedMonthId}&` : ''}week=${selectedWeekId}&day=${day.id}`
                        const href = sessionId && (status === 'partial' || status === 'completed')
                            ? `/app/train?session=${sessionId}&source=home&${scheduleQuery}`
                            : `/app/train?${scheduleQuery}`

                        return {
                            id: day.id,
                            name: dayName,
                            scheduledDate,
                            status,
                            exerciseCount: dayExercises.length,
                            totalSets: dayExercises.reduce((sum, exercise) => sum + (exercise.sets ?? 3), 0),
                            href,
                        }
                    })

                    completedDays = homeTrainingDays.filter((day) => day.status === 'completed').length
                    weekCompleted = totalTrainingDays > 0 && completedDays === totalTrainingDays

                    const unfinishedDays = homeTrainingDays.filter((day) => day.status !== 'completed')
                    const overdueDay = unfinishedDays
                        .filter((day) => day.scheduledDate && day.scheduledDate < today)
                        .sort((left, right) => (right.scheduledDate ?? '').localeCompare(left.scheduledDate ?? ''))[0]
                    const upcomingDay = unfinishedDays
                        .filter((day) => day.scheduledDate && day.scheduledDate > today)
                        .sort((left, right) => (left.scheduledDate ?? '').localeCompare(right.scheduledDate ?? ''))[0]

                    selectedHomeDay = unfinishedDays.find((day) => day.status === 'in_progress')
                        ?? unfinishedDays.find((day) => day.scheduledDate === today)
                        ?? unfinishedDays.find((day) => day.status === 'partial')
                        ?? overdueDay
                        ?? upcomingDay
                        ?? unfinishedDays[0]
                        ?? homeTrainingDays[0]
                        ?? null

                    if (selectedHomeDay) {
                        selectedExercises = (weekExercises ?? [])
                            .filter((exercise) => exercise.routine_day_id === selectedHomeDay?.id)
                            .map((exercise) => ({
                                name: exMap.get(exercise.exercise_id) ?? 'Ejercicio',
                                sets: exercise.sets ?? 3,
                                reps: exercise.reps != null ? String(exercise.reps) : null,
                            }))
                    }
                }
            }
        }
    }

    const firstName = student?.first_name ?? profile.name ?? 'Atleta'
    const routineHref = selectedWeekId
        ? `/app/rutina?${selectedMonthId ? `month=${selectedMonthId}&` : ''}week=${selectedWeekId}`
        : '/app/rutina'
    const hour = getBuenosAiresHour()
    const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

    return (
        <StudentHomeDashboard
            greeting={greeting}
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
            selectedExercises={selectedExercises}
            completedDays={completedDays}
            totalTrainingDays={totalTrainingDays}
            weekCompleted={weekCompleted}
            programWeekNumber={programWeekNumber}
            totalProgramWeeks={totalProgramWeeks}
        />
    )
}

function daysBetween(from: string, to: string) {
    const start = new Date(`${from}T00:00:00Z`)
    const end = new Date(`${to}T00:00:00Z`)
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
}
