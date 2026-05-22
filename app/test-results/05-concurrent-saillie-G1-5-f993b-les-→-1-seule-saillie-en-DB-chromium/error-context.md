# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-concurrent-saillie.spec.ts >> G1-5 — Concurrence saillie (CRITIQUE F2 UNIQUE bout-en-bout) >> 2 sessions parallèles → 1 seule saillie en DB
- Location: tests/e2e/05-concurrent-saillie.spec.ts:41:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog')

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
  1   | import { test, expect, chromium } from '@playwright/test'
  2   | import { sql, sqlScalar, TEST_TAG, cleanupTestRows } from './_helpers'
  3   | 
  4   | /**
  5   |  * G1-5 : CRITIQUE — Test de concurrence saillie.
  6   |  *
  7   |  *  Objectif : valider que la contrainte UNIQUE F2
  8   |  *    idx_saillies_unique_truie_date_active (truie_id, date_saillie)
  9   |  *      WHERE deleted_at IS NULL
  10  |  *  fonctionne bout en bout (UI → Server Action → DB), pas seulement en SQL pur.
  11  |  *
  12  |  *  Scénario :
  13  |  *   - 2 BrowserContext en parallèle (2 onglets/sessions).
  14  |  *   - Chacun ouvre /reproduction → DialogFaireMonter → remplit la MÊME truie
  15  |  *     (T-001 Adjoa) avec la MÊME date (aujourd'hui) avec une idempotency_key
  16  |  *     différente (UUID généré à chaque ouverture du dialog).
  17  |  *   - On soumet les deux en quasi-simultané (Promise.all).
  18  |  *   - Attendu : exactement 1 saillie active en DB pour (T-001, today),
  19  |  *     l'autre Server Action retourne {ok:false, error:'Saillie déjà enregistrée...'}.
  20  |  *
  21  |  *  Pourquoi idempotency_key différente : on veut tester le CONFLIT MÉTIER
  22  |  *  (même truie même jour), PAS le replay idempotent (même idempotency_key).
  23  |  *  Le replay idempotent retourne {ok:true, dedup:true} → ce n'est pas le cas testé ici.
  24  |  *
  25  |  *  Cleanup : DELETE toutes les saillies de T-001 du jour avant ET après.
  26  |  */
  27  | 
  28  | const TRUIE_T001 = '33333333-0000-0000-0000-000000000001'
  29  | 
  30  | test.describe('G1-5 — Concurrence saillie (CRITIQUE F2 UNIQUE bout-en-bout)', () => {
  31  |   test.beforeEach(async () => {
  32  |     cleanupTestRows()
  33  |     sql(`DELETE FROM saillies WHERE truie_id='${TRUIE_T001}' AND date_saillie=CURRENT_DATE`)
  34  |   })
  35  | 
  36  |   test.afterEach(async () => {
  37  |     cleanupTestRows()
  38  |     sql(`DELETE FROM saillies WHERE truie_id='${TRUIE_T001}' AND date_saillie=CURRENT_DATE`)
  39  |   })
  40  | 
  41  |   test('2 sessions parallèles → 1 seule saillie en DB', async () => {
  42  |     // On crée explicitement 2 navigateurs distincts (isolation totale)
  43  |     const browser = await chromium.launch({ headless: true })
  44  | 
  45  |     try {
  46  |       const ctxA = await browser.newContext()
  47  |       const ctxB = await browser.newContext()
  48  |       const pageA = await ctxA.newPage()
  49  |       const pageB = await ctxB.newPage()
  50  | 
  51  |       // Vérification initiale : 0 saillie pour T-001 aujourd'hui.
  52  |       const initialCount = sqlScalar(
  53  |         `SELECT count(*) FROM saillies WHERE truie_id='${TRUIE_T001}' AND date_saillie=CURRENT_DATE AND deleted_at IS NULL`
  54  |       )
  55  |       expect(initialCount).toBe('0')
  56  | 
  57  |       // Helper : préparer un dialog rempli pour la même truie, prêt à submit.
  58  |       async function prepareDialog(page: typeof pageA, marker: string) {
  59  |         await page.goto('/reproduction', { waitUntil: 'domcontentloaded' })
  60  |         await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  61  | 
  62  |         await page.getByRole('button', { name: /nouvelle saillie/i }).click()
  63  | 
  64  |         const dialog = page.getByRole('dialog')
> 65  |         await expect(dialog).toBeVisible({ timeout: 5_000 })
      |                              ^ Error: expect(locator).toBeVisible() failed
  66  | 
  67  |         await dialog.locator('#truie_id').selectOption({ value: TRUIE_T001 })
  68  |         await dialog.locator('#methode').selectOption({ value: 'naturelle' })
  69  | 
  70  |         // Forcer la date à aujourd'hui via le bouton dédié
  71  |         const aujBtn = dialog.getByRole('button', { name: /aujourd'?hui/i })
  72  |         if (await aujBtn.isVisible().catch(() => false)) {
  73  |           await aujBtn.click()
  74  |         }
  75  | 
  76  |         // Marqueur d'observation pour distinguer A et B en cas de besoin
  77  |         const obs = dialog.locator('textarea#observations')
  78  |         if (await obs.isVisible().catch(() => false)) {
  79  |           await obs.fill(`${TEST_TAG} ${marker}`)
  80  |         }
  81  | 
  82  |         return dialog
  83  |       }
  84  | 
  85  |       const [dialogA, dialogB] = await Promise.all([
  86  |         prepareDialog(pageA, 'A'),
  87  |         prepareDialog(pageB, 'B'),
  88  |       ])
  89  | 
  90  |       // Submit en parallèle
  91  |       const [respA, respB] = await Promise.all([
  92  |         dialogA.getByRole('button', { name: /^enregistrer$/i }).click().then(() => 'A_clicked'),
  93  |         dialogB.getByRole('button', { name: /^enregistrer$/i }).click().then(() => 'B_clicked'),
  94  |       ])
  95  | 
  96  |       expect([respA, respB]).toEqual(expect.arrayContaining(['A_clicked', 'B_clicked']))
  97  | 
  98  |       // Attendre la résolution côté serveur : soit dialog fermé (succès), soit
  99  |       // toast d'erreur (rejet). On attend simplement un peu de temps réseau.
  100 |       await pageA.waitForTimeout(2500)
  101 |       await pageB.waitForTimeout(500)
  102 | 
  103 |       // ASSERTION CRITIQUE : exactement 1 saillie active en DB pour T-001 aujourd'hui.
  104 |       const finalCount = sqlScalar(
  105 |         `SELECT count(*) FROM saillies WHERE truie_id='${TRUIE_T001}' AND date_saillie=CURRENT_DATE AND deleted_at IS NULL`
  106 |       )
  107 | 
  108 |       // Si > 1 → la contrainte UNIQUE ne fonctionne pas bout en bout = bug critique F2.
  109 |       // Si 0   → les 2 ont échoué pour une raison non liée à la contrainte = autre bug.
  110 |       expect(
  111 |         finalCount,
  112 |         `F2 UNIQUE BUG : attendu 1 saillie créée (contrainte UNIQUE qui rejette la 2e), observé ${finalCount}`
  113 |       ).toBe('1')
  114 | 
  115 |       // On vérifie aussi qu'un seul des 2 dialogs s'est bien fermé,
  116 |       // et que l'autre a affiché une erreur (toast Sonner).
  117 |       // NB : selon le timing, les 2 dialogs peuvent rester ouverts si l'erreur est
  118 |       // gérée côté action sans fermer. On reste tolérant : l'invariant DB suffit.
  119 | 
  120 |       // Bonus : vérifier que les 2 tentatives ont bien atteint le serveur
  121 |       // (au moins l'une des deux dialogs n'est plus en état "Enregistrement…").
  122 |       // (Pas d'assertion stricte ici — l'invariant DB est l'oracle.)
  123 | 
  124 |       // Vérification anti-faux-positif : aucun row supprimé en flagrant délit
  125 |       const anyRow = sqlScalar(
  126 |         `SELECT count(*) FROM saillies WHERE truie_id='${TRUIE_T001}' AND date_saillie=CURRENT_DATE`
  127 |       )
  128 |       expect(anyRow).toBe('1')
  129 | 
  130 |       await ctxA.close()
  131 |       await ctxB.close()
  132 |     } finally {
  133 |       await browser.close()
  134 |     }
  135 |   })
  136 | })
  137 | 
```