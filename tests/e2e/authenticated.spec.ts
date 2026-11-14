import { expect, test } from '@playwright/test'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const trainerEmail = process.env.E2E_TRAINER_EMAIL!
const otherTrainerEmail = process.env.E2E_OTHER_TRAINER_EMAIL!
const studentEmail = process.env.E2E_STUDENT_EMAIL!
const inviteStudentEmail = process.env.E2E_INVITE_STUDENT_EMAIL!
const password = process.env.E2E_AUTH_PASSWORD!
const routineName = process.env.E2E_ROUTINE_NAME!
const exerciseName = process.env.E2E_EXERCISE_NAME!
const templateId = process.env.E2E_TEMPLATE_ID!
const templateName = process.env.E2E_TEMPLATE_NAME!
const studentId = process.env.E2E_STUDENT_ID!
const inviteStudentId = process.env.E2E_INVITE_STUDENT_ID!
const trainerUserId = process.env.E2E_TRAINER_USER_ID!
const routineDayId = process.env.E2E_ROUTINE_DAY_ID!
const routineDayExerciseId = process.env.E2E_ROUTINE_DAY_EXERCISE_ID!

const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

async function logIn(
    page: import('@playwright/test').Page,
    role: 'trainer' | 'student',
    email: string,
    expectSuccess = true
) {
    await page.goto(`/login/${role}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 30_000 })
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Contraseña').fill(password)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    if (expectSuccess) {
        const destination = role === 'trainer' ? /\/dashboard(?:\?|$)/ : /\/app(?:\?|$)/
        await expect(page).toHaveURL(destination, { timeout: 30_000 })
    }
}

test('el entrenador entra al panel y no al portal del alumno', async ({ page }, testInfo) => {
    await logIn(page, 'trainer', trainerEmail)

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
    await expect(page.getByRole('link', { name: 'Alumnos' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Rutinas' }).first()).toBeVisible()
    if (testInfo.project.name === 'mobile-chromium') {
        await expect(page.getByText('Invitado E2E todavía no activó su acceso a la aplicación.', { exact: true })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Enviar acceso' })).toBeVisible()
    }

    await page.goto('/app')
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
})

test('un entrenador no puede abrir ni usar alumnos de otro entrenador', async ({ page }) => {
    await logIn(page, 'trainer', otherTrainerEmail)

    await page.goto(`/dashboard/students/${studentId}`)
    await expect(page.getByText('No se encontró el alumno.')).toBeVisible()

    await page.goto(`/dashboard/routines/new?studentId=${studentId}`)
    await expect(page.getByText('Alumno no encontrado.')).toBeVisible()

    await page.goto(`/dashboard/students/${studentId}/progress`)
    await expect(page).toHaveURL(/\/dashboard\/students(?:\?|$)/)
})

test('el alumno entra a su portal y no al panel del entrenador', async ({ page }, testInfo) => {
    test.setTimeout(180_000)
    await logIn(page, 'student', studentEmail)

    await expect(page).toHaveURL(/\/app(?:\?|$)/)
    await expect(page.getByRole('link', { name: 'Rutina', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Progreso', exact: true })).toBeVisible()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/app(?:\?|$)/)

    if (testInfo.project.name === 'desktop-chromium') return

    await page.goto('/app/rutina')
    await expect(page.getByText(routineName, { exact: true })).toBeVisible()
    await expect(page.getByText(exerciseName, { exact: true })).toBeVisible()
    await page.getByRole('link', { name: /Entrenar/ }).click()

    await expect(page).toHaveURL(/\/app\/train\?/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'Día E2E' })).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(exerciseName) })).toBeVisible()
    await page.getByRole('button', { name: 'Ver ejercicio' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Músculos trabajados' })).toBeVisible()
    await expect(page.getByText('Glúteos', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: /Mapa corporal.*Glúteos/ })).toBeVisible()
    await expect(page.getByText('Mantené la espalda apoyada y controlá el movimiento.')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar guía del ejercicio' }).click()

    // Una molestia se reporta desde el ejercicio, sin tener que descubrir el selector de mensajes.
    await page.getByText('¿Sentís molestia? Frená y avisá', { exact: true }).click()
    await page.getByPlaceholder(`¿Dónde sentís la molestia al hacer ${exerciseName}?`).fill('Aviso de molestia E2E')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Tu entrenador fue avisado ✓', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: 'Ver conversación →' })).toBeVisible()

    const weightSet1 = page.getByLabel('Peso serie 1')
    const repsSet1 = page.getByLabel('Repeticiones serie 1')
    await expect(page.locator('input[type="number"]')).toHaveCount(6)

    // Si el teléfono bloquea localStorage, la app no debe afirmar que el
    // borrador quedó guardado. Al recuperarse storage, vuelve a confirmarlo.
    await page.evaluate(() => {
        const testWindow = window as Window & { __draftSetItem?: typeof Storage.prototype.setItem }
        const originalSetItem = Storage.prototype.setItem
        testWindow.__draftSetItem = originalSetItem
        Storage.prototype.setItem = function setItem(key, value) {
            if (key.startsWith('progrezzia:workout-draft:')) {
                throw new DOMException('Storage bloqueado para E2E', 'QuotaExceededError')
            }
            return originalSetItem.call(this, key, value)
        }
    })
    await weightSet1.fill('35')
    await expect(page.getByText('No cierres la app', { exact: true })).toBeVisible()
    await expect(page.getByText('Borrador guardado', { exact: true })).toHaveCount(0)

    await page.evaluate(() => {
        const testWindow = window as Window & { __draftSetItem?: typeof Storage.prototype.setItem }
        if (testWindow.__draftSetItem) Storage.prototype.setItem = testWindow.__draftSetItem
        delete testWindow.__draftSetItem
    })
    await weightSet1.fill('35.5')
    await expect(page.getByText('Borrador guardado', { exact: true })).toBeVisible()
    await weightSet1.fill('35')
    await repsSet1.fill('10')
    await expect(page.getByText('Borrador guardado', { exact: true })).toBeVisible()

    // Si la app se cierra o recarga, los datos persisten tanto si alcanzó a
    // sincronizar como si todavía estaban solamente en el borrador local.
    await page.reload()
    await page.context().setOffline(true)
    await expect(weightSet1).toHaveValue('35')
    await expect(repsSet1).toHaveValue('10')

    await page.getByText('Agregar esfuerzo (opcional)', { exact: true }).first().click()
    await page.getByRole('combobox', { name: 'Esfuerzo opcional' }).first().selectOption('7')

    // Sin conexión, el autoguardado queda en cola y se sincroniza al volver internet.
    await expect(page.getByText('Sin conexión · guardado', { exact: true })).toBeVisible({ timeout: 5_000 })
    await page.context().setOffline(false)
    await expect(page.getByRole('button', { name: 'Guardar serie 1' })).toContainText('Actualizar', { timeout: 20_000 })

    // No se puede marcar el día completo por accidente si todavía faltan series.
    await page.getByRole('button', { name: 'Finalizar entrenamiento' }).click()
    const incompleteDialog = page.getByRole('dialog')
    await expect(incompleteDialog.getByRole('heading', { name: '¿Finalizar entrenamiento incompleto?' })).toBeVisible()
    await expect(incompleteDialog.getByText('Te quedan 2 de 3 series sin registrar.', { exact: false })).toBeVisible()
    await incompleteDialog.getByRole('button', { name: 'Seguir entrenando' }).click()
    await expect(page.getByRole('heading', { name: 'Entrenamiento guardado' })).toHaveCount(0)

    // Si decide terminar, persiste como incompleto y no completa falsamente la semana.
    await page.getByRole('button', { name: 'Finalizar entrenamiento' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Finalizar incompleto' }).click()
    await expect(page.getByRole('heading', { name: 'Entrenamiento finalizado con pendientes' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Volver a la rutina' }).click()
    await expect(page.getByText('Semana completada ✓')).toHaveCount(0)
    await expect(page.getByText('Series pendientes · todavía no cuenta como completado')).toBeVisible()
    await page.getByRole('link', { name: 'Completar →' }).click()
    await expect(page.getByText('Incompleta · editable')).toBeVisible({ timeout: 15_000 })

    // El peso solo no alcanza: las repeticiones son obligatorias.
    await page.getByLabel('Peso serie 2').fill('37.5')
    await page.getByRole('button', { name: 'Guardar serie 2' }).click()
    await expect(page.getByText('Ingresá las repeticiones realizadas.', { exact: true })).toBeVisible()
    await page.getByLabel('Repeticiones serie 2').fill('10')
    await expect(page.getByRole('button', { name: 'Guardar serie 2' })).toContainText('Actualizar', { timeout: 20_000 })
    await page.getByLabel('Repeticiones serie 3').fill('9')
    await expect(page.getByRole('button', { name: 'Guardar serie 3' })).toContainText('Actualizar', { timeout: 20_000 })
    await expect(page.getByText('3 de 3 series', { exact: true }).first()).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: 'Finalizar entrenamiento' }).click()

    await expect(page.getByRole('heading', { name: 'Entrenamiento guardado' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Sí', exact: true }).click()
    await page.getByPlaceholder('¿Dónde la sentiste y en qué ejercicio?').fill('Molestia post entrenamiento E2E')
    await page.getByRole('button', { name: 'Enviar evaluación' }).click()
    await expect(page.getByText('Tu entrenador fue avisado ✓', { exact: true })).toBeVisible({ timeout: 15_000 })

    await page.reload()
    await expect(page.getByText('Finalizada · editable')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Guardar serie 1' })).toContainText('Actualizar')

    await page.goto('/app/rutina')
    await expect(page.getByText('Semana completada ✓')).toBeVisible()
    await expect(page.getByText('1 de 1 entrenamientos completados')).toBeVisible()
    await expect(page.getByText('✓ Completado esta semana')).toBeVisible()

    await page.goto('/app')
    await expect(page.getByText('Semana completada', { exact: true })).toBeVisible()
    await expect(page.getByText('¡Excelente trabajo! ✓')).toBeVisible()

    const { data: currentSession, error: currentSessionError } = await admin
        .from('workout_sessions')
        .select('id')
        .eq('student_id', studentId)
        .eq('routine_day_id', routineDayId)
        .eq('status', 'completed')
        .eq('completed_manually', true)
        .order('performed_date', { ascending: false })
        .limit(1)
        .single()
    expect(currentSessionError).toBeNull()
    expect(currentSession?.id).toBeTruthy()

    const historicalDate = '2025-01-15'
    const { data: historicalSession, error: historicalSessionError } = await admin
        .from('workout_sessions')
        .insert({
            student_id: studentId,
            trainer_id: trainerUserId,
            routine_day_id: routineDayId,
            status: 'completed',
            performed_date: historicalDate,
            started_at: `${historicalDate}T12:00:00.000Z`,
            finished_at: `${historicalDate}T12:10:00.000Z`,
            duration_seconds: 600,
            completed_manually: true,
            completion_status: 'complete',
        })
        .select('id')
        .single()
    expect(historicalSessionError).toBeNull()
    expect(historicalSession?.id).toBeTruthy()

    const { error: historicalLogError } = await admin
        .from('exercise_logs')
        .insert({
            student_id: studentId,
            routine_day_exercise_id: routineDayExerciseId,
            workout_session_id: historicalSession!.id,
            weight: 12,
            reps: 8,
            performed_at: historicalDate,
            set_index: 0,
        })
    expect(historicalLogError).toBeNull()

    await page.goto('/app/history')
    await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible()
    await expect(page.getByText(exerciseName, { exact: true }).first()).toBeVisible()

    const historicalSessionLink = page.locator(`a[href="/app/train?session=${historicalSession!.id}"]`)
    await expect(historicalSessionLink).toBeVisible()
    await historicalSessionLink.click()
    await expect(page).toHaveURL(new RegExp(`/app/train\\?session=${historicalSession!.id}$`))
    await expect(page.getByText('Sesión del 15/01/2025', { exact: true })).toBeVisible()
    await expect(page.getByText('Finalizada · editable', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Peso serie 1')).toHaveValue('12')
    await expect(page.getByLabel('Repeticiones serie 1')).toHaveValue('8')
    await expect(page.getByText('Sin peso anterior', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Anterior 35 kg', { exact: true })).toHaveCount(0)

    await page.getByLabel('Peso serie 1').fill('13')
    const historicalSaveButton = page.getByRole('button', { name: 'Guardar serie 1' })
    await expect(historicalSaveButton).toBeEnabled()
    await historicalSaveButton.click()
    await expect.poll(async () => {
        const result = await admin
            .from('exercise_logs')
            .select('weight')
            .eq('workout_session_id', historicalSession!.id)
            .eq('routine_day_exercise_id', routineDayExerciseId)
            .eq('set_index', 0)
            .single()
        return Number(result.data?.weight)
    }, { timeout: 20_000 }).toBe(13)

    const { data: correctedHistoricalLog, error: correctedHistoricalLogError } = await admin
        .from('exercise_logs')
        .select('weight, performed_at')
        .eq('workout_session_id', historicalSession!.id)
        .eq('routine_day_exercise_id', routineDayExerciseId)
        .eq('set_index', 0)
        .single()
    expect(correctedHistoricalLogError).toBeNull()
    expect(Number(correctedHistoricalLog?.weight)).toBe(13)
    expect(correctedHistoricalLog?.performed_at).toBe(historicalDate)

    const { data: unchangedHistoricalSession, error: unchangedHistoricalSessionError } = await admin
        .from('workout_sessions')
        .select('performed_date')
        .eq('id', historicalSession!.id)
        .single()
    expect(unchangedHistoricalSessionError).toBeNull()
    expect(unchangedHistoricalSession?.performed_date).toBe(historicalDate)

    const { data: untouchedCurrentLog, error: untouchedCurrentLogError } = await admin
        .from('exercise_logs')
        .select('weight')
        .eq('workout_session_id', currentSession!.id)
        .eq('routine_day_exercise_id', routineDayExerciseId)
        .eq('set_index', 0)
        .single()
    expect(untouchedCurrentLogError).toBeNull()
    expect(Number(untouchedCurrentLog?.weight)).toBe(35)

    const historicalLogsCleanup = await admin
        .from('exercise_logs')
        .delete()
        .eq('workout_session_id', historicalSession!.id)
    expect(historicalLogsCleanup.error).toBeNull()
    const historicalSessionCleanup = await admin
        .from('workout_sessions')
        .delete()
        .eq('id', historicalSession!.id)
    expect(historicalSessionCleanup.error).toBeNull()

    await page.goto('/app/progress')
    await expect(page.getByRole('heading', { name: 'Progreso' })).toBeVisible()

    await page.goto('/app/profile')
    await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible()

    await page.context().clearCookies()
    await logIn(page, 'trainer', trainerEmail)
    await page.goto('/dashboard/notifications')
    const painNotification = page.getByText('Molestia informada', { exact: true }).first()
    await expect(painNotification).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Molestia después del entrenamiento', { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await painNotification.click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/messages\\?student=${studentId}$`), { timeout: 15_000 })
    await expect(page.getByText('Aviso de molestia E2E', { exact: true })).toBeVisible({ timeout: 15_000 })

    const feedbackCard = page.locator('article').filter({ hasText: 'Molestia post entrenamiento E2E' })
    await expect(feedbackCard).toBeVisible()
    await page.goto('/dashboard')
    await expect(page.getByText('Molestia post entrenamiento E2E', { exact: false }).first()).toBeVisible({ timeout: 15_000 })

    await page.goto(`/dashboard/messages?student=${studentId}`)
    const pendingFeedbackCard = page.locator('article').filter({ hasText: 'Molestia post entrenamiento E2E' })
    await pendingFeedbackCard.getByRole('button', { name: 'Marcar revisado' }).click()
    await expect(pendingFeedbackCard).toHaveCount(0)

    await page.goto('/dashboard')
    await expect(page.getByText('Molestia post entrenamiento E2E', { exact: false })).toHaveCount(0)
})

test('cada tipo de cuenta es rechazado por el acceso equivocado', async ({ page }) => {
    await logIn(page, 'student', trainerEmail, false)
    await expect(page).toHaveURL(/\/login\/student\?message=/)
    await expect(page.getByText(/esta cuenta es de entrenador/i)).toBeVisible()
})

test('el alumno completa su ficha inicial y el entrenador la recibe', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'La ficha inicial se prueba una sola vez por fixture.')

    await logIn(page, 'student', studentEmail)
    await page.goto('/app/onboarding')

    await expect(page.getByRole('heading', { name: 'Contanos sobre vos' })).toBeVisible()
    await page.getByText('Ganar fuerza', { exact: true }).click()
    await page.getByText('Moverme mejor', { exact: true }).click()
    await page.getByText('Estoy empezando', { exact: true }).click()
    await page.getByLabel('Días por semana').selectOption('3')
    await page.getByText('Lun', { exact: true }).click()
    await page.getByText('Mié', { exact: true }).click()
    await page.getByText('Vie', { exact: true }).click()
    await page.getByLabel('Minutos por sesión').selectOption('60')
    await page.getByText('Gimnasio', { exact: true }).click()
    await page.getByText('Máquinas', { exact: true }).click()
    await page.getByLabel(/dolores, lesiones/i).fill('Cuidar la rodilla derecha.')
    await page.getByLabel(/algo que te guste/i).fill('Prefiero explicaciones simples.')
    await page.getByRole('button', { name: 'Guardar y empezar' }).click()

    await expect(page).toHaveURL(/\/app\?onboarding=completed/, { timeout: 15_000 })
    await expect(page.getByText('Completá tu ficha inicial')).toHaveCount(0)

    await page.context().clearCookies()
    await logIn(page, 'trainer', trainerEmail)
    await page.goto('/dashboard/notifications')
    await expect(page.getByText('Ficha inicial completada', { exact: true })).toBeVisible({ timeout: 15_000 })
    await page.getByText('Ficha inicial completada', { exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/students/${studentId}$`), { timeout: 15_000 })
    await expect(page.getByText('Objetivos y disponibilidad', { exact: true })).toBeVisible()
    await expect(page.getByText('Cuidar la rodilla derecha.', { exact: true })).toBeVisible()

    // También debe poder abrirse nuevamente cuando ya quedó en "Anteriores".
    await page.goto('/dashboard/notifications')
    await page.getByText('Ficha inicial completada', { exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/students/${studentId}$`), { timeout: 15_000 })
})

test('el check-in y la conversación privada llegan de alumno a entrenador y vuelven', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'El circuito de seguimiento se prueba una sola vez.')

    await logIn(page, 'student', studentEmail)
    await page.goto('/app/check-in')

    await expect(page.getByRole('heading', { name: '¿Cómo estuvo tu semana?' })).toBeVisible()
    await page.getByRole('button', { name: 'Buena', exact: true }).click()
    await page.getByRole('button', { name: 'Bien', exact: true }).click()
    await page.getByRole('button', { name: 'Poco', exact: true }).click()
    await page.getByRole('button', { name: 'Justos', exact: true }).click()
    await page.getByLabel('¿Querés contarle algo más a tu entrenador?').fill('Check-in automático E2E')
    const photoInputs = page.locator('input[type="file"]')
    await expect(photoInputs).toHaveCount(3)
    await photoInputs.first().setInputFiles('public/icon-192.png')
    await expect(page.getByAltText('Vista previa: Frente')).toBeVisible()
    await page.getByRole('button', { name: 'Enviar control semanal' }).click()
    await expect(page.getByText('Indicá si tuviste dolor o alguna molestia.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'No', exact: true }).click()
    await page.getByRole('button', { name: 'Enviar control semanal' }).click()
    await expect(page.getByText('Control enviado a tu entrenador.')).toBeVisible({ timeout: 15_000 })
    await page.reload()
    await expect(page.getByAltText('Foto guardada: Frente')).toBeVisible({ timeout: 15_000 })

    await page.goto('/app/messages')
    await page.getByRole('combobox').selectOption('question')
    await page.getByPlaceholder('Escribile a tu entrenador…').fill('Consulta privada E2E')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Mensaje enviado ✓')).toBeVisible({ timeout: 15_000 })

    await page.context().clearCookies()
    await logIn(page, 'trainer', trainerEmail)
    await page.goto('/dashboard/notifications')
    await expect(page.getByText('Nuevo check-in semanal', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Nueva consulta de alumno', { exact: true })).toBeVisible({ timeout: 15_000 })
    await page.getByText('Nuevo check-in semanal', { exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/messages\\?student=${studentId}$`), { timeout: 15_000 })
    await expect(page.getByText('Consulta privada E2E')).toBeVisible({ timeout: 15_000 })
    await page.getByPlaceholder('Responderle a Alumno…').fill('Respuesta privada E2E')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Mensaje enviado ✓')).toBeVisible({ timeout: 15_000 })

    await page.context().clearCookies()
    await logIn(page, 'student', studentEmail)
    await page.goto('/app/notifications')
    await expect(page.getByText('Respuesta de tu entrenador', { exact: true })).toBeVisible({ timeout: 15_000 })
    await page.goto('/app/messages')
    await expect(page.getByText('Respuesta privada E2E')).toBeVisible({ timeout: 15_000 })
})

test('la biblioteca muestra la cobertura de videos', async ({ page }) => {
    await logIn(page, 'trainer', trainerEmail)
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
    await page.goto('/dashboard/exercises')

    await expect(page.getByRole('button', { name: /Todos \d+/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Sin video \d+/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Con video \d+/ })).toBeVisible()

    await page.getByPlaceholder('Buscar ejercicio...').fill(exerciseName)
    await expect(page.getByText(exerciseName, { exact: true })).toBeVisible()
    await expect(page.getByText('Video listo', { exact: true })).toBeVisible()
})

test('el entrenador crea un template con criterios de recomendación', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'La creación se prueba una sola vez por fixture.')

    await logIn(page, 'trainer', trainerEmail)
    await page.goto('/dashboard/templates/new')

    await page.getByLabel('Nombre del template').fill('Template clasificado E2E')
    await page.getByLabel('Días por semana').fill('2')
    await page.getByText('Bajar grasa', { exact: true }).click()
    await page.getByText('Estoy empezando', { exact: true }).click()
    await page.getByText('Gimnasio', { exact: true }).click()
    await page.getByText('Máquinas', { exact: true }).click()
    await page.getByLabel('Duración aproximada').selectOption('45')
    await page.getByRole('button', { name: 'Crear template' }).click()

    await expect(page).toHaveURL(/\/dashboard\/routines\/[0-9a-f-]+$/, { timeout: 15_000 })
    await expect(page.getByText('5 criterios configurados', { exact: true })).toBeVisible()

    await page.getByText('Criterios de recomendación', { exact: true }).click()
    await page.getByText('Ganar fuerza', { exact: true }).click()
    await page.getByRole('button', { name: 'Guardar criterios' }).click()
    await expect(page.getByText('6 criterios configurados', { exact: true })).toBeVisible()
})

test('el flujo de un alumno pendiente prioriza reutilizar un template', async ({ page }) => {
    await logIn(page, 'trainer', trainerEmail)
    await page.goto(`/dashboard/students/${inviteStudentId}/assign-routine`)

    await expect(page.getByRole('heading', { name: 'Asignar programa' })).toBeVisible()
    await expect(page.getByRole('article').getByText(templateName, { exact: true })).toBeVisible()
    await expect(page.getByText('Se copiará completo y quedará listo para personalizar.')).toBeVisible()
    await expect(page.getByText('Crear una rutina desde cero')).toBeHidden()
})

test('la recuperación de una cuenta existente no expone enlaces al entrenador', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'La interfaz segura se prueba una sola vez.')

    await logIn(page, 'trainer', trainerEmail)
    await page.goto(`/dashboard/students/${studentId}`)

    // La entrega real se hace por email y no se dispara con direcciones
    // example.com del fixture. Esta prueba garantiza que la UI nunca ofrece
    // crear ni copiar un token de recuperación para una cuenta vinculada.
    await expect(page.getByRole('button', { name: 'Enviar acceso por email' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Probar enlace de acceso/ })).toHaveCount(0)
    await expect(page.locator('a[href*="token_hash"]')).toHaveCount(0)
})

test('un alumno nuevo activa la invitación y completa su ficha antes de recibir rutina', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'La activación completa se prueba una sola vez.')

    await logIn(page, 'trainer', trainerEmail)
    await page.goto(`/dashboard/students/${inviteStudentId}`)
    await page.getByRole('button', { name: 'Preparar invitación' }).click()
    await expect(page.getByText('Invitación lista', { exact: true })).toBeVisible({ timeout: 15_000 })

    const inviteUrl = await page.getByRole('link', { name: /Probar enlace de acceso/ }).getAttribute('href')
    expect(inviteUrl).toContain('/auth/invitation?token_hash=')

    // Simula la vista previa automática de WhatsApp. Esta visita no debe
    // consumir el acceso antes de que el alumno toque Continuar.
    const previewResponse = await page.request.get(inviteUrl!)
    expect(previewResponse.ok()).toBeTruthy()

    await page.context().clearCookies()
    await page.goto(inviteUrl!)
    await expect(page.getByRole('heading', { name: 'Activá tu acceso' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar y crear contraseña' }).click()
    await expect(page).toHaveURL(/\/reset-password\?invite=1/, { timeout: 15_000 })
    await expect(page.getByText('Activá tu acceso de alumno', { exact: true })).toBeVisible()

    await page.getByLabel('Contraseña nueva').fill(password)
    await page.getByLabel('Repetir contraseña').fill(password)
    await page.getByRole('button', { name: 'Crear contraseña y entrar' }).click()

    await expect(page).toHaveURL(/\/app\/onboarding/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Contanos sobre vos' })).toBeVisible()

    await page.context().clearCookies()
    await logIn(page, 'trainer', trainerEmail)
    await expect(page.getByText('Invitado E2E creó su acceso, pero todavía no completó la ficha inicial.', { exact: true })).toBeVisible()

    await page.context().clearCookies()
    await logIn(page, 'student', inviteStudentEmail)
    await page.goto('/app/onboarding')
    await page.getByText('Bajar grasa', { exact: true }).click()
    await page.getByText('Estoy empezando', { exact: true }).click()
    await page.getByLabel('Días por semana').selectOption('3')
    await page.getByText('Lun', { exact: true }).click()
    await page.getByText('Mié', { exact: true }).click()
    await page.getByText('Vie', { exact: true }).click()
    await page.getByLabel('Minutos por sesión').selectOption('45')
    await page.getByText('Gimnasio', { exact: true }).click()
    await page.getByText('Máquinas', { exact: true }).click()
    await page.getByLabel(/dolores, lesiones/i).fill('Sin limitaciones actuales.')
    await page.getByRole('button', { name: 'Guardar y empezar' }).click()

    await expect(page).toHaveURL(/\/app\?onboarding=completed/, { timeout: 15_000 })
    await expect(page.getByText('Tu entrenador está preparando tu programa')).toBeVisible()
})

test('asignar un template crea un programa completo que el alumno puede abrir', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'La asignación se prueba una sola vez por fixture.')

    await logIn(page, 'trainer', trainerEmail)
    await expect(page.getByText('Invitado E2E completó su ficha. Falta elegir el programa.', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Elegir programa' })).toBeVisible()
    await page.goto(`/dashboard/students/${inviteStudentId}/assign-routine`)
    await expect(page.getByText('Recomendado para este alumno', { exact: true })).toBeVisible()

    await page.goto(`/dashboard/routines/${templateId}/assign-to-student`, { waitUntil: 'domcontentloaded' })

    const studentOption = page.locator('label').filter({ hasText: 'Invitado E2E' })
    await expect(studentOption).toBeVisible()
    await studentOption.getByRole('checkbox').check()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Asignar seleccionados (1)' }).click()
    await expect(page.getByText('Asignado correctamente ✓')).toBeVisible({ timeout: 15_000 })

    await page.goto(`/dashboard/students/${inviteStudentId}`)
    await expect(page.getByText('Objetivos y disponibilidad', { exact: true })).toBeVisible()

    await page.context().clearCookies()
    await logIn(page, 'student', inviteStudentEmail)
    await page.goto('/app/rutina')

    await expect(page.getByText(templateName, { exact: true })).toBeVisible()
    await expect(page.getByText(exerciseName, { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /Entrenar/ })).toBeVisible()
})

test('el entrenador reordena y elimina días de un template sin perder su estructura', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'La mutación se prueba una sola vez por fixture.')

    await logIn(page, 'trainer', trainerEmail)
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
    await page.goto(`/dashboard/routines/${templateId}`)

    const dayTabs = page.locator('a[href*="day="]')
    await expect(dayTabs).toHaveCount(3)
    await expect(dayTabs.nth(0)).toContainText('Piernas E2E')
    await expect(dayTabs.nth(1)).toContainText('Torso E2E')

    await page.getByRole('button', { name: 'Mover día a la derecha' }).click()
    await expect(dayTabs.nth(0)).toContainText('Torso E2E')
    await expect(dayTabs.nth(1)).toContainText('Piernas E2E')
    await expect(page.getByText(exerciseName, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Eliminar día' }).click()
    await page.getByRole('button', { name: 'Sí', exact: true }).click()

    await expect(dayTabs).toHaveCount(2)
    await expect(page.getByText('Piernas E2E', { exact: true })).toHaveCount(0)
    await expect(dayTabs.nth(0)).toContainText('Torso E2E')
    await expect(dayTabs.nth(1)).toContainText('Movilidad E2E')
})
