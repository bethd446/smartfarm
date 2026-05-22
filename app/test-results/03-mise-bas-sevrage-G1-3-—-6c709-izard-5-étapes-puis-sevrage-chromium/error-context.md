# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-mise-bas-sevrage.spec.ts >> G1-3 — Mise bas + Sevrage >> mise bas (wizard 5 étapes) puis sevrage
- Location: tests/e2e/03-mise-bas-sevrage.spec.ts:46:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-slot="dialog-content"]')
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
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
  - heading "Mise bas & Sevrage" [level=1]
  - paragraph: 2 portées enregistrées
  - button "Exporter CSV"
  - button "Sevrage"
  - button "Nouvelle mise bas"
  - text: Historique des mises-bas (2)
  - table:
    - rowgroup:
      - row "Truie Date MB Total nés Vivants Mort-nés Momifiés Écrasés Sevrage":
        - columnheader "Truie"
        - columnheader "Date MB"
        - columnheader "Total nés"
        - columnheader "Vivants"
        - columnheader "Mort-nés"
        - columnheader "Momifiés"
        - columnheader "Écrasés"
        - columnheader "Sevrage"
    - rowgroup:
      - row "T-002 (Akissi) 15/05/2026 11 11 0 0 0 En cours":
        - cell "T-002 (Akissi)"
        - cell "15/05/2026"
        - cell "11"
        - cell "11"
        - cell "0"
        - cell "0"
        - cell "0"
        - cell "En cours"
      - row "T-001 (Adjoa) 13/05/2026 13 12 1 0 0 En cours":
        - cell "T-001 (Adjoa)"
        - cell "13/05/2026"
        - cell "13"
        - cell "12"
        - cell "1"
        - cell "0"
        - cell "0"
        - cell "En cours"
  - text: Akissi T-002 · 15/05/2026 100% vivants 11 Vivants 11 Totaux 0 Mort-nés 0 Momifiés 0 Écrasés Poids portée15.8 kg Durée210 min Adjoa T-001 · 13/05/2026 92% vivants 12 Vivants 13 Totaux 1 Mort-nés 0 Momifiés 0 Écrasés Poids portée17.5 kg Durée180 min
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
  1   | import { test, expect } from '@playwright/test'
  2   | import { sql, sqlScalar, TEST_TAG, cleanupTestRows } from './_helpers'
  3   | 
  4   | /**
  5   |  * G1-3 : Mise bas → Sevrage (flow complet en un seul test).
  6   |  *
  7   |  *  Pré-requis DB : il existe une saillie diagnostic positif sans MB pour T-003.
  8   |  *  Si quelqu'un a déjà consommé cette saillie, on recharge :
  9   |  *    - DELETE mises_bas pour T-003 saillie 2026-01-25
  10  |  *
  11  |  *  1. /mises-bas
  12  |  *  2. Click "Nouvelle mise bas" → DialogMiseBas (wizard 5 étapes)
  13  |  *  3. Étape 1 (Truie & horaire) : sélectionner saillie T-003, date=aujourd'hui
  14  |  *  4. Étape 2 (Naissances) : total=13, vivants=12, morts=1, momifies=0
  15  |  *  5. Étape 3 (État portée) : poids=1.4 * 12 = 16.8 kg, ecrases=0
  16  |  *  6. Étape 4 (Truie post-MB) : observations=TEST_TAG
  17  |  *  7. Étape 5 (Récap) : confirmer
  18  |  *  8. Assertion DB : 1 mise_bas créée, statut OK
  19  |  *
  20  |  *  Puis sevrage :
  21  |  *  9. Click "Sevrage" → DialogSevrage
  22  |  * 10. Sélectionner la mise_bas qu'on vient de créer
  23  |  * 11. nb_sevres = 12, date = aujourd'hui (+ obs TEST_TAG)
  24  |  * 12. Submit
  25  |  * 13. Assertion DB : 1 sevrage créé.
  26  |  */
  27  | 
  28  | const TRUIE_T003 = '33333333-0000-0000-0000-000000000003'
  29  | const SAILLIE_T003 = '55555555-0000-0000-0000-000000000003'
  30  | 
  31  | test.describe('G1-3 — Mise bas + Sevrage', () => {
  32  |   test.beforeEach(async () => {
  33  |     cleanupTestRows()
  34  |     // Nettoyer toute mise_bas/sevrage de T-003 issue de tests antérieurs
  35  |     // (sevrages cascade via FK sur mises_bas)
  36  |     sql(`DELETE FROM sevrages WHERE mise_bas_id IN (SELECT id FROM mises_bas WHERE saillie_id='${SAILLIE_T003}')`)
  37  |     sql(`DELETE FROM mises_bas WHERE saillie_id='${SAILLIE_T003}'`)
  38  |   })
  39  | 
  40  |   test.afterEach(async () => {
  41  |     cleanupTestRows()
  42  |     sql(`DELETE FROM sevrages WHERE mise_bas_id IN (SELECT id FROM mises_bas WHERE saillie_id='${SAILLIE_T003}')`)
  43  |     sql(`DELETE FROM mises_bas WHERE saillie_id='${SAILLIE_T003}'`)
  44  |   })
  45  | 
  46  |   test('mise bas (wizard 5 étapes) puis sevrage', async ({ page }) => {
  47  |     // ─── PARTIE 1 : MISE BAS ───────────────────────────────────────────
  48  |     await page.goto('/mises-bas', { waitUntil: 'domcontentloaded' })
  49  |     await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  50  | 
  51  |     // Ouvrir DialogMiseBas
  52  |     const triggerMb = page.getByRole('button', { name: /nouvelle mise bas/i })
  53  |     await expect(triggerMb).toBeVisible({ timeout: 10_000 })
  54  |     await triggerMb.click()
  55  | 
  56  |     const dialog = page.locator('[data-slot="dialog-content"]')
> 57  |     await expect(dialog).toBeVisible({ timeout: 8_000 })
      |                          ^ Error: expect(locator).toBeVisible() failed
  58  | 
  59  |     // Étape 1/5 : Truie & horaire
  60  |     const saillieSelect = dialog.locator('#saillie_id')
  61  |     await expect(saillieSelect).toBeVisible()
  62  |     await saillieSelect.selectOption({ value: SAILLIE_T003 })
  63  |     // date_mise_bas est déjà aujourd'hui par défaut → OK
  64  | 
  65  |     await dialog.getByRole('button', { name: /^suivant$/i }).click()
  66  | 
  67  |     // Étape 2/5 : Naissances
  68  |     await expect(dialog.locator('#nes_totaux')).toBeVisible()
  69  |     await dialog.locator('#nes_totaux').fill('13')
  70  |     await dialog.locator('#nes_vivants').fill('12')
  71  |     await dialog.locator('#nes_morts').fill('1')
  72  |     await dialog.locator('#momifies').fill('0')
  73  | 
  74  |     await dialog.getByRole('button', { name: /^suivant$/i }).click()
  75  | 
  76  |     // Étape 3/5 : État portée
  77  |     await expect(dialog.locator('#poids_portee_kg')).toBeVisible()
  78  |     // poids moyen 1.4 kg × 12 vivants = 16.8 kg
  79  |     await dialog.locator('#poids_portee_kg').fill('16.8')
  80  |     // ecrases reste 0 par défaut
  81  | 
  82  |     await dialog.getByRole('button', { name: /^suivant$/i }).click()
  83  | 
  84  |     // Étape 4/5 : Truie post-MB
  85  |     await expect(dialog.locator('#observations')).toBeVisible()
  86  |     await dialog.locator('#observations').fill(TEST_TAG + ' mise-bas')
  87  | 
  88  |     await dialog.getByRole('button', { name: /^suivant$/i }).click()
  89  | 
  90  |     // Étape 5/5 : Récap → Confirmer la mise-bas
  91  |     await dialog.getByRole('button', { name: /confirmer la mise-bas/i }).click()
  92  | 
  93  |     await expect(dialog).toBeHidden({ timeout: 10_000 })
  94  | 
  95  |     // Assertion DB : mise_bas créée
  96  |     const mbCount = sqlScalar(
  97  |       `SELECT count(*) FROM mises_bas WHERE saillie_id='${SAILLIE_T003}' AND deleted_at IS NULL`
  98  |     )
  99  |     expect(mbCount, `attendu 1 mise-bas, observé ${mbCount}`).toBe('1')
  100 | 
  101 |     const mbStats = sql(
  102 |       `SELECT nes_totaux, nes_vivants, nes_morts FROM mises_bas WHERE saillie_id='${SAILLIE_T003}' AND deleted_at IS NULL LIMIT 1`
  103 |     )
  104 |     expect(mbStats[0]).toEqual(['13', '12', '1'])
  105 | 
  106 |     // ─── PARTIE 2 : SEVRAGE ────────────────────────────────────────────
  107 |     // La page a été revalidée → on attend que le bouton Sevrage soit OK avec la nouvelle MB.
  108 |     await page.waitForTimeout(800)
  109 |     await page.reload({ waitUntil: 'domcontentloaded' })
  110 |     await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  111 | 
  112 |     const triggerSv = page.getByRole('button', { name: /^sevrage$/i })
  113 |     await expect(triggerSv).toBeVisible({ timeout: 10_000 })
  114 |     await triggerSv.click()
  115 | 
  116 |     const dialogSv = page.locator('[data-slot="dialog-content"]')
  117 |     await expect(dialogSv).toBeVisible({ timeout: 8_000 })
  118 | 
  119 |     // Sélectionner la mise-bas qu'on vient de créer (la seule sans sevrage = T-003)
  120 |     const mbId = sqlScalar(
  121 |       `SELECT id FROM mises_bas WHERE saillie_id='${SAILLIE_T003}' AND deleted_at IS NULL LIMIT 1`
  122 |     )
  123 |     expect(mbId).not.toBeNull()
  124 | 
  125 |     const mbSelect = dialogSv.locator('#mise_bas_id')
  126 |     await expect(mbSelect).toBeVisible()
  127 |     await mbSelect.selectOption({ value: mbId! })
  128 | 
  129 |     // nb_sevres est auto-rempli avec nes_vivants (12). On force tout de même.
  130 |     await dialogSv.locator('#nb_sevres').fill('12')
  131 | 
  132 |     // Observations TEST_TAG
  133 |     const obsSv = dialogSv.locator('#observations')
  134 |     if (await obsSv.isVisible().catch(() => false)) {
  135 |       await obsSv.fill(TEST_TAG + ' sevrage')
  136 |     }
  137 | 
  138 |     // Submit
  139 |     await dialogSv.getByRole('button', { name: /^enregistrer$/i }).click()
  140 | 
  141 |     await expect(dialogSv).toBeHidden({ timeout: 10_000 })
  142 | 
  143 |     // Assertion DB : 1 sevrage créé
  144 |     const svCount = sqlScalar(
  145 |       `SELECT count(*) FROM sevrages WHERE mise_bas_id='${mbId}'`
  146 |     )
  147 |     expect(svCount, `attendu 1 sevrage, observé ${svCount}`).toBe('1')
  148 | 
  149 |     const nbSv = sqlScalar(
  150 |       `SELECT nb_sevres FROM sevrages WHERE mise_bas_id='${mbId}' LIMIT 1`
  151 |     )
  152 |     expect(nbSv).toBe('12')
  153 |   })
  154 | })
  155 | 
```