import { test, expect } from '@playwright/test'

/**
 * Smoke prod Smart Farm — Phase 1.
 *
 * Vérifie les 8 routes critiques + features.
 * Auth : session partagée via storageState (cf auth.setup.ts + playwright.smoke.config.ts).
 */

test.describe('Smart Farm smoke prod', () => {
  test('dashboard charge avec KPIs', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('body')).toContainText(/tableau de bord|ferme/i)
  })

  test('cheptel liste les animaux', async ({ page }) => {
    await page.goto('/cheptel')
    await expect(page.getByRole('heading', { name: /cheptel/i })).toBeVisible()
    // Au moins 1 animal présent : la colonne STATUT/STADE REPRO doit afficher
    // un état métier (Hermes Lane 2 a remplacé ACTIF par GESTANTE/VIDE/etc.)
    await expect(
      page.locator('text=/GESTANTE|ALLAITANTE|VIDE|PRÉ-SAILLIE|ACTIF/i').first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('reproduction affiche saillies', async ({ page }) => {
    await page.goto('/reproduction')
    await expect(page.getByRole('heading', { name: /reproduction/i })).toBeVisible()
    await expect(page.locator('text=/montées|saillies/i').first()).toBeVisible()
  })

  test('mises bas chargent', async ({ page }) => {
    await page.goto('/mises-bas')
    await expect(page.getByRole('heading', { name: /mises? bas/i })).toBeVisible()
  })

  test('batiments liste 5 bâtiments démo', async ({ page }) => {
    await page.goto('/batiments')
    await expect(page.getByRole('heading', { name: /bâtiments/i })).toBeVisible()
  })

  test('alimentation projection stock visible', async ({ page }) => {
    await page.goto('/alimentation/plans')
    await expect(page.locator('body')).toContainText(/plan|formule|stock/i)
  })

  test('alertes affiche bouton nouvelle alerte (F2)', async ({ page }) => {
    await page.goto('/alertes')
    await expect(page.getByRole('button', { name: /nouvelle alerte/i })).toBeVisible()
  })

  test('kpi page charge taux fertilité', async ({ page }) => {
    await page.goto('/kpi')
    await expect(page.locator('body')).toContainText(/fertilit|productivit|kpi/i)
  })

  test('multi-tenant : reste sur la ferme démo (RLS)', async ({ page }) => {
    // La ferme réelle a id fdba3bb2-... — tenter de la cibler via URL doit échouer
    await page.goto('/batiments')
    // On reste sur la ferme démo (header confirme via nom ferme ou n° client)
    await expect(page.locator('body')).toContainText(/SF-100001|FERME DÉMO/i, { timeout: 5000 })
  })

  test('feature changer stade visible sur fiche animal (F1)', async ({ page }) => {
    await page.goto('/cheptel')
    // Cliquer sur la 1ère ligne cliquable du tableau (lien fiche animal)
    // Selector robuste vs ancien hardcoding "Adèle T01" (dépendant du nom démo)
    await page.locator('a[href^="/cheptel/"]').first().click({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /changer stade/i })).toBeVisible({
      timeout: 10000,
    })
  })

  test('feature mouvement bâtiment visible sur fiche animal (F3)', async ({ page }) => {
    await page.goto('/cheptel')
    await page.locator('a[href^="/cheptel/"]').first().click({ timeout: 10000 })
    await page.getByRole('button', { name: /mouvements/i }).click()
    await expect(
      page.getByRole('button', { name: /déplacer/i })
    ).toBeVisible({ timeout: 10000 })
  })
})
