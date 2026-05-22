# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-saillie-flow.spec.ts >> G1-2 — Saillie : Nouvelle saillie >> création saillie via DialogFaireMonter
- Location: tests/e2e/02-saillie-flow.spec.ts:36:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-slot="dialog-content"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-slot="dialog-content"]')

```

```yaml
- complementary:
  - img "Smart Farm"
  - text: Smart Farm Élevage porcin · Côte d'Ivoire Yamoussoukro
  - navigation:
    - text: Pilotage
    - list:
      - listitem:
        - link "Tableau de bord":
          - /url: /dashboard
        - tooltip "Tableau de bord"
      - listitem:
        - link "Alertes":
          - /url: /alertes
        - tooltip "Alertes"
      - listitem:
        - link "Performances":
          - /url: /kpi
        - tooltip "Performances"
    - text: Élevage
    - list:
      - listitem:
        - link "Cheptel":
          - /url: /cheptel
        - tooltip "Cheptel"
      - listitem:
        - link "Bandes":
          - /url: /bandes
        - tooltip "Bandes"
      - listitem:
        - link "Bâtiments":
          - /url: /batiments
        - tooltip "Bâtiments"
      - listitem:
        - link "Reproduction":
          - /url: /reproduction
        - tooltip "Reproduction"
      - listitem:
        - link "Mises bas":
          - /url: /mises-bas
        - tooltip "Mises bas"
    - text: Santé
    - list:
      - listitem:
        - link "Sanitaire":
          - /url: /sanitaire
        - tooltip "Sanitaire"
      - listitem:
        - link "PPA":
          - /url: /sanitaire/ppa
        - tooltip "PPA"
    - text: Logistique
    - list:
      - listitem:
        - link "Alimentation":
          - /url: /alimentation
        - tooltip "Alimentation"
      - listitem:
        - link "Stock":
          - /url: /stock
        - tooltip "Stock"
    - text: Système
    - list:
      - listitem:
        - link "Assistant":
          - /url: /assistant
        - tooltip "Assistant"
      - listitem:
        - link "Paramètres":
          - /url: /parametres
        - tooltip "Paramètres"
  - button "Basculer le mode haut contraste": Mode haut contraste
  - text: CL Christophe Liegeois Admin
- banner:
  - button "Ouvrir le menu"
  - img "Smart Farm"
  - text: Smart Farm
- main:
  - heading "Reproduction" [level=1]
  - paragraph: 4 montées enregistrées
  - button "Exporter CSV"
  - button "Diagnostic gestation"
  - button "Nouvelle saillie"
  - region "Historique des montées":
    - heading "Historique des montées" [level=2]
    - heading "Journal chronologique des saillies" [level=3]
    - table:
      - rowgroup:
        - row "Date Truie Verrat Méthode Rang portée Diagnostic":
          - columnheader "Date"
          - columnheader "Truie"
          - columnheader "Verrat"
          - columnheader "Méthode"
          - columnheader "Rang portée"
          - columnheader "Diagnostic"
      - rowgroup:
        - row "15/07/2026 Adjoa (T-001) — () naturelle en attente":
          - cell "15/07/2026"
          - cell "Adjoa (T-001)"
          - cell "— ()"
          - cell "naturelle"
          - cell
          - cell "en attente"
        - row "25/01/2026 Aya (T-003) Yao (V-002) naturelle 1 GESTANTE":
          - cell "25/01/2026"
          - cell "Aya (T-003)"
          - cell "Yao (V-002)"
          - cell "naturelle"
          - cell "1"
          - cell "GESTANTE"
        - row "22/01/2026 Akissi (T-002) Koffi (V-001) IA 1 GESTANTE":
          - cell "22/01/2026"
          - cell "Akissi (T-002)"
          - cell "Koffi (V-001)"
          - cell "IA"
          - cell "1"
          - cell "GESTANTE"
        - row "20/01/2026 Adjoa (T-001) Koffi (V-001) naturelle 2 GESTANTE":
          - cell "20/01/2026"
          - cell "Adjoa (T-001)"
          - cell "Koffi (V-001)"
          - cell "naturelle"
          - cell "2"
          - cell "GESTANTE"
- navigation "Navigation principale mobile":
  - link "Accueil":
    - /url: /dashboard
  - link "Cheptel":
    - /url: /cheptel
  - link "Reproduction":
    - /url: /reproduction
  - link "Alertes (10 actives)":
    - /url: /alertes
    - text: Alertes
  - button "Plus de pages": Plus
- region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | import { sql, sqlScalar, TEST_TAG, cleanupTestRows } from './_helpers'
  3  | 
  4  | /**
  5  |  * G1-2 : Saillie (Nouvelle saillie) — flux complet.
  6  |  *
  7  |  *  1. /reproduction
  8  |  *  2. Click bouton "Nouvelle saillie" → ouvre DialogFaireMonter
  9  |  *  3. Remplir : truie = T-002 (Akissi, déjà connue avoir saillie passée mais
  10 |  *     pas aujourd'hui), méthode = naturelle, date = aujourd'hui.
  11 |  *     Observation = TEST_TAG (pour cleanup).
  12 |  *  4. Submit
  13 |  *  5. Toast OU disparition du dialog + assertion DB : 1 saillie créée
  14 |  *     aujourd'hui pour T-002.
  15 |  *
  16 |  * Mode démo : pas de login.
  17 |  */
  18 | 
  19 | test.describe('G1-2 — Saillie : Nouvelle saillie', () => {
  20 |   // Truie de test : on prend T-002 pour ne pas conflict avec T-001 (saillie
  21 |   // déjà enregistrée le 2026-07-15) ni avec le test concurrent qui prendra T-003.
  22 |   const TRUIE_ID = '33333333-0000-0000-0000-000000000002'
  23 |   const TRUIE_LABEL_PREFIX = 'Akissi'
  24 | 
  25 |   test.beforeEach(async () => {
  26 |     cleanupTestRows()
  27 |     // S'assurer qu'aucune saillie n'existe déjà aujourd'hui pour cette truie
  28 |     sql(`DELETE FROM saillies WHERE truie_id='${TRUIE_ID}' AND date_saillie=CURRENT_DATE`)
  29 |   })
  30 | 
  31 |   test.afterEach(async () => {
  32 |     cleanupTestRows()
  33 |     sql(`DELETE FROM saillies WHERE truie_id='${TRUIE_ID}' AND date_saillie=CURRENT_DATE`)
  34 |   })
  35 | 
  36 |   test('création saillie via DialogFaireMonter', async ({ page }) => {
  37 |     await page.goto('/reproduction', { waitUntil: 'domcontentloaded' })
  38 |     await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  39 | 
  40 |     // 1. Ouvrir le dialog via le bouton "Nouvelle saillie"
  41 |     const trigger = page.getByRole('button', { name: /nouvelle saillie/i })
  42 |     await expect(trigger).toBeVisible({ timeout: 10_000 })
  43 |     await trigger.click()
  44 | 
  45 |     // 2. Dialog visible — sélecteur via data-slot="dialog-content" (le wrapper Radix
  46 |     //    Dialog du projet expose ce slot, cf. src/components/ui/dialog.tsx).
  47 |     //    Le role='dialog' standard ne marche pas toujours côté Playwright à cause
  48 |     //    du portal Radix + plusieurs noeuds aria-hidden parallèles (overlay + content).
  49 |     const dialog = page.locator('[data-slot="dialog-content"]')
> 50 |     await expect(dialog).toBeVisible({ timeout: 5_000 })
     |                          ^ Error: expect(locator).toBeVisible() failed
  51 | 
  52 |     // 3. Sélectionner la truie (select#truie_id) en utilisant le label visible.
  53 |     //    Le composant utilise <select> natif → .selectOption() OK.
  54 |     const truieSelect = dialog.locator('#truie_id')
  55 |     await expect(truieSelect).toBeVisible()
  56 |     await truieSelect.selectOption({ value: TRUIE_ID })
  57 | 
  58 |     // 4. Méthode = naturelle (déjà default mais on force)
  59 |     await dialog.locator('#methode').selectOption({ value: 'naturelle' })
  60 | 
  61 |     // 5. Date = aujourd'hui (déjà default mais on force via le bouton "Aujourd'hui")
  62 |     const aujBtn = dialog.getByRole('button', { name: /aujourd'?hui/i })
  63 |     if (await aujBtn.isVisible().catch(() => false)) {
  64 |       await aujBtn.click()
  65 |     }
  66 | 
  67 |     // 6. Observations = TEST_TAG pour cleanup déterministe
  68 |     const obs = dialog.locator('textarea#observations')
  69 |     if (await obs.isVisible().catch(() => false)) {
  70 |       await obs.fill(TEST_TAG)
  71 |     }
  72 | 
  73 |     // 7. Submit
  74 |     await dialog.getByRole('button', { name: /^enregistrer$/i }).click()
  75 | 
  76 |     // 8. Attendre fermeture dialog OU toast success
  77 |     await expect(dialog).toBeHidden({ timeout: 10_000 })
  78 | 
  79 |     // 9. Assertion DB : 1 saillie créée pour T-002 aujourd'hui
  80 |     const count = sqlScalar(
  81 |       `SELECT count(*) FROM saillies WHERE truie_id='${TRUIE_ID}' AND date_saillie=CURRENT_DATE AND deleted_at IS NULL`
  82 |     )
  83 |     expect(count, `attendu 1 saillie créée, observé ${count}`).toBe('1')
  84 | 
  85 |     // 10. Bonus : la méthode est bien 'naturelle'
  86 |     const methode = sqlScalar(
  87 |       `SELECT methode::text FROM saillies WHERE truie_id='${TRUIE_ID}' AND date_saillie=CURRENT_DATE AND deleted_at IS NULL LIMIT 1`
  88 |     )
  89 |     expect(methode).toBe('naturelle')
  90 | 
  91 |     // 11. Petit smoke : la table /reproduction contient bien T-002 quelque part dans la page
  92 |     //     (la revalidation a fonctionné).
  93 |     await page.waitForTimeout(500)
  94 |     await expect(page.getByText(new RegExp(TRUIE_LABEL_PREFIX, 'i')).first()).toBeVisible({
  95 |       timeout: 5_000,
  96 |     })
  97 |   })
  98 | })
  99 | 
```