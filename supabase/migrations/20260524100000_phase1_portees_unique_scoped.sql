-- =============================================================================
-- Phase 1 / Stabilisation — 2026-05-24
-- Fix bug schéma multi-tenant : portees.code_portee
--
-- AVANT : UNIQUE (code_portee) → conflits cross-fermes (impossible d'avoir
--         le même code_portee P-202605-001 chez 2 fermes différentes)
-- APRÈS : UNIQUE (ferme_id, code_portee) → propre multi-tenant
--
-- Pas de risque sur l'existant car le trigger auto-génère déjà le code par
-- ferme (compteur `WHERE ferme_id = NEW.ferme_id`), donc aucune collision
-- active à la migration.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portees_code_portee_key'
      AND conrelid = 'public.portees'::regclass
  ) THEN
    ALTER TABLE public.portees DROP CONSTRAINT portees_code_portee_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS portees_ferme_code_unique
  ON public.portees (ferme_id, code_portee);

-- Vérification post-migration (lit la nouvelle contrainte)
DO $$
DECLARE
  v_constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'portees'
      AND indexname = 'portees_ferme_code_unique'
  ) INTO v_constraint_exists;

  IF NOT v_constraint_exists THEN
    RAISE EXCEPTION 'Migration KO : portees_ferme_code_unique introuvable';
  END IF;

  RAISE NOTICE 'Migration OK : portees.code_portee scoped par ferme_id';
END $$;
