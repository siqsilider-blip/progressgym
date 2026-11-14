import { randomBytes } from 'node:crypto'
import { rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

const { loadEnvConfig } = nextEnv

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const credentialsPath = path.join(root, '.env.store-demo-credentials.json')
const command = process.argv[2]

loadEnvConfig(root)

if (!['create', 'cleanup'].includes(command)) {
    throw new Error('Uso: node scripts/store-demo.mjs <create|cleanup>')
}
if (process.env.STORE_DEMO_CONFIRM !== '1') {
    throw new Error('Definí STORE_DEMO_CONFIRM=1 para confirmar esta operación.')
}

const supabaseUrl = process.env.STORE_DEMO_SUPABASE_URL
    ?? process.env.E2E_SUPABASE_URL
    ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.STORE_DEMO_SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan la URL de Supabase y la service role key.')
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
})

const emptyRefs = () => ({
    userIds: [], trainerIds: [], studentIds: [], routineIds: [], exerciseIds: [],
})
const unique = (values) => [...new Set(values.filter(Boolean))]
const mergedRefs = (...items) => ({
    userIds: unique(items.flatMap((item) => item?.userIds ?? [])),
    trainerIds: unique(items.flatMap((item) => item?.trainerIds ?? [])),
    studentIds: unique(items.flatMap((item) => item?.studentIds ?? [])),
    routineIds: unique(items.flatMap((item) => item?.routineIds ?? [])),
    exerciseIds: unique(items.flatMap((item) => item?.exerciseIds ?? [])),
})

function assertNoError(error, label) {
    if (error) throw new Error(`${label}: ${error.message}`)
}

async function findDemoRefs() {
    const refs = emptyRefs()
    let page = 1

    while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
        assertNoError(error, 'No se pudieron localizar los accesos demo')
        for (const user of data.users) {
            if (!/^store-demo-(trainer|student)-.+@example\.com$/i.test(user.email ?? '')) continue
            refs.userIds.push(user.id)
            if (/^store-demo-trainer-/i.test(user.email ?? '')) refs.trainerIds.push(user.id)
        }
        if (data.users.length < 200) break
        page += 1
    }

    const { data: profiles, error: profilesError } = await admin
        .from('profiles')
        .select('id, role')
        .like('email', 'store-demo-%@example.com')
    assertNoError(profilesError, 'No se pudieron localizar los perfiles demo')
    for (const profile of profiles ?? []) {
        refs.userIds.push(profile.id)
        if (profile.role === 'trainer') refs.trainerIds.push(profile.id)
    }

    const { data: students, error: studentsError } = await admin
        .from('students')
        .select('id')
        .like('email', 'store-demo-%@example.com')
    assertNoError(studentsError, 'No se pudieron localizar los alumnos demo')
    refs.studentIds.push(...(students ?? []).map((student) => student.id))

    return mergedRefs(refs)
}

async function deleteIn(table, column, values, label) {
    const ids = unique(values)
    if (ids.length === 0) return
    const { error } = await admin.from(table).delete().in(column, ids)
    assertNoError(error, label)
}

async function cleanupDemo(refs) {
    const userIds = unique(refs.userIds ?? [])
    const trainerIds = unique(refs.trainerIds ?? [])
    const studentIds = unique(refs.studentIds ?? [])

    const { data: routines, error: routinesError } = trainerIds.length
        ? await admin.from('routines').select('id').in('trainer_id', trainerIds)
        : { data: [], error: null }
    assertNoError(routinesError, 'No se pudieron localizar las rutinas demo')
    const routineIds = unique([...(refs.routineIds ?? []), ...(routines ?? []).map((row) => row.id)])

    const { data: days, error: daysError } = routineIds.length
        ? await admin.from('routine_days').select('id').in('routine_id', routineIds)
        : { data: [], error: null }
    assertNoError(daysError, 'No se pudieron localizar los días demo')
    const dayIds = unique((days ?? []).map((row) => row.id))

    const { data: exercises, error: exercisesError } = trainerIds.length
        ? await admin.from('exercises').select('id').in('trainer_id', trainerIds)
        : { data: [], error: null }
    assertNoError(exercisesError, 'No se pudieron localizar los ejercicios demo')
    const exerciseIds = unique([
        ...(refs.exerciseIds ?? []),
        ...(exercises ?? []).map((row) => row.id),
    ])

    const { data: conversations, error: conversationError } = studentIds.length
        ? await admin.from('coaching_conversations').select('id').in('student_id', studentIds)
        : { data: [], error: null }
    assertNoError(conversationError, 'No se pudieron localizar las conversaciones demo')
    const conversationIds = unique((conversations ?? []).map((row) => row.id))

    await deleteIn('coaching_messages', 'conversation_id', conversationIds, 'No se pudieron eliminar los mensajes demo')
    await deleteIn('coaching_conversations', 'id', conversationIds, 'No se pudieron eliminar las conversaciones demo')
    await deleteIn('internal_notifications', 'recipient_user_id', userIds, 'No se pudieron eliminar las notificaciones demo')
    await deleteIn('internal_notifications', 'actor_user_id', userIds, 'No se pudieron eliminar las notificaciones generadas por el demo')
    await deleteIn('student_progress_photos', 'student_id', studentIds, 'No se pudieron eliminar las fotos demo')
    await deleteIn('student_weekly_checkins', 'student_id', studentIds, 'No se pudieron eliminar los controles demo')
    await deleteIn('student_follow_ups', 'student_id', studentIds, 'No se pudieron eliminar los seguimientos demo')
    await deleteIn('student_onboarding_profiles', 'student_id', studentIds, 'No se pudo eliminar el onboarding demo')
    await deleteIn('workout_feedback', 'student_id', studentIds, 'No se pudo eliminar el feedback demo')
    await deleteIn('exercise_logs', 'student_id', studentIds, 'No se pudieron eliminar las series demo')
    await deleteIn('workout_sessions', 'student_id', studentIds, 'No se pudieron eliminar las sesiones demo')
    await deleteIn('student_routines', 'student_id', studentIds, 'No se pudieron eliminar las asignaciones demo')
    await deleteIn('routine_day_exercises', 'routine_day_id', dayIds, 'No se pudieron eliminar los ejercicios de rutina demo')
    await deleteIn('routine_days', 'id', dayIds, 'No se pudieron eliminar los días demo')
    await deleteIn('routine_weeks', 'routine_id', routineIds, 'No se pudieron eliminar las semanas demo')
    await deleteIn('routine_months', 'routine_id', routineIds, 'No se pudieron eliminar los mesociclos demo')
    await deleteIn('routines', 'id', routineIds, 'No se pudieron eliminar las rutinas demo')
    await deleteIn('exercises', 'id', exerciseIds, 'No se pudieron eliminar los ejercicios demo')
    await deleteIn('profiles', 'id', userIds, 'No se pudieron eliminar los perfiles demo')
    await deleteIn('students', 'id', studentIds, 'No se pudieron eliminar los alumnos demo')
    await deleteIn('trainers', 'id', trainerIds, 'No se pudieron eliminar los entrenadores demo')

    for (const userId of userIds) {
        const { error } = await admin.auth.admin.deleteUser(userId)
        if (error && !/not found/i.test(error.message)) throw error
    }
}

const dateOnly = (date) => date.toISOString().slice(0, 10)
function addDays(date, days) {
    const result = new Date(date)
    result.setUTCDate(result.getUTCDate() + days)
    return result
}
function mondayOf(date) {
    const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    result.setUTCDate(result.getUTCDate() - ((result.getUTCDay() + 6) % 7))
    return result
}

async function createDemo() {
    const stale = await findDemoRefs()
    await cleanupDemo(stale)
    await rm(credentialsPath, { force: true })

    const runId = `${Date.now()}-${randomBytes(3).toString('hex')}`
    const password = `${randomBytes(24).toString('base64url')}Aa1!`
    const trainerEmail = `store-demo-trainer-${runId}@example.com`
    const studentEmail = `store-demo-student-${runId}@example.com`
    const refs = emptyRefs()

    try {
        const { data: trainerAuth, error: trainerAuthError } = await admin.auth.admin.createUser({
            email: trainerEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Equipo Progrezzia Demo' },
        })
        if (trainerAuthError || !trainerAuth.user) throw trainerAuthError
        refs.userIds.push(trainerAuth.user.id)
        refs.trainerIds.push(trainerAuth.user.id)

        assertNoError((await admin.from('trainers').upsert({
            id: trainerAuth.user.id,
            full_name: 'Equipo Progrezzia Demo',
        })).error, 'No se pudo crear el entrenador demo')
        assertNoError((await admin.from('profiles').upsert({
            id: trainerAuth.user.id,
            email: trainerEmail,
            name: 'Equipo Progrezzia Demo',
            role: 'trainer',
        })).error, 'No se pudo crear el perfil del entrenador demo')

        const { data: studentAuth, error: studentAuthError } = await admin.auth.admin.createUser({
            email: studentEmail,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Laura Demo' },
        })
        if (studentAuthError || !studentAuth.user) throw studentAuthError
        refs.userIds.push(studentAuth.user.id)

        const { data: student, error: studentError } = await admin.from('students').insert({
            trainer_id: trainerAuth.user.id,
            first_name: 'Laura',
            last_name: 'Demo',
            email: studentEmail,
            active_plan: 'active',
        }).select('id').single()
        if (studentError || !student) throw studentError
        refs.studentIds.push(student.id)

        assertNoError((await admin.from('profiles').upsert({
            id: studentAuth.user.id,
            email: studentEmail,
            name: 'Laura Demo',
            role: 'student',
            student_id: student.id,
        })).error, 'No se pudo crear el perfil de Laura Demo')
        assertNoError((await admin.from('student_onboarding_profiles').insert({
            student_id: student.id,
            trainer_id: trainerAuth.user.id,
            goals: ['gain_strength', 'feel_better'],
            experience_level: 'beginner',
            training_days_per_week: 3,
            session_minutes: 45,
            training_location: 'gym',
            available_equipment: ['machines', 'free_weights', 'bands', 'bodyweight'],
            limitations: null,
            preferences: 'Sesiones claras, progresivas y fáciles de seguir.',
        })).error, 'No se pudo completar el onboarding de Laura Demo')

        const { data: routine, error: routineError } = await admin.from('routines').insert({
            trainer_id: trainerAuth.user.id,
            name: 'Fuerza y movilidad · 3 días',
            days_per_week: 3,
            routine_kind: 'program',
        }).select('id').single()
        if (routineError || !routine) throw routineError
        refs.routineIds.push(routine.id)

        const { data: month, error: monthError } = await admin.from('routine_months').insert({
            routine_id: routine.id,
            month_number: 1,
            name: 'Base de fuerza',
        }).select('id').single()
        if (monthError || !month) throw monthError

        const { data: weeks, error: weeksError } = await admin.from('routine_weeks').insert(
            [1, 2, 3].map((week) => ({
                routine_id: routine.id,
                routine_month_id: month.id,
                week_number: week,
                name: `Semana ${week}`,
            }))
        ).select('id, week_number')
        if (weeksError || weeks?.length !== 3) throw weeksError

        const dayNames = ['Glúteos y piernas', 'Torso completo', 'Fuerza global']
        const days = []
        for (const week of weeks) {
            const { data, error } = await admin.from('routine_days').insert(
                dayNames.map((name, index) => ({
                    routine_id: routine.id,
                    routine_week_id: week.id,
                    day_index: index + 1,
                    day_number: index + 1,
                    name,
                    title: name,
                }))
            ).select('id, day_index')
            if (error || data?.length !== 3) throw error
            days.push(...data.map((day) => ({ ...day, week: week.week_number })))
        }

        const exerciseDefinitions = [
            ['bird', 'Bird Dog', 'Core', 'Mové brazo y pierna contraria sin perder estabilidad.'],
            ['hip', 'Hip Thrust', 'Glúteos', 'Empujá con los talones y terminá contrayendo los glúteos.'],
            ['goblet', 'Sentadilla Goblet', 'Cuádriceps', 'Mantené el pecho alto y controlá el recorrido.'],
            ['abduction', 'Abducción en Máquina', 'Glúteos', 'Separá las rodillas sin perder el apoyo del tronco.'],
            ['thoracic', 'Movilidad Torácica', 'Espalda', 'Rotá suave y acompañá con la respiración.'],
            ['row', 'Remo en Polea', 'Espalda', 'Llevá los codos atrás sin elevar los hombros.'],
            ['press', 'Press de Pecho en Máquina', 'Pecho', 'Empujá de forma controlada con la espalda apoyada.'],
            ['plank', 'Plancha Frontal', 'Core', 'Mantené el cuerpo alineado y respiración continua.'],
            ['bridge', 'Puente de Glúteos', 'Glúteos', 'Elevá la cadera sin arquear la zona lumbar.'],
            ['deadlift', 'Peso Muerto Rumano', 'Isquiotibiales', 'Llevá la cadera atrás con la columna estable.'],
            ['pulldown', 'Jalón al Pecho', 'Espalda', 'Bajá la barra sin balancear el tronco.'],
            ['pallof', 'Press Pallof', 'Core', 'Resistí la rotación y sostené el abdomen activo.'],
        ]
        const videoUrl = process.env.STORE_DEMO_EXERCISE_VIDEO_URL?.trim() || null
        const { data: exercises, error: exercisesError } = await admin.from('exercises').insert(
            exerciseDefinitions.map(([key, name, muscle, description]) => ({
                trainer_id: trainerAuth.user.id,
                name,
                metric_type: 'reps',
                muscle_group: muscle,
                description,
                video_url: key === 'hip' ? videoUrl : null,
            }))
        ).select('id, name')
        if (exercisesError || exercises?.length !== exerciseDefinitions.length) throw exercisesError
        refs.exerciseIds.push(...exercises.map((exercise) => exercise.id))

        const exerciseByKey = new Map(exerciseDefinitions.map(([key, name]) => [
            key,
            exercises.find((exercise) => exercise.name === name)?.id,
        ]))
        const plans = {
            1: [['bird', 2, 8, 'activation'], ['hip', 3, 10, 'main'], ['goblet', 3, 10, 'main'], ['abduction', 2, 15, 'closing']],
            2: [['thoracic', 2, 8, 'activation'], ['row', 3, 12, 'main'], ['press', 3, 10, 'main'], ['plank', 3, 30, 'closing']],
            3: [['bridge', 2, 12, 'activation'], ['deadlift', 3, 10, 'main'], ['pulldown', 3, 12, 'main'], ['pallof', 2, 10, 'closing']],
        }
        const dayExercises = []
        for (const day of days) {
            const { data, error } = await admin.from('routine_day_exercises').insert(
                plans[day.day_index].map(([key, sets, reps, block], index) => ({
                    routine_day_id: day.id,
                    exercise_id: exerciseByKey.get(key),
                    sets,
                    reps,
                    rest_seconds: block === 'main' ? 60 : 30,
                    position: index + 1,
                    block,
                }))
            ).select('id, exercise_id, sets, reps')
            if (error || data?.length !== 4) throw error
            dayExercises.push(...data.map((item) => ({ ...item, dayId: day.id, week: day.week, dayIndex: day.day_index })))
        }

        const today = new Date()
        const currentMonday = mondayOf(today)
        assertNoError((await admin.from('student_routines').insert({
            student_id: student.id,
            routine_id: routine.id,
            status: 'active',
            program_started_on: dateOnly(currentMonday),
            training_weekdays: [1, 3, 5],
        })).error, 'No se pudo asignar la rutina demo')

        const firstDay = days.find((day) => day.week === 1 && day.day_index === 1)
        const firstDayExercises = dayExercises.filter((item) => item.dayId === firstDay.id)
        const hipId = exerciseByKey.get('hip')
        const gobletId = exerciseByKey.get('goblet')
        const dates = [-28, -21, -14, -7, 0].map((offset) => addDays(today, offset))
        for (const [index, date] of dates.entries()) {
            const performed = dateOnly(date)
            const { data: session, error } = await admin.from('workout_sessions').insert({
                student_id: student.id,
                trainer_id: trainerAuth.user.id,
                routine_day_id: firstDay.id,
                status: 'completed',
                performed_date: performed,
                started_at: `${performed}T13:00:00.000Z`,
                finished_at: `${performed}T13:42:00.000Z`,
                duration_seconds: 2520,
                completed_manually: true,
                completion_status: 'complete',
            }).select('id').single()
            if (error || !session) throw error

            const logs = []
            for (const exercise of firstDayExercises) {
                const weight = exercise.exercise_id === hipId
                    ? 45 + (index * 5)
                    : exercise.exercise_id === gobletId
                        ? 10 + (index * 2)
                        : 0
                for (let set = 0; set < exercise.sets; set += 1) {
                    logs.push({
                        student_id: student.id,
                        routine_day_exercise_id: exercise.id,
                        workout_session_id: session.id,
                        weight,
                        reps: exercise.reps,
                        rpe: index >= 3 ? 7 : 6,
                        performed_at: performed,
                        set_index: set,
                    })
                }
            }
            assertNoError((await admin.from('exercise_logs').insert(logs)).error, 'No se pudieron crear las series demo')
        }

        const checkins = [-21, -14, -7, 0].map((offset, index) => ({
            trainer_id: trainerAuth.user.id,
            student_id: student.id,
            week_start: dateOnly(addDays(currentMonday, offset)),
            energy: [3, 4, 4, 4][index],
            sleep_quality: [3, 3, 4, 4][index],
            stress: [4, 3, 3, 2][index],
            training_difficulty: [4, 4, 3, 3][index],
            had_pain: false,
            body_weight: [74.5, 74.0, 73.6, 73.2][index],
            waist_cm: [88, 87.2, 86.4, 85.5][index],
            comment: index === 3 ? 'Me siento con más energía y confianza para entrenar.' : null,
            reviewed_at: new Date().toISOString(),
        }))
        assertNoError((await admin.from('student_weekly_checkins').insert(checkins)).error, 'No se pudieron crear los controles demo')

        const now = Date.now()
        const { data: conversation, error: conversationError } = await admin.from('coaching_conversations').insert({
            trainer_id: trainerAuth.user.id,
            student_id: student.id,
            status: 'active',
            last_message_at: new Date().toISOString(),
        }).select('id').single()
        if (conversationError || !conversation) throw conversationError
        assertNoError((await admin.from('coaching_messages').insert([
            { conversation_id: conversation.id, sender_user_id: trainerAuth.user.id, sender_role: 'trainer', topic: 'general', body: 'Hola Laura. Esta semana vamos a priorizar técnica y movimientos controlados.', read_at: new Date().toISOString(), created_at: new Date(now - 50 * 60000).toISOString() },
            { conversation_id: conversation.id, sender_user_id: studentAuth.user.id, sender_role: 'student', topic: 'general', body: 'Perfecto. Hoy terminé la sesión y me sentí con mucha más seguridad.', read_at: new Date().toISOString(), created_at: new Date(now - 30 * 60000).toISOString() },
            { conversation_id: conversation.id, sender_user_id: trainerAuth.user.id, sender_role: 'trainer', topic: 'general', body: 'Excelente. La próxima sesión mantené el mismo ritmo y registrá cada serie.', read_at: new Date().toISOString(), created_at: new Date(now - 10 * 60000).toISOString() },
        ])).error, 'No se pudieron crear los mensajes demo')

        await admin.from('internal_notifications')
            .update({ read_at: new Date().toISOString() })
            .in('recipient_user_id', refs.userIds)

        const state = {
            version: 1,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            trainer: { email: trainerEmail, password },
            student: { email: studentEmail, password },
        }
        await writeFile(credentialsPath, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
        console.log('Demo de tienda creado correctamente.')
        console.log(`Credenciales privadas: ${credentialsPath}`)
    } catch (error) {
        await cleanupDemo(refs)
        await rm(credentialsPath, { force: true })
        throw error
    }
}

async function removeDemo() {
    const stale = await findDemoRefs()
    await cleanupDemo(stale)
    await rm(credentialsPath, { force: true })
    console.log('Demo de tienda eliminado. No se tocaron cuentas reales.')
}

if (command === 'create') await createDemo()
else await removeDemo()
