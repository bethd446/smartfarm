-- ============================================================================
-- Phase 4.A — Alerte R27 dans v_alertes_actives
-- Porcelets démarrage_1/2 ≥ 24 kg → bâtiment Croissance
-- ============================================================================
-- Règle métier Christophe : "Les porcelets à partir de 24 kg passent au
-- bâtiment Croissance". Cette migration étend v_alertes_actives avec une
-- détection LIVE (sans table de stockage) : pour chaque ferme qui a au moins
-- 1 porcelet éligible, on émet une seule ligne d'alerte par ferme.
--
-- Conditions d'éligibilité :
--   - animal.stade IN ('demarrage_1', 'demarrage_2')
--   - animal.poids_actuel_kg >= 24
--   - animal.statut = 'actif'
--   - animal.deleted_at IS NULL
--   - le bâtiment actuel n'est pas déjà de type 'croissance'
--
-- Sécurité : la vue est en security_invoker → RLS de la table animaux
-- s'applique, donc chaque user ne voit que les alertes de SES fermes.
-- ============================================================================

DROP VIEW IF EXISTS public.v_alertes_actives CASCADE;

CREATE VIEW public.v_alertes_actives
WITH (security_invoker = true) AS
-- 1. Alertes stockées dans alertes_loge (non traitées)
SELECT
  al.id,
  al.ferme_id,
  al.type,
  al.severity,
  al.titre,
  al.message,
  al.date_evenement,
  al.animal_id,
  al.batiment_id,
  al.portee_id,
  al.created_at,
  CASE WHEN al.date_evenement < current_date THEN true ELSE false END AS en_retard,
  (current_date - al.date_evenement) AS jours_retard
FROM public.alertes_loge al
WHERE al.traitee = false AND al.deleted_at IS NULL

UNION ALL

-- 2. Événements prévus en retard
SELECT
  e.id,
  e.ferme_id,
  e.type,
  'warning'::severity_alerte AS severity,
  ('Événement en retard : ' || e.type) AS titre,
  COALESCE(e.observations, '') AS message,
  e.date_prevue AS date_evenement,
  e.animal_id,
  NULL::uuid AS batiment_id,
  e.portee_id,
  e.created_at,
  true AS en_retard,
  (current_date - e.date_prevue) AS jours_retard
FROM public.evenements_prevus e
WHERE e.statut = 'planifie'
  AND e.date_prevue < current_date
  AND e.deleted_at IS NULL

UNION ALL

-- 3. R27 — Porcelets prêts pour transfert vers Croissance (≥ 24 kg)
-- Une seule ligne par ferme qui agrège le compteur dans le titre/message.
SELECT
  -- ID synthétique stable par ferme : "r27-<ferme_id_first_8>"
  ('00000000-0000-0000-0000-' || substr(md5('R27-' || ferme_id::text), 1, 12))::uuid AS id,
  ferme_id,
  'porcelets_pret_croissance'::text AS type,
  'info'::severity_alerte AS severity,
  (nb || ' porcelet' || CASE WHEN nb > 1 THEN 's' ELSE '' END || ' à transférer en Croissance (≥ 24 kg)') AS titre,
  ('Règle métier : porcelet ≥ 24 kg → bâtiment Croissance. '
   || nb || ' animal' || CASE WHEN nb > 1 THEN 'aux' ELSE '' END
   || ' éligible' || CASE WHEN nb > 1 THEN 's' ELSE '' END
   || ' actuellement.') AS message,
  current_date AS date_evenement,
  NULL::uuid AS animal_id,
  NULL::uuid AS batiment_id,
  NULL::uuid AS portee_id,
  now() AS created_at,
  false AS en_retard,
  0 AS jours_retard
FROM (
  SELECT
    a.ferme_id,
    count(*)::int AS nb
  FROM public.animaux a
  LEFT JOIN public.batiments b ON b.id = a.batiment_id
  WHERE a.stade IN ('demarrage_1', 'demarrage_2')
    AND a.poids_actuel_kg >= 24
    AND a.statut = 'actif'
    AND a.deleted_at IS NULL
    AND (b.type IS NULL OR b.type <> 'croissance')
  GROUP BY a.ferme_id
  HAVING count(*) > 0
) r27_counts;

GRANT SELECT ON public.v_alertes_actives TO authenticated;

COMMENT ON VIEW public.v_alertes_actives IS
  'Alertes actives consolidées : alertes_loge non traitées + événements prévus en retard + R27 porcelets prêts Croissance (live).';
