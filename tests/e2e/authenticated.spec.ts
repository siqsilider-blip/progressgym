import { expect, test } from '@playwright/test'

const trainerEmail = process.env.E2E_TRAINER_EMAIL!
const studentEmail = process.env.E2E_STUDENT_EMAIL!
const password = process.env.E2E_AUTH_PASSWORD!

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

test('el alumno entra a su portal y no al panel del entrenador', async ({ page }) => {
    await logIn(page, 'student', studentEmail)

    await expect(page).toHaveURL(/\/app(?:\?|$)/)
    await expect(page.getByRole('link', { name: 'Rutina', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Progreso', exact: true })).toBeVisible()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/app(?:\?|$)/)
})

test('cada tipo de cuenta es rechazado por el acceso equivocado', async ({ page }) => {
    await logIn(page, 'student', trainerEmail)
    await expect(page).toHaveURL(/\/login\/student\?message=/)
    await expect(page.getByText(/esta cuenta es de entrenador/i)).toBeVisible()
})
