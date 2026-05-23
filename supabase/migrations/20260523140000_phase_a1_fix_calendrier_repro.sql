-- ============================================================================
-- PHASE A.1 — Fix vue v_calendrier_repro pour shape attendu par dashboard
-- ============================================================================
-- Le dashboard attend : type_evenement, date_prevue, jours_restants,
-- animal_tag, animal_nom, priorite, notes, bande_nom
-- La V1 (alias de v_calendrier_reproductif) exposait un shape différent.
-- ============================================================================

DROP VIEW IF EXISTS v_calendrier_repro;

CREATE OR REPLACE VIEW v_calendrier_repro
WITH (security_invoker = true) AS
SELECT
  ev.id,
  ev.ferme_id,
  ev.animal_id,
  ev.portee_id,
  ev.type AS type_evenement,
  ev.date_prevue,
  ev.statut::text AS statut,
  ev.observations AS notes,
  (ev.date_prevue - CURRENT_DATE) AS jours_restants,
  a.tag AS animal_tag,
  a.nom AS animal_nom,
  NULL::text AS bande_nom,
  CASE
    WHEN ev.date_prevue < CURRENT_DATE THEN 'critique'
    WHEN ev.date_prevue <= CURRENT_DATE + 3 THEN 'haute'
    WHEN ev.date_prevue <= CURRENT_DATE + 7 THEN 'normale'
    ELSE 'basse'
  END AS priorite
FROM evenements_prevus ev
LEFT JOIN animaux a ON a.id = ev.animal_id
WHERE ev.deleted_at IS NULL
  AND ev.statut IN ('planifie','retard')
  AND ev.date_prevue <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY ev.date_prevue ASC;

GRANT SELECT ON v_calendrier_repro TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
