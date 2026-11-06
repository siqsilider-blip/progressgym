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

    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    const { count: completedSessionsCount, error } = await supabase
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .eq('completed_manually', true)
        .eq('completion_status', 'complete')
        .gte('performed_date', fourWeeksAgo.toISOString().split('T')[0])

    if (error) {
        console.error('Error fetching student adherence:', error)
        return {
            completedSessions: 0,
            plannedSessions: 12,
            percentage: 0,
        }
    }

    const completedSessions = completedSessionsCount ?? 0

    // Calcular sesiones planificadas basado en días por semana de la rutina
    const { data: assignment } = await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle()

    let plannedSessions = 12 // default 3 días/semana x 4 semanas

    if (assignment?.routine_id) {
        const { data: months } = await supabase
            .from('routine_months')
            .select('id')
            .eq('routine_id', assignment.routine_id)
            .limit(1)

        if (months && months.length > 0) {
            const { data: weeks } = await supabase
                .from('routine_weeks')
                .select('id')
                .eq('routine_month_id', months[0].id)
                .limit(1)

            if (weeks && weeks.length > 0) {
                const { count: daysCount } = await supabase
                    .from('routine_days')
                    .select('id', { count: 'exact', head: true })
                    .eq('routine_week_id', weeks[0].id)

                if (daysCount && daysCount > 0) {
                    plannedSessions = daysCount * 4 // días/semana x 4 semanas
                }
            }
        }
    }

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
