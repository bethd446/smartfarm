-- ============================================================================
-- 20260522180100_utilisateurs_onboarded.sql
-- F1 — Flag de fin d'onboarding sur la table utilisateurs
-- ============================================================================
--
-- Ajoute `onboarded_at` : timestamptz NULL par défaut.
-- - NULL  → l'utilisateur n'a pas (encore) terminé le wizard d'onboarding
-- - SET   → timestamp de complétion du wizard
--
-- Utilisé par le layout authentifié pour rediriger vers /onboarding tant que
-- la valeur est NULL (F1 du Sprint 1).
-- ============================================================================

ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

COMMENT ON COLUMN public.utilisateurs.onboarded_at IS
  'Timestamp de completion du wizard d''onboarding. NULL = pas encore onboardé.';
