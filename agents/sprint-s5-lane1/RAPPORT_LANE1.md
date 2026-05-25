# LANE 1 — Migrations SQL Smart Farm (Sprint S5)

Sous-agent : senior DBA Postgres + Supabase · mode caveman · brain CONTEXT.md source vérité.

## FAIT — 2 fichiers créés (pas appliqués)

1. `supabase/migrations/20260525150000_fix_v_saillies_a_diagnostiquer.sql`
   DROP + CREATE OR REPLACE `v_saillies_a_diagnostiquer` (security_invoker, GRANT) avec 2x `NOT EXISTS` :
   - exclut saillies déjà diagnostiquées `diagnostics_gestation.resultat = 'positif'`
   - exclut saillies déjà liées à une `mises_bas`
2. `supabase/migrations/20260525150100_v_animaux_stade_repro.sql`
   CREATE OR REPLACE `v_animaux_stade_repro` (security_invoker, GRANT). 4 CTE :
   `derniere_mb` · `sevrage_dernier_mb` · `derniere_saillie` · `diag_positif_derniere_saillie`.
   Colonnes : `id`, `ferme_id`, `tag`, `nom`, `categorie`, `stade_repro`, `jours_stade`.

## VÉRIFS EFFECTUÉES (relecture pré-livrable)

| Vérif | Source | Résultat |
|---|---|---|
| Colonne `animaux.id` (clé jointe par UI) | genesis ligne 339 | ✅ `id uuid PK` |
| Colonne `animaux.sexe` = `F` + `categorie IN ('truie','cochette')` | genesis 342/344 | ✅ enum `sexe_animal` + `categorie_animal` |
| Colonne `animaux.deleted_at` | genesis 362 | ✅ |
| Colonne `saillies.truie_id`/`date_saillie`/`statut`/`resultat_diag`/`deleted_at` | genesis 406/408/413/412/417 | ✅ |
| Enum `resultat_diag` = `('positif','negatif','retour','avorte','en_attente')` | genesis 72 | ✅ minuscule confirmé |
| Colonne `mises_bas.truie_id`/`saillie_id`/`date_mb`/`deleted_at` | genesis 456/457/458/467 | ✅ (la colonne MB est bien `date_mb`, pas `date_mise_bas`) |
| Colonne `diagnostics_gestation.saillie_id`/`resultat`/`deleted_at` | phase_a2 ligne 200/203/208 | ✅ `resultat` est `text`, valeur attendue `'positif'` (lowercase) |
| Colonne `sevrages.mb_id`/`truie_id`/`date_sevrage`/`deleted_at` | phase_a_compat ligne 99-100 + phase_a5 ligne 7 | ✅ |
| Libellés attendus côté UI | `app/src/app/(app)/cheptel/page.tsx:262` STADE_REPRO_MAP | ✅ strict `'gestante'` `'allaitante'` `'vide'` `'pré-saillie'` (avec é) |
| Colonne `id` (pas `truie_id`) attendue par UI | `cheptel/page.tsx:128` `.select('id, stade_repro, jours_stade')` | ✅ aliasée en `a.id AS id` |
| `security_invoker = true` (règle 3 brain) | les 2 fichiers | ✅ |
| `GRANT SELECT ... TO authenticated, anon, service_role` (règle 9 RLS-friendly) | les 2 fichiers | ✅ |
| Naming `YYYYMMDDHHMMSS_*.sql` | 20260525150000 / 20260525150100 | ✅ |

## DIVERGENCES / INCERTITUDES À VALIDER

1. **Liaison sevrages → mise-bas** : la table `sevrages` peut référencer la MB
   soit via `sevrages.mb_id` (FK directe ajoutée en phase A.5), soit via
   `sevrages.portee_id` puis `portees.mb_id`. Mon CTE `sevrage_dernier_mb`
   joint sur `mb_id = dm.mb_id` OU sur `(truie_id, date_sevrage >= date_mb)`
   pour couvrir les sevrages legacy où `mb_id` serait NULL. À surveiller si
   un sevrage post-MB n'est pas remonté.

2. **Fenêtre gestante 18..114j** : choix d'exclure les <18j (statut
   `pré-saillie`/`vide` côté `derniere_saillie` mais sans diag positif
   encore confirmé) et les >114j (post-MB attendue). Couplée au filtre
   `resultat_diag = 'positif' OR diag positif`. Si le user veut afficher
   `gestante` dès J0 sur diag positif fast-track, élargir la borne basse.

3. **Cochette `pré-saillie`** : déclenche uniquement si `categorie = 'cochette'`
   ET aucune saillie en BDD. Une cochette qui aurait une saillie en retour
   negatif devient `vide` (pas `pré-saillie`). Conforme à la sémantique
   métier "n'a jamais commencé son cycle".

4. **Allaitante 28j** : par défaut le sevrage en porc CI est ~21-28j. Si la
   ferme cible sèvre à 35j, des truies sevrées entre 28-35j passeraient en
   `vide` au lieu de `allaitante`. Cohérent avec `v_calendrier_reproductif`
   (genesis ligne 2083) qui utilise 35j — DIVERGENCE assumée :
   `v_calendrier_reproductif` couvre l'agenda, `v_animaux_stade_repro` couvre
   l'état métier instantané. À uniformiser ultérieurement si besoin.

5. **Colonne `tag`/`nom`** : exposées par `v_animaux_stade_repro` même si UI
   actuelle ne lit que `(id, stade_repro, jours_stade)`. Sans coût et utile
   pour debug/SQL ad hoc.

## TODO ORCHESTRATEUR

- [ ] **Appliquer migration 1** (`20260525150000_fix_v_saillies_a_diagnostiquer.sql`)
  via Management API Supabase (PAT `SUPABASE_ACCESS_TOKEN`, règle 12 brain) OU MCP
  `mcp__supabase__apply_migration` sur projet `tpzhxjzwlxwujboboyit`.
- [ ] **Appliquer migration 2** (`20260525150100_v_animaux_stade_repro.sql`) idem.
- [ ] **Vérifier post-apply** (SQL ad-hoc Management API) sur compte ferme test :
  - `SELECT count(*) FROM v_saillies_a_diagnostiquer WHERE ferme_id = 'fdba3bb2-85dd-4ac1-9ab3-713c750980dc';`
    attendu : 2 (au lieu de 8 avant fix)
  - `SELECT stade_repro, count(*) FROM v_animaux_stade_repro WHERE ferme_id = 'fdba3bb2-85dd-4ac1-9ab3-713c750980dc' GROUP BY 1;`
    attendu (brain ligne 38) : 10 gestantes / 2 allaitantes / 5 vides
- [ ] Smoke prod après build : `/cheptel?tab=truies` doit afficher
  `GESTANTE Jxx` / `ALLAITANTE Jxx` / `VIDE` / `PRÉ-SAILLIE` au lieu de `ACTIF`.
- [ ] `/reproduction` : la liste "saillies à diagnostiquer" doit ne plus contenir
  les saillies des truies déjà gestantes confirmées ni celles ayant mis bas.

## NON FAIT (hors scope lane 1)

- ❌ Pas d'`mcp__supabase__apply_migration` (le user applique lui-même).
- ❌ Pas de modif code app (UI cheptel/page.tsx consomme déjà la vue avec
  fallback graceful — ne touche pas).
- ❌ Pas de migration sur les autres vues `v_*_actives|attente|prevus`
  citées en pattern systémique #2 de l'audit — relève d'un sprint dédié.
