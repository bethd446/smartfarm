-- ============================================================================
-- Fix v_saillies_a_diagnostiquer : exclure les saillies déjà diagnostiquées
-- positives ET celles ayant déjà une mise bas enregistrée.
--
-- Bug initial (migration 20260523160000_phase_a3_view_shape_fix.sql) :
-- la vue filtre sur `s.resultat_diag = 'en_attente'` côté saillies, mais
-- N'EXCLUT PAS les saillies qui ont déjà un `diagnostics_gestation` POSITIF
-- ni celles avec une `mises_bas` rattachée. Résultat : 6/8 saillies listées
-- en bruit sur la ferme test, 18/20 sur la démo.
--
-- Référence audit : .claude-memory/CRITIQUE_V2_FULL_2026-05-25.md (Chantier A)
-- ============================================================================

DROP VIEW IF EXISTS public.v_saillies_a_diagnostiquer CASCADE;

CREATE OR REPLACE VIEW public.v_saillies_a_diagnostiquer
WITH (security_invoker = true) AS
SELECT
  s.id              AS saillie_id,
  s.ferme_id,
  s.truie_id,
  a.tag             AS truie_tag,
  a.nom             AS truie_nom,
  s.date_saillie,
  s.date_diag_prevue,
  (CURRENT_DATE - s.date_saillie) AS jours_post_saillie,
  CASE
    WHEN (CURRENT_DATE - s.date_saillie) < 18                       THEN 'attente'
    WHEN (CURRENT_DATE - s.date_saillie) BETWEEN 18 AND 24          THEN 'fenetre_diagnostic'
    WHEN (CURRENT_DATE - s.date_saillie) BETWEEN 25 AND 45          THEN 'fenetre_echographie'
    ELSE                                                                 'retard'
  END AS phase_diagnostic
FROM public.saillies s
LEFT JOIN public.animaux a ON a.id = s.truie_id
WHERE s.deleted_at IS NULL
  AND s.statut = 'en_cours'
  AND s.resultat_diag = 'en_attente'
  -- Exclure les saillies déjà diagnostiquées POSITIF (gestation confirmée)
  AND NOT EXISTS (
    SELECT 1
    FROM public.diagnostics_gestation dg
    WHERE dg.saillie_id = s.id
      AND dg.deleted_at IS NULL
      AND dg.resultat = 'positif'
  )
  -- Exclure les saillies qui ont déjà donné lieu à une mise bas
  AND NOT EXISTS (
    SELECT 1
    FROM public.mises_bas mb
    WHERE mb.saillie_id = s.id
      AND mb.deleted_at IS NULL
  );

GRANT SELECT ON public.v_saillies_a_diagnostiquer TO authenticated, anon, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
