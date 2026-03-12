import { createClient } from '@/lib/supabase/server'

export type TrainerDashboardStats = {
    totalStudents: number
    activeStudents: number
    inactiveStudents: number
    totalPRs: number
    studentsWithRoutine: number
}

export async function getTrainerDashboardStats(): Promise<TrainerDashboardStats> {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return {
            totalStudents: 0,
            activeStudents: 0,
            inactiveStudents: 0,
            totalPRs: 0,
            studentsWithRoutine: 0,
        }
    }

    const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('trainer_id', user.id)

    if (studentsError) {
        console.error('Error fetching students:', studentsError)
        return {
            totalStudents: 0,
            activeStudents: 0,
            inactiveStudents: 0,
            totalPRs: 0,
            studentsWithRoutine: 0,
        }
    }

    const studentIds = (students ?? []).map((student) => student.id)
    const totalStudents = studentIds.length

    if (studentIds.length === 0) {
        return {
            totalStudents: 0,
            activeStudents: 0,
            inactiveStudents: 0,
            totalPRs: 0,
            studentsWithRoutine: 0,
        }
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const sevenDaysAgoIso = sevenDaysAgo.toISOString()

    const [recentWorkoutsResult, routinesResult] = await Promise.all([
        supabase
            .from('workouts')
            .select('student_id, created_at')
            .in('student_id', studentIds)
            .gte('created_at', sevenDaysAgoIso),

        supabase
            .from('student_routines')
            .select('student_id')
            .in('student_id', studentIds),
    ])

    if (recentWorkoutsResult.error) {
        console.error('Error fetching recent workouts:', recentWorkoutsResult.error)
    }

    if (routinesResult.error) {
        console.error('Error fetching student routines:', routinesResult.error)
    }

    const recentWorkouts = recentWorkoutsResult.data ?? []
    const routines = routinesResult.data ?? []

    const activeStudentIds = new Set(
        recentWorkouts.map((workout) => workout.student_id)
    )

    const routineStudentIds = new Set(
        routines.map((assignment) => assignment.student_id)
    )

    const activeStudents = activeStudentIds.size
    const inactiveStudents = totalStudents - activeStudents

    // Por ahora en 0 hasta ver cómo guardás los PR reales
    const totalPRs = 0

    const studentsWithRoutine = routineStudentIds.size

    return {
        totalStudents,
        activeStudents,
        inactiveStudents,
        totalPRs,
        studentsWithRoutine,
    }
}