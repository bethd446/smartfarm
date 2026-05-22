import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for SmartFarm E2E tests.
 *
 * IMPORTANT (Sprint 2 Wave 2 G1) :
 * - Le serveur Next.js est déjà lancé sur 127.0.0.1:3000 par l'orchestrateur.
 *   On NE redémarre PAS le serveur (règle dure CONTEXT.md).
 * - workers=1 : sérialiser pour éviter d'accumuler des bruits DB entre fichiers.
 *   Le test concurrent (#5) crée explicitement 2 BrowserContext en parallèle
 *   dans le MÊME test (pas via workers).
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Pas de mode parallèle entre fichiers : on touche la même DB demo.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? 'list' : 'list',
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    // Mode démo : pas d'auth, donc pas de storageState.
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
