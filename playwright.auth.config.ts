import { defineConfig, devices } from '@playwright/test'

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: 'authenticated.spec.ts',
    globalSetup: './tests/e2e/auth-fixture.ts',
    globalTeardown: './tests/e2e/auth-teardown.ts',
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: externalBaseUrl || 'http://127.0.0.1:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'mobile-chromium',
            use: { ...devices['Pixel 7'] },
        },
        {
            name: 'desktop-chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: externalBaseUrl
        ? undefined
        : {
            command: 'npm run dev',
            url: 'http://127.0.0.1:3000',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
})
