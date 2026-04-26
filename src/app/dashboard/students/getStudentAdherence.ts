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

    const { data: logs, error } = await supabase
        .from('exercise_logs')
        .select('performed_at')
        .eq('student_id', studentId)
        .gte('performed_at', fourWeeksAgo.toISOString().split('T')[0])

    if (error) {
        console.error('Error fetching student adherence:', error)
        return {
            completedSessions: 0,
            plannedSessions: 12,
            percentage: 0,
        }
    }

    const uniqueDays = new Set(
        (logs || [])
            .map((log) => {
                if (!log.performed_at) return null
                return new Date(log.performed_at).toISOString().split('T')[0]
            })
            .filter(Boolean)
    )

    const completedSessions = uniqueDays.size

    // Calcular sesiones planificadas basado en días por semana de la rutina
    const { data: assignment } = await supabase
        .from('student_routines')
        .select('routine_id')
        .eq('student_id', studentId)
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