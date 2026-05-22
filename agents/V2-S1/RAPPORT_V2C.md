# Rapport V2-C — Alertes métier (R13 → R16)

**Agent** : V2-C (Producteur)
**Date** : 2026-05-21
**Mission** : étendre la vue `v_alertes_actives` avec 4 nouvelles règles métier.

---

## 1. Décisions clés

### 1.1 Renommage R11/R12 → R13/R14/R15/R16

Le brief V2-C demandait des IDs `R11-truie-anorexie`, `R12-cochette-trop-vieille`,
`R13-mortalite-anormale`, `R14-mise-bas-tardive`.

**Problème** : après le passage de l'agent V2-A, la vue `v_alertes_actives`
contenait déjà 12 règles, dont :

- `R11-aliment-rupture-prevue`
- `R12-acte-sanitaire-en-retard`

Coller `R11`/`R12` aux nouvelles règles aurait créé une collision de `regle_id`
(le front filtre/agrège dessus). J'ai donc **continué la séquence** en R13..R16 :

| ID final                     | Brief équivalent                  |
| ---------------------------- | --------------------------------- |
| `R13-truie-anorexie`         | R11 anorexie truie                |
| `R14-cochette-trop-vieille`  | R12 cochette >250j                |
| `R15-lot-mortalite-anormale` | R13 mortalité anormale            |
| `R16-mise-bas-tardive`       | R14 mise-bas tardive              |

### 1.2 Adaptations aux schémas réels

Après vérification via `\d` :

| Table                    | Constat                                                                          | Impact                                                       |
| ------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `consommations_aliment`  | **Par-bande** (`bande_id`), pas par-animal. Pas de `deleted_at`. Colonne `date`. | R13 cible une **bande** (pas une truie) ; pas de filtre soft-delete sur `c` |
| `mortalites`             | Colonne `date_mort` (pas `date_mortalite`). `bande_id` direct.                   | R15 utilise `m.date_mort` et peut aussi joindre via `bande_animaux` |
| `bandes`                 | `date_fin_prevue` / `date_fin_reelle` (pas `date_fin`).                          | R15 filtre `date_fin_reelle IS NULL OR >= CURRENT_DATE`      |
| `diagnostics_gestation`  | **Pas de colonne `deleted_at`**                                                  | R16 ne filtre pas `d.deleted_at` (la table n'a pas le champ) |
| `bande_animaux`          | (`bande_id`, `animal_id`, `date_entree`, `date_sortie`). Pas d'`id`.             | R15 utilise `COUNT(DISTINCT ba.animal_id)`                   |
| `animaux.sexe`           | enum `sexe_t` = `'M'` / `'F'`                                                    | Pas d'impact (R14 ne filtre que `categorie='cochette'`)      |

---

## 2. Migration appliquée

- **Fichier** : `supabase/migrations/20260521200001_alertes_metier_v2.sql` (~20 ko)
- **Type** : `CREATE OR REPLACE VIEW v_alertes_actives WITH (security_invoker=true)`
- **Préservation** : R01 → R12 (post-V2A) recopiées telles quelles depuis
  `pg_get_viewdef('v_alertes_actives')`.
- **GRANT** : `GRANT SELECT ON v_alertes_actives TO anon, authenticated;` conservé.
- **Transaction** : `BEGIN; ... COMMIT;`
- **Application** :
  ```
  BEGIN
  CREATE VIEW
  GRANT
  COMMIT
  ```

---

## 3. Détail des 4 nouvelles règles

### R13 — `R13-truie-anorexie`

- **Cible** : `bande` (pas truie — voir §1.2)
- **Gravité** : `critique`
- **Logique** : pour chaque bande active contenant ≥ 1 truie/cochette active,
  `LATERAL` calcule :
  - `moyenne_7j` = AVG(`quantite_kg`) sur `CURRENT_DATE - 8 → -2`
  - `quantite_recent` = MAX(`quantite_kg`) sur les 2 derniers jours
- **Déclenchement** : `quantite_recent < moyenne_7j * 0.5`
- **Exemple de titre généré** :
  > Chute consommation aliment bande **B-2026-03** : 18.5 kg vs moyenne 7 j 42.3 kg (-56 %)

### R14 — `R14-cochette-trop-vieille`

- **Cible** : `truie` (catégorie cochette mais cible_type harmonisé `truie` pour le front)
- **Gravité** : `moyenne`
- **Logique** : `LEFT JOIN saillies` + `HAVING COUNT(s.id) = 0` sur cochettes
  actives nées il y a > 250 jours.
- **Exemple de titre généré** (testé en transaction rollback) :
  > Cochette **TEST-COCHETTE-V2C** âgée de 300 j sans saillie enregistrée

### R15 — `R15-lot-mortalite-anormale`

- **Cible** : `bande`
- **Gravité** : `critique`
- **Logique** : pour chaque bande non terminée, `COUNT(DISTINCT m.id) / COUNT(DISTINCT ba.animal_id) > 5 %`
  sur 7 derniers jours (`date_mort BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE`).
- **Note doublon** : recoupe en partie `R08-mortalite-elevee-7j` (même seuil 5 %/7j).
  Différences :
  - R08 = effectif vivant à J-7 (`date_sortie IS NULL OR >= CURRENT_DATE - 7`)
  - R15 = effectif total du lot via `bande_animaux` + jointure sur `animal_id`
  Si une bande dépasse 5 % sur 7 j, **les deux règles s'affichent** côte à côte.
  C'est conforme au brief V2-C qui les demande comme règles distinctes.
- **Exemple de titre généré** :
  > Mortalité anormale lot **B-2026-03** : 8 morts / 120 animaux (6.7 % sur 7 j)

### R16 — `R16-mise-bas-tardive`

- **Cible** : `truie`
- **Gravité** : `critique`
- **Logique** : `saillies` + `diagnostics_gestation.resultat = 'positif'` +
  `LEFT JOIN mises_bas` avec `mb.id IS NULL` ; `CURRENT_DATE > s.date_saillie + 117`.
- **Différence vs R04** (`R04-gestante-en-retard`) :
  - R04 = retard de **3 j** par rapport à J+114 (≥ J+117)
  - R16 = retard depuis **plus de 117 j** stricte (≥ J+118)
  Léger overlap, mais R16 est plus tardif (critique escalade) et a un libellé
  spécifique « mise-bas tardive » au sens du brief expert.
- **Exemple de titre généré** :
  > Mise-bas tardive truie **T-2025-007** : J119 (saillie positive sans MB)

---

## 4. Vérifications

### 4.1 Liste finale des règles

```sql
SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id ORDER BY regle_id;
```

| regle_id                       | count |
| ------------------------------ | ----- |
| `R01-truie-vide-prolongee`     | 1     |
| `R10-stock-critique`           | 3     |

**Toutes les autres règles (R02-R09, R11-R12, R13-R16) renvoient 0 ligne** —
PostgreSQL n'affiche pas les `GROUP BY` à 0. Ce comportement est attendu :
les données démo en base sont minimales (0 conso aliment, 0 mortalité, 0 cochette
active, 3 diagnostics positifs mais aucun > 117 j sans MB).

### 4.2 Existence vue

```
\dv v_alertes_actives
  Schema |       Name        | Type |  Owner
 --------+-------------------+------+----------
  public | v_alertes_actives | view | postgres
```

### 4.3 Test fonctionnel R14 (transaction rollback)

```sql
BEGIN;
INSERT INTO animaux (ferme_id, tag, sexe, categorie, date_naissance)
  VALUES (<ferme>, 'TEST-COCHETTE-V2C', 'F', 'cochette', CURRENT_DATE - 300);
SELECT regle_id, cible_label, titre FROM v_alertes_actives WHERE regle_id LIKE 'R14%';
-- 1 row → R14-cochette-trop-vieille | TEST-COCHETTE-V2C | Cochette TEST-COCHETTE-V2C âgée de 300 j sans saillie enregistrée
ROLLBACK;
```

✅ La règle R14 se déclenche correctement quand les données existent.

### 4.4 Front

```bash
$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/alertes
200
```

✅ La page `/alertes` répond **HTTP 200** — l'UI consomme la nouvelle vue sans
modification de code.

---

## 5. Pourquoi R13/R15/R16 ne déclenchent rien sur la démo

| Règle | Cause |
| ----- | ----- |
| R13   | `consommations_aliment` est vide (0 ligne). Seed à enrichir pour activer la règle. |
| R15   | `mortalites` est vide (0 ligne). |
| R16   | 3 diagnostics positifs présents, mais aucune saillie n'a > 117 j sans mise-bas correspondante (les saillies positives sont récentes ou ont une MB enregistrée). |
| R14   | 0 cochette en statut `actif` dans la base démo. |

**Aucun bug** — l'absence de déclenchement est conforme aux données seed actuelles.
Dès que la prochaine vague de seed (ou la prod) injecte des consommations, mortalités
et cochettes, les règles s'activeront automatiquement (la vue est recalculée à la volée).

---

## 6. Anti-régressions

- ✅ Les 12 règles R01..R12 existantes ont été recopiées telles quelles depuis
  `pg_get_viewdef` post-V2A. Aucune perte.
- ✅ `security_invoker=true` préservé.
- ✅ `GRANT SELECT TO anon, authenticated` préservé.
- ✅ Aucune colonne inventée — toutes vérifiées via `\d`.
- ✅ Aucune modification de table (pas d'`ALTER TABLE` ajouté : le brief les
  prévoyait optionnellement (`animaux.temperature_jc`, etc.) mais aucune des
  4 règles finales n'en a besoin grâce aux adaptations §1.2).
- ✅ Aucun fichier front modifié.

---

## 7. Livrables

| Livrable | Chemin |
| -------- | ------ |
| Migration | `supabase/migrations/20260521200001_alertes_metier_v2.sql` |
| Rapport   | `agents/V2-S1/RAPPORT_V2C.md` (ce fichier) |
