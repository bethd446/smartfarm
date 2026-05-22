# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-mortalite.spec.ts >> G1-4 — Mortalité (depuis /cheptel/[id]) >> déclarer une perte → animal.statut=mort
- Location: tests/e2e/04-mortalite.spec.ts:46:7

# Error details

```
Error: BUG WAVE 3 : aucun bouton "Mortalité/Décès/Perte" sur /cheptel/[id]. DialogNouvellePerte est défini dans src/app/(app)/sanitaire/_dialogs-sanitaire.tsx mais jamais importé/utilisé. Actions rapides actuelles : Peser, Vacciner, Soigner.

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - img "Smart Farm" [ref=e6]
        - generic [ref=e7]:
          - generic [ref=e8]: Smart Farm
          - generic [ref=e9]: Élevage porcin · Côte d'Ivoire
          - generic [ref=e10]: Yamoussoukro 🇨🇮
      - navigation [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: Pilotage
          - list [ref=e14]:
            - listitem [ref=e15]:
              - link "Tableau de bord" [ref=e16] [cursor=pointer]:
                - /url: /dashboard
                - img [ref=e17]
                - text: Tableau de bord
              - tooltip "Tableau de bord" [ref=e22]
            - listitem [ref=e23]:
              - link "Alertes" [ref=e24] [cursor=pointer]:
                - /url: /alertes
                - img [ref=e25]
                - text: Alertes
              - tooltip "Alertes" [ref=e28]
            - listitem [ref=e29]:
              - link "Performances" [ref=e30] [cursor=pointer]:
                - /url: /kpi
                - img [ref=e31]
                - text: Performances
              - tooltip "Performances" [ref=e34]
        - generic [ref=e35]:
          - generic [ref=e36]: Élevage
          - list [ref=e37]:
            - listitem [ref=e38]:
              - link "Cheptel" [ref=e39] [cursor=pointer]:
                - /url: /cheptel
                - img [ref=e40]
                - text: Cheptel
              - tooltip "Cheptel" [ref=e43]
            - listitem [ref=e44]:
              - link "Bandes" [ref=e45] [cursor=pointer]:
                - /url: /bandes
                - img [ref=e46]
                - text: Bandes
              - tooltip "Bandes" [ref=e50]
            - listitem [ref=e51]:
              - link "Bâtiments" [ref=e52] [cursor=pointer]:
                - /url: /batiments
                - img [ref=e53]
                - text: Bâtiments
              - tooltip "Bâtiments" [ref=e57]
            - listitem [ref=e58]:
              - link "Reproduction" [ref=e59] [cursor=pointer]:
                - /url: /reproduction
                - img [ref=e60]
                - text: Reproduction
              - tooltip "Reproduction" [ref=e62]
            - listitem [ref=e63]:
              - link "Mises bas" [ref=e64] [cursor=pointer]:
                - /url: /mises-bas
                - img [ref=e65]
                - text: Mises bas
              - tooltip "Mises bas" [ref=e68]
        - generic [ref=e69]:
          - generic [ref=e70]: Santé
          - list [ref=e71]:
            - listitem [ref=e72]:
              - link "Sanitaire" [ref=e73] [cursor=pointer]:
                - /url: /sanitaire
                - img [ref=e74]
                - text: Sanitaire
              - tooltip "Sanitaire" [ref=e78]
            - listitem [ref=e79]:
              - link "PPA" [ref=e80] [cursor=pointer]:
                - /url: /sanitaire/ppa
                - img [ref=e81]
                - text: PPA
              - tooltip "PPA" [ref=e83]
        - generic [ref=e84]:
          - generic [ref=e85]: Logistique
          - list [ref=e86]:
            - listitem [ref=e87]:
              - link "Alimentation" [ref=e88] [cursor=pointer]:
                - /url: /alimentation
                - img [ref=e89]
                - text: Alimentation
              - tooltip "Alimentation" [ref=e98]
            - listitem [ref=e99]:
              - link "Stock" [ref=e100] [cursor=pointer]:
                - /url: /stock
                - img [ref=e101]
                - text: Stock
              - tooltip "Stock" [ref=e105]
        - generic [ref=e106]:
          - generic [ref=e107]: Système
          - list [ref=e108]:
            - listitem [ref=e109]:
              - link "Assistant" [ref=e110] [cursor=pointer]:
                - /url: /assistant
                - img [ref=e111]
                - text: Assistant
              - tooltip "Assistant" [ref=e114]
            - listitem [ref=e115]:
              - link "Paramètres" [ref=e116] [cursor=pointer]:
                - /url: /parametres
                - img [ref=e117]
                - text: Paramètres
              - tooltip "Paramètres" [ref=e120]
      - generic [ref=e121]:
        - button "Basculer le mode haut contraste" [ref=e122]:
          - img [ref=e123]
          - text: Mode haut contraste
        - generic [ref=e126]:
          - generic [ref=e127]: CL
          - generic [ref=e128]:
            - generic [ref=e129]: Christophe Liegeois
            - generic [ref=e130]: Admin
    - generic [ref=e131]:
      - banner [ref=e132]:
        - button "Ouvrir le menu" [ref=e133]:
          - img [ref=e134]
        - generic [ref=e135]:
          - img "Smart Farm" [ref=e137]
          - generic [ref=e138]: Smart Farm
      - main [ref=e139]:
        - generic [ref=e141]:
          - generic [ref=e142]:
            - link "Retour au cheptel" [ref=e144] [cursor=pointer]:
              - /url: /cheptel
              - img [ref=e145]
              - text: Retour au cheptel
            - generic [ref=e147]:
              - generic [ref=e148]:
                - generic [ref=e149]:
                  - generic "Photo de l'animal" [ref=e150]:
                    - generic [ref=e151]:
                      - img [ref=e152]
                      - text: Aucune photo
                  - button "Sélectionner une photo" [ref=e155]
                  - button "Ajouter une photo" [ref=e156]:
                    - img [ref=e157]
                    - text: Ajouter une photo
                - generic [ref=e160]:
                  - heading "P-002" [level=1] [ref=e161]:
                    - img [ref=e162]
                    - text: P-002
                  - generic [ref=e165]: ♀ Femelleengraissementactif
                  - paragraph [ref=e166]: — · 24sem
              - generic [ref=e167]:
                - link "Peser" [ref=e168] [cursor=pointer]:
                  - /url: /pesees?action=new&animal_id=33333333-0000-0000-0000-100000000002
                  - button "Peser" [ref=e169]:
                    - img [ref=e170]
                    - text: Peser
                - link "Vacciner" [ref=e174] [cursor=pointer]:
                  - /url: /sanitaire?action=vacciner&animal_id=33333333-0000-0000-0000-100000000002
                  - button "Vacciner" [ref=e175]:
                    - img [ref=e176]
                    - text: Vacciner
                - link "Soigner" [ref=e178] [cursor=pointer]:
                  - /url: /sanitaire?action=soigner&animal_id=33333333-0000-0000-0000-100000000002
                  - button "Soigner" [ref=e179]:
                    - img [ref=e180]
                    - text: Soigner
          - generic [ref=e184]:
            - generic [ref=e187]:
              - generic [ref=e188]: Poids actuel
              - generic [ref=e189]: 102.22kg
            - generic [ref=e192]:
              - generic [ref=e193]: Pesées
              - generic [ref=e194]: 0pesée
          - generic [ref=e195]:
            - generic [ref=e197]: Identification rapide
            - generic [ref=e199]:
              - generic [ref=e200]:
                - img [ref=e201]
                - code [ref=e207]: P-002
              - generic [ref=e208]:
                - paragraph [ref=e209]:
                  - text: "Tag :"
                  - code [ref=e210]: P-002
                - paragraph [ref=e211]:
                  - text: Scanner cette boucle d'oreille avec un lecteur code-barres (ou QR) pour identifier l'animal lors d'une intervention terrain. Le scanner intégré
                  - code [ref=e212]: <BarcodeScanner>
                  - text: peut être branché sur les écrans de saisie pour ouvrir cette fiche automatiquement.
          - generic [ref=e213]:
            - generic [ref=e214]:
              - button "Pesées" [ref=e215]
              - button "Santé" [ref=e216]
              - button "Mouvements" [ref=e217]
            - generic [ref=e218]:
              - generic [ref=e220]: Pesées
              - paragraph [ref=e222]: Historique des pesées — à venir (animal 33333333…).
    - navigation "Navigation principale mobile" [ref=e223]:
      - link "Accueil" [ref=e224] [cursor=pointer]:
        - /url: /dashboard
        - img [ref=e226]
        - text: Accueil
      - link "Cheptel" [ref=e231] [cursor=pointer]:
        - /url: /cheptel
        - img [ref=e233]
        - text: Cheptel
      - link "Reproduction" [ref=e236] [cursor=pointer]:
        - /url: /reproduction
        - img [ref=e238]
        - text: Reproduction
      - link "Alertes (10 actives)" [ref=e240] [cursor=pointer]:
        - /url: /alertes
        - generic [ref=e241]:
          - img [ref=e242]
          - text: "10"
        - text: Alertes
      - button "Plus de pages" [ref=e245]:
        - img [ref=e246]
        - text: Plus
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import { sql, sqlScalar, TEST_TAG, cleanupTestRows } from './_helpers'
  3   | 
  4   | /**
  5   |  * G1-4 : Mortalité d'un animal.
  6   |  *
  7   |  *  Spec demandée :
  8   |  *   1. Goto /cheptel/[id]
  9   |  *   2. Click "Mortalité"
  10  |  *   3. Form cause + date
  11  |  *   4. Submit → vérifier animal.statut='mort'
  12  |  *
  13  |  *  Observation au moment du test :
  14  |  *   - Le composant DialogNouvellePerte existe dans
  15  |  *     src/app/(app)/sanitaire/_dialogs-sanitaire.tsx
  16  |  *   - Mais il n'est IMPORTÉ NULLE PART :
  17  |  *       $ grep -rn "DialogNouvellePerte" src/  →  1 ligne (la définition)
  18  |  *   - La page /cheptel/[id] expose en actions rapides : Peser, Vacciner, Soigner
  19  |  *     mais PAS "Mortalité" / "Marquer mort" (commentaire ligne 26 mentionne
  20  |  *     "Marquer mort" comme TODO).
  21  |  *
  22  |  *  Décision (règle dure : NE PAS modifier code app) :
  23  |  *   - On EXÉCUTE le scénario complet attendu.
  24  |  *   - Le test va échouer sur l'absence du bouton → c'est le BUG à fixer Wave 3.
  25  |  *   - On fait quand même un fallback "soft-skip" pour ne pas faire planter
  26  |  *     toute la suite : on log le bug et on FAIL explicite avec un message clair.
  27  |  */
  28  | 
  29  | const ANIMAL_TEST = '33333333-0000-0000-0000-100000000002' // P-002, F, engraissement, actif
  30  | 
  31  | test.describe('G1-4 — Mortalité (depuis /cheptel/[id])', () => {
  32  |   test.beforeEach(async () => {
  33  |     cleanupTestRows()
  34  |     // S'assurer que l'animal est bien 'actif' (au cas où un test précédent l'aurait
  35  |     // fait passer en 'mort').
  36  |     sql(`UPDATE animaux SET statut='actif' WHERE id='${ANIMAL_TEST}'`)
  37  |     sql(`DELETE FROM mortalites WHERE animal_id='${ANIMAL_TEST}'`)
  38  |   })
  39  | 
  40  |   test.afterEach(async () => {
  41  |     cleanupTestRows()
  42  |     sql(`UPDATE animaux SET statut='actif' WHERE id='${ANIMAL_TEST}'`)
  43  |     sql(`DELETE FROM mortalites WHERE animal_id='${ANIMAL_TEST}'`)
  44  |   })
  45  | 
  46  |   test('déclarer une perte → animal.statut=mort', async ({ page }) => {
  47  |     await page.goto(`/cheptel/${ANIMAL_TEST}`, { waitUntil: 'domcontentloaded' })
  48  |     await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  49  | 
  50  |     // H1 doit contenir le tag de l'animal.
  51  |     await expect(page.locator('h1').first()).toBeVisible()
  52  | 
  53  |     // Chercher un bouton/lien "Mortalité" OU "Marquer mort" OU "Décès" OU "Perte".
  54  |     const mortBtn = page
  55  |       .getByRole('button', { name: /mortalit|marquer mort|décès|perte/i })
  56  |       .or(page.getByRole('link', { name: /mortalit|marquer mort|décès|perte/i }))
  57  |       .first()
  58  | 
  59  |     // Si introuvable → diagnose et fail explicite.
  60  |     const found = await mortBtn.isVisible().catch(() => false)
  61  |     expect(
  62  |       found,
  63  |       'BUG WAVE 3 : aucun bouton "Mortalité/Décès/Perte" sur /cheptel/[id]. ' +
  64  |         'DialogNouvellePerte est défini dans src/app/(app)/sanitaire/_dialogs-sanitaire.tsx ' +
  65  |         'mais jamais importé/utilisé. Actions rapides actuelles : Peser, Vacciner, Soigner.'
> 66  |     ).toBe(true)
      |       ^ Error: BUG WAVE 3 : aucun bouton "Mortalité/Décès/Perte" sur /cheptel/[id]. DialogNouvellePerte est défini dans src/app/(app)/sanitaire/_dialogs-sanitaire.tsx mais jamais importé/utilisé. Actions rapides actuelles : Peser, Vacciner, Soigner.
  67  | 
  68  |     // Si on est arrivé jusqu'ici (bouton trouvé), continuer le flow nominal.
  69  |     await mortBtn.click()
  70  | 
  71  |     const dialog = page.locator('[data-slot="dialog-content"]')
  72  |     await expect(dialog).toBeVisible({ timeout: 5_000 })
  73  | 
  74  |     // Cause : remplir un champ texte "cause" (cohérent avec schemaPerte).
  75  |     const causeInput = dialog.locator('#cause, input[name="cause"], textarea[name="cause"]').first()
  76  |     if (await causeInput.isVisible().catch(() => false)) {
  77  |       await causeInput.fill('cause_e2e_test')
  78  |     }
  79  | 
  80  |     // Observations TEST_TAG
  81  |     const obs = dialog.locator('#observations, textarea[name="observations"]').first()
  82  |     if (await obs.isVisible().catch(() => false)) {
  83  |       await obs.fill(TEST_TAG)
  84  |     }
  85  | 
  86  |     // Submit
  87  |     await dialog.getByRole('button', { name: /enregistrer|confirmer|valider/i }).click()
  88  | 
  89  |     await expect(dialog).toBeHidden({ timeout: 10_000 })
  90  | 
  91  |     // Assertion DB : mortalité créée + animal.statut='mort'
  92  |     const mortCount = sqlScalar(
  93  |       `SELECT count(*) FROM mortalites WHERE animal_id='${ANIMAL_TEST}'`
  94  |     )
  95  |     expect(mortCount).toBe('1')
  96  | 
  97  |     const statut = sqlScalar(`SELECT statut::text FROM animaux WHERE id='${ANIMAL_TEST}'`)
  98  |     expect(statut).toBe('mort')
  99  |   })
  100 | })
  101 | 
```