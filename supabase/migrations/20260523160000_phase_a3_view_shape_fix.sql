-- ============================================================================
-- PHASE A.3 — Fixes column aliases + view shape adjustments
-- ============================================================================

-- 1. diagnostics_gestation : alias date_diagnostic (le code l'attend)
ALTER TABLE diagnostics_gestation
  ADD COLUMN IF NOT EXISTS date_diagnostic date GENERATED ALWAYS AS (date_diag) STORED;

-- 2. v_saillies_a_diagnostiquer : reshape pour matcher exactement le code
DROP VIEW IF EXISTS v_saillies_a_diagnostiquer;

CREATE OR REPLACE VIEW v_saillies_a_diagnostiquer
WITH (security_invoker = true) AS
SELECT
  s.id AS saillie_id,
  s.ferme_id,
  s.truie_id,
  a.tag AS truie_tag,
  a.nom AS truie_nom,
  s.date_saillie,
  s.date_diag_prevue,
  (CURRENT_DATE - s.date_saillie) AS jours_post_saillie,
  CASE
    WHEN (CURRENT_DATE - s.date_saillie) < 18 THEN 'attente'
    WHEN (CURRENT_DATE - s.date_saillie) BETWEEN 18 AND 24 THEN 'fenetre_diagnostic'
    WHEN (CURRENT_DATE - s.date_saillie) BETWEEN 25 AND 45 THEN 'fenetre_echographie'
    ELSE 'retard'
  END AS phase_diagnostic
FROM saillies s
LEFT JOIN animaux a ON a.id = s.truie_id
WHERE s.deleted_at IS NULL
  AND s.statut = 'en_cours'
  AND s.resultat_diag = 'en_attente';

GRANT SELECT ON v_saillies_a_diagnostiquer TO authenticated, anon, service_role;

-- 3. matieres_premieres : la table fraîchement créée doit avoir une RLS qui permet
-- aux users non-admin de la lire (vu que c'est référentiel global, ferme_id NULL OK)
-- Déjà fait dans la migration A.2, juste vérifier ici qu'on n'a pas oublié

-- 4. animaux : ajouter le statut 'gestante' et 'allaitante' si pas déjà dans enum
-- (Le code filtre parfois là-dessus)
-- Note : statut_animal enum = actif/sortie/mort/vendu/reforme/malade — ces statuts
-- reproductifs sont en réalité dans la colonne `stade` (truie_gestante/truie_allaitante)
-- Pas de changement nécessaire

-- 5. Reload PostgREST
NOTIFY pgrst, 'reload schema';
