import { test, expect } from '@playwright/test'

/**
 * Régression D2 — carnet de reproduction : la date de saillie doit s'afficher
 * en date civile (JJ/MM/AAAA), pas en durée relative.
 *
 * Contexte : la Phase D2 (design) avait remplacé `toLocaleDateString` par
 * `<RelativeTime addSuffix>` ("il y a X"), faisant disparaître la date exacte
 * sous une colonne littéralement nommée « Date ». Fix : <FormattedDateTime
 * format="date"> (cf. components/ui/formatted-date.tsx + lib/format/dates.ts).
 *
 * Discriminant : RelativeTime ne produit jamais le motif \d{2}/\d{2}/\d{4}
 * (il rend "il y a X" / "dans X"). Ce test échoue donc sur le code buggé et
 * passe après le fix — quelle que soit la date des fixtures.
 *
 * Mode démo : pas de login. Nécessite ≥1 saillie fixture (T-001, cf 02-saillie-flow).
 * S'exécute en CI (Supabase docker dispo) — non lançable sans la stack locale.
 */
test.describe('G1-6 — Reproduction : date de saillie en format civil', () => {
  test('colonne Date du carnet : JJ/MM/AAAA, pas de temps relatif', async ({ page }) => {
    await page.goto('/reproduction', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // Carnet historique : 1ère colonne <th>Date</th>. <FormattedDateTime> rend
    // côté client après hydration → on attend la cellule peuplée.
    const dateCell = page.locator('table tbody tr td:first-child').first()
    await expect(dateCell).toBeVisible({ timeout: 10_000 })
    await expect(dateCell).toHaveText(/\d{2}\/\d{2}\/\d{4}/, { timeout: 10_000 })
    await expect(dateCell).not.toContainText(/il y a|dans /i)
  })
})
