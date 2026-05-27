import { defineConfig, devices } from '@playwright/test'

/**
 * Config Playwright smoke prod — Phase 1 stabilisation + V2 storageState.
 *
 * Cible : https://smartfarm.group avec login démo réel.
 * Lancé manuellement (`npm run e2e:smoke`) et via CI (workflow .github/workflows/smoke.yml).
 *
 * Distinct de playwright.config.ts qui pointe sur 127.0.0.1:3000 (dev local).
 *
 * Auth partagée : project `setup` fait 1 login → storageState dans
 * playwright/.auth/demo.json → tous les autres projects le réutilisent.
 * Évite le WAF Hostinger qui rate-limitait sur 50+ logins POST par run.
 */

const AUTH_FILE = 'playwright/.auth/demo.json'

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
    // 1. Setup : 1 SEUL login démo → save storageState
    // retries=2 (au lieu du défaut 1 hérité) : le cold-start Hostinger Passenger
    // peut nécessiter 2+ tentatives pour warm-up (thunder herd entre 2 jobs //).
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      retries: 2,
    },
    // 2. Tests desktop avec session pré-authentifiée
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
    // 3. Tests mobile (Pixel 7) avec même session
    {
      name: 'mobile-pixel',
      use: {
        ...devices['Pixel 7'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
  ],
})
