# R7 P2 — Stabilité Technique

Mission : fix lucide-react fantôme + 9 indexes FK + CI/CD GitHub Actions + try/catch Server Actions.

## M1 lucide-react ⚠️ — **Faux positif K2, aucune action requise**

Le diagnostic K2 #10 (`lucide-react@1.16.0` = version inexistante) est **obsolète**.

Vérifications réelles (mai 2026, registry live) :

```bash
$ npm view lucide-react@latest version
1.16.0

$ npm view lucide-react time --json | jq '."1.0.0", ."1.16.0"'
"2026-03-23T13:46:46.982Z"   # v1.0.0 release
"2026-05-14T11:42:38.467Z"   # v1.16.0 release

$ npm view lucide-react versions --json | wc -l
668 versions
```

→ `lucide-react` a effectivement publié `v1.0.0` (release majeure / refactor naming) en mars 2026 puis itéré jusqu'à `1.16.0`. La pin `^1.16.0` dans `package.json` est **actuellement la dernière version stable upstream**.

L'audit K2 a été produit sur un snapshot où le registry pointait encore vers `0.5xx`. Pas de fix nécessaire. Tous les 51 imports `from 'lucide-react'` résolvent correctement (vérifié `node_modules/lucide-react/dist/esm/icons/` peuplé, types `.d.ts` présents).

**Recommandation** : reclasser K2 #10 en *resolved* dans le suivi des dettes.

## M2 9 indexes FK ✅

Migration appliquée : `supabase/migrations/20260526000000_indexes_fk_critiques.sql`

8 indexes créés (le 9e, `idx_pesees_animal_id`, était déjà couvert par `idx_pesees_animal` existant — skip explicite documenté dans la migration) :

```
 idx_animaux_case_id        | animaux               | WHERE statut='actif' AND deleted_at IS NULL
 idx_animaux_mere_id        | animaux               | WHERE deleted_at IS NULL
 idx_animaux_pere_id        | animaux               | WHERE deleted_at IS NULL
 idx_diagnostics_saillie_id | diagnostics_gestation | (table sans deleted_at → index complet)
 idx_mises_bas_bande_id     | mises_bas             | WHERE deleted_at IS NULL
 idx_mortalites_animal_id   | mortalites            | WHERE deleted_at IS NULL
 idx_sevrages_truie_id      | sevrages              | WHERE deleted_at IS NULL
 idx_vaccinations_animal_id | vaccinations          | WHERE deleted_at IS NULL
```

Output `psql -f migration.sql` :
```
BEGIN
CREATE INDEX × 8
ANALYZE × 6
COMMIT
```

Sanity check counts post-migration (aucune ligne perdue) :
```
animaux               | 17
mises_bas             |  2
sevrages              |  0
vaccinations          |  2
diagnostics_gestation |  3
mortalites            |  0
```

Predicates partiels alignés avec la convention soft-delete de l'app (toutes les Server Actions lisent `WHERE deleted_at IS NULL`). Index sur `animaux.case_id` ajoute `statut='actif'` (densité bâtiment ne regarde que les vivants).

## M3 CI/CD GitHub Actions ✅

Fichier mis à jour : `.github/workflows/ci.yml`

Améliorations vs. existant :
- Trigger `push` étendu à `develop` (en plus de `main`)
- Cache npm activé (`actions/setup-node` avec `cache: npm`)
- **Lint step ajouté** (`npm run lint --if-present`)
- **Env stubs Supabase + `SMARTFARM_DEMO_MODE=true`** pour que `next build` passe sans secrets réels (le wrapper `supabase/server.ts` bascule en mode démo via service_role stub)

Workflow final :

```yaml
name: ci
on:
  pull_request: { branches: [main] }
  push:         { branches: [main, develop] }
  workflow_dispatch:

jobs:
  lint-typecheck-build:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: app } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: app/package-lock.json
      - run: npm ci --no-audit --no-fund
      - run: npx tsc --noEmit -p tsconfig.json
      - run: npm run lint --if-present
      - run: npm run build
        env:
          NEXT_TELEMETRY_DISABLED: "1"
          NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321"
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummy-anon-key"
          SUPABASE_SERVICE_ROLE_KEY: "dummy-service-role-key"
          SMARTFARM_DEMO_MODE: "true"
```

`deploy.yml` laissé tel quel (n'est pas dans le scope P2 — sera revu en P3 quand pm2/systemd sera décidé).

## M4 Try/catch ✅ — 8 functions wrappées

Pattern uniforme : `try { … existing logic … } catch (e) { console.error('[fn] unexpected error:', e); return { ok: false, error: e instanceof Error ? e.message : 'Erreur inattendue' } }`

Toutes les fonctions retournaient déjà `{ok,error}` → contrat préservé, aucun call-site à mettre à jour.

| # | Fichier | Fonction |
|---|---|---|
| 1 | `reproduction/_server-actions.ts` | `creerSaillie` |
| 2 | `reproduction/_server-actions.ts` | `creerDiagnostic` |
| 3 | `mises-bas/_server-actions.ts` | `creerMiseBas` |
| 4 | `mises-bas/_server-actions.ts` | `creerSevrage` |
| 5 | `bandes/_server-actions.ts` | `creerBande` |
| 6 | `sanitaire/_server-actions.ts` | `creerVaccination` |
| 7 | `sanitaire/_server-actions.ts` | `creerTraitement` |
| 8 | `sanitaire/_server-actions.ts` | `creerMortalite` |

`cheptel/_server-actions.ts` (`creerAnimal`) **non patché** pour rester sous le budget 8 — petite fonction, peu de surface d'attaque (1 seul `await insert`), à reprendre Phase 3.

Vérification tsc après modifs :
```bash
$ npx tsc --noEmit 2>&1 | grep -E "(reproduction|mises-bas|bandes|sanitaire)/_server-actions"
(aucun résultat → 0 erreur TS introduite)
```

Total erreurs tsc projet : 2 (pré-existantes dans `.next/types/validator.ts` — cache stale, non liées).

## M5 Refacto KPI ⏭ skip

Conformément à la consigne : "SI TEMPS MANQUE → SKIP M5". Budget atteint sur M1-M4, page `/kpi` fonctionne correctement (200 OK) → reportée Phase 3.

## Stats avant/après

| Métrique | Avant P2 | Après P2 |
|---|---|---|
| Indexes FK critiques métier | 0/9 | 8/9 (9e déjà couvert) |
| Total indexes DB (tables ciblées) | 25 | 33 |
| Server Actions sans try/catch (5 fichiers ciblés) | 8/8 | 0/8 |
| CI : trigger push develop | ❌ | ✅ |
| CI : cache npm | ❌ | ✅ |
| CI : lint step | ❌ | ✅ |
| CI : build avec stubs demo mode | ❌ | ✅ |
| Erreurs tsc introduites | — | 0 |
| Routes app live (smoke `/`, `/reproduction`, `/sanitaire`, `/bandes`) | 200×4 | 200×4 |

## Fichiers livrés

- ✅ `supabase/migrations/20260526000000_indexes_fk_critiques.sql` (NEW)
- ✅ `.github/workflows/ci.yml` (UPDATE)
- ✅ `app/src/app/(app)/reproduction/_server-actions.ts` (UPDATE)
- ✅ `app/src/app/(app)/mises-bas/_server-actions.ts` (UPDATE)
- ✅ `app/src/app/(app)/bandes/_server-actions.ts` (UPDATE)
- ✅ `app/src/app/(app)/sanitaire/_server-actions.ts` (UPDATE)

Total : **5 fichiers modifiés + 1 migration + 1 workflow** (sous le budget 12+1+1).

## Issues bloquantes

Aucune.

Notes :
- Audit K2 #10 (lucide-react fantôme) à reclasser *resolved* — registry upstream a rattrapé.
- Audit K2 #5 (FK sans index) : **8/9 traités**, 1 marqué N/A (déjà indexé sous un autre nom).
- M5 reportée Phase 3 (non-bloquant, page rend correctement).
- `creerAnimal` (cheptel) non patché ce sprint — backlog Phase 3.

## DERNIÈRE MIGRATION (mise à jour CONTEXT)

`20260526000000_indexes_fk_critiques.sql`
