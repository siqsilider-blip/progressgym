import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

export default async function removeAuthFixture() {
    loadEnvConfig(process.cwd())

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const trainerUserId = process.env.E2E_TRAINER_USER_ID
    const studentUserId = process.env.E2E_STUDENT_USER_ID
    const studentId = process.env.E2E_STUDENT_ID

    if (!supabaseUrl || !serviceRoleKey) return

    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    const userIds = [trainerUserId, studentUserId].filter(
        (id): id is string => Boolean(id)
    )

    if (userIds.length > 0) {
        await admin.from('profiles').delete().in('id', userIds)
    }

    if (studentId) {
        await admin.from('students').delete().eq('id', studentId)
    }

    if (userIds.length > 0) {
        await admin.from('trainers').delete().in('id', userIds)
    }

    for (const userId of userIds) {
        await admin.auth.admin.deleteUser(userId)
    }
}
