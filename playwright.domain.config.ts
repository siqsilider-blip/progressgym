import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests/domain',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    reporter: 'list',
})
