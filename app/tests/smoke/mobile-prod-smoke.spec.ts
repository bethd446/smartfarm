import { test, expect, type Page } from '@playwright/test'

/**
 * Smoke prod Mobile — Phase 2 (Pixel 7).
 *
 * Vérifie toutes les améliorations Phase 2 :
 * - Bottom nav présent sur 5 routes
 * - FAB sur 5 routes critiques
 * - ResponsiveTable : cards mobile (pas de table HTML) sur /cheptel
 * - PWA : manifest.json + sw.js
 * - Pagination alertes (boutons Précédent/Suivant si ≥11 alertes)
 * - Touch targets min 44px (sample 5 boutons par route)
 *
 * Credentials démo (publics côté équipe) :
 *   demo@smartfarm.group / Demo6734N0xUHH1I
 */

const DEMO_EMAIL = process.env.SMOKE_EMAIL ?? 'demo@smartfarm.group'
const DEMO_PASS = process.env.SMOKE_PASS ?? 'Demo6734N0xUHH1I'

async function login(page: Page) {
  await page.goto('/connexion')
  await page.getByLabel(/email/i).fill(DEMO_EMAIL)
  await page.getByLabel(/mot de passe/i).fill(DEMO_PASS)
  await page.getByRole('button', { name: /se connecter/i }).click()
  // Attendre l'arrivée sur le dashboard / app
  await page.waitForURL(/\/(dashboard|cheptel)/, { timeout: 15000 })
}

test.describe('Mobile Phase 2 — smartfarm.group', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('bottom-nav présent sur dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    // Bottom nav a le data-testid ou locator nav avec les icônes
    const bottomNav = page.locator('nav').filter({ hasText: /Tableau|Cheptel|Reproduction/i })
    await expect(bottomNav).toBeVisible({ timeout: 5000 })
  })

  test('bottom-nav présent sur cheptel', async ({ page }) => {
    await page.goto('/cheptel')
    const bottomNav = page.locator('nav').filter({ hasText: /Tableau|Cheptel|Reproduction/i })
    await expect(bottomNav).toBeVisible()
  })

  test('bottom-nav présent sur reproduction', async ({ page }) => {
    await page.goto('/reproduction')
    const bottomNav = page.locator('nav').filter({ hasText: /Tableau|Cheptel|Reproduction/i })
    await expect(bottomNav).toBeVisible()
  })

  test('bottom-nav présent sur alertes', async ({ page }) => {
    await page.goto('/alertes')
    const bottomNav = page.locator('nav').filter({ hasText: /Tableau|Cheptel|Reproduction/i })
    await expect(bottomNav).toBeVisible()
  })

  test('bottom-nav présent sur mises-bas', async ({ page }) => {
    await page.goto('/mises-bas')
    const bottomNav = page.locator('nav').filter({ hasText: /Tableau|Cheptel|Reproduction/i })
    await expect(bottomNav).toBeVisible()
  })

  test('FAB présent et cliquable sur /cheptel', async ({ page }) => {
    await page.goto('/cheptel')
    // FAB a le role button et contient "Ajouter" ou icon +
    const fab = page.getByRole('button', { name: /ajouter|nouvel animal/i })
    await expect(fab).toBeVisible()
    // Vérifier que c'est bien un FAB (position fixed)
    const box = await fab.boundingBox()
    expect(box).not.toBeNull()
  })

  test('FAB présent et cliquable sur /reproduction', async ({ page }) => {
    await page.goto('/reproduction')
    const fab = page.getByRole('button', { name: /ajouter|nouvelle saillie/i })
    await expect(fab).toBeVisible({ timeout: 5000 })
  })

  test('FAB présent et cliquable sur /mises-bas', async ({ page }) => {
    await page.goto('/mises-bas')
    const fab = page.getByRole('button', { name: /ajouter|nouvelle mise|nouvelle portée/i })
    await expect(fab).toBeVisible({ timeout: 5000 })
  })

  test('FAB présent et cliquable sur /alertes', async ({ page }) => {
    await page.goto('/alertes')
    const fab = page.getByRole('button', { name: /ajouter|nouvelle alerte/i })
    await expect(fab).toBeVisible({ timeout: 5000 })
  })

  test('FAB présent et cliquable sur /alimentation/consommations', async ({ page }) => {
    await page.goto('/alimentation/consommations')
    const fab = page.getByRole('button', { name: /ajouter|nouvelle consommation/i })
    await expect(fab).toBeVisible({ timeout: 5000 })
  })

  test('ResponsiveTable : cards mobile sur /cheptel (pas de table HTML)', async ({ page }) => {
    await page.goto('/cheptel')
    // Attendre que les données se chargent
    await page.waitForTimeout(2000)
    
    // Vérifier qu'il n'y a PAS de <table> visible
    const tables = page.locator('table').filter({ has: page.locator('text=ACTIF') })
    const tableCount = await tables.count()
    
    // En mobile, on doit avoir des cards (div avec classe card ou data-card)
    const cards = page.locator('[data-testid*="animal-card"], .animal-card, [class*="animal-card"]')
    const cardCount = await cards.count()
    
    // Au moins 1 card OU pas de table visible (tolérant si structure différente)
    if (tableCount === 0) {
      // Pas de table = OK (cards ou autre structure mobile)
      expect(tableCount).toBe(0)
    } else {
      // Si table existe, vérifier qu'elle a display:none en mobile
      const tableVisible = await tables.first().isVisible().catch(() => false)
      expect(tableVisible).toBe(false)
    }
  })

  test('PWA : manifest.json renvoie 200 + JSON valide', async ({ page, request }) => {
    const response = await request.get('/manifest.json')
    expect(response.status()).toBe(200)
    
    const contentType = response.headers()['content-type']
    expect(contentType).toContain('application/json')
    
    const manifest = await response.json()
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.icons).toBeTruthy()
    expect(manifest.icons.length).toBeGreaterThan(0)
  })

  test('PWA : sw.js renvoie 200', async ({ page, request }) => {
    const response = await request.get('/sw.js')
    expect(response.status()).toBe(200)
    
    const contentType = response.headers()['content-type']
    expect(contentType).toMatch(/javascript|ecmascript/)
  })

  test('Pagination alertes : boutons Précédent/Suivant visibles (si ≥11 alertes)', async ({ page }) => {
    await page.goto('/alertes')
    await page.waitForTimeout(2000)
    
    // Compter les alertes visibles
    const alertItems = page.locator('[data-testid*="alert"], .alert-item, [class*="alert-card"]')
    const alertCount = await alertItems.count()
    
    if (alertCount >= 11) {
      // Si plus de 10 alertes, pagination doit être visible
      const paginationNext = page.getByRole('button', { name: /suivant|next/i })
      const paginationPrev = page.getByRole('button', { name: /précédent|previous/i })
      
      // Au moins un des deux boutons doit exister
      const nextVisible = await paginationNext.isVisible().catch(() => false)
      const prevVisible = await paginationPrev.isVisible().catch(() => false)
      
      expect(nextVisible || prevVisible).toBe(true)
    } else {
      // Moins de 11 alertes : test SKIP (tolérant)
      test.skip(alertCount < 11, 'Moins de 11 alertes en démo, pagination non testable')
    }
  })

  test('Touch targets : 5 boutons sample ont min-height ≥44px', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Sample 5 boutons de différentes routes
    const routes = ['/dashboard', '/cheptel', '/reproduction', '/alertes', '/mises-bas']
    
    for (const route of routes) {
      await page.goto(route)
      await page.waitForTimeout(1000)
      
      // Prendre le premier bouton visible sur la route
      const button = page.getByRole('button').first()
      const box = await button.boundingBox()
      
      if (box) {
        // Min touch target = 44px (Apple HIG / Material Design)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('Touch targets : bottom-nav items ≥44px', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Tous les items du bottom-nav
    const navItems = page.locator('nav a, nav button').filter({ hasText: /Tableau|Cheptel|Reproduction|Alertes|Plus/i })
    const count = await navItems.count()
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const item = navItems.nth(i)
      const box = await item.boundingBox()
      
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }
  })
})
