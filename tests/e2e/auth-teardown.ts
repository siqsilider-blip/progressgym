import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { removeAuthFixtureData } from './auth-fixture-cleanup'

export default async function removeAuthFixture() {
    loadEnvConfig(process.cwd())

    const supabaseUrl = process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    const trainerUserId = process.env.E2E_TRAINER_USER_ID
    const studentUserId = process.env.E2E_STUDENT_USER_ID
    const studentId = process.env.E2E_STUDENT_ID
    const inviteStudentId = process.env.E2E_INVITE_STUDENT_ID
    const inviteStudentEmail = process.env.E2E_INVITE_STUDENT_EMAIL
    const routineId = process.env.E2E_ROUTINE_ID
    const exerciseId = process.env.E2E_EXERCISE_ID

    if (!supabaseUrl || !serviceRoleKey) return

    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    let invitedUserId: string | undefined
    if (inviteStudentEmail) {
        let page = 1
        while (!invitedUserId) {
            const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
            if (error) break
            invitedUserId = data.users.find(
                (user) => user.email?.toLowerCase() === inviteStudentEmail.toLowerCase()
            )?.id
            if (data.users.length < 200) break
            page += 1
        }
    }

    const userIds = [trainerUserId, studentUserId, invitedUserId].filter(
        (id): id is string => Boolean(id)
    )

    await removeAuthFixtureData(admin, {
        userIds,
        trainerIds: userIds,
        studentIds: [studentId, inviteStudentId].filter(
            (id): id is string => Boolean(id)
        ),
        routineIds: routineId ? [routineId] : [],
        exerciseIds: exerciseId ? [exerciseId] : [],
    })
}
