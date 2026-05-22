# RAPPORT TEST-1 — Protocole vaccinal cochettes pré-saillie

## Statut
✅ Mission accomplie sans accroc.

## Actions
1. Migration créée : `supabase/migrations/20260522010000_cochettes_pre_saillie.sql`
2. Appliquée via psql → `BEGIN / UPDATE 1 / INSERT 0 1 ×3 / COMMIT` (exit 0)
3. Pas de build, pas de restart, pas de touche front

## Vérif SQL (catégorie `cochette`, ordre `age_jours`)
| nom | age_jours | rappels_jours | obligatoire |
|---|---|---|---|
| Parvovirose + Leptospirose (cochettes) | 70 | {21,165} | t |
| Rouget cochettes pré-saillie | 150 | {365} | t |
| Érysipèle + Parvo combiné cochette pré-saillie | 165 | {21} | t |
| Vermifuge cochettes pré-saillie | 165 | {} | t |

→ 4 lignes (attendu : 4). ✓

## Détail des changements
- **R1** UPDATE Parvo/Lepto : rappels passés de `{21}` à `{21, 165}` + description IFIP
- **R2** INSERT Rouget J150 + rappel annuel J365, IM encolure 2 mL
- **R3** INSERT Érysipèle+Parvo combiné J165 + rappel J186 (21j), IM encolure 2 mL
- **R4** INSERT Vermifuge J165 (Ivermectine/Doramectine), SC 0.3 mL, pas de rappel

## Fichiers
- ➕ `/root/projects/smartfarm/supabase/migrations/20260522010000_cochettes_pre_saillie.sql` (2029 octets)
- ➕ `/root/projects/smartfarm/agents/V2-TEST/RAPPORT_TEST1.md` (ce fichier)

## Anti-pièges respectés
- `rappels_jours integer[]` : `ARRAY[…]` et `ARRAY[]::integer[]` pour le vermifuge ✓
- INSERT...SELECT FROM fermes WHERE deleted_at IS NULL → 1 ferme démo = 1 row par INSERT ✓
- Aucune autre ligne `protocoles_vaccinaux` (porcelet/sevrage/etc.) touchée ✓

## TODO résolu côté CONTEXT.md
- ☑ "Cochettes vaccins Parvo/Lepto/Rouget (protocole manquant)" — désormais 4 protocoles complets cochette (Parvo+Lepto, Rouget, Érysipèle+Parvo, Vermifuge)

## Manque / non-bloquant
- Pas de vue dépendante détectée (catégorie `cochette` consommée directement) — RAS
- Pas testé côté UI `/sanitaire/protocoles` (interdit de build/restart)
