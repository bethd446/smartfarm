# Brief V2-E — KPI techniques métier : ISSF + Productivité numérique

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : Calculer et afficher les vrais KPI techniques d'un élevage porcin (ISSF et Productivité numérique de la truie)

---

## PÉRIMÈTRE EXCLUSIF — NE TOUCHE QUE :

1. `supabase/migrations/` — UNE seule migration `20260521210100_kpi_techniques.sql`
2. `app/src/app/(app)/dashboard/` (composants KPI dashboard)
3. `app/src/app/(app)/cheptel/[id]/` (fiche truie — section KPI individuels)
4. `app/src/app/(app)/kpi/page.tsx` (page Performances)
5. Ne touche **PAS** : sanitaire, nutrition, alertes, reproduction (forms), sidebar

---

## CONTEXTE

- DB : `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`
- Vues existantes : `v_kpi_truie`, `v_kpi_bande`, `v_alertes_actives`, `v_calendrier_repro`, `v_calendrier_sanitaire_porcelets`, `v_bcs_historique_truie` (créée par V2-D si finie avant — sinon ignore)
- Sors la déf de `v_kpi_truie` et `v_kpi_bande` :
  ```bash
  PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -At -c "SELECT pg_get_viewdef('v_kpi_truie'::regclass, true);"
  PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -At -c "SELECT pg_get_viewdef('v_kpi_bande'::regclass, true);"
  ```
- Lis aussi la page actuelle `/kpi/page.tsx` pour comprendre ce qui est déjà présenté.

---

## DÉFINITIONS MÉTIER

### ISSF — Intervalle Sevrage-Saillie Fécondante (jours)
Pour une truie : moyenne sur ses N derniers cycles de `(date_saillie_fécondante - date_sevrage_précédent)`.
- "Saillie fécondante" = celle qui a abouti à une mise-bas confirmée
- Cible biologique : 5-7 jours, > 10 jours = problématique

```sql
WITH saillies_avec_mb AS (
  SELECT s.truie_id, s.date_saillie, mb.date_mise_bas
  FROM saillies s
  JOIN mises_bas mb ON mb.saillie_id = s.id AND mb.deleted_at IS NULL
  WHERE s.deleted_at IS NULL
),
saillie_apres_sevrage AS (
  SELECT
    sv.truie_id,
    sv.date_sevrage,
    MIN(sa.date_saillie) AS prochaine_saillie_fecondante
  FROM sevrages sv
  LEFT JOIN saillies_avec_mb sa ON sa.truie_id = sv.truie_id AND sa.date_saillie > sv.date_sevrage
  WHERE sv.deleted_at IS NULL
  GROUP BY sv.truie_id, sv.date_sevrage
)
SELECT truie_id, AVG(prochaine_saillie_fecondante - date_sevrage) AS issf_jours
FROM saillie_apres_sevrage
WHERE prochaine_saillie_fecondante IS NOT NULL
GROUP BY truie_id
```

### Productivité numérique de la truie (porcelets sevrés / truie / an)
```
Nb sevrés par cycle moyen × Cycles théoriques par an

Où:
  cycle complet ≈ gestation (115j) + lactation (28j) + ISSF (~7j) ≈ 150j
  cycles/an = 365 / 150 ≈ 2.43
```

```sql
WITH stats_truie AS (
  SELECT
    sv.truie_id,
    AVG(sv.nb_sevres) AS moyenne_sevres_par_portee,
    COUNT(*) AS nb_portees
  FROM sevrages sv WHERE sv.deleted_at IS NULL
  GROUP BY sv.truie_id
)
SELECT
  st.truie_id,
  st.moyenne_sevres_par_portee,
  -- on prend l'ISSF de la truie si dispo sinon 7j par défaut
  (st.moyenne_sevres_par_portee * (365.0 / (115.0 + 28.0 + COALESCE(issf, 7))))::numeric(5,1) AS productivite_numerique
FROM stats_truie st
LEFT JOIN ( /* sous-requête ISSF ci-dessus */ ) i ON i.truie_id = st.truie_id
```

### TMM — Taux de mortalité maternité (%)
`(SUM(nes_morts + momifies + COALESCE(ecrases,0)) / SUM(nes_totaux)) * 100` sur les MB d'une bande/truie.

### Autres bonus à calculer si rapide
- **Nés totaux moyens/portée** par truie (à partir de `mises_bas.nes_totaux`)
- **Nés vivants moyens/portée** par truie
- **Taux de pertes en lactation** : `(nes_vivants_sum - nb_sevres_sum) / nes_vivants_sum * 100`

---

## OBJECTIF — Vue SQL `v_kpi_techniques_truie`

```sql
CREATE OR REPLACE VIEW v_kpi_techniques_truie
WITH (security_invoker=true) AS
WITH issf_truie AS ( /* sous-requête ISSF */ ),
sevrages_stats AS (
  SELECT truie_id,
         AVG(nb_sevres) AS sevres_moyen,
         COUNT(*) AS nb_sevrages
  FROM sevrages WHERE deleted_at IS NULL GROUP BY truie_id
),
mb_stats AS (
  SELECT truie_id,
         AVG(nes_totaux) AS nes_totaux_moyen,
         AVG(nes_vivants) AS nes_vivants_moyen,
         SUM(nes_morts) AS sum_nes_morts,
         SUM(momifies) AS sum_momifies,
         SUM(COALESCE(ecrases, 0)) AS sum_ecrases,
         SUM(nes_totaux) AS sum_totaux,
         SUM(nes_vivants) AS sum_vivants,
         COUNT(*) AS nb_mb
  FROM mises_bas WHERE deleted_at IS NULL GROUP BY truie_id
)
SELECT
  a.id AS truie_id,
  a.tag,
  a.ferme_id,
  a.statut,
  mbs.nb_mb,
  mbs.nes_totaux_moyen,
  mbs.nes_vivants_moyen,
  ss.sevres_moyen,
  i.issf_jours,
  CASE
    WHEN mbs.sum_totaux > 0
    THEN ((mbs.sum_nes_morts + mbs.sum_momifies + mbs.sum_ecrases)::numeric / mbs.sum_totaux * 100)::numeric(5,2)
  END AS tmm_pct,
  CASE
    WHEN ss.sevres_moyen IS NOT NULL
    THEN (ss.sevres_moyen * (365.0 / (115.0 + 28.0 + COALESCE(i.issf_jours, 7))))::numeric(5,1)
  END AS productivite_numerique,
  CASE
    WHEN mbs.sum_vivants > 0 AND ss.sevres_moyen IS NOT NULL
    THEN ((mbs.sum_vivants - (ss.sevres_moyen * ss.nb_sevrages))::numeric / mbs.sum_vivants * 100)::numeric(5,2)
  END AS pertes_lactation_pct
FROM animaux a
LEFT JOIN mb_stats mbs ON mbs.truie_id = a.id
LEFT JOIN sevrages_stats ss ON ss.truie_id = a.id
LEFT JOIN issf_truie i ON i.truie_id = a.id
WHERE a.categorie='truie' AND a.deleted_at IS NULL;

GRANT SELECT ON v_kpi_techniques_truie TO anon, authenticated;
```

### Vue agrégée fermes
```sql
CREATE OR REPLACE VIEW v_kpi_techniques_ferme
WITH (security_invoker=true) AS
SELECT
  ferme_id,
  COUNT(*) FILTER (WHERE statut='actif') AS truies_actives,
  AVG(nes_vivants_moyen) AS nes_vivants_par_portee_moyen,
  AVG(sevres_moyen) AS sevres_par_portee_moyen,
  AVG(issf_jours) AS issf_moyen,
  AVG(tmm_pct) AS tmm_moyen_pct,
  AVG(productivite_numerique) AS productivite_moyenne,
  AVG(pertes_lactation_pct) AS pertes_lactation_moyenne_pct
FROM v_kpi_techniques_truie
GROUP BY ferme_id;

GRANT SELECT ON v_kpi_techniques_ferme TO anon, authenticated;
```

---

## OBJECTIF — Affichage

### Dashboard `/dashboard`
Ajoute 4 KPI cards en haut (juste sous les cards existantes "Truies actives" etc.) :
- **ISSF moyen** : valeur + sparkline 6 mois si possible (sinon juste valeur). Couleur : vert si ≤7j, orange 8-10, rouge >10
- **Productivité numérique** : porcelets sevrés/truie/an. Cible : ≥22 porc/truie/an
- **TMM** (Taux mortalité maternité) : % avec couleur (vert ≤8%, orange 8-12, rouge >12)
- **Nés vivants moyens/portée** : valeur + cible (≥12)

Tout doit lire depuis `v_kpi_techniques_ferme` (1 row pour la ferme démo).

### Fiche truie `/cheptel/[id]`
Ajoute une section "Performances techniques" affichant les KPI individuels de cette truie (lire `v_kpi_techniques_truie` filtré par truie_id).

### Page Performances `/kpi`
Ajoute un tableau classement des truies triable par chaque KPI (ISSF, productivité, TMM). Truie sans données → "Pas assez de cycles". Utilise `<EmptyState>` si la liste est vide.

---

## PROCÉDURE

1. Lire `pg_get_viewdef('v_kpi_truie')` et la page actuelle `/kpi/page.tsx`
2. Vérifier que la colonne `ecrases` existe dans `mises_bas` :
   ```bash
   PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\d mises_bas" | grep ecrases
   ```
   - Si OUI (V2-D fini avant toi) : utilise `COALESCE(ecrases, 0)`
   - Si NON (V2-D pas encore passé) : utilise `0::integer` au lieu de `ecrases`. Documente dans le rapport.
3. Crée et applique la migration
4. Modifie le frontend (dashboard, fiche truie, page kpi)
5. ⚠️ NE LANCE PAS `npm run build`. L'orchestrateur centralisera build+redeploy à la fin de la vague. Tu te contentes des fichiers source + migration SQL.

---

## LIVRABLES

1. Migration appliquée
2. 4 cards KPI sur dashboard
3. Section performances sur fiche truie
4. Page `/kpi` enrichie
5. Rapport `/root/projects/smartfarm/agents/V2-S2/RAPPORT_V2E.md` :
   - Sortie de `SELECT * FROM v_kpi_techniques_ferme;`
   - Snippet de 3 truies dans `v_kpi_techniques_truie`
   - Codes HTTP

## ANTI-PIÈGES

- Si pas de sevrages en DB → tous les KPI seront NULL : utilise `<EmptyState>` partout
- Ne casse pas les vues existantes (`v_kpi_truie` et `v_kpi_bande`) — crée des NOUVELLES vues
- Cast les divisions en numeric pour éviter integer division en Postgres
- Vérifie la cible métier : un ISSF < 5j est suspect (saillie de retour de chaleur sans vraie sortie) — ne mets pas de couleur verte agressive si < 4j
