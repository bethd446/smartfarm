-- ============================================================================
-- NUKE PRE-GENESIS — 2026-05-23 (V2 — sans EXCEPTION pour révéler erreurs)
-- Purge complète du schéma public avant migration GENESIS.
-- ============================================================================

-- Désactiver RLS partout d'abord
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Drop toutes les policies
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Drop toutes les vues
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, viewname FROM pg_views WHERE schemaname='public' LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', r.schemaname, r.viewname);
  END LOOP;
END $$;

-- Drop toutes les vues matérialisées
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, matviewname FROM pg_matviews WHERE schemaname='public' LOOP
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE', r.schemaname, r.matviewname);
  END LOOP;
END $$;

-- Drop toutes les triggers
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT trigger_schema, trigger_name, event_object_table 
           FROM information_schema.triggers 
           WHERE trigger_schema='public' LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I CASCADE', 
      r.trigger_name, r.trigger_schema, r.event_object_table);
  END LOOP;
END $$;

-- Drop toutes les fonctions custom (TOUTES, y compris triggers)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
           FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
           WHERE n.nspname='public' 
           AND p.prokind IN ('f','p')  -- functions et procédures, pas les aggregates
           LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', 
      r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Drop toutes les tables (CASCADE pour FK)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Drop tous les types custom
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT n.nspname, t.typname FROM pg_type t 
           JOIN pg_namespace n ON t.typnamespace = n.oid 
           WHERE n.nspname='public' AND t.typtype IN ('e','c','d') LOOP
    EXECUTE format('DROP TYPE IF EXISTS %I.%I CASCADE', r.nspname, r.typname);
  END LOOP;
END $$;

-- Drop sequences
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT sequence_schema, sequence_name FROM information_schema.sequences 
           WHERE sequence_schema='public' LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS %I.%I CASCADE', r.sequence_schema, r.sequence_name);
  END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'NUKE V2 TERMINÉ : schéma public vide, prêt pour GENESIS';
END $$;
