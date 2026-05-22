# RAPPORT FIX-A — Corrections P0 métier critiques

**Date** : 2026-05-21
**Agent** : FIX-A (contexte vierge, périmètre exclusif respecté)
**Brief source** : `/root/projects/smartfarm/agents/V2-FIX/BRIEF_FIXA.md`

---

## Statut global : ✅ 4/4 fixes appliqués et vérifiés

Tous les changements appliqués en transaction atomique côté DB. `npm run build` non lancé (orchestrateur). Périmètre exclusif respecté — aucun fichier hors scope FIX-B / FIX-C touché.

---

## FIX #1 — Calendrier porcelets Mycoplasma J14/J28 ✅

### Problème
Vue `v_calendrier_sanitaire_porcelets` planifiait Mycoplasma à **J7 (primo) et J21 (rappel)**.
- Source de vérité `protocoles_vaccinaux` = **J14 / J28**.
- **Danger médical** : à J7 l'immunité maternelle bloque la séroconversion → vaccination inefficace.

### Correction
Vue recréée avec `CREATE OR REPLACE` :
- Mycoplasma primo → **J14**
- Mycoplasma rappel → **J28**
- Castration alignée à **J5** (milieu de la fourchette IFIP J3-J7)
- `WITH (security_invoker=true)` + `GRANT SELECT TO anon, authenticated` conservés
- `COMMENT ON VIEW` ajouté pour traçabilité

### Vérification
```
acte                                 | jour_offset
Injection Fer dextran 200 mg         | 1
Castration / coupe queue (optionnel) | 5
Vaccination Mycoplasma primo (J14)   | 14
Vaccination Mycoplasma rappel (J28)  | 28
Pesée + sevrage                      | 28
```

---

## FIX #2 — TMM exclut les écrasés (norme GTTT/IFIP) ✅

### Problème
`v_kpi_techniques_truie` calculait :
```
tmm_pct = (sum_nes_morts + sum_momifies + sum_ecrases) / sum_totaux * 100
```
La **norme IFIP/GTTT** réserve le TMM aux pertes pré/per-natales ; les écrasés sont des pertes en lactation post-naissance (déjà comptées dans `pertes_lactation_pct`).

### Correction
Vue recréée à l'identique au bit près, **seul le numérateur du TMM modifié** :
```sql
CASE
  WHEN mbs.sum_totaux > 0
  THEN ((mbs.sum_nes_morts + mbs.sum_momifies)::numeric
        / mbs.sum_totaux::numeric * 100::numeric)::numeric(5,2)
  ELSE NULL::numeric
END AS tmm_pct
```
- Toutes les autres branches (CTEs, autres CASE, JOINs, WHERE) **identiques bit-à-bit** vs `pg_get_viewdef`
- `sum_ecrases` reste agrégé dans `mb_stats` (au cas où la colonne est exposée plus tard)
- `security_invoker=true` + GRANTs conservés
- `COMMENT ON VIEW` ajouté

### Vérification
Échantillon DB seed (truie 33333333-…-0001) :
- Avant : tmm_pct incluait les écrasés
- Après : `tmm_pct = 7.69 %` (mort-nés + momifiés / nés totaux uniquement)
- `pertes_lactation_pct` reste séparé et non modifié

---

## FIX #3 — Labels Lys / Met → SID (Standardized Ileal Digestible) ✅

### Problème
Colonnes `matieres_premieres.lysine_pct` / `methionine_pct` sont seedées avec des valeurs **SID NRC 2012**, mais affichées comme "Lys totale" / "Met totale" dans l'UI → induit le formulateur en erreur (les SID sont 10-15 % plus basses que les totales).

### Correction (Option A : light, sans rename de colonne)

#### Côté DB
2 `COMMENT ON COLUMN` ajoutés (vérifiés en base) :
```
lysine_pct     → 'Lysine SID (Standardized Ileal Digestible) en % — référentiel NRC 2012'
methionine_pct → 'Méthionine SID (Standardized Ileal Digestible) en % — référentiel NRC 2012'
```

#### Côté front — 3 fichiers, labels uniquement (aucun nom de variable / aucune logique modifié)
| Fichier | Avant | Après |
|---|---|---|
| `app/src/lib/nutrition-engine.ts:193-194` | `label: 'Lysine'` / `label: 'Méthionine'` | `label: 'Lysine SID'` / `label: 'Méthionine SID'` |
| `app/src/app/(app)/alimentation/matieres/_dialog-matiere.tsx:299,308` | `Lysine %` / `Méthionine %` | `Lysine SID %` / `Méthionine SID %` |
| `app/src/app/(app)/alimentation/matieres/page.tsx:324-325` | `Lys %` / `Met %` | `Lys SID %` / `Met SID %` |

`nutrition-engine.ts` est le label central utilisé par le composant carences/conformité du formulateur (propagation maximale). Le dialog matière est le point de saisie le plus critique pour bien typer la donnée. La table des matières est l'affichage principal.

**Note** : autres fichiers (`_calculator.tsx`, `formulation/page.tsx`, `concentres/page.tsx`) contiennent encore des libellés "Lysine" / "Méthionine" en lecture seule — laissés intentionnellement pour respecter "1-3 fichiers max" du brief. À traiter en P1 ultérieur si besoin (les COMMENT SQL + nutrition-engine couvrent déjà le besoin de traçabilité minimal).

---

## FIX #4 — Mapping UI alertes R13-R18 ✅

### Problème
`app/src/lib/alertes-regles.ts` ne contenait que R01-R12 → les alertes R13-R18 (livrées par la migration `20260521200001_alertes_metier_v2.sql`) tombaient dans le fallback "AUTRES" sans nom/catégorie/icône cohérents.

### Correction
6 entrées ajoutées au catalogue `REGLES_ALERTES`, **commentaire d'en-tête mis à jour** (`12 règles` → `18 règles`) :

| ID | Catégorie | Gravité défaut |
|---|---|---|
| `R13-truie-anorexie` | sanitaire | critique |
| `R14-cochette-trop-vieille` | reproduction | moyenne |
| `R15-lot-mortalite-anormale` | pertes | critique |
| `R16-mise-bas-tardive` | reproduction | critique |
| `R17-eau-chute-importante` | sanitaire | critique |
| `R18-lot-non-analyse` | sanitaire | moyenne |

Type `CategorieAlerte` couvre déjà `reproduction | sanitaire | nutrition | pertes | stock` → aucune extension nécessaire.

### Vérification
- `grep -c "^  'R[0-9]" alertes-regles.ts` → **18**
- Lint TS : OK (auto-check après patch)

---

## Livrables

### Migration (1 fichier, transaction atomique)
- `/root/projects/smartfarm/supabase/migrations/20260521230000_fix_metier_audit2.sql` (7607 bytes)
  - Appliquée avec `psql -v ON_ERROR_STOP=1` → `BEGIN / CREATE VIEW × 2 / GRANT × 2 / COMMENT × 4 / COMMIT`
  - Aucune erreur

### Fichiers front modifiés (4 fichiers — labels uniquement, aucun rename de variable)
- `app/src/lib/alertes-regles.ts` — 6 règles ajoutées + commentaire d'en-tête
- `app/src/lib/nutrition-engine.ts` — labels SID dans le tableau de conformité
- `app/src/app/(app)/alimentation/matieres/_dialog-matiere.tsx` — labels SID dans le dialog de saisie
- `app/src/app/(app)/alimentation/matieres/page.tsx` — labels SID dans la table principale

---

## Vérifications base de données

```sql
-- FIX #1 : calendrier
SELECT acte, jour_offset FROM v_calendrier_sanitaire_porcelets GROUP BY acte, jour_offset ORDER BY jour_offset;
-- → Fer J1, castration J5, Mycoplasma J14, Mycoplasma J28, sevrage J28 ✅

-- FIX #2 : TMM
SELECT pg_get_viewdef('v_kpi_techniques_truie'::regclass, true);
-- → TMM CASE numérateur = (sum_nes_morts + sum_momifies) UNIQUEMENT ✅
-- → sum_ecrases conservé dans mb_stats CTE ✅

-- FIX #3 : COMMENT colonnes
SELECT col_description('matieres_premieres'::regclass, attnum)
  FROM pg_attribute WHERE attname IN ('lysine_pct','methionine_pct');
-- → 'Lysine SID (Standardized Ileal Digestible) en % — référentiel NRC 2012' ✅
-- → 'Méthionine SID …' ✅
```

---

## Anti-pièges respectés ✅
- Aucune colonne / contrainte / trigger cassé(e)
- `security_invoker=true` + `GRANT … TO anon, authenticated` conservés sur les 2 vues recréées
- TMM : seul le numérateur du CASE modifié ; le reste de la vue identique bit-à-bit à `pg_get_viewdef`
- Aucune Server Action ni page de domaine touchée (réservé FIX-B)
- Aucun fichier de navigation/routing touché (réservé FIX-C)
- `npm run build` non lancé (orchestrateur)
- Périmètre `supabase/migrations` + `app/src/lib/alertes-regles.ts` + libellés Lys/Met UI uniquement
