-- ============================================================================
-- Migration : ALTER VIEW security_invoker=true sur toutes les vues publiques
-- Date      : 2026-05-22 (Sprint 2 fix)
-- Contexte  : Les vues SQL exécutaient en SECURITY DEFINER par défaut → bypass
--             RLS des tables sous-jacentes. Ex : v_calendrier_repro retournait
--             des events de toutes les fermes au lieu de filtrer via la RLS
--             de evenements_prevus. Fuite cross-tenant secondaire.
-- Action    : security_invoker = true → les vues respectent désormais la RLS
--             du caller (le user authentifié). 19 vues patchées.
-- ============================================================================

DO $$
DECLARE v text;
BEGIN
  FOR v IN
    SELECT table_name FROM information_schema.views WHERE table_schema='public'
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v);
  END LOOP;
END $$;
