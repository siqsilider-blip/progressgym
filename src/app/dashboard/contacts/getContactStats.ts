import { createClient } from '@/lib/supabase/server'

function parseDateOnly(value: string) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
}

function startOfToday() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export async function getContactStats() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('trainer_id', user.id)
        .eq('is_archived', false)

    if (error) {
        console.error('Error fetching contact stats:', error)
        return {
            total: 0,
            pendingToday: 0,
            overdue: 0,
            hot: 0,
            converted: 0,
        }
    }

    const today = startOfToday()

    const stats = {
        total: data?.length || 0,
        pendingToday: 0,
        overdue: 0,
        hot: 0,
        converted: 0,
    }

    for (const c of data || []) {
        if (c.temperature === 'hot') stats.hot++
        if (c.converted_to_student) stats.converted++

        if (c.next_follow_up_at) {
            const nextDate = parseDateOnly(String(c.next_follow_up_at).slice(0, 10))

            if (nextDate.getTime() === today.getTime()) {
                stats.pendingToday++
            }

            if (nextDate < today && !c.converted_to_student) {
                stats.overdue++
            }
        }
    }

    return stats
}