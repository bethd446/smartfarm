import { test as setup, expect } from '@playwright/test'

/**
 * Setup auth — 1 SEUL login démo pour partager la session entre tous les tests smoke.
 *
 * Évite l'anti-pattern `beforeEach(login)` qui causait 50+ logins POST par run CI,
 * déclenchant le WAF Hostinger Cloud (cascade net::ERR_ABORTED).
 *
 * Le storageState est sauvé dans playwright/.auth/demo.json (gitignored), réutilisé
 * par les projects chromium-desktop + mobile-pixel via la config Playwright.
 */

const AUTH_FILE = 'playwright/.auth/demo.json'

const DEMO_EMAIL = process.env.SMOKE_EMAIL ?? 'demo@smartfarm.group'
const DEMO_PASS = process.env.SMOKE_PASS ?? 'Demo6734N0xUHH1I'

setup('authenticate demo', async ({ page }) => {
  // 'load' au lieu de 'networkidle' : Next 16 + Hostinger LiteSpeed gardent
  // souvent une connexion ouverte (RSC streaming, SSE, sw.js), networkidle
  // timeout 30s alors que la page est déjà cliquable. 'load' = DOMContentLoaded
  // + ressources critiques chargées → suffisant pour fill + click.
  await page.goto('/connexion', { waitUntil: 'load', timeout: 60000 })
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/mot de passe/i).fill(DEMO_PASS)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForURL(/\/(dashboard|cheptel)/, { timeout: 60000 })
  // Sanity check : on est bien authentifié (header chrome de l'app, badge user, etc.)
  await expect(page.getByRole('heading', { name: /tableau de bord|cheptel/i }).first()).toBeVisible({
    timeout: 10000,
  })
  await page.context().storageState({ path: AUTH_FILE })
})
