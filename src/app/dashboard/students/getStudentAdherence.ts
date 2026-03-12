import { createClient } from '@/lib/supabase/server'

export type StudentAdherence = {
    completedSessions: number
    plannedSessions: number
    percentage: number
}

export async function getStudentAdherence(
    studentId: string
): Promise<StudentAdherence> {
    const supabase = await createClient()

    const twentyEightDaysAgo = new Date()
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)

    const twentyEightDaysAgoIso = twentyEightDaysAgo.toISOString()

    const { data: assignment, error: assignmentError } = await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', studentId)
        .maybeSingle()

    if (assignmentError) {
        console.error('Error fetching student routine assignment:', assignmentError)
    }

    let plannedSessions = 0

    if (assignment?.routine_id) {
        const { data: routineDays, error: routineDaysError } = await supabase
            .from('routine_days')
            .select('id')
            .eq('routine_id', assignment.routine_id)

        if (routineDaysError) {
            console.error('Error fetching routine days:', routineDaysError)
        }

        const daysPerWeek = routineDays?.length ?? 0
        plannedSessions = daysPerWeek * 4
    }

    const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('id')
        .eq('student_id', studentId)
        .gte('created_at', twentyEightDaysAgoIso)

    if (workoutsError) {
        console.error('Error fetching adherence workouts:', workoutsError)
    }

    const completedSessions = workouts?.length ?? 0

    const percentage =
        plannedSessions > 0
            ? Math.round((completedSessions / plannedSessions) * 100)
            : 0

    return {
        completedSessions,
        plannedSessions,
        percentage,
    }
}