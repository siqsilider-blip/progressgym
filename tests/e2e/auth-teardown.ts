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
    const routineId = process.env.E2E_ROUTINE_ID
    const exerciseId = process.env.E2E_EXERCISE_ID

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

    await removeAuthFixtureData(admin, {
        userIds,
        trainerIds: userIds,
        studentIds: studentId ? [studentId] : [],
        routineIds: routineId ? [routineId] : [],
        exerciseIds: exerciseId ? [exerciseId] : [],
    })
}
