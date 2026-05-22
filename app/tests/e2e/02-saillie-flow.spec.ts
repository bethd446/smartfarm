import { test, expect } from '@playwright/test'
import { sql, sqlScalar, TEST_TAG, cleanupTestRows } from './_helpers'

/**
 * G1-2 : Saillie (Nouvelle saillie) — flux complet.
 *
 *  1. /reproduction
 *  2. Click bouton "Nouvelle saillie" → ouvre DialogFaireMonter
 *  3. Remplir : truie = T-002 (Akissi, déjà connue avoir saillie passée mais
 *     pas aujourd'hui), méthode = naturelle, date = aujourd'hui.
 *     Observation = TEST_TAG (pour cleanup).
 *  4. Submit
 *  5. Toast OU disparition du dialog + assertion DB : 1 saillie créée
 *     aujourd'hui pour T-002.
 *
 * Mode démo : pas de login.
 */

test.describe('G1-2 — Saillie : Nouvelle saillie', () => {
  // Truie de test : on prend T-002 pour ne pas conflict avec T-001 (saillie
  // déjà enregistrée le 2026-07-15) ni avec le test concurrent qui prendra T-003.
  const TRUIE_ID = '33333333-0000-0000-0000-000000000002'
  const TRUIE_LABEL_PREFIX = 'Akissi'

  test.beforeEach(async () => {
    cleanupTestRows()
    // S'assurer qu'aucune saillie n'existe déjà aujourd'hui pour cette truie
    sql(`DELETE FROM saillies WHERE truie_id='${TRUIE_ID}' AND date_saillie=CURRENT_DATE`)
  })

  test.afterEach(async () => {
    cleanupTestRows()
    sql(`DELETE FROM saillies WHERE truie_id='${TRUIE_ID}' AND date_saillie=CURRENT_DATE`)
  })

  test('création saillie via DialogFaireMonter', async ({ page }) => {
    await page.goto('/reproduction', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // 1. Ouvrir le dialog via le bouton "Nouvelle saillie"
    const trigger = page.getByRole('button', { name: /nouvelle saillie/i })
    await expect(trigger).toBeVisible({ timeout: 10_000 })
    await trigger.click()

    // 2. Dialog visible — sélecteur via data-slot="dialog-content" (le wrapper Radix
    //    Dialog du projet expose ce slot, cf. src/components/ui/dialog.tsx).
    //    Le role='dialog' standard ne marche pas toujours côté Playwright à cause
    //    du portal Radix + plusieurs noeuds aria-hidden parallèles (overlay + content).
    const dialog = page.locator('[data-slot="dialog-content"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // 3. Sélectionner la truie (select#truie_id) en utilisant le label visible.
    //    Le composant utilise <select> natif → .selectOption() OK.
    const truieSelect = dialog.locator('#truie_id')
    await expect(truieSelect).toBeVisible()
    await truieSelect.selectOption({ value: TRUIE_ID })

    // 4. Méthode = naturelle (déjà default mais on force)
    await dialog.locator('#methode').selectOption({ value: 'naturelle' })

    // 5. Date = aujourd'hui (déjà default mais on force via le bouton "Aujourd'hui")
    const aujBtn = dialog.getByRole('button', { name: /aujourd'?hui/i })
    if (await aujBtn.isVisible().catch(() => false)) {
      await aujBtn.click()
    }

    // 6. Observations = TEST_TAG pour cleanup déterministe
    const obs = dialog.locator('textarea#observations')
    if (await obs.isVisible().catch(() => false)) {
      await obs.fill(TEST_TAG)
    }

    // 7. Submit
    await dialog.getByRole('button', { name: /^enregistrer$/i }).click()

    // 8. Attendre fermeture dialog OU toast success
    await expect(dialog).toBeHidden({ timeout: 10_000 })

    // 9. Assertion DB : 1 saillie créée pour T-002 aujourd'hui
    const count = sqlScalar(
      `SELECT count(*) FROM saillies WHERE truie_id='${TRUIE_ID}' AND date_saillie=CURRENT_DATE AND deleted_at IS NULL`
    )
    expect(count, `attendu 1 saillie créée, observé ${count}`).toBe('1')

    // 10. Bonus : la méthode est bien 'naturelle'
    const methode = sqlScalar(
      `SELECT methode::text FROM saillies WHERE truie_id='${TRUIE_ID}' AND date_saillie=CURRENT_DATE AND deleted_at IS NULL LIMIT 1`
    )
    expect(methode).toBe('naturelle')

    // 11. Petit smoke : la table /reproduction contient bien T-002 quelque part dans la page
    //     (la revalidation a fonctionné).
    await page.waitForTimeout(500)
    await expect(page.getByText(new RegExp(TRUIE_LABEL_PREFIX, 'i')).first()).toBeVisible({
      timeout: 5_000,
    })
  })
})
