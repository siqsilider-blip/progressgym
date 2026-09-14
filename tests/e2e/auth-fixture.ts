import { randomBytes } from 'node:crypto'
import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

type CreatedFixture = {
    trainerUserId?: string
    studentUserId?: string
    studentId?: string
}

export default async function createAuthFixture() {
    loadEnvConfig(process.cwd())

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Las pruebas autenticadas requieren NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.'
        )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    async function removeStaleFixtures() {
        const staleUserIds: string[] = []
        let page = 1

        while (true) {
            const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
            if (error) throw error

            for (const user of data.users) {
                if (/^e2e-(trainer|student)-.+@example\.com$/i.test(user.email ?? '')) {
                    staleUserIds.push(user.id)
                }
            }

            if (data.users.length < 200) break
            page += 1
        }

        const { data: staleStudents } = await admin
            .from('students')
            .select('id')
            .like('email', 'e2e-%@example.com')

        if (staleUserIds.length > 0) {
            await admin.from('profiles').delete().in('id', staleUserIds)
        }

        const staleStudentIds = (staleStudents ?? []).map((student) => student.id)
        if (staleStudentIds.length > 0) {
            await admin.from('students').delete().in('id', staleStudentIds)
        }

        if (staleUserIds.length > 0) {
            await admin.from('trainers').delete().in('id', staleUserIds)
        }

        for (const userId of staleUserIds) {
            await admin.auth.admin.deleteUser(userId)
        }
    }

    await removeStaleFixtures()

    const runId = `${Date.now()}-${randomBytes(4).toString('hex')}`
    const password = `${randomBytes(24).toString('base64url')}Aa1!`
    const trainerEmail = `e2e-trainer-${runId}@example.com`
    const studentEmail = `e2e-student-${runId}@example.com`
    const created: CreatedFixture = {}

    async function cleanup() {
        const profileIds = [created.trainerUserId, created.studentUserId].filter(
            (id): id is string => Boolean(id)
        )

        if (profileIds.length > 0) {
            await admin.from('profiles').delete().in('id', profileIds)
        }

        if (created.studentId) {
            await admin.from('students').delete().eq('id', created.studentId)
        }

        if (profileIds.length > 0) {
            await admin.from('trainers').delete().in('id', profileIds)
        }

        for (const userId of profileIds) {
            await admin.auth.admin.deleteUser(userId)
        }
    }

    try {
        const { data: trainerAuth, error: trainerAuthError } = await admin.auth.admin.createUser({
            email: trainerEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Entrenador E2E' },
        })

        if (trainerAuthError || !trainerAuth.user) {
            throw new Error(`No se pudo crear el entrenador E2E: ${trainerAuthError?.message}`)
        }
        created.trainerUserId = trainerAuth.user.id

        const { error: trainerRowError } = await admin.from('trainers').upsert({
            id: trainerAuth.user.id,
            full_name: 'Entrenador E2E',
        })
        if (trainerRowError) throw trainerRowError

        const { error: trainerProfileError } = await admin.from('profiles').upsert({
            id: trainerAuth.user.id,
            email: trainerEmail,
            name: 'Entrenador E2E',
            role: 'trainer',
        })
        if (trainerProfileError) throw trainerProfileError

        const { data: studentAuth, error: studentAuthError } = await admin.auth.admin.createUser({
            email: studentEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Alumno E2E' },
        })

        if (studentAuthError || !studentAuth.user) {
            throw new Error(`No se pudo crear el alumno E2E: ${studentAuthError?.message}`)
        }
        created.studentUserId = studentAuth.user.id

        const { data: student, error: studentError } = await admin
            .from('students')
            .insert({
                trainer_id: trainerAuth.user.id,
                first_name: 'Alumno',
                last_name: 'E2E',
                email: studentEmail,
                active_plan: 'active',
            })
            .select('id')
            .single()

        if (studentError || !student) {
            throw new Error(`No se pudo crear la ficha del alumno E2E: ${studentError?.message}`)
        }
        created.studentId = student.id

        const { error: studentProfileError } = await admin.from('profiles').upsert({
            id: studentAuth.user.id,
            email: studentEmail,
            name: 'Alumno E2E',
            role: 'student',
            student_id: student.id,
        })
        if (studentProfileError) throw studentProfileError

        process.env.E2E_TRAINER_EMAIL = trainerEmail
        process.env.E2E_STUDENT_EMAIL = studentEmail
        process.env.E2E_AUTH_PASSWORD = password
        process.env.E2E_TRAINER_USER_ID = trainerAuth.user.id
        process.env.E2E_STUDENT_USER_ID = studentAuth.user.id
        process.env.E2E_STUDENT_ID = student.id
    } catch (error) {
        await cleanup()
        throw error
    }
}
