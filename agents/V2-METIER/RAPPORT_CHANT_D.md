# RAPPORT CHANT-D — Bandes : sexage + transit phase

**Statut** : ✅ Livré, migration appliquée, TS clean.
**Date** : 2026-05-22

## Livrables

### 1. Migration SQL
`supabase/migrations/20260522040000_bandes_sexage_transit.sql` (appliquée OK)

- `ALTER TABLE bandes` : `phase_courante text CHECK (… 5 valeurs)`, `sexee boolean NOT NULL DEFAULT false`.
- `ALTER TABLE bande_animaux` : `sous_groupe text CHECK ('M','F','mixte')`.
- `CREATE TABLE transits_phase (id, bande_id, ferme_id, phase_avant, phase_apres, date_transit, nb_males, nb_femelles, poids_moyen_m_kg, poids_moyen_f_kg, poids_total_kg, observations, enregistre_par, created_at, deleted_at)` + index `(bande_id, date_transit DESC)` + GRANT anon/authenticated.
- `CREATE VIEW v_bande_effectif` (security_invoker) : bande_id, code, nom, statut, phase_courante, sexee, ferme_id, date_debut, **effectif_total**, **nb_males**, **nb_femelles**, **sous_groupe_m**, **sous_groupe_f**, **age_bande_jours**.
- `CREATE OR REPLACE VIEW v_alertes_actives` : 21 règles R01-R21 préservées **mot pour mot** (extraites via `pg_get_viewdef` après CHANT-A) + **R22-bande-non-sexee-2-mois** ajoutée en UNION ALL final.
  - Vérif : `regexp_count(pg_get_viewdef, 'AS regle_id') = 22` ✅
  - R22 active immédiatement (1 occurrence détectée sur la bande seed B2026-01, 126 j).

### 2. Page `/bandes/[id]/page.tsx`
- Server Component, lit `v_bande_effectif` + `transits_phase`.
- Header : nom, code, statut, phase courante, badge `Sexée`/`Non sexée`, âge j.
- 6 KPI cards : effectif total / M / F / sous-groupe M / sous-groupe F / âge.
- Bannière warning R22 quand `!sexee && age>=60`.
- Bouton **"Sexer cette bande"** (form action server, visible uniquement si éligible).
- Bouton **"Nouveau transit de phase"** (Dialog client).
- Tableau historique transits (date, phase avant → après, nb M/F, poids M/F/total, observations).
- Bloc rappel métier (sexage à 60j + ordre des phases).
- `generateMetadata` titre = `${nom} — Bande — Smart Farm`.

### 3. Server Actions `_actions.ts`
- **`sexerBande(formData)`** : `UPDATE bandes SET sexee=true`, puis pour chaque ligne `bande_animaux` encore présente, `UPDATE … SET sous_groupe = animaux.sexe`. revalidatePath `/bandes/[id]`, `/bandes`, `/alertes`.
- **`transitPhase(formData)`** : lit bande_id + phase_avant/apres + nb_males/femelles + poids moyens. Calcule **`poids_total_kg = nb_M*poids_M + nb_F*poids_F`** côté serveur. INSERT dans `transits_phase`, UPDATE `bandes.phase_courante`. revalidatePath.
- Utilise `service_role` client (pattern V2-METIER standard).

### 4. Dialog client `_dialog-transit.tsx`
- Récap **live** du poids total estimé (useMemo : `nb_M × poids_M + nb_F × poids_F`).
- Select phase apres (5 valeurs cohérentes avec le CHECK SQL).
- Inputs nb_males / nb_femelles préremplis depuis l'effectif courant (`v_bande_effectif`).
- Form submit direct sur Server Action `transitPhase` via `<form action={…}>`.

### 5. Mapping UI `src/lib/alertes-regles.ts`
- Header commentaire : "21 règles → 22 règles".
- Ajout entrée `R22-bande-non-sexee-2-mois` :
  - nom : "Bande non sexée à 2 mois"
  - description : "Bande active de plus de 60 jours sans sexage — séparer mâles et femelles pour éviter la consanguinité."
  - gravite_default : `moyenne`, catégorie : `reproduction`.

## Vérifications
- `psql -f migration` : BEGIN…COMMIT, 11 statements, exit 0.
- `SELECT count(DISTINCT regle_id) FROM v_alertes_actives` : 22 distinctes définies (R10/R17/R18/R22 actives sur data seed).
- `SELECT … FROM v_bande_effectif` : 1 ligne, effectif=3, nb_femelles=3, sexee=false, age=126.
- `npx tsc --noEmit` : aucune erreur sur les nouveaux fichiers.
- HTTP GET `/bandes/<id>` : 404 (attendu — serveur standalone, build orchestrateur fera la prise en compte).

## Anti-pièges respectés
- ✅ `pg_get_viewdef('v_alertes_actives')` lu AVANT recréation → 21 règles préservées mot pour mot.
- ✅ `security_invoker=true` + `GRANT SELECT … TO anon, authenticated` sur les 2 vues.
- ✅ `revalidatePath` après chaque mutation.
- ✅ Pas de `npm run build`, pas de restart serveur.
- ✅ Migration NOUVELLE (timestamp 20260522040000), aucune ancienne touchée.

## Fichiers modifiés / créés
| Fichier | Action |
|---|---|
| `supabase/migrations/20260522040000_bandes_sexage_transit.sql` | créé |
| `app/src/app/(app)/bandes/[id]/page.tsx` | créé |
| `app/src/app/(app)/bandes/[id]/_actions.ts` | créé |
| `app/src/app/(app)/bandes/[id]/_dialog-transit.tsx` | créé |
| `app/src/lib/alertes-regles.ts` | +entrée R22 + header 21→22 |
