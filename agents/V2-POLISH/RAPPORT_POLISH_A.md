# Rapport POLISH-A — Métier porcin critique restant

**Agent** : POLISH-A (Producteur Sonnet, contexte vierge)
**Date** : 2026-05-21
**Périmètre** : 4 fix métier P1 identifiés par l'audit V2 Round 2
**Statut** : ✅ Tous les fix livrés, TS clean, migration appliquée, R19 vérifiée

---

## Livrables

| # | Type | Fichier | Statut |
|---|------|---------|--------|
| 1 | Migration SQL | `supabase/migrations/20260522000000_polish_a_metier.sql` | ✅ appliquée |
| 2 | Lib TS modifiée | `app/src/lib/alertes-regles.ts` (18 → 19 règles) | ✅ |
| 3 | Lib TS modifiée | `app/src/lib/nutrition-engine.ts` (+ Thr/Trp/Cys, + ratios AA, + heat stress) | ✅ |
| 4 | Lib TS créée | `app/src/lib/repro-cibles.ts` (cibles BCS) | ✅ |

Vérifications :
- `npx tsc --noEmit` → 0 erreur
- `psql ... v_alertes_actives` → 19 branches OK
- Test R19 (sim suppression diag T-003) → R19 se déclenche, R01 reste muet (cf. § « Cas test »)

---

## Fix #1 — Split R01 vide vs R19 mise-bas attendue sans diag

### Bug audit
T-003 (saillie 25/01/2026, J116 = zone gestation post-terme) était libellée
*« Truie T-003 vide depuis 116 jours »* par R01. R04 (gestante en retard) ne se
déclenchait pas car repose sur un diagnostic positif. Avant le fix la truie
tombait dans le mauvais bucket sémantique.

### Changements DB (vue `v_alertes_actives`)
- **R01** : ajout condition d'exclusion `NOT (derniere_saillie IS NOT NULL AND CURRENT_DATE - derniere_saillie BETWEEN 110 AND 130)`. Les truies en zone de mise-bas attendue ne sont plus considérées comme « vides ».
- **R19 (nouvelle)** : `R19-mise-bas-attendue-sans-diag`, gravité `élevée`,
  cible `truie`. Déclenchement :
  - dernière saillie entre J110 et J130
  - aucune MB enregistrée postérieure à cette saillie
  - aucun diagnostic gestation sur la saillie en question
  → ramène toutes les truies « zone d'ombre » sous une seule alerte actionnable.

La vue a été reconstruite intégralement (`DROP VIEW … CREATE VIEW`) en
recopiant les 18 branches existantes (R01 modifiée + R02–R18 à l'identique)
puis en ajoutant R19. `security_invoker=true` + `GRANT SELECT TO anon,
authenticated` préservés.

### Changement front
`alertes-regles.ts` : ajout de l'entrée `R19-mise-bas-attendue-sans-diag`
(catégorie `reproduction`, gravité `élevée`). Header de catalogue passé de
« 18 règles » à « 19 règles ».

### Cas test (rolled-back)
```sql
BEGIN;
DELETE FROM diagnostics_gestation
 WHERE saillie_id IN (SELECT id FROM saillies WHERE truie_id = (SELECT id FROM animaux WHERE tag='T-003'));
SELECT regle_id, titre FROM v_alertes_actives WHERE cible_label='T-003';
-- → R19-mise-bas-attendue-sans-diag : "Truie T-003 : mise-bas attendue, J116 post-saillie (2026-01-25) sans diagnostic ni MB"
ROLLBACK;
```
Conforme à la sémantique attendue.

---

## Fix #2 — Ratios AA idéaux + Thr / Trp / Cys

### DB
3 colonnes ajoutées sur `matieres_premieres` :
- `threonine_pct   numeric(6,3)`
- `tryptophane_pct numeric(6,3)`
- `cystine_pct     numeric(6,3)`

Toutes commentées NRC 2012.

Seeds appliqués (vérifiés en base) :
- **Maïs grain** : Thr 0.27 / Trp 0.07 / Cys 0.21
- **Tourteau de soja 48%** : Thr 1.74 / Trp 0.62 / Cys 0.66
- **Tourteau de soja 44%** : `UPDATE 0` (cette matière n'existe pas dans le seed actuel — sera complétée si introduite plus tard, brief tolère NULL)

Les autres matières (arachide, coton, son, manioc, farine de poisson, prémix) gardent `NULL` — à compléter dans un sprint dédié AA.

### `nutrition-engine.ts`
- Champs `threonine_pct` / `tryptophane_pct` / `cystine_pct` ajoutés à `Ingredient` (optionnels) et `MixNutrition` (calculés).
- `computeMixNutrition` pondère désormais ces 3 AA via la même mécanique
  Σ(pct_i × valeur_i)/100.
- Nouveau type `FormulationCalculee` et fonction `calculerRatiosAA` :
  - `thr_sur_lys_pct`     = Thr/Lys × 100
  - `trp_sur_lys_pct`     = Trp/Lys × 100
  - `met_cys_sur_lys_pct` = (Met+Cys)/Lys × 100
  - `lys_sur_em_g_par_mcal` = Lys × 10 / (EM/1000)
  Retourne `null` si lysine ou nutriment manquant (l'UI doit afficher « — »).
- Nouvelle constante `CIBLES_RATIOS_AA` (NRC 2012 Tables 17-1 / 17-7), 4 stades :
  - croissance : Thr/Lys 62-65, Trp/Lys 18-22, (Met+Cys)/Lys 55-60, Lys/EM 3.0-3.5
  - finition   : 65-67 / 18-22 / 55-60 / 2.8-3.2
  - gestation  : 65-67 / 19-22 / 55-60 / 2.8-3.0
  - lactation  : 62-65 / 18-20 / 55-58 / 3.2-3.5

### Pages consommatrices (NON modifiées, signal pour Christophe)
`computeMixNutrition` / `MixNutrition` sont consommés par :
- `app/src/app/(app)/alimentation/formulation/page.tsx`
- `app/src/app/(app)/alimentation/formulation/_calculator.tsx`

→ **Les ajouts sont strictement additifs** (champs optionnels sur `Ingredient`,
nouveaux champs sur `MixNutrition`), donc `tsc --noEmit` reste vert sur ces
fichiers. La page n'affiche pas encore les ratios AA : elle pourra
brancher `calculerRatiosAA(mix)` quand le sprint UI prendra le sujet.

---

## Fix #3 — Cibles BCS par stade (`repro-cibles.ts`)

Nouveau fichier `app/src/lib/repro-cibles.ts` :
- Type `StadeBCS` = `'saillie' | 'mi_gestation' | 'fin_gestation' | 'mise_bas' | 'sevrage'`
- Constante `CIBLES_BCS` (INRAE / IFIP), bornes (min / ideal / max) :
  - saillie       : 3.0 / 3.5 / 4.0
  - mi_gestation  : 3.5 / 3.5 / 4.0
  - fin_gestation : 3.5 / 4.0 / 4.5
  - mise_bas      : 3.5 / 4.0 / 4.5
  - sevrage       : 2.5 / 3.0 / 3.5
- `LABEL_STADE_BCS` (FR pro pour UI)
- Fonctions :
  - `bcsAlerte(stade, bcs): 'ok' | 'maigre' | 'grasse'`
  - `evaluerBCS(stade, bcs)` (variante riche : verdict + cible + écarts min/max/ideal)

Aucune page ne consomme encore — exposé pour future PR (BCS UI dans
maternité / saillie).

---

## Fix #4 — Heat stress tropical (CI saison chaude)

Ajouté à `nutrition-engine.ts` (constantes pures, pas de fonction) :

- `AJUSTEMENT_HEAT_STRESS` (multiplicateurs à appliquer si T° ambiante > 27 °C) :
  - ingéré truie lactation : **× 0.85** (−15 %)
  - ingéré truie gestation : **× 0.92** (−8 %)
  - eau truie lactation    : **× 1.50** (+50 %)
  - eau truie gestation    : **× 1.30** (+30 %)
  - densité EM recommandée : **3200 kcal/kg** (vs 3000 standard)
  - densité Lys SID recommandée : **1.10 %** (vs 0.95 standard)

- `RECOMMANDATIONS_HEAT_STRESS` (`readonly string[]`, 5 messages prêts pour l'UI) : distribution fractionnée 2/3 matin + 1/3 soir, débit abreuvoir ≥ 4 L/min, densification ration, surveillance T° truie (alerte 39.5°C / urgence 40°C), brumisateurs+ventilateurs à T°>30°C.

Aucune logique exécutée — pures données. À consommer par la future page
« conditions d'élevage » / chatbot conseiller.

---

## Vérifications

```bash
# 1. TypeScript propre
$ cd app && npx tsc --noEmit
(exit 0, aucune erreur)

# 2. Migration appliquée
$ psql ... < 20260522000000_polish_a_metier.sql
BEGIN, 3× ALTER TABLE, 3× COMMENT, 2× UPDATE 1, 1× UPDATE 0,
DROP VIEW, CREATE VIEW, COMMENT, GRANT, COMMIT

# 3. Vue alertes : 19 règles disponibles
$ psql -c "SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id;"
(actuellement seulement R10/R17/R18 ont des données — fonctionnel mais
catalogue complet : la vue contient bien les 19 branches.)

# 4. Test sémantique R19 (rolled-back, cf. § Cas test)
→ Quand T-003 perd son diag : R01 reste muet, R19 lève le bon message. ✅
```

---

## Anti-pièges respectés

- `security_invoker=true` + `GRANT SELECT ... TO anon, authenticated` recopiés sur la vue.
- Aucune page front modifiée (uniquement `lib/` et `migrations/`).
- 1 seule migration créée (`20260522000000_polish_a_metier.sql`).
- `npm run build` non lancé (conformément au brief).
- POLISH-C qui suit pourra recréer / étendre `v_alertes_actives` à partir de la définition figée ici (catalogue 19 règles, R01 corrigé, R19 ajoutée).

---

## Fichiers touchés (résumé)

```
A supabase/migrations/20260522000000_polish_a_metier.sql      (nouvelle, 27 KB)
M app/src/lib/alertes-regles.ts                                (+8 lignes : R19)
M app/src/lib/nutrition-engine.ts                              (+165 lignes : Thr/Trp/Cys + ratios AA + heat stress)
A app/src/lib/repro-cibles.ts                                  (nouveau, 4.8 KB : CIBLES_BCS + helpers)
```

**Aucun fichier hors périmètre touché.**
