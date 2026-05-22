# BRIEF D4-C — UI KPI Productivité IFIP (caveman ≤80L)

## TOI
Dev frontend. Tu exposes les nouveaux KPI IFIP dans la page /kpi. Pas npm build (orchestrateur).

## LIS
1. `/root/projects/smartfarm/.brain/CONTEXT.md`
2. `/root/projects/smartfarm/app/src/app/(app)/kpi/page.tsx` (page existante après D2)
3. `/root/projects/smartfarm/app/src/components/kpi/kpi-tech-card.tsx` (composant carte existant)

## ATTENDS D4-A
D4-A produit 3 vues SQL : `v_kpi_mca_ferme`, `v_kpi_ic_ferme`, `v_kpi_gmq_par_stade`.
Tu attends que la migration soit appliquée AVANT de coder. Vérifie : `psql -c "SELECT * FROM v_kpi_mca_ferme LIMIT 1;"` doit marcher.

## OBJECTIF
Ajouter section "Productivité IFIP" dans `/kpi` qui affiche :
1. Card MCA — `mca_xof_par_kg` (formaté XOF / kg croît, cible IFIP <800 = vert, 800-1200 = gold, >1200 = rouge)
2. Card IC ferme — `ic` (cible 2.6-2.8 = vert, 2.8-3.2 = gold, >3.2 = rouge)
3. Tableau GMQ par stade — porcelet / sevrage / engraissement avec gmq_g_par_jour et tone selon cible IFIP par stade :
   - porcelet : >200g/j vert
   - sevrage : >400g/j vert
   - engraissement : >750g/j vert

## CONTRAINTES
- Réutiliser `<KpiTechCard>` existant (tones : nominal/attendu/urgence/neutre)
- Section avec `<h2>` (suite D2)
- Pas casser cards existantes (ISSF, PN, TMM, productivité)
- Server Component (page async, fetch via createClient)
- Pas de Tooltip (pas dans @/components/ui) → title="" HTML natif

## FICHIERS À MODIFIER
- `src/app/(app)/kpi/page.tsx` UNIQUEMENT
- Optionnel : créer `src/app/(app)/kpi/_kpi-ifip.tsx` (composant client si besoin filtres)

## SORTIE
1. Page /kpi avec section IFIP visible
2. Rapport `/tmp/d4-c/RAPPORT.md` ≤ 2 KB : composants créés, vues consommées, tests `curl :3000/kpi | grep -c "MCA\\|GMQ\\|IC ferme"`

## INTERDICTIONS
- ❌ modifier vues SQL (D4-A)
- ❌ modifier nutrition-engine.ts (D4-B)
- ❌ npm/build/restart
- ❌ casser KPI existants

Go.
