import { defineConfig, devices } from '@playwright/test'

/**
 * Config Playwright smoke prod — Phase 1 stabilisation.
 *
 * Cible : https://smartfarm.group avec login démo réel.
 * Lancé manuellement (`npm run e2e:smoke`) et via CI (workflow .github/workflows/smoke.yml).
 *
 * Distinct de playwright.config.ts qui pointe sur 127.0.0.1:3000 (dev local).
 */
export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.SMOKE_URL ?? 'https://smartfarm.group',
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-pixel',
      use: { ...devices['Pixel 7'] },
    },
  ],
})
