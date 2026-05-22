# Rapport SA-C — Auto-création événements protocoles

## Livrable
1 migration SQL : `supabase/migrations/20260522070000_auto_evenements.sql`
- Helper `ensure_evenement_prevu(...)` idempotent (NULL-safe via COALESCE::text)
- 3 triggers PL/pgSQL actifs (vérif `pg_trigger`)
- Backfill DO blocks pour cochettes / mises-bas / diagnostics positifs existants
- Extension du CHECK constraint `evenements_prevus_type_evenement_check` (+12 nouveaux types)

## Triggers créés
| Trigger | Table | Quand | Crée |
|---|---|---|---|
| `trg_animal_cochette` | animaux | AFTER INSERT OR UPDATE OF categorie, date_naissance | 5 événements (J70 Parvo+Lepto, J91 rappel, J150 Rouget, J165 Erysipèle+Parvo, J165 Vermifuge) |
| `trg_mise_bas_porcelets` | mises_bas | AFTER INSERT | 5 événements (J1 Fer, J5 Castration, J14 Mycoplasma primo, J28 rappel, J28 Sevrage) |
| `trg_diag_pos_truie` | diagnostics_gestation | AFTER INSERT (si `resultat='positif'`) | 2 événements (vermifuge truie J-14 pré-MB, Erysipèle+Parvo J-21) |

## Backfill — compte avant/après
- **Avant** : 4 événements planifiés (2 types : `sevrage_prevu`, `mise_bas_prevue`)
- **Après** : 20 événements planifiés (9 types). Détail des nouveaux types :
```
vermifuge_truie_pre_mb               | 3   (3 diag positifs)
vaccin_erysipele_parvo_truie_pre_mb  | 3
sevrage_j28                          | 2   (2 MB)
vaccin_mycoplasma_rappel_j28         | 2
castration_porcelets_j5              | 2
vaccin_mycoplasma_primo_j14          | 2
fer_dextran_porcelets_j1             | 2
```
Soit +16 événements (10 actes porcelets sur 2 MB + 6 events truie sur 3 diag pos). 0 cochette en base donc 0 backfill cochette (normal).

## Test trigger live confirmé
Insert d'une cochette test (`TEST-COCH-SA-C`, date_naissance = today-60) :
- 5 événements auto créés ✅ (dates 2026-05-31 → 2026-09-03)
- Re-UPDATE de `date_naissance` (déclenche le trigger 2e fois) → toujours 5 events, pas de doublon ✅ (idempotence helper)
- Nettoyage : DELETE 5 events + DELETE 1 animal

## Anti-pièges rencontrés
1. **CHECK constraint `type_evenement`** : limitait à 8 valeurs historiques. Solution : DROP + ADD avec les 20 valeurs (8 historiques + 12 nouvelles). Aucune valeur historique supprimée.
2. **CHECK constraint `statut`** : autorise `'planifie','realise','annule','retard'` (pas `'en_cours'`). Helper ajusté : `statut IN ('planifie','retard')` pour la déduplication.
3. **`mises_bas` n'a pas `ferme_id`** : récupéré via `animaux WHERE id = truie_id`. Si truie introuvable → trigger RETURN NEW silencieusement (pas d'erreur bloquante).
4. **`diagnostics_gestation`** : pas de `ferme_id` direct, récupéré via `saillies` (FK saillie_id).

## Modifs UI / autres modules
Aucune (périmètre SA-C respecté : SQL uniquement). Pas de `npm run build` lancé.

## Fichiers
- ✅ Créé : `/root/projects/smartfarm/supabase/migrations/20260522070000_auto_evenements.sql` (267 lignes)
- ✅ Modifié BDD : constraint `evenements_prevus_type_evenement_check` étendu (+12 types), 3 triggers + 4 fonctions PL/pgSQL ajoutés
