-- ============================================================================
-- Phase 4.B — Alertes R28, R29, R30 dans v_alertes_actives
-- Trois nouvelles règles zootechniques :
--   R28 : Truies vides ≥ 8 jours post-sevrage sans diag chaleur
--   R29 : Portées zombies (effectif_naissance = 0)
--   R30 : Porcelets 22-24 kg (anticipation transfert Croissance)
-- ============================================================================
-- Règles métier Christophe :
--
-- R28 : Détection de truies vides depuis ≥ 8 jours après le dernier sevrage
--       sans aucun diagnostic de chaleur enregistré. Permet de relancer la
--       détection des chaleurs et d'éviter un ISS trop long.
--
-- R29 : Portées enregistrées avec effectif_naissance = 0 (données incomplètes
--       ou zombies) → à nettoyer ou compléter pour maintenir la cohérence
--       du cheptel.
--
-- R30 : Porcelets en démarrage_1/2 avec poids entre 22 et 24 kg → alerte
--       anticipée pour planifier le transfert vers Croissance avant le seuil
--       critique de 24 kg.
--
-- Sécurité : la vue est en security_invoker → RLS de la table animaux/portees
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
) r27_counts

UNION ALL

-- 4. R28 — Truies vides ≥ 8 jours post-sevrage sans diagnostic de chaleur
-- Agrégation par ferme.
SELECT
  ('00000000-0000-0000-0000-' || substr(md5('R28-' || ferme_id::text), 1, 12))::uuid AS id,
  ferme_id,
  'truies_vides_post_sevrage'::text AS type,
  'warning'::severity_alerte AS severity,
  (nb || ' truie' || CASE WHEN nb > 1 THEN 's' ELSE '' END || ' vide' || CASE WHEN nb > 1 THEN 's' ELSE '' END || ' à surveiller (post-sevrage > 8j)') AS titre,
  ('Référentiel IFIP : détection des chaleurs à relancer. '
   || nb || ' truie' || CASE WHEN nb > 1 THEN 's ont' ELSE ' a' END
   || ' dépassé 8 jours après le sevrage sans diagnostic de chaleur enregistré.') AS message,
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
  -- Truie vide
  WHERE a.stade = 'truie_vide'
    AND a.statut = 'actif'
    AND a.deleted_at IS NULL
    -- Dernière portée sevrée il y a ≥ 8 jours
    AND EXISTS (
      SELECT 1
      FROM public.portees p
      WHERE p.truie_id = a.id
        AND p.date_sevrage_reelle IS NOT NULL
        AND p.date_sevrage_reelle < current_date - INTERVAL '8 days'
        AND p.deleted_at IS NULL
      ORDER BY p.date_sevrage_reelle DESC
      LIMIT 1
    )
  GROUP BY a.ferme_id
  HAVING count(*) > 0
) r28_counts

UNION ALL

-- 5. R29 — Portées zombies (effectif_naissance = 0)
-- Agrégation par ferme.
SELECT
  ('00000000-0000-0000-0000-' || substr(md5('R29-' || ferme_id::text), 1, 12))::uuid AS id,
  ferme_id,
  'portees_zombies'::text AS type,
  'info'::severity_alerte AS severity,
  (nb || ' portée' || CASE WHEN nb > 1 THEN 's' ELSE '' END || ' sans effectif (à nettoyer ou compléter)') AS titre,
  ('Portée' || CASE WHEN nb > 1 THEN 's' ELSE '' END || ' enregistrée' || CASE WHEN nb > 1 THEN 's' ELSE '' END
   || ' avec effectif naissance = 0. '
   || 'Données incomplètes à compléter ou nettoyer pour maintenir la cohérence du cheptel.') AS message,
  current_date AS date_evenement,
  NULL::uuid AS animal_id,
  NULL::uuid AS batiment_id,
  NULL::uuid AS portee_id,
  now() AS created_at,
  false AS en_retard,
  0 AS jours_retard
FROM (
  SELECT
    p.ferme_id,
    count(*)::int AS nb
  FROM public.portees p
  WHERE p.effectif_naissance = 0
    AND p.deleted_at IS NULL
  GROUP BY p.ferme_id
  HAVING count(*) > 0
) r29_counts

UNION ALL

-- 6. R30 — Porcelets 22-24 kg (anticipation transfert Croissance)
-- Agrégation par ferme.
SELECT
  ('00000000-0000-0000-0000-' || substr(md5('R30-' || ferme_id::text), 1, 12))::uuid AS id,
  ferme_id,
  'porcelets_anticipation_croissance'::text AS type,
  'info'::severity_alerte AS severity,
  (nb || ' porcelet' || CASE WHEN nb > 1 THEN 's' ELSE '' END || ' proche' || CASE WHEN nb > 1 THEN 's' ELSE '' END || ' du seuil Croissance (22-24 kg)') AS titre,
  ('Référentiel zootechnique CI : anticipation transfert Croissance à planifier. '
   || nb || ' porcelet' || CASE WHEN nb > 1 THEN 's sont' ELSE ' est' END
   || ' actuellement entre 22 et 24 kg.') AS message,
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
    AND a.poids_actuel_kg >= 22
    AND a.poids_actuel_kg < 24
    AND a.statut = 'actif'
    AND a.deleted_at IS NULL
    AND (b.type IS NULL OR b.type <> 'croissance')
  GROUP BY a.ferme_id
  HAVING count(*) > 0
) r30_counts;

GRANT SELECT ON public.v_alertes_actives TO authenticated;

COMMENT ON VIEW public.v_alertes_actives IS
  'Alertes actives consolidées : alertes_loge non traitées + événements prévus en retard + R27/R28/R29/R30 (détection live).';
