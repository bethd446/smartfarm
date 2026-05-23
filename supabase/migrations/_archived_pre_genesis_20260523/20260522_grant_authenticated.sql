-- ============================================================================
-- Migration : GRANT massif aux rôles authenticated + anon
-- Date      : 2026-05-22
-- Auteur    : Hermes (Sprint 1 fix sécurité)
-- Contexte  : Découverte que la plupart des tables n'avaient PAS de
--             GRANT SELECT pour `authenticated`. Conséquence : l'app
--             ne pouvait fonctionner qu'en `service_role` (bypass RLS)
--             ce qui expliquait la fuite cross-tenant sur le dashboard.
-- Action    : GRANT SELECT/INSERT/UPDATE/DELETE à `authenticated` sur
--             toutes les tables publiques. La RLS s'occupe du filtrage.
-- ============================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;

  -- Pour les vues, SELECT seulement
  FOR t IN
    SELECT table_name FROM information_schema.views
    WHERE table_schema='public'
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- Note : `anon` reste sans aucun GRANT (cohérent avec un site auth-only).
-- Les pages publiques (landing) n'ont pas besoin de lire la BDD.
