import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from './server'

export const getStudentAppContext = cache(async () => {
    const user = await getServerUser()
    if (!user) return null

    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, email, role, student_id, created_at')
        .eq('id', user.id)
        .maybeSingle()

    return profile ? { user, profile } : null
})
