import { createClient } from '@/lib/supabase/server'
import { getBuenosAiresDateString, getElapsedProgramWeekIndex } from '@/lib/buenosAiresDate'
import { getTrainerStudents } from './getTrainerStudents'

export type TrainerAlert = {
    type: 'inactive' | 'no_routine' | 'new_student' | 'unfinished_session' | 'program_ending' | 'weekly_checkin' | 'missing_checkin' | 'progress_photo_due'
    studentId: string
    studentName: string
    studentPhone: string | null
    message: string
    actionHref: string
}

type AssignmentRow = {
    student_id: string
    routine_id: string
    program_started_on: string
}

type WeekRow = { routine_id: string }
type SessionRow = { student_id: string; started_at: string }
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

export async function getTrainerAlerts(): Promise<TrainerAlert[]> {
    const supabase = await createClient()
    const students = await getTrainerStudents()

    if (students.length === 0) {
        return []
    }

    const studentIds = students.map((student) => student.id)
    const now = new Date()
    const today = getBuenosAiresDateString(now)

    const [workoutsResult, routinesResult, activeSessionsResult, followUpsResult, weeklyCheckinsResult, progressPhotosResult] = await Promise.all([
        supabase
            .from('exercise_logs')
            .select('student_id, performed_at')
            .in('student_id', studentIds)
            .not('performed_at', 'is', null)
            .order('performed_at', { ascending: false }),

        supabase
            .from('student_routines')
            .select('student_id, routine_id, program_started_on')
            .in('student_id', studentIds)
            .eq('status', 'active'),

        supabase
            .from('workout_sessions')
            .select('student_id, started_at')
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
            .from('student_progress_photos')
            .select('student_id, captured_on')
            .in('student_id', studentIds)
            .order('captured_on', { ascending: false }),
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

    if (progressPhotosResult.error) {
        console.error('Error fetching progress photos for alerts:', progressPhotosResult.error)
    }

    const workouts = workoutsResult.data ?? []
    const routines = (routinesResult.data as AssignmentRow[] | null) ?? []
    const activeSessions = (activeSessionsResult.data as SessionRow[] | null) ?? []
    const suppressedAlertKeys = new Set(
        ((followUpsResult.data as FollowUpRow[] | null) ?? [])
            .map((row) => `${row.student_id}:${row.alert_type}`)
    )
    const isSuppressed = (studentId: string, type: TrainerAlert['type']) => (
        suppressedAlertKeys.has(`${studentId}:${type}`)
    )
    const attentionCheckinByStudent = new Map<string, WeeklyCheckinRow>()
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
        if (!lastWorkoutByStudent.has(log.student_id) && log.performed_at) {
            lastWorkoutByStudent.set(log.student_id, String(log.performed_at))
        }
    }

    const assignmentByStudent = new Map(
        routines.map((assignment) => [assignment.student_id, assignment])
    )
    const staleSessionByStudent = new Map<string, SessionRow>()

    for (const session of activeSessions) {
        const startedAt = new Date(session.started_at)
        const ageHours = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60)
        if (ageHours >= 6 && !staleSessionByStudent.has(session.student_id)) {
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

        // Una sola prioridad por alumno: siempre queda arriba la acción más urgente.
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
                alerts.push({
                    type: 'no_routine',
                    studentId: student.id,
                    studentName: fullName,
                    studentPhone: student.phone ?? null,
                    message: `${fullName} no tiene un programa activo.`,
                    actionHref: `/dashboard/students/${student.id}/assign-routine`,
                })
            }
            continue
        }

        if (staleSessionByStudent.has(student.id)) {
            if (!isSuppressed(student.id, 'unfinished_session')) {
                alerts.push({
                    type: 'unfinished_session',
                    studentId: student.id,
                    studentName: fullName,
                    studentPhone: student.phone ?? null,
                    message: `${fullName} dejó una sesión abierta hace más de 6 horas.`,
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
        const currentWeek = Math.min(
            getElapsedProgramWeekIndex(assignment.program_started_on) + 1,
            totalWeeks
        )

        if (totalWeeks > 1 && currentWeek === totalWeeks) {
            if (!isSuppressed(student.id, 'program_ending')) {
                alerts.push({
                    type: 'program_ending',
                    studentId: student.id,
                    studentName: fullName,
                    studentPhone: student.phone ?? null,
                    message: `${fullName} está en la última semana de su programa.`,
                    actionHref: `/dashboard/students/${student.id}`,
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
        weekly_checkin: 0,
        no_routine: 1,
        unfinished_session: 2,
        inactive: 3,
        new_student: 4,
        missing_checkin: 5,
        program_ending: 6,
        progress_photo_due: 7,
    }

    return alerts.sort((a, b) => priority[a.type] - priority[b.type])
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
