import { test, expect, chromium } from '@playwright/test'
import { sql, sqlScalar, TEST_TAG, cleanupTestRows } from './_helpers'

/**
 * G1-5 : CRITIQUE — Test de concurrence saillie.
 *
 *  Objectif : valider que la contrainte UNIQUE F2
 *    idx_saillies_unique_truie_date_active (truie_id, date_saillie)
 *      WHERE deleted_at IS NULL
 *  fonctionne bout en bout (UI → Server Action → DB), pas seulement en SQL pur.
 *
 *  Scénario :
 *   - 2 BrowserContext en parallèle (2 onglets/sessions).
 *   - Chacun ouvre /reproduction → DialogFaireMonter → remplit la MÊME truie
 *     (T-001 Adjoa) avec la MÊME date (aujourd'hui) avec une idempotency_key
 *     différente (UUID généré à chaque ouverture du dialog).
 *   - On soumet les deux en quasi-simultané (Promise.all).
 *   - Attendu : exactement 1 saillie active en DB pour (T-001, today),
 *     l'autre Server Action retourne {ok:false, error:'Saillie déjà enregistrée...'}.
 *
 *  Pourquoi idempotency_key différente : on veut tester le CONFLIT MÉTIER
 *  (même truie même jour), PAS le replay idempotent (même idempotency_key).
 *  Le replay idempotent retourne {ok:true, dedup:true} → ce n'est pas le cas testé ici.
 *
 *  Cleanup : DELETE toutes les saillies de T-001 du jour avant ET après.
 */

const TRUIE_T001 = '33333333-0000-0000-0000-000000000001'

test.describe('G1-5 — Concurrence saillie (CRITIQUE F2 UNIQUE bout-en-bout)', () => {
  test.beforeEach(async () => {
    cleanupTestRows()
    sql(`DELETE FROM saillies WHERE truie_id='${TRUIE_T001}' AND date_saillie=CURRENT_DATE`)
  })

  test.afterEach(async () => {
    cleanupTestRows()
    sql(`DELETE FROM saillies WHERE truie_id='${TRUIE_T001}' AND date_saillie=CURRENT_DATE`)
  })

  test('2 sessions parallèles → 1 seule saillie en DB', async () => {
    // On crée explicitement 2 navigateurs distincts (isolation totale)
    const browser = await chromium.launch({ headless: true })

    try {
      const ctxA = await browser.newContext()
      const ctxB = await browser.newContext()
      const pageA = await ctxA.newPage()
      const pageB = await ctxB.newPage()

      // Vérification initiale : 0 saillie pour T-001 aujourd'hui.
      const initialCount = sqlScalar(
        `SELECT count(*) FROM saillies WHERE truie_id='${TRUIE_T001}' AND date_saillie=CURRENT_DATE AND deleted_at IS NULL`
      )
      expect(initialCount).toBe('0')

      // Helper : préparer un dialog rempli pour la même truie, prêt à submit.
      async function prepareDialog(page: typeof pageA, marker: string) {
        await page.goto('/reproduction', { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

        await page.getByRole('button', { name: /nouvelle saillie/i }).click()

        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible({ timeout: 5_000 })

        await dialog.locator('#truie_id').selectOption({ value: TRUIE_T001 })
        await dialog.locator('#methode').selectOption({ value: 'naturelle' })

        // Forcer la date à aujourd'hui via le bouton dédié
        const aujBtn = dialog.getByRole('button', { name: /aujourd'?hui/i })
        if (await aujBtn.isVisible().catch(() => false)) {
          await aujBtn.click()
        }

        // Marqueur d'observation pour distinguer A et B en cas de besoin
        const obs = dialog.locator('textarea#observations')
        if (await obs.isVisible().catch(() => false)) {
          await obs.fill(`${TEST_TAG} ${marker}`)
        }

        return dialog
      }

      const [dialogA, dialogB] = await Promise.all([
        prepareDialog(pageA, 'A'),
        prepareDialog(pageB, 'B'),
      ])

      // Submit en parallèle
      const [respA, respB] = await Promise.all([
        dialogA.getByRole('button', { name: /^enregistrer$/i }).click().then(() => 'A_clicked'),
        dialogB.getByRole('button', { name: /^enregistrer$/i }).click().then(() => 'B_clicked'),
      ])

      expect([respA, respB]).toEqual(expect.arrayContaining(['A_clicked', 'B_clicked']))

      // Attendre la résolution côté serveur : soit dialog fermé (succès), soit
      // toast d'erreur (rejet). On attend simplement un peu de temps réseau.
      await pageA.waitForTimeout(2500)
      await pageB.waitForTimeout(500)

      // ASSERTION CRITIQUE : exactement 1 saillie active en DB pour T-001 aujourd'hui.
      const finalCount = sqlScalar(
        `SELECT count(*) FROM saillies WHERE truie_id='${TRUIE_T001}' AND date_saillie=CURRENT_DATE AND deleted_at IS NULL`
      )

      // Si > 1 → la contrainte UNIQUE ne fonctionne pas bout en bout = bug critique F2.
      // Si 0   → les 2 ont échoué pour une raison non liée à la contrainte = autre bug.
      expect(
        finalCount,
        `F2 UNIQUE BUG : attendu 1 saillie créée (contrainte UNIQUE qui rejette la 2e), observé ${finalCount}`
      ).toBe('1')

      // On vérifie aussi qu'un seul des 2 dialogs s'est bien fermé,
      // et que l'autre a affiché une erreur (toast Sonner).
      // NB : selon le timing, les 2 dialogs peuvent rester ouverts si l'erreur est
      // gérée côté action sans fermer. On reste tolérant : l'invariant DB suffit.

      // Bonus : vérifier que les 2 tentatives ont bien atteint le serveur
      // (au moins l'une des deux dialogs n'est plus en état "Enregistrement…").
      // (Pas d'assertion stricte ici — l'invariant DB est l'oracle.)

      // Vérification anti-faux-positif : aucun row supprimé en flagrant délit
      const anyRow = sqlScalar(
        `SELECT count(*) FROM saillies WHERE truie_id='${TRUIE_T001}' AND date_saillie=CURRENT_DATE`
      )
      expect(anyRow).toBe('1')

      await ctxA.close()
      await ctxB.close()
    } finally {
      await browser.close()
    }
  })
})
