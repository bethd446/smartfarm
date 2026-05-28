# RAPPORT L3 — C8 Prix matières historique

## Fait
- Migration `supabase/migrations/20260528100000_prix_matieres_historique.sql` écrite (NON appliquée — l'orchestrateur la pousse via Mgmt API)
  - Table `public.prix_matieres_historique` (id, ferme_id NOT NULL FK fermes, matiere_id NOT NULL FK matieres_premieres, date_releve, prix_xof_kg numeric(10,2) CHECK>0, source, observations, created_at, created_by FK auth.users)
  - 2 index : `(matiere_id, date_releve DESC)`, `(ferme_id, date_releve DESC)`
  - RLS ENABLE + 3 policies (SELECT/INSERT/DELETE) basées sur `current_farm_id()`
  - GRANT SELECT, INSERT, DELETE TO authenticated
  - Fonction `public.fn_sync_prix_matiere()` SECURITY DEFINER, search_path=public
  - Trigger `trg_sync_prix_matiere` AFTER INSERT → UPDATE `matieres_premieres.prix_indicatif_xof_kg`
- 4 fichiers route `app/src/app/(app)/alimentation/matieres-prix/`
  - `page.tsx` — server component async, KPI x3, filtres (matière + from/to), table relevés, dialog "+ Nouveau prix", empty state, error state
  - `_dialog-prix.tsx` — 'use client', RHF + zodResolver, mode create-only, reset au close, `router.refresh()` post-success
  - `_actions.ts` — `ajouterPrixMatiere()` (zod + getFermeId + insert + revalidatePath x2 incluant `/alimentation/matieres` car trigger SQL) + `supprimerPrixMatiere()`
  - `_schemas.ts` — Zod minimal : matiere_id uuid, date_releve ≤ today, prix_xof_kg coerce > 0 max 100000, source max 200, observations max 1000

## Vérifs (sorties grep/ls réelles)
- `ls app/src/app/(app)/alimentation/matieres-prix/` → `_actions.ts  _dialog-prix.tsx  _schemas.ts  page.tsx` (4 fichiers) ✅
- `ls supabase/migrations/20260528100000_*.sql` → `supabase/migrations/20260528100000_prix_matieres_historique.sql` ✅
- `grep -c "current_farm_id\|ENABLE ROW LEVEL SECURITY\|GRANT" supabase/migrations/20260528100000_*.sql` → `6` (≥ 5) ✅
- `grep "trg_sync_prix_matiere" supabase/migrations/20260528100000_*.sql` → 2 occurrences (DROP TRIGGER + CREATE TRIGGER) ✅
- `wc -l app/src/app/(app)/alimentation/matieres-prix/*` →
  - `_actions.ts` 50 < 80 ✅
  - `_dialog-prix.tsx` 189 < 250 ✅
  - `_schemas.ts` 16 < 30 ✅
  - `page.tsx` 394 < 400 ✅

## Pré-vérifs schéma existant
- `matieres_premieres.ferme_id` confirmé présent (genesis 20260523120000 ligne 275 + RECREATE phase_a2 20260523150000 ligne 19). FK vers `public.fermes(id) ON DELETE CASCADE`.
- `matieres_premieres.prix_indicatif_xof_kg` confirmé présent (phase_a2 ligne 34, numeric). Cible du trigger valide.
- `public.current_farm_id()` confirmée présente (genesis ligne 225, GRANT EXECUTE TO authenticated ligne 239). Non recréée.
- `getFermeId()` exporté depuis `@/lib/supabase/ferme-context.ts` (utilise RPC `current_farm_id`).

## Divergences brief
- Aucune divergence fonctionnelle. Le brief était strictement applicable au schéma actuel.
- Note minime : `matieres_premieres.ferme_id` actuel est `uuid REFERENCES fermes(id)` sans `NOT NULL` (cf phase_a2), alors que la nouvelle table `prix_matieres_historique.ferme_id` est `NOT NULL` (conforme brief). Pas d'impact runtime — `getFermeId()` ne renvoie jamais null (throw avant).
- Note pattern RLS : tables existantes (ex. `matieres_premieres`) utilisent `user_farms IN (...)` directement, alors que cette nouvelle migration utilise `current_farm_id()` conformément à la charte §10 règle 4 ("Multi-tenant via RLS `current_farm_id()`"). Cohérent avec le brief.
- Aucun fichier hors périmètre touché. `matieres/*`, `alimentation/page.tsx`, sidebar = intacts.

## TODO orchestrateur
1. Appliquer migration via curl Mgmt API `POST /v1/projects/tpzhxjzwlxwujboboyit/database/query` (cf handoff §3.2)
2. `npx tsc --noEmit` (workspace `app/`) → vérifier 0 erreur sur les 4 nouveaux fichiers
3. Câbler lien dans `/alimentation/page.tsx` vers `/alimentation/matieres-prix` (badge "Historique prix" ou tile dans la grille modules)
4. (Optionnel) Ajouter entrée sidebar/drawer si pertinent (charte 13 règles §13 : max 12 entrées)
5. Smoke desktop authentifié `demo@smartfarm.group` :
   - Naviguer `/alimentation/matieres-prix` → vérifier 0 erreur console, RLS OK
   - Ouvrir dialog "+ Nouveau prix" → sélectionner matière, date, prix → submit
   - Vérifier toast succès + ligne dans la table
   - Aller `/alimentation/matieres` → vérifier que `prix_indicatif_xof_kg` de la matière concernée a bien été mis à jour (trigger SQL OK)
   - Tester filtre matière + filtre date (from/to)
   - Tester suppression d'un relevé
6. Smoke RLS cross-farm (compte secondaire si possible) → s'assurer qu'on ne voit pas les prix d'une autre ferme
