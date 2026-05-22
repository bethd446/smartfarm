# RAPPORT SA-B — PPA Surveillance (Sprint A)

**Statut :** ✅ Livré · **Référentiel :** OIE/WOAH · **Date :** 2026-05-22

## Livrables

### 1. Migration SQL — appliquée ✅
`supabase/migrations/20260522060000_ppa_surveillance.sql`
- Table `ppa_observations` (24 colonnes : observation clinique, symptômes booléens + `symptomes text[]`, déclaration, prélèvement, résultat labo, audit `enregistre_par/created_at/deleted_at`)
- 2 index : `idx_ppa_ferme_date(ferme_id, date_observation DESC)` + `idx_ppa_niveau` partiel
- CHECK contraintes : `niveau_suspicion IN ('faible','moyen','eleve','tres_eleve')`, `resultat_laboratoire IN ('en_attente','negatif','positif','indetermine')`, `nb_animaux_affectes ≥ 1`
- Vue `v_ppa_surveillance` (security_invoker=true) : `obs_30j`, `suspicions_critiques_30j`, `confirmes_total`, `suspicions_non_declarees`, `derniere_observation`
- GRANT SELECT/INSERT/UPDATE table + GRANT SELECT vue → anon, authenticated

### 2. Page `/sanitaire/ppa/page.tsx`
- Header avec lien retour `/sanitaire` + icône AlertTriangle rouge + bouton Dialog en haut à droite
- **Encart pédagogique rouge** : mortalité 100%, pas de vaccin, transmission (tiques Ornithodoros, viande crue, vecteurs), symptômes clés, obligation OIE, contact DSV Côte d'Ivoire
- **4 KPI** : Observations 30j / Suspicions critiques 30j / Non déclarées (rouge si >0 avec mention « Action OIE requise ») / Confirmés cumul
- **Card « Symptômes typiques »** : 6 repères terrain (fièvre, hémorragies, mortalité subite, cyanose, refus aliment, vom./diarrhée) avec icônes
- **Tableau historique** : 30 dernières observations · colonnes Date/Nb/Niveau (Badge danger/warning)/T°max/Symptômes/Déclaré(succès/danger)/Résultat labo · EmptyState si vide

### 3. Server Action `_actions.ts`
`enregistrerObservationPPA(formData: FormData): Promise<ActionResult>`
- Validation niveau ∈ enum, nb ≥ 1, résultat labo ∈ enum, helpers `nonEmpty/toNumOrNull/toIntOrNull/boolFromForm`
- Construit `symptomes text[]` à partir des 6 checkboxes
- Insert via service_role + `revalidatePath('/sanitaire/ppa')` + `/sanitaire`
- Retour discriminé `{ok:true,id} | {ok:false,error}`

### 4. Dialog `_dialog-observation.tsx` (client)
- Trigger : bouton rouge `variant="destructive"` « Nouvelle observation suspecte »
- Form direct `action={handleSubmit}` + `useTransition` (pas de react-hook-form, simple terrain)
- 4 blocs : contexte (date/nb/niveau + T° max), checklist 6 symptômes avec hints, bloc déclaration (rouge) avec date+référence, bloc prélèvement avec résultat labo, textarea observations
- Affichage erreur serveur inline, fermeture auto si succès

## Vérifications

```sql
-- Test aller-retour : INSERT tres_eleve → vue agrège correctement
SELECT * FROM v_ppa_surveillance;
-- ferme_id=demo · obs_30j=1 · critiques=1 · non_declarees=1 · derniere=2026-05-21 ✅
```

- `tsc --noEmit` sur tout le projet : ✅ 0 erreur
- Migration appliquée (psql) : ✅ table + 2 index + vue + grants OK
- HTTP 404 sur `/sanitaire/ppa` attendu (build standalone — sera 200 après `npm run build` orchestrateur)

## Conformité brief
- ✅ Pas touché `v_alertes_actives` (aucune règle PPA — différée)
- ✅ Pas touché sidebar (accessible par URL directe pour l'instant)
- ✅ Pas lancé `npm run build`
- ✅ Migration NOUVELLE (`20260522060000_*`), pas modifié existantes
- ✅ Vue avec `security_invoker=true` + GRANT anon/authenticated
- ✅ `revalidatePath` après mutation

## Fichiers créés
1. `supabase/migrations/20260522060000_ppa_surveillance.sql` (4,3 Ko)
2. `app/src/app/(app)/sanitaire/ppa/page.tsx` (15 Ko)
3. `app/src/app/(app)/sanitaire/ppa/_dialog-observation.tsx` (10 Ko)
4. `app/src/app/(app)/sanitaire/ppa/_actions.ts` (5,5 Ko)

## Notes pour orchestrateur
- Après `npm run build` + relance serveur, route `/sanitaire/ppa` disponible
- Bouton-trigger dans `/sanitaire` ou sidebar : non ajouté (hors périmètre, validation Christophe requise)
- Règle alertes PPA dans `v_alertes_actives` : à définir ultérieurement (seuils, fenêtre temporelle, gravité)
