-- ===========================================================================
-- Smart Farm — Fix métier P0 (audit V2 Round 2)
-- ===========================================================================
-- 4 corrections P0 critiques :
--   FIX #1 : Vue v_calendrier_sanitaire_porcelets — Mycoplasma J14/J28
--            (au lieu de J7/J21 — danger médical : immunité maternelle)
--   FIX #2 : Vue v_kpi_techniques_truie — TMM exclut désormais les écrasés
--            (norme IFIP/GTTT : TMM = (mort-nés + momifiés) / nés totaux)
--   FIX #3 : COMMENT SQL clarifiant que lysine_pct / methionine_pct sont
--            des valeurs SID (Standardized Ileal Digestible, NRC 2012)
--
-- Application : transaction atomique (BEGIN/COMMIT).
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- FIX #1 — v_calendrier_sanitaire_porcelets : Mycoplasma J14/J28 + castration J5
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_calendrier_sanitaire_porcelets
WITH (security_invoker=true) AS
WITH actes_planifies AS (
  SELECT
    mb.id AS mise_bas_id,
    mb.bande_id,
    mb.truie_id,
    a.tag AS truie_tag,
    a.ferme_id,
    mb.date_mise_bas,
    mb.nes_vivants,
    acte.libelle,
    acte.type_acte,
    acte.jour_offset,
    (mb.date_mise_bas + acte.jour_offset)::date AS date_prevue,
    acte.gravite
  FROM mises_bas mb
  JOIN animaux a ON a.id = mb.truie_id
  CROSS JOIN LATERAL (
    VALUES
      ('Injection Fer dextran 200 mg'::text,         'traitement'::text, 1,  'élevée'::text),
      ('Castration / coupe queue (optionnel)'::text, 'traitement'::text, 5,  'moyenne'::text),
      ('Vaccination Mycoplasma primo (J14)'::text,   'vaccination'::text,14, 'élevée'::text),
      ('Vaccination Mycoplasma rappel (J28)'::text,  'vaccination'::text,28, 'élevée'::text),
      ('Pesée + sevrage'::text,                      'traitement'::text, 28, 'moyenne'::text)
  ) acte(libelle, type_acte, jour_offset, gravite)
  WHERE mb.deleted_at IS NULL
)
SELECT (mise_bas_id::text || ':' || libelle) AS acte_id,
       mise_bas_id, bande_id, truie_id, truie_tag, ferme_id,
       date_mise_bas, nes_vivants,
       libelle AS acte, type_acte, jour_offset, date_prevue, gravite,
       CASE
         WHEN date_prevue < CURRENT_DATE THEN 'retard'
         WHEN date_prevue = CURRENT_DATE THEN 'aujourd_hui'
         WHEN date_prevue <= CURRENT_DATE + 7 THEN 'semaine'
         WHEN date_prevue <= CURRENT_DATE + 30 THEN 'mois'
         ELSE 'lointain'
       END AS statut_temporel
FROM actes_planifies
WHERE date_prevue >= CURRENT_DATE - INTERVAL '14 days'
  AND date_prevue <= CURRENT_DATE + INTERVAL '60 days';

GRANT SELECT ON v_calendrier_sanitaire_porcelets TO anon, authenticated;

COMMENT ON VIEW v_calendrier_sanitaire_porcelets IS
  'Calendrier sanitaire porcelets — protocole IFIP : Fer J1, castration J5, Mycoplasma primo J14, rappel J28, pesée+sevrage J28.';

-- ---------------------------------------------------------------------------
-- FIX #2 — v_kpi_techniques_truie : TMM exclut les écrasés
-- ---------------------------------------------------------------------------
-- Définition récupérée via pg_get_viewdef puis modifiée UNIQUEMENT sur le
-- numérateur du TMM (retrait de mbs.sum_ecrases). Tout le reste est identique.
-- Norme IFIP/GTTT : TMM = (nés morts + momifiés) / nés totaux
--                   pertes_lactation_pct = pertes post-naissance (déjà séparé)
CREATE OR REPLACE VIEW v_kpi_techniques_truie
WITH (security_invoker=true) AS
WITH saillies_avec_mb AS (
  SELECT s.truie_id,
         s.date_saillie
    FROM saillies s
    JOIN mises_bas mb ON mb.saillie_id = s.id AND mb.deleted_at IS NULL
   WHERE s.deleted_at IS NULL
), saillie_apres_sevrage AS (
  SELECT sv.truie_id,
         sv.date_sevrage,
         min(sa.date_saillie) AS prochaine_saillie_fecondante
    FROM sevrages sv
    LEFT JOIN saillies_avec_mb sa
      ON sa.truie_id = sv.truie_id
     AND sa.date_saillie > sv.date_sevrage
   WHERE sv.deleted_at IS NULL
   GROUP BY sv.truie_id, sv.date_sevrage
), issf_truie AS (
  SELECT saillie_apres_sevrage.truie_id,
         avg(saillie_apres_sevrage.prochaine_saillie_fecondante
             - saillie_apres_sevrage.date_sevrage)::numeric(6,2) AS issf_jours,
         count(*) AS nb_cycles_issf
    FROM saillie_apres_sevrage
   WHERE saillie_apres_sevrage.prochaine_saillie_fecondante IS NOT NULL
   GROUP BY saillie_apres_sevrage.truie_id
), sevrages_stats AS (
  SELECT sevrages.truie_id,
         avg(sevrages.nb_sevres)::numeric(6,2) AS sevres_moyen,
         sum(sevrages.nb_sevres) AS sevres_sum,
         count(*) AS nb_sevrages
    FROM sevrages
   WHERE sevrages.deleted_at IS NULL
   GROUP BY sevrages.truie_id
), mb_stats AS (
  SELECT mises_bas.truie_id,
         avg(mises_bas.nes_totaux)::numeric(6,2) AS nes_totaux_moyen,
         avg(mises_bas.nes_vivants)::numeric(6,2) AS nes_vivants_moyen,
         sum(mises_bas.nes_morts) AS sum_nes_morts,
         sum(mises_bas.momifies) AS sum_momifies,
         sum(COALESCE(mises_bas.ecrases, 0)) AS sum_ecrases,
         sum(mises_bas.nes_totaux) AS sum_totaux,
         sum(mises_bas.nes_vivants) AS sum_vivants,
         count(*) AS nb_mb
    FROM mises_bas
   WHERE mises_bas.deleted_at IS NULL
   GROUP BY mises_bas.truie_id
)
SELECT a.id AS truie_id,
       a.tag,
       a.nom,
       a.ferme_id,
       a.statut,
       COALESCE(mbs.nb_mb, 0::bigint) AS nb_mises_bas,
       COALESCE(ss.nb_sevrages, 0::bigint) AS nb_sevrages,
       COALESCE(i.nb_cycles_issf, 0::bigint) AS nb_cycles_issf,
       mbs.nes_totaux_moyen,
       mbs.nes_vivants_moyen,
       ss.sevres_moyen,
       i.issf_jours,
       CASE
         WHEN mbs.sum_totaux > 0
         THEN ((mbs.sum_nes_morts + mbs.sum_momifies)::numeric
               / mbs.sum_totaux::numeric * 100::numeric)::numeric(5,2)
         ELSE NULL::numeric
       END AS tmm_pct,
       CASE
         WHEN ss.sevres_moyen IS NOT NULL
         THEN (ss.sevres_moyen
               * (365.0 / (115.0 + 28.0 + COALESCE(i.issf_jours, 7::numeric))))::numeric(5,1)
         ELSE NULL::numeric
       END AS productivite_numerique,
       CASE
         WHEN mbs.sum_vivants > 0 AND ss.sevres_sum IS NOT NULL
         THEN ((mbs.sum_vivants - ss.sevres_sum)::numeric
               / mbs.sum_vivants::numeric * 100::numeric)::numeric(5,2)
         ELSE NULL::numeric
       END AS pertes_lactation_pct
  FROM animaux a
  LEFT JOIN mb_stats mbs        ON mbs.truie_id = a.id
  LEFT JOIN sevrages_stats ss   ON ss.truie_id  = a.id
  LEFT JOIN issf_truie i        ON i.truie_id   = a.id
 WHERE a.categorie = 'truie'::categorie_t
   AND a.deleted_at IS NULL;

GRANT SELECT ON v_kpi_techniques_truie TO anon, authenticated;

COMMENT ON VIEW v_kpi_techniques_truie IS
  'KPI techniques truie (norme IFIP/GTTT). TMM = (mort-nés + momifiés) / nés totaux — exclut les écrasés (pertes en lactation, voir pertes_lactation_pct).';

-- ---------------------------------------------------------------------------
-- FIX #3 — Clarifier que lysine_pct / methionine_pct sont des valeurs SID
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN matieres_premieres.lysine_pct IS
  'Lysine SID (Standardized Ileal Digestible) en % — référentiel NRC 2012';

COMMENT ON COLUMN matieres_premieres.methionine_pct IS
  'Méthionine SID (Standardized Ileal Digestible) en % — référentiel NRC 2012';

COMMIT;
