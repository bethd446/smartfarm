import { test, expect, type Page } from '@playwright/test'

/**
 * S5 Lane 1 — Bulk transition stade porcelets
 *
 * Smoke prod validant le composant <PorceletsTableBulk> + <DialogChangerStadeBatch> :
 * - Checkbox header + lignes
 * - Sticky bar apparaît avec sélection
 * - Dialog batch ouvre avec intersection stades calculée
 * - Annulation sans mutation BDD
 * - Mobile : sticky bar offset au-dessus BottomNav (h-16 = 64px)
 * - 0 erreur console React #418 hydration
 */

const DEMO_EMAIL = process.env.SMOKE_EMAIL ?? 'demo@smartfarm.group'
const DEMO_PASS = process.env.SMOKE_PASS ?? 'Demo6734N0xUHH1I'

async function login(page: Page) {
  await page.goto('/connexion')
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/mot de passe/i).fill(DEMO_PASS)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await page.waitForURL(/\/(dashboard|cheptel)/, { timeout: 15000 })
}

test.describe('S5 Lane 1 — Bulk transition stade porcelets', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('onglet porcelets affiche table custom avec checkboxes', async ({ page }) => {
    await page.goto('/cheptel?tab=porcelets')
    // Header checkbox "Tout sélectionner"
    const headerCheckbox = page.getByLabel(/tout sélectionner/i)
    await expect(headerCheckbox).toBeVisible({ timeout: 10000 })
    // Au moins 1 row checkbox (ferme démo a 95+ porcelets en demarrage_2)
    const rowCheckboxes = page.locator('input[type="checkbox"][aria-label^="Sélectionner "]')
    await expect(rowCheckboxes.first()).toBeVisible()
  })

  test('sticky bar apparaît après sélection 2 porcelets', async ({ page }) => {
    await page.goto('/cheptel?tab=porcelets')
    const rowCheckboxes = page.locator('input[type="checkbox"][aria-label^="Sélectionner "]')
    await rowCheckboxes.nth(0).check()
    await rowCheckboxes.nth(1).check()
    // Sticky bar avec "2 sélectionné(s)"
    await expect(page.getByText(/^2 sélectionnés?$/)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /changer le stade/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /effacer/i })).toBeVisible()
  })

  test('bouton effacer désélectionne tout', async ({ page }) => {
    await page.goto('/cheptel?tab=porcelets')
    const rowCheckboxes = page.locator('input[type="checkbox"][aria-label^="Sélectionner "]')
    await rowCheckboxes.nth(0).check()
    await rowCheckboxes.nth(1).check()
    await expect(page.getByText(/^2 sélectionnés?$/)).toBeVisible()
    await page.getByRole('button', { name: /effacer/i }).click()
    // Sticky bar doit disparaître (selection.size === 0)
    await expect(page.getByText(/^2 sélectionnés?$/)).not.toBeVisible({ timeout: 3000 })
  })

  test('dialog batch ouvre + intersection stades calculée', async ({ page }) => {
    await page.goto('/cheptel?tab=porcelets')
    const rowCheckboxes = page.locator('input[type="checkbox"][aria-label^="Sélectionner "]')
    await rowCheckboxes.nth(0).check()
    await rowCheckboxes.nth(1).check()
    await page.getByRole('button', { name: /changer le stade/i }).click()
    // Dialog ouvert (shadcn dialog → role="dialog")
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    // Titre "Changer le stade — N animal/aux"
    await expect(page.getByText(/changer le stade\s+—\s+\d+\s+animal/i)).toBeVisible()
    // Section sélection avec badges tags
    await expect(page.getByText(/^Sélection$/)).toBeVisible()
    // Soit Select stade visible (intersection non vide) soit message sélection mixte
    const stadeOptions = page.getByRole('combobox')
    const mixedMsg = page.getByText(/sélection mixte non transitionnable/i)
    const hasStadeOrMixed = await Promise.race([
      stadeOptions.first().waitFor({ state: 'visible', timeout: 3000 }).then(() => 'stade'),
      mixedMsg.waitFor({ state: 'visible', timeout: 3000 }).then(() => 'mixed'),
    ]).catch(() => 'none')
    expect(['stade', 'mixed']).toContain(hasStadeOrMixed)
    // Annule sans muter BDD
    await page.getByRole('button', { name: /annuler/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 })
  })

  test('mobile : sticky bar offset au-dessus BottomNav', async ({ page, viewport }) => {
    // Ce test ne vaut que sur viewport mobile (project mobile-pixel = Pixel 7 ~412×915)
    test.skip(viewport === null || viewport.width >= 1024, 'Mobile-only test')
    await page.goto('/cheptel?tab=porcelets')
    const rowCheckboxes = page.locator('input[type="checkbox"][aria-label^="Sélectionner "]')
    await rowCheckboxes.nth(0).check()
    const stickyBar = page.getByRole('region', { name: /actions bulk/i })
    await expect(stickyBar).toBeVisible({ timeout: 5000 })
    const box = await stickyBar.boundingBox()
    expect(box).not.toBeNull()
    if (box && viewport) {
      const bottomEdgeFromTop = box.y + box.height
      const distanceFromBottom = viewport.height - bottomEdgeFromTop
      // BottomNav fait h-16 = 64px. Sticky bar doit être ≥ 48px au-dessus du bas.
      expect(distanceFromBottom).toBeGreaterThanOrEqual(48)
    }
  })

  test('0 erreur console React #418 / hydration sur /cheptel?tab=porcelets', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const txt = msg.text()
        if (/(#418|hydrat|server.+(rendered|HTML))/i.test(txt)) {
          errors.push(`console.error: ${txt}`)
        }
      }
    })
    await page.goto('/cheptel?tab=porcelets', { waitUntil: 'networkidle' })
    // Attendre que le React Server Component soit hydraté côté client
    await page.locator('input[type="checkbox"][aria-label^="Sélectionner "]').first().waitFor({
      state: 'visible',
      timeout: 10000,
    })
    expect(errors).toEqual([])
  })
})
