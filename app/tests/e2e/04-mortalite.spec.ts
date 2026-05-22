import { test, expect } from '@playwright/test'
import { sql, sqlScalar, TEST_TAG, cleanupTestRows } from './_helpers'

/**
 * G1-4 : Mortalité d'un animal.
 *
 *  Spec demandée :
 *   1. Goto /cheptel/[id]
 *   2. Click "Mortalité"
 *   3. Form cause + date
 *   4. Submit → vérifier animal.statut='mort'
 *
 *  Observation au moment du test :
 *   - Le composant DialogNouvellePerte existe dans
 *     src/app/(app)/sanitaire/_dialogs-sanitaire.tsx
 *   - Mais il n'est IMPORTÉ NULLE PART :
 *       $ grep -rn "DialogNouvellePerte" src/  →  1 ligne (la définition)
 *   - La page /cheptel/[id] expose en actions rapides : Peser, Vacciner, Soigner
 *     mais PAS "Mortalité" / "Marquer mort" (commentaire ligne 26 mentionne
 *     "Marquer mort" comme TODO).
 *
 *  Décision (règle dure : NE PAS modifier code app) :
 *   - On EXÉCUTE le scénario complet attendu.
 *   - Le test va échouer sur l'absence du bouton → c'est le BUG à fixer Wave 3.
 *   - On fait quand même un fallback "soft-skip" pour ne pas faire planter
 *     toute la suite : on log le bug et on FAIL explicite avec un message clair.
 */

const ANIMAL_TEST = '33333333-0000-0000-0000-100000000002' // P-002, F, engraissement, actif

test.describe('G1-4 — Mortalité (depuis /cheptel/[id])', () => {
  test.beforeEach(async () => {
    cleanupTestRows()
    // S'assurer que l'animal est bien 'actif' (au cas où un test précédent l'aurait
    // fait passer en 'mort').
    sql(`UPDATE animaux SET statut='actif' WHERE id='${ANIMAL_TEST}'`)
    sql(`DELETE FROM mortalites WHERE animal_id='${ANIMAL_TEST}'`)
  })

  test.afterEach(async () => {
    cleanupTestRows()
    sql(`UPDATE animaux SET statut='actif' WHERE id='${ANIMAL_TEST}'`)
    sql(`DELETE FROM mortalites WHERE animal_id='${ANIMAL_TEST}'`)
  })

  test('déclarer une perte → animal.statut=mort', async ({ page }) => {
    await page.goto(`/cheptel/${ANIMAL_TEST}`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // H1 doit contenir le tag de l'animal.
    await expect(page.locator('h1').first()).toBeVisible()

    // Chercher un bouton/lien "Mortalité" OU "Marquer mort" OU "Décès" OU "Perte".
    const mortBtn = page
      .getByRole('button', { name: /mortalit|marquer mort|décès|perte/i })
      .or(page.getByRole('link', { name: /mortalit|marquer mort|décès|perte/i }))
      .first()

    // Si introuvable → diagnose et fail explicite.
    const found = await mortBtn.isVisible().catch(() => false)
    expect(
      found,
      'BUG WAVE 3 : aucun bouton "Mortalité/Décès/Perte" sur /cheptel/[id]. ' +
        'DialogNouvellePerte est défini dans src/app/(app)/sanitaire/_dialogs-sanitaire.tsx ' +
        'mais jamais importé/utilisé. Actions rapides actuelles : Peser, Vacciner, Soigner.'
    ).toBe(true)

    // Si on est arrivé jusqu'ici (bouton trouvé), continuer le flow nominal.
    await mortBtn.click()

    const dialog = page.locator('[data-slot="dialog-content"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Cause : remplir un champ texte "cause" (cohérent avec schemaPerte).
    const causeInput = dialog.locator('#cause, input[name="cause"], textarea[name="cause"]').first()
    if (await causeInput.isVisible().catch(() => false)) {
      await causeInput.fill('cause_e2e_test')
    }

    // Observations TEST_TAG
    const obs = dialog.locator('#observations, textarea[name="observations"]').first()
    if (await obs.isVisible().catch(() => false)) {
      await obs.fill(TEST_TAG)
    }

    // Submit
    await dialog.getByRole('button', { name: /enregistrer|confirmer|valider/i }).click()

    await expect(dialog).toBeHidden({ timeout: 10_000 })

    // Assertion DB : mortalité créée + animal.statut='mort'
    const mortCount = sqlScalar(
      `SELECT count(*) FROM mortalites WHERE animal_id='${ANIMAL_TEST}'`
    )
    expect(mortCount).toBe('1')

    const statut = sqlScalar(`SELECT statut::text FROM animaux WHERE id='${ANIMAL_TEST}'`)
    expect(statut).toBe('mort')
  })
})
