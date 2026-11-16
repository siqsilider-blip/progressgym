import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBuenosAiresDateString, getElapsedProgramWeekIndex } from '@/lib/buenosAiresDate'
import { getProgramCyclePosition } from '@/lib/trainingDomain'
import { getRoutineExerciseNameMap } from '@/lib/coaching/getRoutineExerciseNames'
import { formatOpenSessionAge, getSessionActivityAt, isStaleOpenSession } from '@/lib/trainerAlertTime'
import { getTrainerStudents } from './getTrainerStudents'

export type TrainerAlert = {
    type: 'inactive' | 'no_routine' | 'new_student' | 'unfinished_session' | 'program_ending' | 'weekly_checkin' | 'missing_checkin' | 'progress_photo_due' | 'workout_pain'
    stage?: 'access_pending' | 'onboarding_pending' | 'ready_for_program'
    studentId: string
    studentName: string
    studentPhone: string | null
    message: string
    actionHref: string
    actionLabel?: string
}

type AssignmentRow = {
    student_id: string
    routine_id: string
    program_started_on: string
}

type WeekRow = { routine_id: string }
type SessionRow = { id: string; student_id: string; started_at: string; last_activity_at?: string }
type FollowUpRow = { student_id: string; alert_type: TrainerAlert['type'] }
type WeeklyCheckinRow = {
    student_id: string
    week_start: string
    energy: number
    sleep_quality: number
    stress: number
    training_difficulty: number
    had_pain: boolean
    reviewed_at: string | null
}
type ProgressPhotoRow = { student_id: string; captured_on: string }
type WorkoutPainRow = { student_id: string; pain_details: string | null; created_at: string }
type ConversationRow = { id: string; student_id: string }
type PainMessageRow = {
    conversation_id: string
    body: string
    created_at: string
    routine_day_exercise_id: string | null
}
type LinkedProfileRow = { id: string; student_id: string | null }
type OnboardingRow = { student_id: string; completed_at: string | null }

export async function getTrainerAlerts(): Promise<TrainerAlert[]> {
    const supabase = await createClient()
    const admin = createAdminClient()
    const students = await getTrainerStudents()

    if (students.length === 0) {
        return []
    }

    const studentIds = students.map((student) => student.id)
    const now = new Date()
    const today = getBuenosAiresDateString(now)

    const [workoutsResult, routinesResult, activeSessionsResult, followUpsResult, weeklyCheckinsResult, workoutPainResult, conversationsResult, progressPhotosResult, linkedProfilesResult, onboardingResult] = await Promise.all([
        supabase
            .from('exercise_logs')
            .select('student_id, performed_at, created_at')
            .in('student_id', studentIds)
            .order('created_at', { ascending: false }),

        supabase
            .from('student_routines')
            .select('student_id, routine_id, program_started_on')
            .in('student_id', studentIds)
            .eq('status', 'active'),

        supabase
            .from('workout_sessions')
            .select('id, student_id, started_at')
            .in('student_id', studentIds)
            .eq('status', 'in_progress'),

        supabase
            .from('student_follow_ups')
            .select('student_id, alert_type')
            .in('student_id', studentIds)
            .gt('snoozed_until', now.toISOString()),

        supabase
            .from('student_weekly_checkins')
            .select('student_id, week_start, energy, sleep_quality, stress, training_difficulty, had_pain, reviewed_at')
            .in('student_id', studentIds)
            .order('week_start', { ascending: false }),

        supabase
            .from('workout_feedback')
            .select('student_id, pain_details, created_at')
            .in('student_id', studentIds)
            .eq('had_pain', true)
            .is('reviewed_at', null)
            .order('created_at', { ascending: false }),

        supabase
            .from('coaching_conversations')
            .select('id, student_id')
            .in('student_id', studentIds),

        supabase
            .from('student_progress_photos')
            .select('student_id, captured_on')
            .in('student_id', studentIds)
            .order('captured_on', { ascending: false }),

        admin
            .from('profiles')
            .select('id, student_id')
            .in('student_id', studentIds)
            .eq('role', 'student'),

        supabase
            .from('student_onboarding_profiles')
            .select('student_id, completed_at')
            .in('student_id', studentIds),
    ])

    if (workoutsResult.error) {
        console.error('Error fetching workouts for alerts:', workoutsResult.error)
    }

    if (routinesResult.error) {
        console.error('Error fetching routines for alerts:', routinesResult.error)
    }

    if (activeSessionsResult.error) {
        console.error('Error fetching active sessions for alerts:', activeSessionsResult.error)
    }

    if (followUpsResult.error) {
        console.error('Error fetching follow-ups for alerts:', followUpsResult.error)
    }

    if (weeklyCheckinsResult.error) {
        console.error('Error fetching weekly check-ins for alerts:', weeklyCheckinsResult.error)
    }

    if (workoutPainResult.error) {
        console.error('Error fetching workout pain alerts:', workoutPainResult.error)
    }

    if (conversationsResult.error) {
        console.error('Error fetching coaching conversations for alerts:', conversationsResult.error)
    }

    if (progressPhotosResult.error) {
        console.error('Error fetching progress photos for alerts:', progressPhotosResult.error)
    }

    if (linkedProfilesResult.error) {
        console.error('Error fetching linked profiles for alerts:', linkedProfilesResult.error)
    }

    if (onboardingResult.error) {
        console.error('Error fetching onboarding profiles for alerts:', onboardingResult.error)
    }

    const workouts = workoutsResult.data ?? []
    const routines = (routinesResult.data as AssignmentRow[] | null) ?? []
    let activeSessions = (activeSessionsResult.data as SessionRow[] | null) ?? []
    const activeSessionIds = activeSessions.map((session) => session.id)
    if (activeSessionIds.length > 0) {
        const { data: activeLogs, error: activeLogsError } = await supabase
            .from('exercise_logs')
            .select('workout_session_id, created_at')
            .in('workout_session_id', activeSessionIds)
            .order('created_at', { ascending: false })

        if (activeLogsError) {
            console.error('Error fetching active session activity:', activeLogsError)
        } else {
            const latestActivityBySession = new Map<string, string>()
            for (const log of activeLogs ?? []) {
                if (log.workout_session_id && log.created_at && !latestActivityBySession.has(log.workout_session_id)) {
                    latestActivityBySession.set(log.workout_session_id, log.created_at)
                }
            }
            activeSessions = activeSessions.map((session) => ({
                ...session,
                last_activity_at: latestActivityBySession.get(session.id) ?? session.started_at,
            }))
        }
    }
    const linkedProfiles = (linkedProfilesResult.data as LinkedProfileRow[] | null) ?? []
    const completedOnboardingStudentIds = new Set(
        ((onboardingResult.data as OnboardingRow[] | null) ?? [])
            .filter((profile) => Boolean(profile.completed_at))
            .map((profile) => profile.student_id)
    )
    const activatedStudentIds = new Set(completedOnboardingStudentIds)
    const activationResults = await Promise.all(
        linkedProfiles
            .filter((profile) => profile.student_id && !completedOnboardingStudentIds.has(profile.student_id))
            .map(async (profile) => {
                const { data, error } = await admin.auth.admin.getUserById(profile.id)
                if (error) {
                    console.error('Error fetching student access status:', error)
                    return null
                }

                return data.user.email_confirmed_at ? profile.student_id : null
            })
    )
    for (const studentId of activationResults) {
        if (studentId) activatedStudentIds.add(studentId)
    }
    const suppressedAlertKeys = new Set(
        ((followUpsResult.data as FollowUpRow[] | null) ?? [])
            .map((row) => `${row.student_id}:${row.alert_type}`)
    )
    const isSuppressed = (studentId: string, type: TrainerAlert['type']) => (
        suppressedAlertKeys.has(`${studentId}:${type}`)
    )
    const attentionCheckinByStudent = new Map<string, WeeklyCheckinRow>()
    const workoutPainByStudent = new Map<string, WorkoutPainRow>()
    for (const feedback of ((workoutPainResult.data as WorkoutPainRow[] | null) ?? [])) {
        if (!workoutPainByStudent.has(feedback.student_id)) {
            workoutPainByStudent.set(feedback.student_id, feedback)
        }
    }
    const conversations = (conversationsResult.data as ConversationRow[] | null) ?? []
    const conversationStudentMap = new Map(conversations.map((conversation) => [conversation.id, conversation.student_id]))
    const painMessageByStudent = new Map<string, PainMessageRow>()
    let painExerciseNameByRoutineExercise = new Map<string, string>()
    if (conversations.length > 0) {
        const { data: painMessages, error: painMessagesError } = await supabase
            .from('coaching_messages')
            .select('conversation_id, body, created_at, routine_day_exercise_id')
            .in('conversation_id', conversations.map((conversation) => conversation.id))
            .eq('sender_role', 'student')
            .eq('topic', 'pain')
            .is('read_at', null)
            .order('created_at', { ascending: false })

        if (painMessagesError) {
            console.error('Error fetching pain messages for alerts:', painMessagesError)
        }

        const typedPainMessages = (painMessages as PainMessageRow[] | null) ?? []
        painExerciseNameByRoutineExercise = await getRoutineExerciseNameMap(
            supabase,
            typedPainMessages.map((message) => message.routine_day_exercise_id)
        )

        for (const message of typedPainMessages) {
            const studentId = conversationStudentMap.get(message.conversation_id)
            if (studentId && !painMessageByStudent.has(studentId)) {
                painMessageByStudent.set(studentId, message)
            }
        }
    }
    const lastCheckinByStudent = new Map<string, WeeklyCheckinRow>()
    for (const checkin of ((weeklyCheckinsResult.data as WeeklyCheckinRow[] | null) ?? [])) {
        const isLatestCheckin = !lastCheckinByStudent.has(checkin.student_id)
        if (isLatestCheckin) {
            lastCheckinByStudent.set(checkin.student_id, checkin)
        }
        const requiresAttention = checkin.had_pain
            || checkin.energy <= 2
            || checkin.sleep_quality <= 2
            || checkin.stress >= 4
            || checkin.training_difficulty >= 5
        if (isLatestCheckin && !checkin.reviewed_at && requiresAttention) {
            attentionCheckinByStudent.set(checkin.student_id, checkin)
        }
    }
    const lastPhotoByStudent = new Map<string, ProgressPhotoRow>()
    for (const photo of ((progressPhotosResult.data as ProgressPhotoRow[] | null) ?? [])) {
        if (!lastPhotoByStudent.has(photo.student_id)) {
            lastPhotoByStudent.set(photo.student_id, photo)
        }
    }

    const routineIds = [...new Set(routines.map((routine) => routine.routine_id))]
    const weekCountByRoutine = new Map<string, number>()

    if (routineIds.length > 0) {
        const { data: weeks, error: weeksError } = await supabase
            .from('routine_weeks')
            .select('routine_id')
            .in('routine_id', routineIds)

        if (weeksError) {
            console.error('Error fetching routine weeks for alerts:', weeksError)
        }

        for (const week of ((weeks as WeekRow[] | null) ?? [])) {
            weekCountByRoutine.set(
                week.routine_id,
                (weekCountByRoutine.get(week.routine_id) ?? 0) + 1
            )
        }
    }

    const lastWorkoutByStudent = new Map<string, string>()
    for (const log of workouts) {
        if (!lastWorkoutByStudent.has(log.student_id) && (log.created_at || log.performed_at)) {
            lastWorkoutByStudent.set(log.student_id, String(log.created_at ?? log.performed_at))
        }
    }

    const assignmentByStudent = new Map(
        routines.map((assignment) => [assignment.student_id, assignment])
    )
    const staleSessionByStudent = new Map<string, SessionRow>()

    for (const session of activeSessions) {
        const activityAt = getSessionActivityAt(session.started_at, session.last_activity_at)
        if (!isStaleOpenSession(activityAt, now)) continue

        const current = staleSessionByStudent.get(session.student_id)
        if (
            !current
            || new Date(activityAt).getTime() > new Date(current.last_activity_at ?? current.started_at).getTime()
        ) {
            staleSessionByStudent.set(session.student_id, session)
        }
    }

    const alerts: TrainerAlert[] = []

    for (const student of students) {
        const fullName =
            `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno'

        const lastWorkoutAt = lastWorkoutByStudent.get(student.id)
        const assignment = assignmentByStudent.get(student.id)
        const attentionCheckin = attentionCheckinByStudent.get(student.id)
        const workoutPain = workoutPainByStudent.get(student.id)
        const painMessage = painMessageByStudent.get(student.id)

        // Una sola prioridad por alumno: siempre queda arriba la acción más urgente.
        if (workoutPain || painMessage) {
            if (!isSuppressed(student.id, 'workout_pain')) {
                const painExerciseName = painMessage?.routine_day_exercise_id
                    ? painExerciseNameByRoutineExercise.get(painMessage.routine_day_exercise_id)
                    : null
                alerts.push({
                    type: 'workout_pain',
                    studentId: student.id,
                    studentName: fullName,
                    studentPhone: student.phone ?? null,
                    message: workoutPain
                        ? `${fullName} informó una molestia después de entrenar${workoutPain.pain_details ? `: ${workoutPain.pain_details}` : '.'}`
                        : `${fullName} informó una molestia ${painExerciseName ? `al hacer ${painExerciseName}` : 'durante el entrenamiento'}${painMessage?.body ? `: ${painMessage.body}` : '.'}`,
                    actionHref: `/dashboard/messages?student=${student.id}`,
                    actionLabel: 'Revisar molestia',
                })
            }
            continue
        }

        if (attentionCheckin) {
            if (!isSuppressed(student.id, 'weekly_checkin')) {
                alerts.push({
                    type: 'weekly_checkin',
                    studentId: student.id,
                    studentName: fullName,
                    studentPhone: student.phone ?? null,
                    message: getWeeklyCheckinAlertMessage(fullName, attentionCheckin),
                    actionHref: `/dashboard/messages?student=${student.id}`,
                })
            }
            continue
        }

        if (!assignment) {
            if (!isSuppressed(student.id, 'no_routine')) {
                const onboardingCompleted = completedOnboardingStudentIds.has(student.id)
                const accountActivated = activatedStudentIds.has(student.id)
                const stage: TrainerAlert['stage'] = onboardingCompleted
                    ? 'ready_for_program'
                    : accountActivated
                        ? 'onboarding_pending'
                        : 'access_pending'
                alerts.push({
                    type: 'no_routine',
                    stage,
                    studentId: student.id,
                    studentName: fullName,
                    studentPhone: student.phone ?? null,
                    message: onboardingCompleted
                        ? `${fullName} completó su ficha. Falta elegir el programa.`
                        : accountActivated
                            ? `${fullName} creó su acceso, pero todavía no completó la ficha inicial.`
                            : `${fullName} todavía no activó su acceso a la aplicación.`,
                    actionHref: onboardingCompleted
                        ? `/dashboard/students/${student.id}/assign-routine`
                        : `/dashboard/students/${student.id}${accountActivated ? '' : '?setup=invite'}`,
                    actionLabel: onboardingCompleted
                        ? 'Elegir programa'
                        : accountActivated
                            ? 'Ver ficha'
                            : 'Enviar acceso',
                })
            }
            continue
        }

        const staleSession = staleSessionByStudent.get(student.id)
        if (staleSession) {
            if (!isSuppressed(student.id, 'unfinished_session')) {
                alerts.push({
                    type: 'unfinished_session',
                    studentId: student.id,
                    studentName: fullName,
                    studentPhone: student.phone ?? null,
                    message: `${fullName} tiene una sesión abierta sin actividad ${formatOpenSessionAge(getSessionActivityAt(staleSession.started_at, staleSession.last_activity_at), now)}.`,
                    actionHref: `/dashboard/students/${student.id}/train`,
                })
            }
            continue
        }

        if (!lastWorkoutAt) {
            if (!isSuppressed(student.id, 'new_student')) {
                alerts.push({
                    type: 'new_student',
                    studentId: student.id,
                    studentName: fullName,
                    studentPhone: student.phone ?? null,
                    message: `${fullName} todavía no registró entrenamientos.`,
                    actionHref: `/dashboard/students/${student.id}`,
                })
            }
            continue
        }

        const diffDays = Math.floor(
            (now.getTime() - new Date(lastWorkoutAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )

        if (diffDays >= 7) {
            if (!isSuppressed(student.id, 'inactive')) {
                alerts.push({
                    type: 'inactive',
                    studentId: student.id,
                    studentName: fullName,
                    studentPhone: student.phone ?? null,
                    message: `${fullName} no entrena hace ${diffDays} días.`,
                    actionHref: `/dashboard/students/${student.id}`,
                })
            }
            continue
        }

        const lastCheckin = lastCheckinByStudent.get(student.id)
        const programAgeWeeks = getElapsedProgramWeekIndex(assignment.program_started_on)
        const checkinAgeDays = lastCheckin ? daysBetween(lastCheckin.week_start, today) : null
        const needsCheckin = lastCheckin ? checkinAgeDays !== null && checkinAgeDays >= 10 : programAgeWeeks >= 1

        if (needsCheckin) {
            if (!isSuppressed(student.id, 'missing_checkin')) {
                alerts.push({
                    type: 'missing_checkin',
                    studentId: student.id,
                    studentName: fullName,
                    studentPhone: student.phone ?? null,
                    message: lastCheckin
                        ? `${fullName} no completa el control semanal hace ${checkinAgeDays} días.`
                        : `${fullName} todavía no completó su primer control semanal.`,
                    actionHref: `/dashboard/messages?student=${student.id}`,
                })
            }
            continue
        }

        const totalWeeks = Math.max(1, weekCountByRoutine.get(assignment.routine_id) ?? 1)
        const currentWeek = getProgramCyclePosition(
            totalWeeks,
            getElapsedProgramWeekIndex(assignment.program_started_on)
        ).programWeekNumber

        if (totalWeeks > 1 && currentWeek === totalWeeks) {
            if (!isSuppressed(student.id, 'program_ending')) {
                alerts.push({
                    type: 'program_ending',
                    studentId: student.id,
                    studentName: fullName,
                    studentPhone: student.phone ?? null,
                    message: `${fullName} está en la última semana del ciclo. Conviene revisar si el programa sigue igual o necesita ajustes.`,
                    actionHref: `/dashboard/students/${student.id}`,
                    actionLabel: 'Revisar programa',
                })
            }
            continue
        }

        const lastPhoto = lastPhotoByStudent.get(student.id)
        const photoAgeDays = lastPhoto ? daysBetween(lastPhoto.captured_on, today) : null
        const needsPhoto = lastPhoto ? photoAgeDays !== null && photoAgeDays >= 35 : programAgeWeeks >= 4
        if (needsPhoto && !isSuppressed(student.id, 'progress_photo_due')) {
            alerts.push({
                type: 'progress_photo_due',
                studentId: student.id,
                studentName: fullName,
                studentPhone: student.phone ?? null,
                message: lastPhoto
                    ? `${fullName} no actualiza sus fotos de progreso hace ${photoAgeDays} días.`
                    : `${fullName} ya puede registrar sus primeras fotos de progreso.`,
                actionHref: `/dashboard/messages?student=${student.id}`,
            })
        }
    }

    const priority: Record<TrainerAlert['type'], number> = {
        workout_pain: 0,
        weekly_checkin: 1,
        no_routine: 2,
        unfinished_session: 3,
        inactive: 4,
        new_student: 7,
        missing_checkin: 8,
        program_ending: 9,
        progress_photo_due: 10,
    }

    const getPriority = (alert: TrainerAlert) => {
        if (alert.type !== 'no_routine') return priority[alert.type]
        if (alert.stage === 'ready_for_program') return 2
        if (alert.stage === 'onboarding_pending') return 5
        return 6
    }

    return alerts.sort((a, b) => getPriority(a) - getPriority(b))
}

function daysBetween(from: string, to: string) {
    const start = new Date(`${from}T00:00:00Z`)
    const end = new Date(`${to}T00:00:00Z`)
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
}

function getWeeklyCheckinAlertMessage(studentName: string, checkin: WeeklyCheckinRow) {
    if (checkin.had_pain) return `${studentName} informó dolor o una molestia en su check-in.`
    if (checkin.energy <= 2) return `${studentName} informó energía baja esta semana.`
    if (checkin.sleep_quality <= 2) return `${studentName} informó que durmió mal esta semana.`
    if (checkin.stress >= 4) return `${studentName} informó estrés alto esta semana.`
    return `${studentName} sintió los entrenamientos demasiado exigentes.`
}
