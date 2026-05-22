# BRIEF D4-B — AA matières CI hors Maïs/Soja (caveman ≤80L)

## TOI
Dev nutrition porcine. Tu remplis les ratios AA NRC manquants pour matières premières CI. Pas npm build.

## LIS
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (section LIB nutrition-engine.ts + colonnes matieres_premieres)
2. Table `matieres_premieres` colonnes : threonine_pct, tryptophane_pct, cystine_pct, lysine_pct, methionine_pct
3. Référence NRC 2012 Nutrient Requirements of Swine (valeurs % matière brute pour matières CI courantes)

## OBJECTIF
Migration `supabase/migrations/20260523010000_aa_matieres_ci.sql` qui UPDATE les ratios AA Thr/Trp/Cys (NULL) pour toutes matières CI hors Maïs/Soja DÉJÀ remplis.

## DONNÉES À REMPLIR (NRC 2012 + tables FAO)

| Matière (nom approx, à matcher LIKE) | Lys % | Met % | Thr % | Trp % | Cys % |
|---|---|---|---|---|---|
| Manioc / Cassava | 0.05 | 0.02 | 0.05 | 0.02 | 0.03 |
| Sorgho | 0.22 | 0.15 | 0.27 | 0.10 | 0.16 |
| Mil / Pearl Millet | 0.32 | 0.20 | 0.32 | 0.13 | 0.20 |
| Riz / Brisure riz | 0.27 | 0.18 | 0.28 | 0.09 | 0.18 |
| Son de blé | 0.59 | 0.20 | 0.42 | 0.26 | 0.30 |
| Drèche brasserie / DDGS | 0.78 | 0.55 | 1.05 | 0.21 | 0.56 |
| Tourteau coton | 1.65 | 0.55 | 1.20 | 0.45 | 0.65 |
| Tourteau arachide | 1.50 | 0.30 | 1.20 | 0.50 | 0.55 |
| Tourteau palmiste | 0.65 | 0.30 | 0.65 | 0.20 | 0.30 |
| Farine de poisson | 4.50 | 1.65 | 2.45 | 0.65 | 0.55 |
| Coque cacao / fève cacao | 0.50 | 0.20 | 0.50 | 0.15 | 0.25 |

## MÉTHODE
1. `SELECT id, nom FROM matieres_premieres WHERE threonine_pct IS NULL OR tryptophane_pct IS NULL OR cystine_pct IS NULL;` pour cartographier réel
2. Pour chaque match approximatif (UNACCENT + LOWER + LIKE), UPDATE avec valeurs ci-dessus, IDEMPOTENT (WHERE x IS NULL OR x = 0)
3. Si matière non listée : ne pas inventer, laisser NULL et noter dans rapport

## SORTIE
1. Migration appliquée
2. Rapport `/tmp/d4-b/RAPPORT.md` ≤ 2 KB : combien lignes UPDATE, lesquelles restent NULL, références NRC

## INTERDICTIONS
- ❌ modifier UI ou nutrition-engine.ts
- ❌ casser matières Maïs/Soja existantes (vérifier WHERE NOT LIKE '%maïs%' AND NOT LIKE '%soja%')
- ❌ inventer valeurs hors table NRC

Go.
