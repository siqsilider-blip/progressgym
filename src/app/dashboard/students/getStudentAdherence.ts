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
        .gte('performed_at', fourWeeksAgo.toISOString())

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
    const plannedSessions = 12
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