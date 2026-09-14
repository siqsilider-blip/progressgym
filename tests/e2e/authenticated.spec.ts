import { expect, test } from '@playwright/test'

const trainerEmail = process.env.E2E_TRAINER_EMAIL!
const studentEmail = process.env.E2E_STUDENT_EMAIL!
const password = process.env.E2E_AUTH_PASSWORD!
const routineName = process.env.E2E_ROUTINE_NAME!
const exerciseName = process.env.E2E_EXERCISE_NAME!
const templateId = process.env.E2E_TEMPLATE_ID!

async function logIn(page: import('@playwright/test').Page, role: 'trainer' | 'student', email: string) {
    await page.goto(`/login/${role}`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Contraseña').fill(password)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
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

    await expect(page).toHaveURL(/\/app\/train\?/)
    await expect(page.getByText(/Día E2E · Activación · 1\/1/)).toBeVisible()
    await expect(page.getByRole('heading', { name: exerciseName })).toBeVisible()

    const numberInputs = page.locator('input[type="number"]')
    await expect(numberInputs).toHaveCount(2)
    await numberInputs.nth(0).fill('35')
    await numberInputs.nth(1).fill('10')
    await page.getByRole('button', { name: '7', exact: true }).click()
    await page.getByRole('button', { name: 'Guardar set 1' }).click()

    await expect(page.getByRole('heading', { name: 'Sesión completada' })).toBeVisible({ timeout: 15_000 })

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Sesión completada' })).toBeVisible({ timeout: 15_000 })
})

test('cada tipo de cuenta es rechazado por el acceso equivocado', async ({ page }) => {
    await logIn(page, 'student', trainerEmail)
    await expect(page).toHaveURL(/\/login\/student\?message=/)
    await expect(page.getByText(/esta cuenta es de entrenador/i)).toBeVisible()
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
