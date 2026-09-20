import { expect, test } from '@playwright/test'

test('la portada carga y permite comenzar', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /el sistema para/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /crear mi cuenta gratis/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /ya tengo cuenta/i })).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )
    expect(hasHorizontalOverflow).toBe(false)
})

test('el acceso separa correctamente entrenador y alumno', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Progrezzia' })).toBeVisible()
    await expect(page.getByRole('link', { name: /soy entrenador/i })).toHaveAttribute(
        'href',
        '/login/trainer'
    )
    await expect(page.getByRole('link', { name: /soy alumno/i })).toHaveAttribute(
        'href',
        '/login/student'
    )
})

test('los alumnos crean su acceso únicamente desde una invitación', async ({ page }) => {
    await page.goto('/signup/student')

    await expect(page).toHaveURL(/\/login\/student\?message=/)
    await expect(page.getByText(/tu entrenador debe enviarte una invitación/i)).toBeVisible()
})

test('las áreas privadas no se muestran sin sesión', async ({ page }) => {
    for (const privatePath of ['/dashboard', '/dashboard/routines', '/app/train']) {
        await page.goto(privatePath)
        await expect(page).toHaveURL(/\/login(?:\?|$)/)
    }
})

test('los recursos instalables son válidos', async ({ request }) => {
    const manifestResponse = await request.get('/manifest.webmanifest')
    expect(manifestResponse.ok()).toBe(true)
    expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json')

    const manifest = await manifestResponse.json()
    expect(manifest.name).toBe('Progrezzia')
    expect(manifest.icons).toHaveLength(2)

    const serviceWorkerResponse = await request.get('/sw.js')
    expect(serviceWorkerResponse.ok()).toBe(true)
    expect(await serviceWorkerResponse.text()).toContain("self.addEventListener('fetch'")
})

test('la versión publicada informa su estado y commit', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBe(true)
    expect(response.headers()['cache-control']).toContain('no-store')

    const health = await response.json()
    expect(health.ok).toBe(true)
    expect(health.commit).toMatch(/^(local|[0-9a-f]{40})$/)

    if (process.env.GITHUB_SHA) {
        expect(health.commit).toBe(process.env.GITHUB_SHA)
    }
})
