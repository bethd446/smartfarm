# BRIEF D4-A — KPI Productivité IFIP : MCA + IC ferme + GMQ par stade (caveman ≤80L)

## TOI
Dev BDD/Zootech. Tu crées migrations SQL : MCA + IC ferme + GMQ par stade. Pas npm build (orchestrateur).

## LIS
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (notamment section VUES + RÈGLES R01-R26)
2. `pg_get_viewdef('v_kpi_techniques_ferme')` et `pg_get_viewdef('v_kpi_bande')` AVANT de créer (préserver existants).
3. Référence IFIP nutrition porcine : MCA = (Coût alimentaire € / kg de croît produit), IC = (kg aliment consommé / kg croît), GMQ = gain moyen quotidien g/j.

## OBJECTIF
Migration `supabase/migrations/20260523000000_kpi_ifip_productivite.sql` (BEGIN/COMMIT) qui crée :

### 1. Vue `v_kpi_mca_ferme`
Marge sur Coût Alimentaire par ferme (€/kg croît).
Cols : ferme_id, periode_debut, periode_fin, conso_total_kg, cout_alim_total_xof, croit_total_kg, mca_xof_par_kg, prix_aliment_moyen_xof_kg.
Calcul : SUM(consommations_aliment.cout) / SUM(pesees post-pesees - poids_naissance ou poids_entree).

### 2. Vue `v_kpi_ic_ferme`
Indice de consommation par ferme (kg aliment / kg croît).
Cols : ferme_id, ic, conso_kg, croit_kg, periode_debut, periode_fin.
Cible IFIP : IC 2.6-2.8 = excellent. >3.2 = à revoir.

### 3. Vue `v_kpi_gmq_par_stade`
GMQ par stade de vie : porcelet (0-J28), sevrage (J28-J70), engraissement (J70-vente).
Cols : ferme_id, bande_id, stade, gmq_g_par_jour, nb_pesees, age_min_j, age_max_j.
Source : table `pesees` + `animaux.date_naissance`.

### 4. Règles R27 + R28 (ajout à v_alertes_actives sans casser R01-R26)
- **R27** : IC ferme > 3.2 (≥ 30j période) — gravite moyenne, catégorie nutrition
- **R28** : GMQ engraissement < 600g/j (cible IFIP 750-850) — gravite moyenne, catégorie nutrition

ATTENTION : recréer v_alertes_actives = pg_get_viewdef d'abord, ajouter R27/R28 à la fin du UNION, garder R01-R26 byte-identique.

## CONTRAINTES
- Toutes vues `WITH (security_invoker=true)` + `GRANT SELECT TO anon, authenticated`
- BEGIN/COMMIT
- Indexes si besoin (consommations_aliment(bande_id, date), pesees(bande_id, date_pesee))
- Vérification : `psql -c "SELECT * FROM v_kpi_mca_ferme;"` doit renvoyer ≥1 ligne (ferme demo)

## SORTIE
1. Migration appliquée (psql -f)
2. Rapport `/tmp/d4-a/RAPPORT.md` ≤ 2 KB : DDL résumé + résultats des 3 SELECT de test + ajouts R27/R28

## INTERDICTIONS
- ❌ modifier code UI (D4-C s'en charge)
- ❌ modifier nutrition-engine.ts (D4-B)
- ❌ casser R01-R26
- ❌ npm/build/restart

Go.
