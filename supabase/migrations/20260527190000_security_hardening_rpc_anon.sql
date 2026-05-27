-- ============================================================================
-- 2026-05-27 — Durcissement sécurité RPC anon
--
-- Contexte : audit sécu adversaire sur branche feat/phase-a-quick-wins.
-- Findings traités ici :
--
--   P1-3 — email_par_numero_client GRANT EXECUTE TO anon → user enumeration
--          via brute-force sur l'espace SF-XXXXXX (1M valeurs, ~10h à 3 req/s).
--          La fonction est utilisée par le login alternatif (numéro client +
--          password). Elle reste callable par 'authenticated' (login post-1er
--          accès) et par 'service_role' (admin). On retire uniquement 'anon'.
--
--          → Trade-off documenté : l'utilisateur qui s'est créé un compte
--            (donc est authentifié au moins une fois) peut toujours utiliser
--            le login par numéro client après. Un client qui n'a JAMAIS
--            d'authentification active devra utiliser le login email.
--            Si ce trade-off ne convient pas, alternative : wrapper la RPC
--            avec rate-limiting (table compteur + pg_sleep) — TODO Phase D.
--
-- ============================================================================

-- 1) Retirer le GRANT EXECUTE à anon
REVOKE EXECUTE ON FUNCTION public.email_par_numero_client(TEXT) FROM anon;

-- 2) S'assurer que authenticated + service_role gardent l'accès
GRANT EXECUTE ON FUNCTION public.email_par_numero_client(TEXT) TO authenticated, service_role;

-- 3) Documenter le changement sur la fonction
COMMENT ON FUNCTION public.email_par_numero_client(TEXT) IS
  'Lookup email par numéro client SF-XXXXXX. EXECUTE limité à authenticated/service_role (REVOKE anon le 2026-05-27 — prévention user enumeration). Login alt par numéro client : flow inscription → email confirmation → re-login = transition acceptable.';

-- 4) Vérif post-migration
DO $$
DECLARE v_has_anon boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    LEFT JOIN aclexplode(p.proacl) acl ON true
    WHERE n.nspname = 'public'
      AND p.proname = 'email_par_numero_client'
      AND acl.grantee = 'anon'::regrole
      AND acl.privilege_type = 'EXECUTE'
  ) INTO v_has_anon;

  IF v_has_anon THEN
    RAISE EXCEPTION 'Migration KO : anon a toujours EXECUTE sur email_par_numero_client';
  END IF;
  RAISE NOTICE 'Migration OK : anon REVOKE sur email_par_numero_client confirmé';
END $$;

NOTIFY pgrst, 'reload schema';
