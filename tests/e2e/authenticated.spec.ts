import { expect, test } from '@playwright/test'

const trainerEmail = process.env.E2E_TRAINER_EMAIL!
const studentEmail = process.env.E2E_STUDENT_EMAIL!
const password = process.env.E2E_AUTH_PASSWORD!
const routineName = process.env.E2E_ROUTINE_NAME!
const exerciseName = process.env.E2E_EXERCISE_NAME!
const templateId = process.env.E2E_TEMPLATE_ID!
const templateName = process.env.E2E_TEMPLATE_NAME!
const studentId = process.env.E2E_STUDENT_ID!
const inviteStudentId = process.env.E2E_INVITE_STUDENT_ID!

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

test('el entrenador entra al panel y no al portal del alumno', async ({ page }) => {
    await logIn(page, 'trainer', trainerEmail)

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
    await expect(page.getByRole('link', { name: 'Alumnos' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Rutinas' }).first()).toBeVisible()

    await page.goto('/app')
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
})

test('el alumno entra a su portal y no al panel del entrenador', async ({ page }, testInfo) => {
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
    await expect(page.getByText(/Día E2E · Activación · 1\/1/)).toBeVisible()
    await expect(page.getByRole('heading', { name: exerciseName })).toBeVisible()
    await page.getByRole('button', { name: 'Ver cómo se hace' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Mantené la espalda apoyada y controlá el movimiento.')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar demostración' }).click()
    const numberInputs = page.locator('input[type="number"]')
    await expect(numberInputs).toHaveCount(2)
    await numberInputs.nth(0).fill('35')
    await numberInputs.nth(1).fill('10')
    await page.getByRole('button', { name: 'Agregar esfuerzo percibido (opcional)' }).click()
    await page.getByRole('button', { name: 'Esfuerzo 7 de 10' }).click()
    await page.getByRole('button', { name: 'Guardar serie 1' }).click()

    await expect(page.getByRole('heading', { name: 'Sesión completada' })).toBeVisible({ timeout: 15_000 })

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Sesión completada' })).toBeVisible({ timeout: 15_000 })

    await page.goto('/app/rutina')
    await expect(page.getByText('Semana completada ✓')).toBeVisible()
    await expect(page.getByText('1 de 1 entrenamientos completados')).toBeVisible()
    await expect(page.getByText('✓ Completado esta semana')).toBeVisible()

    await page.goto('/app')
    await expect(page.getByText('Semana completada', { exact: true })).toBeVisible()
    await expect(page.getByText('¡Excelente trabajo! ✓')).toBeVisible()

    await page.goto('/app/history')
    await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible()
    await expect(page.getByText(exerciseName, { exact: false })).toBeVisible()

    await page.goto('/app/progress')
    await expect(page.getByRole('heading', { name: 'Progreso' })).toBeVisible()

    await page.goto('/app/profile')
    await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible()
})

test('cada tipo de cuenta es rechazado por el acceso equivocado', async ({ page }) => {
    await logIn(page, 'student', trainerEmail, false)
    await expect(page).toHaveURL(/\/login\/student\?message=/)
    await expect(page.getByText(/esta cuenta es de entrenador/i)).toBeVisible()
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

test('el entrenador prepara un acceso personal para enviar por WhatsApp', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'La generación del enlace se prueba una sola vez.')

    await logIn(page, 'trainer', trainerEmail)
    await page.goto(`/dashboard/students/${studentId}`)

    await page.getByRole('button', { name: 'Preparar nuevo acceso' }).click()
    await expect(page.getByText('Invitación lista', { exact: true })).toBeVisible({ timeout: 15_000 })

    const whatsappLink = page.getByRole('link', { name: 'Enviar por WhatsApp' })
    await expect(whatsappLink).toHaveAttribute('href', /^https:\/\/wa\.me\//)

    const accessLink = page.getByRole('link', { name: /Probar enlace de acceso/ })
    await expect(accessLink).toHaveAttribute('href', /\/auth\/confirm\?token_hash=/)
})

test('un alumno nuevo activa la invitación y entra directamente a su rutina', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'La activación completa se prueba una sola vez.')

    await logIn(page, 'trainer', trainerEmail)
    await page.goto(`/dashboard/students/${inviteStudentId}`)
    await page.getByRole('button', { name: 'Preparar invitación' }).click()
    await expect(page.getByText('Invitación lista', { exact: true })).toBeVisible({ timeout: 15_000 })

    const inviteUrl = await page.getByRole('link', { name: /Probar enlace de acceso/ }).getAttribute('href')
    expect(inviteUrl).toContain('/auth/confirm?token_hash=')

    await page.context().clearCookies()
    await page.goto(inviteUrl!)
    await expect(page).toHaveURL(/\/reset-password\?invite=1/, { timeout: 15_000 })
    await expect(page.getByText('Activá tu acceso de alumno', { exact: true })).toBeVisible()

    await page.getByLabel('Contraseña nueva').fill(password)
    await page.getByLabel('Repetir contraseña').fill(password)
    await page.getByRole('button', { name: 'Crear contraseña y entrar' }).click()

    await expect(page).toHaveURL(/\/app(?:\?|$)/, { timeout: 20_000 })
    await page.goto('/app/rutina')
    await expect(page.getByText(routineName, { exact: true })).toBeVisible()
})

test('asignar un template crea un programa completo que el alumno puede abrir', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop-chromium', 'La asignación se prueba una sola vez por fixture.')

    await logIn(page, 'trainer', trainerEmail)
    await page.goto(`/dashboard/routines/${templateId}/assign-to-student`, { waitUntil: 'domcontentloaded' })

    const studentOption = page.locator('label').filter({ hasText: 'Alumno E2E' })
    await expect(studentOption).toBeVisible()
    await studentOption.getByRole('checkbox').check()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Asignar seleccionados (1)' }).click()
    await expect(page.getByText('Asignado correctamente ✓')).toBeVisible({ timeout: 15_000 })

    await page.goto(`/dashboard/students/${studentId}`)
    await expect(page.getByText('Seguimiento al día', { exact: true })).toBeVisible()
    await expect(page.getByText('/100', { exact: false })).toHaveCount(0)

    await page.context().clearCookies()
    await logIn(page, 'student', studentEmail)
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
