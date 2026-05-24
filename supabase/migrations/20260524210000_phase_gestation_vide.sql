-- Migration : ajouter phase 'gestation_vide' à l'enum phase_batiment
-- Date: 2026-05-24
-- Auteur: Hermes (sur input Christophe vocal)
-- Contexte: Truies en attente d'insémination doivent avoir leur propre bâtiment
--           pour distinguer leur ration (2.5 kg/j) de la gestation (3 kg/j).

DO $$
BEGIN
  -- PostgreSQL : ALTER TYPE ... ADD VALUE doit être hors transaction.
  -- ici on est en SQL standalone donc OK.
  ALTER TYPE phase_batiment ADD VALUE IF NOT EXISTS 'gestation_vide' BEFORE 'gestation';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'gestation_vide deja present ou erreur: %', SQLERRM;
END $$;

-- Vérification post-migration
SELECT
  enumlabel AS phase,
  enumsortorder AS ordre
FROM pg_enum
WHERE enumtypid = 'phase_batiment'::regtype
ORDER BY enumsortorder;
