# K2 — Critique Technique (Senior Architect, mode adversaire)

> Audit lecture seule, 8 min, batch. Code 32 377 LOC TS/TSX, 173 fichiers, Next 16 / React 19 / Supabase. Bundle 3.0 MB chunks. DB 43 tables, 118 index, RLS ON 100 %.

## Verdict : PRODUCTION READY ? **NON.**

5 raisons (par criticité descendante) :
1. **Service_role en clair dans 34 emplacements + 13 fichiers** qui bypassent RLS — l'app n'est *pas* multi-tenant en pratique, juste en SQL. (cf K4-V4)
2. **Aucune CI/CD** : pas de `.github/workflows/`, scripts `npm` réduits à `dev/build/start`, pas de typecheck/lint en pré-deploy, `deploy.sh` = `npm run build && nohup node`. Aucun garde-fou.
3. **Aucun test exécutable en CI** — 5 specs E2E Playwright mais zéro test unitaire sur `nutrition-engine`, `alertes-regles`, `repro-cibles` (coeur métier). Régressions silencieuses garanties.
4. **Vue `v_alertes_actives` = 34 KB de SQL** (26 CTE empilées). EXPLAIN ANALYZE OK aujourd'hui sur 3 truies, mais cost=6068 sur dataset vide → catastrophique à 500 truies.
5. **Pas une seule `<Suspense>` boundary, 4 loading/error boundaries** sur 14 routes principales → page entière en attente du plus lent `await supabase.from()`. Waterfall serveur garanti.

## Score /10 par axe

| Axe | Note | Synthèse |
|---|---|---|
| A. Architecture | **5/10** | Server-first OK, mais 43 `'use client'` sans justification, god-files 700-975 LOC |
| B. Performance | **4/10** | Bundle 3 MB, 0 Suspense, vue alertes O(n) sur 26 règles, FK sans index |
| C. Dette SQL | **4/10** | `v_alertes_actives` 34 KB, 15 FK non-indexées (dont `animaux_case_id`, `sevrages_*`), 0 matview hot path |
| D. Typing | **6/10** | 34 `: any` sur surfaces UI, 169 schémas Zod (bien), 0 `@ts-ignore` (très bien) |
| E. Robustesse | **3/10** | 0 `console.log` (clean), mais 0 try/catch dans Server Actions data-mut, 0 Suspense, 4 boundaries |
| F. CI/CD | **1/10** | **Aucune CI**. `deploy.sh` artisanal, `fuser -k -9` brutal, pas de rollback, pas de healthcheck post-deploy hors HTTP 200 |
| G. Dépendances | **6/10** | 2 CVE moderate (postcss XSS via Next 16.2.6), TS 5.9 (latest 6.0), `lucide-react@1.16` ⚠ (latest=0.5xx — *version pinnée hyper suspecte*) |

**Moyenne pondérée : 4.1/10 → reportable. Pas catastrophique côté code, catastrophique côté ops/sécu.**

## Stats brutes

- **LOC** : 32 377 (TS/TSX), 173 fichiers
- **Composants client** : 43 `'use client'` (25 % des fichiers — élevé pour app Server-first)
- **Server Actions** : 28 fichiers `'use server'`
- **TODO/FIXME/HACK/XXX** : **0** ✅ (suspect : soit clean, soit camouflé)
- **`: any`** : 34 occurrences (surfaces UI : dashboard, repro, mises-bas, alimentation, bandes)
- **`@ts-ignore` / `@ts-expect-error`** : 0 ✅
- **`console.log`** : 0 ✅
- **`service_role` / `SUPABASE_SERVICE_ROLE_KEY`** : **34** (bombe — cf K4)
- **Zod schemas** : 169 (couverture correcte)
- **revalidatePath/Tag** : 117 appels
- **Bundle chunks** : 3.0 MB total, top chunk 364 KB, 8 chunks >100 KB
- **DB** : 118 index, 0 table sans RLS, 15 FK sans index (dont 9 critiques métier)
- **Tests** : 5 specs E2E Playwright, **0 test unitaire**, **0 CI**
- **Loading/error/not-found** : 4 boundaries pour 14 routes (28 %)
- **Suspense** : 0

## TOP 12 DETTES P0 (par dangerosité)

| # | Dette | Fichier:Ligne | Impact | Effort |
|---|---|---|---|---|
| **1** | Pas de CI/CD du tout | `.github/workflows/` (absent) | Régression non détectée, deploy à l'aveugle | M |
| **2** | `service_role` exposé 34× | `lib/supabase/server.ts:41`, `app/(app)/reproduction/_server-actions.ts:12`, +13 | RLS bypass total prod | L |
| **3** | Vue `v_alertes_actives` = 34 KB / 26 CTE | DB `pg_views` | Explose à >100 truies | L |
| **4** | God-files 700-975 LOC | `lib/maladies-porcines.ts:975`, `app/(app)/kpi/page.tsx:864` | Tests impossibles, merge conflicts | M |
| **5** | 15 FK sans index (9 critiques métier) | `mises_bas_bande_id`, `sevrages_truie_id`, `animaux_case_id`, `animaux_mere_id`, `animaux_pere_id` | Lectures × 100 à grosse base | S |
| **6** | 0 Suspense / 4 boundaries sur 14 routes | `app/(app)/*/page.tsx` | Waterfall, UX dégradée | M |
| **7** | 0 test unitaire sur `lib/` métier | `lib/nutrition-engine.ts`, `lib/alertes-regles.ts`, `lib/repro-cibles.ts` | Régressions calculs NRC/BCS muettes | M |
| **8** | 34 `: any` sur surfaces données | `dashboard/page.tsx:85,277,354,410`, `reproduction/page.tsx:294`, `mises-bas/page.tsx:50,142,173` | Drift schéma DB→UI non détecté | S |
| **9** | Pas de try/catch dans 80 % des Server Actions | `reproduction/_server-actions.ts`, `bandes/_server-actions.ts`, `mises-bas/_server-actions.ts` | Erreur DB = page 500 brute | S |
| **10** | `lucide-react@1.16.0` (version inexistante en upstream) | `package.json` | Build cassé si lock perdu — **dépendance verrouillée à fantôme** | S |
| **11** | `postcss <8.5.10` CVE XSS via Next 16.2.6 | `npm audit` | Fix = `next@9.3.3` (downgrade massif, impossible) → attendre patch upstream | XS |
| **12** | Hard delete sur 5 tables (audit trail perdu) | (cf K4-V6) | Aucun rollback métier possible | M |

## Anti-patterns avec fichier:ligne

- **`statutColors: any`** au lieu d'`as const` ou `Record<Statut, ColorTone>` → `app/(app)/bandes/page.tsx:13`
- **`.map((m: any) => …)`** : pattern répété 15× sur résultats Supabase non typés → `app/(app)/dashboard/page.tsx:85,277,354,410`, `mises-bas/page.tsx`, `reproduction/page.tsx:294`
- **`createClient(url, SERVICE_ROLE_KEY!)`** instancié *dans chaque Server Action* au lieu d'un helper centralisé → `reproduction/_server-actions.ts:12`, `alimentation/plans/_actions.ts:10`, `alimentation/consommations/_actions.ts:10` (×4 minimum). Dette : changer la stratégie d'auth = patcher N fichiers.
- **`revalidatePath('/dashboard')` après chaque Server Action repro** (×3 chemins par action) → invalidation cascade aveugle, pourrait être un `revalidateTag('animaux')`. → `_server-actions.ts:67-69, 95-97`.
- **Mix `DEMO_FERME_ID` hardcodé (11 fichiers) vs `getFermeId()` helper (2 fichiers)** → cf K4-V8. Quand on bascule en prod, 11 endroits à patcher.
- **`app/api/registre/route.ts:536 LOC`** dans une seule route handler. Découper en `_handlers/registre/{cheptel,sanitaire,repro}.ts`.
- **`app/(app)/kpi/page.tsx:864 LOC`** = page Server qui devrait être 5 composants Server + `<Suspense>` indépendants par carte KPI.
- **`force-dynamic` partout** sur API routes → tue tout l'ISR potentiel sur `/api/kpi/refresh`. → 4/4 routes API.
- **Server Action sans validation Zod** sur 80 % des cas (28 actions, 169 Zod schemas, mais ratio mal réparti — Zod côté form client, pas en SA).

## Bombes à retardement (avec timing estimé)

| Bombe | Trigger | ETA |
|---|---|---|
| **`v_alertes_actives` timeout** | >200 truies actives + 30 jours données → 26 CTE Cartesian explosent | **Q2 2026** si onboarding réel |
| **`service_role` leak en prod** | Une seule personne ajoute `'use server'` sans `getFermeId()` dans nouveau module | **Premier sprint post-launch** |
| **`lucide-react@1.16.0`** | `package-lock.json` corrompu / `node_modules` réinstallé sans lock → `npm install` cherche v1.16.0 inexistante sur registry | **Premier `rm -rf node_modules`** = build cassé |
| **Hard DELETE animaux** | Éleveur supprime truie par erreur → toutes ses MB/saillies/portées effacées en cascade (audit_logs absent) | **Première semaine prod** |
| **Lost updates (pas d'`updated_at`/`version`)** | 2 ouvriers sur tablette saisissent MB de la même truie | **Premier jour multi-user** |
| **Postgres `seq scan` partout** | `Seq Scan on saillies/mises_bas/animaux` sur EXPLAIN — pas d'index sur `truie_id, deleted_at` | **5 000 lignes/table** |
| **`fuser -k -9` au deploy** | Coupe brutalement les requêtes en cours → corruption transactions Supabase si pooler local | **À chaque deploy en heure ouvrée** |
| **0 healthcheck DB** | `deploy.sh` curl `/` mais ne vérifie pas que Postgres répond → app UP mais lectures cassées | **Premier crash docker Supabase** |
| **`@react-pdf/renderer` SSR** | Génération PDF synchrone bloquante en Server Action → timeout Vercel/standalone 30 s sur gros registre | **Premier rapport annuel** |

## Quick wins (<1h chacun)

1. **Créer `.github/workflows/ci.yml`** : `npm ci && npx tsc --noEmit && npx next lint` sur PR. (30 min)
2. **Ajouter `"typecheck": "tsc --noEmit"` + `"lint": "next lint"` dans `package.json`**. (5 min)
3. **Ajouter index sur 9 FK critiques métier** : 1 migration SQL, ~10 lignes. (20 min)
   ```sql
   CREATE INDEX CONCURRENTLY idx_mises_bas_bande_id ON mises_bas(bande_id) WHERE deleted_at IS NULL;
   CREATE INDEX CONCURRENTLY idx_sevrages_truie_id ON sevrages(truie_id);
   CREATE INDEX CONCURRENTLY idx_animaux_case_id ON animaux(case_id);
   CREATE INDEX CONCURRENTLY idx_animaux_mere_id ON animaux(mere_id);
   -- etc
   ```
4. **Centraliser `createServiceRoleClient()`** dans `lib/supabase/server.ts` → remplacer les 4-13 instanciations dispersées par 1 import. (30 min)
5. **Typer les `.map((x: any) => …)`** via `Database['public']['Tables']['xxx']['Row']` (déjà généré par Supabase). (45 min — fait grep+sed mental)
6. **Ajouter `loading.tsx` minimal à chaque route `/dashboard`, `/cheptel`, `/bandes`, `/reproduction`, `/mises-bas`, `/sanitaire`, `/alimentation`** (10 routes × 5 lignes). (30 min)
7. **`<Suspense>` autour des cartes KPI lourdes** dans `kpi/page.tsx` (passer de 864 LOC monobloc à 5 cartes parallèles). (45 min)
8. **Renforcer `deploy.sh`** : graceful shutdown via `kill -TERM` puis `kill -9` après 10 s, healthcheck DB en plus de HTTP. (15 min)
9. **Vérifier/pinner `lucide-react`** à la vraie version utilisée (sans doute `^0.460`), pas `^1.16.0`. (5 min — **vérifier en priorité absolue**)

## Verdict final

Le code Next/React est **propre dans sa surface** (0 console.log, 0 ts-ignore, 0 TODO, 169 Zod, 117 revalidatePath) — quelqu'un sait écrire. **Mais c'est une coquille bien polie sur une fondation ops/sécu inexistante.**

- **Code applicatif** : 6/10 — sortable avec 2 sprints d'hygiène (typing, splitting god-files, Suspense).
- **Sécurité runtime** : 1/10 — cf K4, non négociable.
- **Ops / déploiement** : 1/10 — aucun garde-fou, aucune CI, deploy.sh artisanal.
- **DB perf** : 4/10 — schéma correct mais vue alertes ingérable et 15 FK nues. Reportable.

**Recommandation senior** : *NE PAS lancer en prod multi-tenant en l'état.* Acceptable pour démo / 1 client pilote contrôlé. Pour ouvrir à 10+ fermes, **bloquer 3 semaines** sur :
1. Semaine 1 : CI + typecheck + tests unitaires lib métier + index FK
2. Semaine 2 : auth réelle + suppression `service_role` côté Server Actions + headers sécu (K4)
3. Semaine 3 : refacto vue `v_alertes_actives` en matview ou en code applicatif + Suspense + splitting god-files

Sans ça : **bombe à retardement double — perf à 200 truies + faille sécu au premier prospect curieux.**
