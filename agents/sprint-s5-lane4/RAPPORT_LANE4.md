# LANE 4 — Alimentation Smart Farm — RAPPORT (2026-05-25)

## FAIT — 7 fichiers modifiés

| Fichier | Δ lignes | Nature |
|---|---|---|
| `app/src/app/(app)/alimentation/plans/_schemas.ts` | ~5 | rename `type_aliment_id` → `formule_id` |
| `app/src/app/(app)/alimentation/plans/_actions.ts` | ~40 | rename + getFermeId() à l'insert + try/catch + console.error |
| `app/src/app/(app)/alimentation/plans/_dialog-plan.tsx` | ~15 | prop `typesAliment` → `formules`, champ formule_id |
| `app/src/app/(app)/alimentation/plans/page.tsx` | ~140 (refonte) | query `formules` (pas `types_aliment`), loadPageData try/catch global, EmptyState a11y |
| `app/src/app/(app)/alimentation/consommations/page.tsx` | ~22 | EmptyState a11y au lieu de `error.message` brut |
| `app/src/app/(app)/alimentation/matieres/page.tsx` | ~22 | idem |
| `app/src/app/(app)/alimentation/concentres/page.tsx` | ~22 | idem |
| `app/src/app/(app)/alimentation/_components/nutrition-stats.tsx` | ~40 | Fix #3 stock critique (<7j → rouge + badge + role=alert) |

## CAUSE RACINE bug `/alimentation/plans`

**PostgREST error** : `Could not find a relationship between 'plans_alimentation' and 'type_aliment_id' in the schema cache`.

**Cause** : mismatch schéma → code.

Schéma BDD réel (migration `20260523150000_phase_a2_compat_full.sql` ligne 331) :
```sql
CREATE TABLE IF NOT EXISTS plans_alimentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  bande_id uuid REFERENCES bandes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  formule_id uuid REFERENCES formules(id),       -- <<< colonne réelle
  date_debut date,
  date_fin date,
  ration_kg_jour numeric,
  observations text, ...);
```

Code fautif (ancien `plans/page.tsx` ligne 156) :
```ts
.select('id, bande_id, type_aliment_id, ..., type_aliment:type_aliment_id(id, nom)')
//                     ^^^^^^^^^^^^^^^                       ^^^^^^^^^^^^^^
//                     colonne inexistante                    relation inexistante
```

L'ancien schéma (`_archived_pre_genesis_20260523/20260520000001_init_smartfarm.sql`) utilisait `type_aliment_id REFERENCES types_aliment(id)`, mais la migration genesis du 23/05 a recréé la table avec `formule_id REFERENCES formules(id)`. Le code Next n'a jamais été mis à jour côté `plans/*`. Côté `consommations/*`, le fix BUG-SC12 (2026-05-24) avait déjà fait la migration. Lane 4 termine le job sur `plans/*`.

Pourquoi PostgREST raconte "relationship" et pas "column doesn't exist" ? Parce qu'avec l'embed `type_aliment:type_aliment_id(id, nom)`, PostgREST cherche d'abord une FK pour résoudre la jointure → renvoie une erreur "relationship missing" plus parlante côté API… mais incompréhensible pour l'éleveur.

## CHOIX Option B (propre) + Option A en safety net

**Option B appliquée** : alignement complet du code sur le schéma réel.
- `_schemas.ts` : `type_aliment_id` → `formule_id`
- `_actions.ts` : payload `formule_id`, ajout `ferme_id` à l'insert via `getFermeId()` (NOT NULL en BDD — bug latent évité)
- `_dialog-plan.tsx` : prop `typesAliment: { id, nom }[]` → `formules`, champ formulaire `formule_id`
- `page.tsx` : query `formule:formule_id(id, nom)`, query liste `formules` au lieu de `types_aliment`

**Option A en safety net** : `loadPageData()` wrap try/catch global. Si une des 3 queries critiques (plans/bandes/formules) échoue, la page renvoie un EmptyState métier au lieu d'un crash ou stack trace :
- Composant `<ChargementImpossible>` avec `role="alert"` + `aria-live="polite"` (WCAG 4.1.3)
- Message métier : "Plans d'alimentation : configuration en cours, contactez votre administrateur"
- En `NODE_ENV !== 'production'`, la stack est affichée dans un `<pre>` discret pour debug local
- `console.error('[alimentation/plans] ...')` côté serveur pour ops/logs Hostinger

**Justification du choix double** : Option B seule corrige le bug, mais ne protège pas contre une régression future (autre colonne renommée, GRANT manquant, RLS bug). Option A en safety net = ceinture+bretelles. Coût marginal : +20 lignes.

## AUDIT SOUS-PAGES alim

| Page | Query critique | Verdict initial | Verdict après lane 4 |
|---|---|---|---|
| `/alimentation` (hub) | `nutrition-stats.tsx` queries `consommations_aliment(qte_kg, formule_id, ...)` | clean (déjà migré BUG-SC12) | **enrichi** : KPI Stock critique <7j rouge + badge "STOCK CRITIQUE" + role=alert |
| `/alimentation/matieres` | `matieres_premieres` colonnes nutritionnelles | clean (query OK) mais exposait `error.message` brut | **fixed** : EmptyState a11y métier |
| `/alimentation/concentres` | `matieres_premieres WHERE categorie='concentré_commercial'` | clean mais exposait `error.message` brut | **fixed** : EmptyState a11y métier |
| `/alimentation/formulation` | `formulations + formulation_ingredients + matieres` avec retry fallback `stade_cible` | clean (n'affiche pas l'erreur, juste tableau vide) | non touché |
| `/alimentation/plans` | `plans_alimentation` avec colonne fantôme `type_aliment_id` | **CASSÉ** (stack PostgREST exposée) | **fixed Option B** : query alignée sur `formule_id` + safety net |
| `/alimentation/consommations` | `consommations_aliment(qte_kg, formule_id)` | clean côté query, mais exposait `error.message` brut si erreur | **fixed** : EmptyState a11y métier |

## FIX #3 Hub `/alimentation` — Stock critique

Modif `nutrition-stats.tsx` :
- Nouvelle variable `stockJoursNum: number | null` (capture la valeur numérique en plus du `string`)
- Constante `stockCritique = stockJoursNum !== null && stockJoursNum < 7`
- Si critique : 
  - Card 4 : bg/ink = palette `--sf-danger-*` (rouge)
  - Icône `<AlertTriangle>` à gauche de la valeur
  - Badge "STOCK CRITIQUE" inline next to label
  - `role="alert"` + `aria-live="polite"` sur la Card
- Aucune migration SQL, juste classe/style conditionnels

Pas observé en démo sur ferme 13smartfarm (totalKg = 0 → calcul stockJours reste `—` car la branche `if (totalKg > 0)` n'entre pas). Cohérent avec le diagnostic terrain : tant que pas de consommations saisies, on ne peut pas calculer le burn rate. La logique de seuil critique ne s'active que sur ferme avec données réelles (la démo).

## VÉRIFS

**`npx tsc --noEmit`** : **non exécutable depuis cet agent** — sandbox Bash bloque l'exécution Node (`tsc`, `node`, `npx` tous refusés via "Permission denied"). Vérification manuelle effectuée :
- Tous les types `PlanRow` mis à jour cohéremment (`formule_id` partout, plus de `type_aliment_id`)
- Prop renames cohérents `typesAliment` → `formules` entre page.tsx et _dialog-plan.tsx
- Imports lucide `AlertTriangle` ajoutés sur les 4 pages qui l'utilisent
- `as unknown as Row[]` conservé pour bypasser typing Supabase embed (idiome existant du projet)
- Pas de nouvel `any`, pas de nouveau import lib externe
- Pas de console.log user-facing, seulement `console.error` server-side

Recommandation orchestrateur : **lancer `cd app && npx tsc --noEmit` depuis le shell utilisateur** pour valider AVANT merge.

## TODO ORCHESTRATEUR

1. **Validation tsc local obligatoire** : `cd app && npx tsc --noEmit -p tsconfig.json` (sandbox a empêché vérif côté agent).
2. **Smoke test browser** : naviguer `/alimentation/plans` connecté en ferme 13smartfarm ET en ferme démo → ne doit plus afficher de stack PostgREST. Si BDD plante, EmptyState "configuration en cours" attendu.
3. **Test création plan** : ouvrir le dialog "Nouveau plan", choisir bande + formule + date → vérifier insert OK (cause : `ferme_id` était omis avant, contrainte NOT NULL aurait fait planter le submit silencieusement).
4. **Seed data** : pour activer le KPI "Stock critique" en démo, vérifier que la matière la plus utilisée a un `stock_actuel` >0 et que les consommations sont récentes — sinon stockJoursNum restera `null` et le badge ne s'affichera pas.
5. **Migration cleanup éventuelle** : la table `types_aliment` (créée à la fois dans `_archived_pre_genesis_20260523/20260520000001_init_smartfarm.sql` ET dans `20260523150000_phase_a2_compat_full.sql:479`) est toujours là mais plus référencée par `plans_alimentation` ni `consommations_aliment`. À considérer pour purge si réellement orpheline (vérifier `formulations.type_aliment_id` qui pointe encore vers elle dans le legacy schema — pas touché par cette lane).
6. **Pas commité ni pushé** par l'agent (worktree clean attendu après modifs locales). À l'orchestrateur de stage + commit avec message style projet.

---
*Lane 4 close. 7 fichiers, scope strict `app/src/app/(app)/alimentation/**`, 0 fichier hors périmètre touché.*
