import { createClient } from '@/lib/supabase/server'

export type TrainerAlert = {
    type: 'inactive' | 'no_routine' | 'new_student'
    studentId: string
    studentName: string
    message: string
}

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

    const [workoutsResult, routinesResult] = await Promise.all([
        supabase
            .from('workouts')
            .select('student_id, created_at')
            .in('student_id', studentIds)
            .order('created_at', { ascending: false }),

        supabase
            .from('student_routines')
            .select('student_id')
            .in('student_id', studentIds),
    ])

    if (workoutsResult.error) {
        console.error('Error fetching workouts for alerts:', workoutsResult.error)
    }

    if (routinesResult.error) {
        console.error('Error fetching routines for alerts:', routinesResult.error)
    }

    const workouts = workoutsResult.data ?? []
    const routines = routinesResult.data ?? []

    const lastWorkoutByStudent = new Map<string, string>()
    for (const workout of workouts) {
        if (!lastWorkoutByStudent.has(workout.student_id)) {
            lastWorkoutByStudent.set(workout.student_id, workout.created_at)
        }
    }

    const studentsWithRoutine = new Set(routines.map((row) => row.student_id))
    const now = new Date()

    const alerts: TrainerAlert[] = []

    for (const student of students) {
        const fullName =
            `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Alumno'

        const lastWorkoutAt = lastWorkoutByStudent.get(student.id)
        const hasRoutine = studentsWithRoutine.has(student.id)

        if (!hasRoutine) {
            alerts.push({
                type: 'no_routine',
                studentId: student.id,
                studentName: fullName,
                message: `${fullName} no tiene rutina asignada.`,
            })
        }

        if (!lastWorkoutAt) {
            alerts.push({
                type: 'new_student',
                studentId: student.id,
                studentName: fullName,
                message: `${fullName} todavía no registró entrenamientos.`,
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
            })
        }
    }

    return alerts
}