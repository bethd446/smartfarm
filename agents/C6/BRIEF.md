# CHANTIER C6 — Module Nutrition complet

## Contexte projet

Smart Farm — webapp Next.js 16 + React 19 + Tailwind v4 + Supabase Docker local. Élevage porcin Côte d'Ivoire. Vocabulaire français standard pro.

Repo : `/root/projects/smartfarm/app/`
DB Postgres locale (Supabase CLI), accès psql : `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`
DEMO_FERME_ID = `'00000000-0000-0000-0000-000000000001'`

## Tables existantes (réutilisables)

- `types_aliment` (id, nom, categorie_cible, proteine_pct, energie_kcal_kg, observations)
- `formulations` (id, ferme_id, type_aliment_id, nom, date_creation, cout_kg, actif)
- `formulation_ingredients` (formulation_id, matiere_premiere_id, pourcentage)
- `plans_alimentation` (id, bande_id, type_aliment_id, date_debut, date_fin, ration_kg_jour)
- `consommations_aliment` (id, bande_id, type_aliment_id, date, quantite_kg, cout, observations)
- `matieres_premieres` (id, ferme_id, nom, type, unite, seuil_alerte, stock_actuel, cout_moyen_unite)

## Mission C6

Construire le module Nutrition en 3 chantiers parallèles, périmètres disjoints :

---

### AGENT C6-A — Référentiel matières premières CI + concentrés industriels

**Fichiers AUTORISÉS** :
- `supabase/migrations/20260520190001_nutrition_seed.sql` (NEW) — migration ajoute colonnes manquantes + seed
- `app/src/lib/nutrition-data.ts` (NEW) — table de référence statique TS pour usage côté UI
- `app/src/app/(app)/alimentation/matieres/page.tsx` (NEW)
- `app/src/app/(app)/alimentation/matieres/_actions.ts` (NEW)
- `app/src/app/(app)/alimentation/matieres/_schemas.ts` (NEW)
- `app/src/app/(app)/alimentation/matieres/_dialog-matiere.tsx` (NEW)
- `app/src/app/(app)/alimentation/concentres/page.tsx` (NEW)

**Spec** :

1. **Migration SQL** : ajouter colonnes à `matieres_premieres` :
   - `categorie_nutritionnelle text` (céréale / tourteau / sous_produit / minéral / concentré_commercial / additif)
   - `mat_pct numeric` (Matière Azotée Totale = protéine brute, %)
   - `em_porc_kcal_kg numeric` (Énergie Métabolisable porc, kcal/kg MS)
   - `lysine_pct numeric` (lysine totale, %)
   - `methionine_pct numeric` (méthionine totale, %)
   - `calcium_pct numeric` (Ca, %)
   - `phosphore_pct numeric` (P total, %)
   - `fibre_pct numeric` (cellulose brute, %)
   - `matiere_seche_pct numeric default 88` (MS, %)
   - `origine text` (locale_ci / importée / industrielle)
   - `fournisseur text` (pour les concentrés : De Heus, Koudijs, Vitalac, Maridave, IVOGRAIN, etc.)
   - `prix_indicatif_xof_kg numeric` (référence prix CI en FCFA/kg)
   - `notes_terrain text`

2. **Seed matières premières locales CI** (15-20 items) — données issues de FAO/INRAE/CIRAD, à citer en commentaire :
   - Maïs grain (céréale, MAT 8%, EM 3300, lys 0.25%, met 0.18%, Ca 0.03%, P 0.28%, fibre 2.5%)
   - Sorgho grain (céréale, MAT 10%, EM 3250, lys 0.22%, met 0.16%, Ca 0.04%, P 0.30%, fibre 2.6%)
   - Son de blé (sous_produit, MAT 16%, EM 2200, lys 0.65%, met 0.25%, Ca 0.13%, P 1.20%, fibre 11%)
   - Son de riz (sous_produit, MAT 13%, EM 2700, lys 0.55%, met 0.30%, Ca 0.07%, P 1.80%, fibre 10%)
   - Tourteau de soja 48% (tourteau, MAT 47%, EM 3300, lys 3.0%, met 0.68%, Ca 0.30%, P 0.65%, fibre 6%)
   - Tourteau d'arachide (tourteau, MAT 45%, EM 3100, lys 1.55%, met 0.50%, Ca 0.18%, P 0.60%, fibre 8%, NOTE : risque aflatoxines)
   - Tourteau de coton (tourteau, MAT 41%, EM 2700, lys 1.65%, met 0.55%, Ca 0.20%, P 1.00%, fibre 14%, NOTE : limite gossypol 5% max ration)
   - Tourteau de palmiste (tourteau, MAT 16%, EM 2400, lys 0.55%, met 0.30%, Ca 0.30%, P 0.55%, fibre 18%)
   - Drêches de brasserie sèches (sous_produit, MAT 25%, EM 2300, lys 0.85%, met 0.45%, Ca 0.30%, P 0.55%, fibre 16%)
   - Manioc séché (céréale-substitut, MAT 2.5%, EM 3200, lys 0.10%, met 0.04%, Ca 0.15%, P 0.10%, fibre 4%)
   - Patate douce séchée (sous_produit, MAT 4%, EM 3100, lys 0.20%, met 0.08%, Ca 0.10%, P 0.10%, fibre 3.5%)
   - Farine de poisson 60% (origine_animale, MAT 60%, EM 3000, lys 4.8%, met 1.7%, Ca 6.0%, P 3.2%, fibre 1%)
   - Carbonate de calcium / coquilles (minéral, Ca 38%, P 0%)
   - Phosphate bicalcique (minéral, Ca 24%, P 18%)
   - Sel marin (minéral)
   - Huile de palme (additif énergie, EM 8500, MAT 0%)
   - L-Lysine HCl (additif AA, lys 78%)
   - DL-Méthionine (additif AA, met 99%)
   - Prémix vitamine-minéral porc croissance (additif)
   - Prémix vitamine-minéral porc gestation/lactation (additif)

3. **Seed concentrés industriels CI** (10-12 items types, marques réelles distribuées en CI) :
   - **IVOGRAIN** (CI, leader local) : Porcelet 1er âge, Croissance, Finition, Truie gestante, Truie allaitante
   - **De Heus** (importé) : Pre-starter, Starter, Grower, Finisher
   - **Koudijs / NUTRECO** : équivalents
   - **Vitalac** (importé fr) : gamme Porc
   - **Maridave** : si dispo
   - Pour chaque concentré : nom, fournisseur, categorie_cible (porcelet/croissance/finition/truie/verrat), MAT, EM, lys, met, Ca, P, prix_indicatif FCFA/kg
   - **Fournir références plausibles documentées en commentaire** — pas d'invention de marques fictives. Si tu n'es pas certain d'un produit, marque-le "à confirmer" dans `notes_terrain`.

4. **`lib/nutrition-data.ts`** :
   - Export `BESOINS_NUTRITIONNELS` : table de besoins par stade (porcelet 5-15kg, porcelet 15-30kg, croissance 30-60kg, finition 60-110kg, truie gestante, truie allaitante, verrat) avec MAT_min, EM_min_kcal, lys_min_pct, met_min_pct, Ca_min, P_min
   - Sources NRC 2012 (porc) + INRA 2018, à citer en commentaire

5. **Page `/alimentation/matieres`** :
   - Tableau filtrable par catégorie (céréale/tourteau/sous_produit/minéral/additif)
   - Colonnes : Nom · Origine · MAT% · EM kcal/kg · Lys% · Met% · Ca% · P% · Prix XOF/kg · Stock · Actions
   - Recherche texte
   - Dialog créer/éditer matière (CRUD)
   - Bouton "Réinitialiser au catalogue standard"

6. **Page `/alimentation/concentres`** :
   - Filtres par fournisseur (IVOGRAIN/De Heus/Koudijs/Vitalac) et stade (porcelet/croissance/finition/truie/verrat)
   - Cards par concentré avec : marque · stade · MAT/EM/lys/met · prix · "ajouter en stock"

**Définition de DONE** :
- Migration appliquée : `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/20260520190001_nutrition_seed.sql`
- 15+ matières premières et 8+ concentrés en DB
- Pages HTTP 200
- `npm run build` ✅

---

### AGENT C6-B — Calculateur de formule (least-cost / rationnement)

**Fichiers AUTORISÉS** :
- `app/src/app/(app)/alimentation/formulation/page.tsx` (NEW) — liste formulations
- `app/src/app/(app)/alimentation/formulation/nouveau/page.tsx` (NEW) — éditeur calculateur
- `app/src/app/(app)/alimentation/formulation/_actions.ts` (NEW)
- `app/src/app/(app)/alimentation/formulation/_schemas.ts` (NEW)
- `app/src/app/(app)/alimentation/formulation/_calculator.tsx` (NEW) — composant client React calcul live
- `app/src/lib/nutrition-engine.ts` (NEW) — moteur calcul nutritionnel pur (sans React, testable)

**Spec** :

1. **`lib/nutrition-engine.ts`** — fonctions pures :
   ```ts
   type Ingredient = { id: string; nom: string; pourcentage: number; mat_pct, em_porc_kcal_kg, lysine_pct, methionine_pct, calcium_pct, phosphore_pct, fibre_pct, prix_xof_kg }
   
   computeMixNutrition(ingredients: Ingredient[]): {
     totalPct: number
     mat_pct: number      // somme pondérée
     em_kcal_kg: number
     lysine_pct: number
     methionine_pct: number
     calcium_pct: number
     phosphore_pct: number
     fibre_pct: number
     cout_kg_xof: number
   }
   
   compareWithRequirements(mix, stade: 'porcelet_1' | 'porcelet_2' | 'croissance' | 'finition' | 'gestante' | 'allaitante' | 'verrat'): {
     ok: boolean
     ecarts: { nutrient: string; valeur: number; cible: number; statut: 'ok' | 'sous' | 'sur'; ecart_pct: number }[]
   }
   ```

2. **Page `/alimentation/formulation`** : liste des formulations enregistrées (table : nom, stade cible, MAT, EM, lys, coût/kg, statut conformité, actions)

3. **Page `/alimentation/formulation/nouveau`** (calculateur interactif) :
   - **Étape 1** : choisir stade cible (porcelet_2 / croissance / finition / truie / verrat) → affiche les besoins NRC/INRA en sidebar
   - **Étape 2** : ajouter ingrédients depuis catalogue matières premières + concentrés (autocomplete)
   - **Étape 3** : ajuster pourcentages avec sliders ou inputs numériques
   - **Étape 4** : tableau récap nutritionnel **en temps réel** :
     - MAT % (vert si ≥ cible, rouge si < cible -5%, orange entre)
     - EM kcal/kg
     - Lysine % (essentiel)
     - Méthionine %
     - Ratio Ca/P
     - Coût FCFA/kg
   - **Validation** : total ingrédients = 100% exactement (sinon disable submit)
   - Bouton "Enregistrer formulation" → INSERT en `formulations` + `formulation_ingredients`

4. **Préréglages "formules type"** : 4 boutons d'aide en haut de l'éditeur, qui pré-remplissent une formule de départ :
   - "Porcelet 1er âge type" (80% concentré + 20% maïs)
   - "Croissance maïs/soja/son" (60% maïs + 22% tourteau soja + 15% son blé + 3% premix+CaCO3)
   - "Finition manioc/tourteau" (50% maïs + 20% manioc + 20% tourteau soja + 10% son)
   - "Truie allaitante" (50% maïs + 25% tourteau soja + 15% son blé + 5% farine poisson + 5% prémix/minéraux)

**Définition de DONE** :
- Page formulation accessible
- Calculateur fait l'arithmétique correctement (testé avec un mix simple : 60% maïs + 30% tourteau soja + 10% prémix → MAT attendu ~ 0.6×8 + 0.3×47 + 0.1×0 = 18.9%)
- Sauvegarde en DB possible (formulation + ingrédients)
- `npm run build` ✅

---

### AGENT C6-C — Plans d'alimentation par bande + consommations + dashboard

**Fichiers AUTORISÉS** :
- `app/src/app/(app)/alimentation/plans/page.tsx` (NEW) — liste plans par bande
- `app/src/app/(app)/alimentation/plans/_actions.ts` (NEW)
- `app/src/app/(app)/alimentation/plans/_schemas.ts` (NEW)
- `app/src/app/(app)/alimentation/plans/_dialog-plan.tsx` (NEW)
- `app/src/app/(app)/alimentation/consommations/page.tsx` (NEW)
- `app/src/app/(app)/alimentation/consommations/_actions.ts` (NEW)
- `app/src/app/(app)/alimentation/consommations/_dialog-conso.tsx` (NEW)
- `app/src/app/(app)/alimentation/_components/nutrition-stats.tsx` (NEW)
- `app/src/app/(app)/alimentation/page.tsx` (MODIFY) — refondre la page hub avec :
  - 4 KPI cards (en haut) : Conso 30j total kg / Coût 30j XOF / IC moyen / Stock j restants
  - 4 cards de navigation : Matières premières · Concentrés · Formulation · Plans · Consommations
  - Pas plus, pas moins

**Spec plans d'alimentation** :
- CRUD plan : bande_id, type_aliment_id (ou formulation_id), date_debut, date_fin, ration_kg_jour
- Affichage : tableau filtrable par bande active, statut (en cours / terminé / à venir)

**Spec consommations** :
- Saisie quotidienne / hebdomadaire : bande_id, type_aliment_id, date, quantite_kg, cout
- Liste dernières 30 entrées
- Export CSV (utiliser `ExportButton` existant si dispo)

**Spec dashboard stats** (`_components/nutrition-stats.tsx`) :
1. Conso 30j (kg total) — somme consommations_aliment 30 derniers jours
2. Coût 30j (XOF) — somme cout
3. IC moyen — si pesées disponibles : (kg aliment total période) / (kg vif produit période). Sinon "—"
4. Stock j restants — pour la matière première la + utilisée : `stock_actuel / conso_moyenne_jour`

**Définition de DONE** :
- Pages plans + consommations HTTP 200
- Page alim refondue avec 4 KPI + 5 cards nav
- `npm run build` ✅

---

## Contraintes communes — TOUS LES AGENTS

1. Vocabulaire FR standard pro
2. UI : `@/components/ui/{card,badge,button,dialog,select,input,table}` + Radix (déjà migrés)
3. Server Components par défaut, `'use client'` uniquement quand interactif (calculateur)
4. Server Actions : schemas Zod dans `_schemas.ts` séparé
5. Pas de hardcoded hex (utiliser `var(--sf-primary)` etc.)
6. Date : `date-fns` locale fr
7. Toast : `sonner`
8. Devise : **FCFA / XOF** (pas €, pas $)
9. **Sources médicales/nutritionnelles obligatoires en commentaire** (NRC 2012, INRA 2018, FAO, IFIP, CIRAD)
10. Vérif finale : `cd /root/projects/smartfarm/app && npm run build`
11. Test HTTP au minimum 1 route par chantier : `curl -sI http://localhost:3000/alimentation/<route>`

## Hors-périmètre — INTERDIT
- Reproduction, mises-bas, pesées, sanitaire, stock, cheptel, bandes
- Sidebar/layout
- Composants UI base
- Page `/alimentation/page.tsx` : uniquement l'agent C6-C peut la modifier

## Livrable rapport (chacun)
1. Liste fichiers créés/modifiés
2. Sortie build (15 dernières lignes minimum)
3. Curl HTTP 200 sur 1 route par chantier
4. Hypothèses et choix techniques

GO.
