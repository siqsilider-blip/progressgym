import { randomBytes } from 'node:crypto'
import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { removeAuthFixtureData } from './auth-fixture-cleanup'

type CreatedFixture = {
    trainerUserId?: string
    studentUserId?: string
    studentId?: string
    routineId?: string
    exerciseId?: string
}

export default async function createAuthFixture() {
    loadEnvConfig(process.cwd())

    const supabaseUrl = process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Las pruebas autenticadas requieren la URL de Supabase y una service role key.'
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

        const staleStudentIds = (staleStudents ?? []).map((student) => student.id)
        await removeAuthFixtureData(admin, {
            userIds: staleUserIds,
            trainerIds: staleUserIds,
            studentIds: staleStudentIds,
        })
    }

    await removeStaleFixtures()

    const runId = `${Date.now()}-${randomBytes(4).toString('hex')}`
    const password = `${randomBytes(24).toString('base64url')}Aa1!`
    const trainerEmail = `e2e-trainer-${runId}@example.com`
    const studentEmail = `e2e-student-${runId}@example.com`
    const created: CreatedFixture = {}

    async function cleanup() {
        const userIds = [created.trainerUserId, created.studentUserId].filter(
            (id): id is string => Boolean(id)
        )
        await removeAuthFixtureData(admin, {
            userIds,
            trainerIds: userIds,
            studentIds: created.studentId ? [created.studentId] : [],
            routineIds: created.routineId ? [created.routineId] : [],
            exerciseIds: created.exerciseId ? [created.exerciseId] : [],
        })
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

        const { data: routine, error: routineError } = await admin
            .from('routines')
            .insert({
                trainer_id: trainerAuth.user.id,
                name: `Rutina E2E ${runId}`,
                days_per_week: 1,
            })
            .select('id')
            .single()
        if (routineError || !routine) {
            throw new Error(`No se pudo crear la rutina E2E: ${routineError?.message}`)
        }
        created.routineId = routine.id

        const { data: month, error: monthError } = await admin
            .from('routine_months')
            .insert({ routine_id: routine.id, month_number: 1, name: 'Mesociclo E2E' })
            .select('id')
            .single()
        if (monthError || !month) {
            throw new Error(`No se pudo crear el mesociclo E2E: ${monthError?.message}`)
        }

        const { data: week, error: weekError } = await admin
            .from('routine_weeks')
            .insert({
                routine_id: routine.id,
                routine_month_id: month.id,
                week_number: 1,
                name: 'Semana E2E',
            })
            .select('id')
            .single()
        if (weekError || !week) {
            throw new Error(`No se pudo crear la semana E2E: ${weekError?.message}`)
        }

        const { data: day, error: dayError } = await admin
            .from('routine_days')
            .insert({
                routine_id: routine.id,
                routine_week_id: week.id,
                day_index: 1,
                day_number: 1,
                name: 'Día E2E',
                title: 'Día E2E',
            })
            .select('id')
            .single()
        if (dayError || !day) {
            throw new Error(`No se pudo crear el día E2E: ${dayError?.message}`)
        }

        const { data: exercise, error: exerciseError } = await admin
            .from('exercises')
            .insert({
                trainer_id: trainerAuth.user.id,
                name: `Ejercicio E2E ${runId}`,
                metric_type: 'reps',
                muscle_group: 'Prueba E2E',
            })
            .select('id')
            .single()
        if (exerciseError || !exercise) {
            throw new Error(`No se pudo crear el ejercicio E2E: ${exerciseError?.message}`)
        }
        created.exerciseId = exercise.id

        const { data: dayExercise, error: dayExerciseError } = await admin
            .from('routine_day_exercises')
            .insert({
                routine_day_id: day.id,
                exercise_id: exercise.id,
                sets: 1,
                reps: 10,
                rest_seconds: 0,
                position: 1,
                block: 'activation',
            })
            .select('id')
            .single()
        if (dayExerciseError || !dayExercise) {
            throw new Error(`No se pudo agregar el ejercicio E2E: ${dayExerciseError?.message}`)
        }

        const { error: assignmentError } = await admin.from('student_routines').insert({
            student_id: student.id,
            routine_id: routine.id,
            status: 'active',
        })
        if (assignmentError) throw assignmentError

        process.env.E2E_TRAINER_EMAIL = trainerEmail
        process.env.E2E_STUDENT_EMAIL = studentEmail
        process.env.E2E_AUTH_PASSWORD = password
        process.env.E2E_TRAINER_USER_ID = trainerAuth.user.id
        process.env.E2E_STUDENT_USER_ID = studentAuth.user.id
        process.env.E2E_STUDENT_ID = student.id
        process.env.E2E_ROUTINE_ID = routine.id
        process.env.E2E_ROUTINE_DAY_ID = day.id
        process.env.E2E_ROUTINE_DAY_EXERCISE_ID = dayExercise.id
        process.env.E2E_EXERCISE_ID = exercise.id
        process.env.E2E_ROUTINE_NAME = `Rutina E2E ${runId}`
        process.env.E2E_EXERCISE_NAME = `Ejercicio E2E ${runId}`
    } catch (error) {
        await cleanup()
        throw error
    }
}
