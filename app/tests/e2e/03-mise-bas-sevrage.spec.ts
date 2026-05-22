import { test, expect } from '@playwright/test'
import { sql, sqlScalar, TEST_TAG, cleanupTestRows } from './_helpers'

/**
 * G1-3 : Mise bas → Sevrage (flow complet en un seul test).
 *
 *  Pré-requis DB : il existe une saillie diagnostic positif sans MB pour T-003.
 *  Si quelqu'un a déjà consommé cette saillie, on recharge :
 *    - DELETE mises_bas pour T-003 saillie 2026-01-25
 *
 *  1. /mises-bas
 *  2. Click "Nouvelle mise bas" → DialogMiseBas (wizard 5 étapes)
 *  3. Étape 1 (Truie & horaire) : sélectionner saillie T-003, date=aujourd'hui
 *  4. Étape 2 (Naissances) : total=13, vivants=12, morts=1, momifies=0
 *  5. Étape 3 (État portée) : poids=1.4 * 12 = 16.8 kg, ecrases=0
 *  6. Étape 4 (Truie post-MB) : observations=TEST_TAG
 *  7. Étape 5 (Récap) : confirmer
 *  8. Assertion DB : 1 mise_bas créée, statut OK
 *
 *  Puis sevrage :
 *  9. Click "Sevrage" → DialogSevrage
 * 10. Sélectionner la mise_bas qu'on vient de créer
 * 11. nb_sevres = 12, date = aujourd'hui (+ obs TEST_TAG)
 * 12. Submit
 * 13. Assertion DB : 1 sevrage créé.
 */

const TRUIE_T003 = '33333333-0000-0000-0000-000000000003'
const SAILLIE_T003 = '55555555-0000-0000-0000-000000000003'

test.describe('G1-3 — Mise bas + Sevrage', () => {
  test.beforeEach(async () => {
    cleanupTestRows()
    // Nettoyer toute mise_bas/sevrage de T-003 issue de tests antérieurs
    // (sevrages cascade via FK sur mises_bas)
    sql(`DELETE FROM sevrages WHERE mise_bas_id IN (SELECT id FROM mises_bas WHERE saillie_id='${SAILLIE_T003}')`)
    sql(`DELETE FROM mises_bas WHERE saillie_id='${SAILLIE_T003}'`)
  })

  test.afterEach(async () => {
    cleanupTestRows()
    sql(`DELETE FROM sevrages WHERE mise_bas_id IN (SELECT id FROM mises_bas WHERE saillie_id='${SAILLIE_T003}')`)
    sql(`DELETE FROM mises_bas WHERE saillie_id='${SAILLIE_T003}'`)
  })

  test('mise bas (wizard 5 étapes) puis sevrage', async ({ page }) => {
    // ─── PARTIE 1 : MISE BAS ───────────────────────────────────────────
    await page.goto('/mises-bas', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // Ouvrir DialogMiseBas
    const triggerMb = page.getByRole('button', { name: /nouvelle mise bas/i })
    await expect(triggerMb).toBeVisible({ timeout: 10_000 })
    await triggerMb.click()

    const dialog = page.locator('[data-slot="dialog-content"]')
    await expect(dialog).toBeVisible({ timeout: 8_000 })

    // Étape 1/5 : Truie & horaire
    const saillieSelect = dialog.locator('#saillie_id')
    await expect(saillieSelect).toBeVisible()
    await saillieSelect.selectOption({ value: SAILLIE_T003 })
    // date_mise_bas est déjà aujourd'hui par défaut → OK

    await dialog.getByRole('button', { name: /^suivant$/i }).click()

    // Étape 2/5 : Naissances
    await expect(dialog.locator('#nes_totaux')).toBeVisible()
    await dialog.locator('#nes_totaux').fill('13')
    await dialog.locator('#nes_vivants').fill('12')
    await dialog.locator('#nes_morts').fill('1')
    await dialog.locator('#momifies').fill('0')

    await dialog.getByRole('button', { name: /^suivant$/i }).click()

    // Étape 3/5 : État portée
    await expect(dialog.locator('#poids_portee_kg')).toBeVisible()
    // poids moyen 1.4 kg × 12 vivants = 16.8 kg
    await dialog.locator('#poids_portee_kg').fill('16.8')
    // ecrases reste 0 par défaut

    await dialog.getByRole('button', { name: /^suivant$/i }).click()

    // Étape 4/5 : Truie post-MB
    await expect(dialog.locator('#observations')).toBeVisible()
    await dialog.locator('#observations').fill(TEST_TAG + ' mise-bas')

    await dialog.getByRole('button', { name: /^suivant$/i }).click()

    // Étape 5/5 : Récap → Confirmer la mise-bas
    await dialog.getByRole('button', { name: /confirmer la mise-bas/i }).click()

    await expect(dialog).toBeHidden({ timeout: 10_000 })

    // Assertion DB : mise_bas créée
    const mbCount = sqlScalar(
      `SELECT count(*) FROM mises_bas WHERE saillie_id='${SAILLIE_T003}' AND deleted_at IS NULL`
    )
    expect(mbCount, `attendu 1 mise-bas, observé ${mbCount}`).toBe('1')

    const mbStats = sql(
      `SELECT nes_totaux, nes_vivants, nes_morts FROM mises_bas WHERE saillie_id='${SAILLIE_T003}' AND deleted_at IS NULL LIMIT 1`
    )
    expect(mbStats[0]).toEqual(['13', '12', '1'])

    // ─── PARTIE 2 : SEVRAGE ────────────────────────────────────────────
    // La page a été revalidée → on attend que le bouton Sevrage soit OK avec la nouvelle MB.
    await page.waitForTimeout(800)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    const triggerSv = page.getByRole('button', { name: /^sevrage$/i })
    await expect(triggerSv).toBeVisible({ timeout: 10_000 })
    await triggerSv.click()

    const dialogSv = page.locator('[data-slot="dialog-content"]')
    await expect(dialogSv).toBeVisible({ timeout: 8_000 })

    // Sélectionner la mise-bas qu'on vient de créer (la seule sans sevrage = T-003)
    const mbId = sqlScalar(
      `SELECT id FROM mises_bas WHERE saillie_id='${SAILLIE_T003}' AND deleted_at IS NULL LIMIT 1`
    )
    expect(mbId).not.toBeNull()

    const mbSelect = dialogSv.locator('#mise_bas_id')
    await expect(mbSelect).toBeVisible()
    await mbSelect.selectOption({ value: mbId! })

    // nb_sevres est auto-rempli avec nes_vivants (12). On force tout de même.
    await dialogSv.locator('#nb_sevres').fill('12')

    // Observations TEST_TAG
    const obsSv = dialogSv.locator('#observations')
    if (await obsSv.isVisible().catch(() => false)) {
      await obsSv.fill(TEST_TAG + ' sevrage')
    }

    // Submit
    await dialogSv.getByRole('button', { name: /^enregistrer$/i }).click()

    await expect(dialogSv).toBeHidden({ timeout: 10_000 })

    // Assertion DB : 1 sevrage créé
    const svCount = sqlScalar(
      `SELECT count(*) FROM sevrages WHERE mise_bas_id='${mbId}'`
    )
    expect(svCount, `attendu 1 sevrage, observé ${svCount}`).toBe('1')

    const nbSv = sqlScalar(
      `SELECT nb_sevres FROM sevrages WHERE mise_bas_id='${mbId}' LIMIT 1`
    )
    expect(nbSv).toBe('12')
  })
})
