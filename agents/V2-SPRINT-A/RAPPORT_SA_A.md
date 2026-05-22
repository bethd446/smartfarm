# RAPPORT SA-A — 4 règles critiques + densité bâtiment

**Date** : 2026-05-22
**Statut** : ✅ Livré (migration appliquée, type-check OK)

## Livrables

| Artefact | Chemin | État |
|---|---|---|
| Migration SQL atomique | `supabase/migrations/20260522050000_sprint_a_alertes_critiques.sql` | ✅ Appliquée (BEGIN/COMMIT, 1 transaction) |
| Vue `v_densite_batiment` | DB Postgres | ✅ `security_invoker=true` + GRANT anon/authenticated |
| Vue `v_alertes_actives` étendue | DB Postgres | ✅ 22 → 26 règles, 22 branches existantes préservées |
| Mapping UI étendu | `src/lib/alertes-regles.ts` | ✅ 22 → 26 entrées (R23, R24, R25, R26) |

## Règles ajoutées

| ID | Cible | Gravité | Catégorie | Référentiel |
|---|---|---|---|---|
| R23 | truie gestante MB prévue 0-14j sans vermifuge ≤30j | élevée | sanitaire | INRAE |
| R24 | mise-bas J3-J7 sans Fer dextran administré | critique | sanitaire | INRAE/CIRAD |
| R25 | sevrage `bcs_truie < 2.5` sans nouvelle saillie depuis | moyenne | reproduction | IFIP |
| R26 | bâtiment dont `taux_occupation_pct ≥ 95` | moyenne | pertes | FAO/CIRAD |

## Points techniques notables

1. **Schéma `traitements`** : aucune colonne `date_traitement` — utilisé `date_debut` à la place (vérifié via `information_schema.columns`).
2. **`v_densite_batiment`** : agrégat `batiments` ← `cases` ← `animaux` (LEFT JOIN), filtre `statut='actif' AND deleted_at IS NULL`. Renvoie `effectif_actuel` + `taux_occupation_pct` (numeric arrondi 1 décimale). Capacité NULL ou 0 → `taux_occupation_pct=NULL` (pas de division par zéro).
3. **`v_alertes_actives`** : récupérée via `pg_get_viewdef`, intégrée verbatim + 4 `UNION ALL` ajoutés. Aucune branche R01-R22 modifiée.
4. **R24 join** : `bande_id OR animal_id` sur `traitements` pour capter le Fer injecté soit en bande (cas porc) soit par animal individuel.
5. **R25 filtre** : exclut les truies déjà ressaillies (sevrage suivi de saillie = problème résolu, plus d'alerte).

## Vérifications post-déploiement

```sql
-- 26 règles compilées :
SELECT COUNT(DISTINCT regle_id) FROM v_alertes_actives;          -- → 26 attendues (branches compilées)
SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id;
-- → 4 règles avec données démo actives : R10 (3), R17 (1), R18 (1), R22 (1)
-- → R23-R26 = 0 ligne sur données démo (sevrages vide, pas de saillies J100-114, batiments à 0% occupation)

-- Vue densité :
SELECT * FROM v_densite_batiment ORDER BY taux_occupation_pct DESC NULLS LAST;
-- → 5 bâtiments listés, capacités 6→300, occupations à 0% (démo non peuplée côté case_id)
```

```bash
grep -c "^  'R" src/lib/alertes-regles.ts   # → 26 ✅
npx tsc --noEmit src/lib/alertes-regles.ts  # → OK, pas d'erreur ✅
```

## Anti-pièges traités

- ✅ Aucune touche aux 22 règles existantes (def récupérée via `pg_get_viewdef`, intégrée verbatim)
- ✅ `security_invoker=true` + `GRANT … TO anon, authenticated` sur les 2 vues
- ✅ Migration atomique (BEGIN/COMMIT, ON_ERROR_STOP)
- ✅ Cast explicites (`::text`, `::statut_animal_t`) pour rester cohérent avec branches existantes
- ✅ Pas de `npm run build` (orchestrateur)
- ✅ Pas de modif UI / pages / autres modules

## Anomalies / dette

- Données démo ne déclenchent aucune des 4 nouvelles règles (sevrages vide, animaux non assignés à `case_id` → `effectif_actuel=0` partout). Branches néanmoins compilées et requêtables. À retester quand SA-B/SA-C peupleront la démo.
- `v_densite_batiment` retournera des chiffres réalistes dès que les animaux auront un `case_id` assigné. À utiliser plus tard pour la page `/batiments`.
