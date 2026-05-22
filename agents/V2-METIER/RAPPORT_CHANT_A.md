# RAPPORT CHANT-A — Retour chaleur post-saillie

**Date** : 2026-05-22
**Statut** : ✅ Terminé
**Build** : non lancé (orchestrateur en fin de vague)

## Livrables

### 1. Migration SQL
**Fichier** : `supabase/migrations/20260522020000_suivi_saillie.sql` (appliquée)

- ✅ Vue `v_saillies_a_diagnostiquer` (security_invoker + GRANT anon/authenticated)
  - Cols : `saillie_id, truie_id, truie_tag, truie_nom, date_saillie, verrat_id, verrat_tag, ferme_id, jours_post_saillie, phase_diagnostic, date_mb_prevue`
  - Phase : `attente` (<18j) · `fenetre_diagnostic` (18-24j) · `fenetre_echographie` (25-35j) · `retard` (>35j)
  - Fenêtre globale : 14-45 j post-saillie, sans diagnostic ni MB
- ✅ Vue `v_alertes_actives` recréée à l'identique R01-R20 + **R21 ajoutée**
  - R21 = `R21-diagnostic-gestation-attendu` (catégorie `reproduction`, gravité `moyenne`)
  - Fenêtre 18-35 j post-saillie sans diagnostic ni MB → lien `/reproduction?diagnostic=<id>`
  - 20 règles précédentes vérifiées strict identiques (CTE + UNION ALL préservés)

### 2. Mapping UI (`src/lib/alertes-regles.ts`)
- ✅ Entrée `R21-diagnostic-gestation-attendu` ajoutée (nom, description, gravité, catégorie)
- ✅ Commentaire "20 règles" → "21 règles"
- `grep -c "R21"` = 2 (titre commentaire + clé)

### 3. UI `/reproduction` (`page.tsx`)
- ✅ Lecture de `v_saillies_a_diagnostiquer` (ordre desc `jours_post_saillie`)
- ✅ Section `<Card>` « Saillies à diagnostiquer (N) » au-dessus de l'historique
  - Liste : tag truie + nom + date saillie + J+N + badge phase + bouton « Diagnostiquer » (pré-rempli)
  - Affichage conditionnel : section masquée si liste vide
  - Sous-titre pédagogique : fenêtre 18-24 j / échographie >25 j

### 4. `_dialog-diagnostic.tsx` (amélioré)
- ✅ Schéma Zod élargi : ajout `'en_attente'` (cohérent enum SQL `resultat_gestation_t`)
- ✅ 4 boutons résultat (grille 2×2) : **GESTANTE / RETOUR CHALEUR / VIDE / EN ATTENTE**
  - Tons : success / warning / danger / info
- ✅ Encart info conditionnel (warning) si `retour_chaleur` ou `negatif` :
  - « 💡 Truie revenue en chaleur. Nouvelle saillie sous 21 j (cycle œstral). 3ᵉ retour → réforme. »
- ✅ Bouton secondaire « **Programmer nouvelle saillie maintenant** » → ouvre `DialogFaireMonter` pré-rempli avec `truie_id`
- ✅ Pré-sélection saillie via prop `defaultSaillieId` (depuis section « à diagnostiquer »)

### 5. `_dialog-faire-monter.tsx` (extension non-cassante)
- ✅ Nouveau props optionnels : `prefillTruieId`, `open`, `onOpenChange`, `trigger?`
- ✅ Mode contrôlé activable depuis l'extérieur (sans trigger DOM)
- ✅ Pré-remplit `truie_id` dans le form

### 6. `_schemas.ts`
- ✅ `resultat: z.enum([...4 valeurs])`

## Vérifications

```sql
SELECT COUNT(*) FROM v_saillies_a_diagnostiquer;       -- 0 (aucune saillie dans fenêtre)
SELECT COUNT(DISTINCT regle_id) FROM v_alertes_actives; -- 3 actuel (R10,R17,R18)
```
Test injection saillie (20 j post) → R21 ressort + phase=`fenetre_diagnostic` ✅

```bash
npx tsc --noEmit                                       # 0 erreur
grep -c "R21" .../alertes-regles.ts                    # 2
```

## Fichiers modifiés
- `supabase/migrations/20260522020000_suivi_saillie.sql` (nouveau)
- `app/src/lib/alertes-regles.ts`
- `app/src/app/(app)/reproduction/_schemas.ts`
- `app/src/app/(app)/reproduction/_dialog-diagnostic.tsx`
- `app/src/app/(app)/reproduction/_dialog-faire-monter.tsx`
- `app/src/app/(app)/reproduction/page.tsx`

## Notes pour CHANT-D
- `v_alertes_actives` recréée avec CTE en tête → pour ajouter **R22**, la déf complète sera dispo via `pg_get_viewdef`. Le pattern reste : recréer la vue complète avec `UNION ALL SELECT 'R22-...'`.
- Catalogue UI à incrémenter à 22.
