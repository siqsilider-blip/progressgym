import { createClient } from '@/lib/supabase/server'
import { getElapsedProgramWeekIndex } from '@/lib/buenosAiresDate'

export type TrainerAlert = {
    type: 'inactive' | 'no_routine' | 'new_student' | 'unfinished_session' | 'program_ending'
    studentId: string
    studentName: string
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

export async function getTrainerAlerts(): Promise<TrainerAlert[]> {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return []
    }

    const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('trainer_id', user.id)

    if (studentsError || !students) {
        console.error('Error fetching students for alerts:', studentsError)
        return []
    }

    if (students.length === 0) {
        return []
    }

    const studentIds = students.map((student) => student.id)

    const [workoutsResult, routinesResult, activeSessionsResult] = await Promise.all([
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

    const workouts = workoutsResult.data ?? []
    const routines = (routinesResult.data as AssignmentRow[] | null) ?? []
    const activeSessions = (activeSessionsResult.data as SessionRow[] | null) ?? []

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
    const now = new Date()

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

        // Una sola prioridad por alumno: siempre queda arriba la acción más urgente.
        if (!assignment) {
            alerts.push({
                type: 'no_routine',
                studentId: student.id,
                studentName: fullName,
                message: `${fullName} no tiene un programa activo.`,
                actionHref: `/dashboard/students/${student.id}/assign-routine`,
            })
            continue
        }

        if (staleSessionByStudent.has(student.id)) {
            alerts.push({
                type: 'unfinished_session',
                studentId: student.id,
                studentName: fullName,
                message: `${fullName} dejó una sesión abierta hace más de 6 horas.`,
                actionHref: `/dashboard/students/${student.id}/train`,
            })
            continue
        }

        if (!lastWorkoutAt) {
            alerts.push({
                type: 'new_student',
                studentId: student.id,
                studentName: fullName,
                message: `${fullName} todavía no registró entrenamientos.`,
                actionHref: `/dashboard/students/${student.id}`,
            })
            continue
        }

        const diffDays = Math.floor(
            (now.getTime() - new Date(lastWorkoutAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )

        if (diffDays >= 7) {
            alerts.push({
                type: 'inactive',
                studentId: student.id,
                studentName: fullName,
                message: `${fullName} no entrena hace ${diffDays} días.`,
                actionHref: `/dashboard/students/${student.id}`,
            })
            continue
        }

        const totalWeeks = Math.max(1, weekCountByRoutine.get(assignment.routine_id) ?? 1)
        const currentWeek = Math.min(
            getElapsedProgramWeekIndex(assignment.program_started_on) + 1,
            totalWeeks
        )

        if (totalWeeks > 1 && currentWeek === totalWeeks) {
            alerts.push({
                type: 'program_ending',
                studentId: student.id,
                studentName: fullName,
                message: `${fullName} está en la última semana de su programa.`,
                actionHref: `/dashboard/students/${student.id}`,
            })
        }
    }

    const priority: Record<TrainerAlert['type'], number> = {
        no_routine: 0,
        unfinished_session: 1,
        inactive: 2,
        new_student: 3,
        program_ending: 4,
    }

    return alerts.sort((a, b) => priority[a.type] - priority[b.type])
}
