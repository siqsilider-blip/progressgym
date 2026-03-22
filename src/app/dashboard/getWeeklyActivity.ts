import { createClient } from '@/lib/supabase/server'

export async function getWeeklyActivity() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return []

    const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('trainer_id', user.id)

    if (!students || students.length === 0) return []

    const studentIds = students.map((student) => student.id)

    const today = new Date()
    const startDate = new Date()
    startDate.setDate(today.getDate() - 6)

    const { data, error } = await supabase
        .from('exercise_logs')
        .select('performed_at, student_id')
        .in('student_id', studentIds)
        .gte('performed_at', startDate.toISOString().slice(0, 10))

    if (error) {
        console.error('Error fetching weekly activity:', error)
        return []
    }

    const daysMap: Record<string, number> = {}

    for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        daysMap[key] = 0
    }

    for (const item of data ?? []) {
        if (!item.performed_at) continue

        const key = item.performed_at.slice(0, 10)
        if (daysMap[key] !== undefined) {
            daysMap[key] += 1
        }
    }

    return Object.entries(daysMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
            date,
            count,
        }))
}