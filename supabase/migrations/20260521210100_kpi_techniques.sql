-- ============================================================
-- V2-E : KPI techniques métier — ISSF + Productivité numérique + TMM
-- ============================================================
-- Crée 2 vues SQL :
--   v_kpi_techniques_truie : KPI individuels par truie
--   v_kpi_techniques_ferme : agrégat ferme (1 row par ferme)
--
-- NOTE : la colonne `mises_bas.ecrases` est ajoutée par la migration V2-D
-- (porcelets écrasés en lactation). On utilise COALESCE(ecrases, 0) pour
-- gérer les anciennes lignes.
-- ============================================================

CREATE OR REPLACE VIEW v_kpi_techniques_truie
WITH (security_invoker = true) AS
WITH
-- 1) Saillies fécondantes : celles qui ont abouti à une mise-bas
saillies_avec_mb AS (
  SELECT
    s.truie_id,
    s.date_saillie
  FROM saillies s
  JOIN mises_bas mb
    ON mb.saillie_id = s.id
   AND mb.deleted_at IS NULL
  WHERE s.deleted_at IS NULL
),
-- 2) Pour chaque sevrage, on cherche la prochaine saillie fécondante
saillie_apres_sevrage AS (
  SELECT
    sv.truie_id,
    sv.date_sevrage,
    MIN(sa.date_saillie) AS prochaine_saillie_fecondante
  FROM sevrages sv
  LEFT JOIN saillies_avec_mb sa
    ON sa.truie_id = sv.truie_id
   AND sa.date_saillie > sv.date_sevrage
  WHERE sv.deleted_at IS NULL
  GROUP BY sv.truie_id, sv.date_sevrage
),
-- 3) ISSF = moyenne des intervalles (sevrage → saillie fécondante)
issf_truie AS (
  SELECT
    truie_id,
    AVG(prochaine_saillie_fecondante - date_sevrage)::numeric(6,2) AS issf_jours,
    COUNT(*) AS nb_cycles_issf
  FROM saillie_apres_sevrage
  WHERE prochaine_saillie_fecondante IS NOT NULL
  GROUP BY truie_id
),
-- 4) Stats sevrages par truie
sevrages_stats AS (
  SELECT
    truie_id,
    AVG(nb_sevres)::numeric(6,2) AS sevres_moyen,
    SUM(nb_sevres)               AS sevres_sum,
    COUNT(*)                     AS nb_sevrages
  FROM sevrages
  WHERE deleted_at IS NULL
  GROUP BY truie_id
),
-- 5) Stats mises-bas par truie (TMM, nés totaux/vivants moyens)
mb_stats AS (
  SELECT
    truie_id,
    AVG(nes_totaux)::numeric(6,2)  AS nes_totaux_moyen,
    AVG(nes_vivants)::numeric(6,2) AS nes_vivants_moyen,
    SUM(nes_morts)                 AS sum_nes_morts,
    SUM(momifies)                  AS sum_momifies,
    SUM(COALESCE(ecrases, 0))      AS sum_ecrases,
    SUM(nes_totaux)                AS sum_totaux,
    SUM(nes_vivants)               AS sum_vivants,
    COUNT(*)                       AS nb_mb
  FROM mises_bas
  WHERE deleted_at IS NULL
  GROUP BY truie_id
)
SELECT
  a.id        AS truie_id,
  a.tag,
  a.nom,
  a.ferme_id,
  a.statut,
  -- Volumes
  COALESCE(mbs.nb_mb, 0)        AS nb_mises_bas,
  COALESCE(ss.nb_sevrages, 0)   AS nb_sevrages,
  COALESCE(i.nb_cycles_issf, 0) AS nb_cycles_issf,
  -- Moyennes par portée
  mbs.nes_totaux_moyen,
  mbs.nes_vivants_moyen,
  ss.sevres_moyen,
  -- ISSF
  i.issf_jours,
  -- TMM = (morts + momifies + écrasés) / nés totaux × 100
  CASE
    WHEN mbs.sum_totaux > 0
      THEN ((mbs.sum_nes_morts + mbs.sum_momifies + mbs.sum_ecrases)::numeric
            / mbs.sum_totaux * 100)::numeric(5,2)
  END AS tmm_pct,
  -- Productivité numérique = sevrés/portée × (365 / (115 + 28 + ISSF))
  CASE
    WHEN ss.sevres_moyen IS NOT NULL
      THEN (ss.sevres_moyen
            * (365.0 / (115.0 + 28.0 + COALESCE(i.issf_jours, 7))))::numeric(5,1)
  END AS productivite_numerique,
  -- Pertes en lactation = (vivants - sevrés) / vivants × 100
  CASE
    WHEN mbs.sum_vivants > 0 AND ss.sevres_sum IS NOT NULL
      THEN ((mbs.sum_vivants - ss.sevres_sum)::numeric
            / mbs.sum_vivants * 100)::numeric(5,2)
  END AS pertes_lactation_pct
FROM animaux a
LEFT JOIN mb_stats        mbs ON mbs.truie_id = a.id
LEFT JOIN sevrages_stats  ss  ON ss.truie_id  = a.id
LEFT JOIN issf_truie      i   ON i.truie_id   = a.id
WHERE a.categorie = 'truie'
  AND a.deleted_at IS NULL;

GRANT SELECT ON v_kpi_techniques_truie TO anon, authenticated;

COMMENT ON VIEW v_kpi_techniques_truie IS
  'V2-E : KPI techniques métier par truie — ISSF, productivité numérique, TMM, pertes lactation.';

-- ============================================================
-- Vue agrégée par ferme
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_techniques_ferme
WITH (security_invoker = true) AS
SELECT
  ferme_id,
  COUNT(*) FILTER (WHERE statut = 'actif')                       AS truies_actives,
  COUNT(*) FILTER (WHERE nes_vivants_moyen IS NOT NULL)          AS truies_avec_mb,
  AVG(nes_totaux_moyen)::numeric(6,2)                            AS nes_totaux_par_portee_moyen,
  AVG(nes_vivants_moyen)::numeric(6,2)                           AS nes_vivants_par_portee_moyen,
  AVG(sevres_moyen)::numeric(6,2)                                AS sevres_par_portee_moyen,
  AVG(issf_jours)::numeric(6,2)                                  AS issf_moyen,
  AVG(tmm_pct)::numeric(5,2)                                     AS tmm_moyen_pct,
  AVG(productivite_numerique)::numeric(5,1)                      AS productivite_moyenne,
  AVG(pertes_lactation_pct)::numeric(5,2)                        AS pertes_lactation_moyenne_pct
FROM v_kpi_techniques_truie
GROUP BY ferme_id;

GRANT SELECT ON v_kpi_techniques_ferme TO anon, authenticated;

COMMENT ON VIEW v_kpi_techniques_ferme IS
  'V2-E : Agrégat KPI techniques métier au niveau ferme — pour cards dashboard.';
