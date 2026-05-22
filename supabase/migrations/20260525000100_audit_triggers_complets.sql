-- ============================================================================
-- G2 — P0-8 : Triggers audit_log complets sur tables critiques manquantes
-- Sprint 2 Wave 2 — étend la couverture audit de 9/43 à 26/43 tables.
-- ============================================================================
-- Fonction réutilisée : trigger_audit_log() (existante, vérifiée).
-- Couverture actuelle (9 tables) : animaux, bandes, departs, mises_bas,
--   mortalites, mouvements_stock, saillies, sevrages, traitements.
-- Tables ajoutées par G2 (17) :
--   vaccinations, pesees, batiments, cases, evenements_prevus,
--   observations_bcs, biosecurite_audits, ppa_observations,
--   matieres_premieres, lots_matieres_premieres,
--   consommations_aliment, consommations_eau, plans_alimentation,
--   formulations, transits_phase, checks_post_mb, diagnostics_gestation
-- ============================================================================

BEGIN;

-- Helper : créer un trigger audit idempotent sur une table donnée
-- (DROP + CREATE — pas de "CREATE TRIGGER IF NOT EXISTS" en PG < 17)
DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'vaccinations',
    'pesees',
    'batiments',
    'cases',
    'evenements_prevus',
    'observations_bcs',
    'biosecurite_audits',
    'ppa_observations',
    'matieres_premieres',
    'lots_matieres_premieres',
    'consommations_aliment',
    'consommations_eau',
    'plans_alimentation',
    'formulations',
    'transits_phase',
    'checks_post_mb',
    'diagnostics_gestation'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    -- Vérifier que la table existe avant
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS audit_%I ON public.%I;',
        v_table, v_table
      );
      EXECUTE format(
        'CREATE TRIGGER audit_%I
           AFTER INSERT OR UPDATE OR DELETE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();',
        v_table, v_table
      );
      RAISE NOTICE 'G2 audit trigger installé sur %', v_table;
    ELSE
      RAISE NOTICE 'G2 SKIP table inexistante: %', v_table;
    END IF;
  END LOOP;
END$$;

COMMIT;

-- Vérification post-migration (à exécuter manuellement) :
--   SELECT event_object_table, trigger_name
--   FROM information_schema.triggers
--   WHERE trigger_schema='public'
--     AND action_statement LIKE '%trigger_audit_log%'
--   ORDER BY event_object_table;
