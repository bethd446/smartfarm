-- ============================================================================
-- 20260522190000_rpc_bootstrap_ferme.sql
-- F1 Sprint 1 — RPC bootstrap_ferme + colonnes optionnelles fermes
-- ============================================================================
--
-- Permet à un user authentifié sans ferme d'en créer une via le wizard
-- d'onboarding /onboarding. Création atomique :
--   1. INSERT public.fermes (déclenche trigger seed_nouvelle_ferme L3 →
--      5 bâtiments + matières + protocoles + concentrés)
--   2. INSERT public.utilisateur_fermes (lien admin)
--   3. UPDATE public.utilisateurs SET role='admin', onboarded_at=now()
--
-- Schéma fermes confirmé via information_schema :
--   id uuid pk, nom text NN, code text NN, localisation text, pays text='CI',
--   type text='porcine', created_at, updated_at, deleted_at
-- → On ajoute telephone + races_principales (utilisés par la suite par SMS,
--   filtres, KPI génétique). Les effectifs initiaux saisis dans le wizard
--   sont stockés en metadata jsonb (informatif, pas utilisé par l'app
--   métier — l'éleveur crée ses animaux via /cheptel après onboarding).
-- ============================================================================

BEGIN;

-- 1) Colonnes additionnelles fermes (idempotent) -----------------------------
ALTER TABLE public.fermes
  ADD COLUMN IF NOT EXISTS telephone         text,
  ADD COLUMN IF NOT EXISTS races_principales text[],
  ADD COLUMN IF NOT EXISTS metadata          jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) RPC bootstrap_ferme -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_ferme(
  p_nom          text,
  p_localisation text   DEFAULT NULL,
  p_telephone    text   DEFAULT NULL,
  p_races        text[] DEFAULT NULL,
  p_effectifs    jsonb  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_id  uuid;
  v_user_id  uuid;
  v_ferme_id uuid;
  v_code     text;
  v_nom      text;
  v_meta     jsonb;
BEGIN
  -- 1. Auth check
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '28000';
  END IF;

  -- 2. Récupère profil utilisateurs lié à auth_id
  SELECT id INTO v_user_id
    FROM public.utilisateurs
   WHERE auth_id = v_auth_id
     AND deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Profil utilisateur introuvable pour auth_id=%', v_auth_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Validation nom
  v_nom := btrim(coalesce(p_nom, ''));
  IF length(v_nom) < 2 THEN
    RAISE EXCEPTION 'Le nom de la ferme doit contenir au moins 2 caractères'
      USING ERRCODE = '22023';
  END IF;

  -- 4. Génère code ferme : 3 lettres nom + - + 4 chiffres aléatoires.
  --    Re-tirage en cas de collision (très improbable mais propre).
  LOOP
    v_code := upper(left(regexp_replace(v_nom, '[^a-zA-Z]', '', 'g') || 'XXX', 3))
              || '-' || lpad(floor(random()*10000)::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.fermes WHERE code = v_code);
  END LOOP;

  -- 5. Metadata (effectifs initiaux informatifs)
  v_meta := jsonb_build_object(
    'effectifs_declares', coalesce(p_effectifs, '{}'::jsonb),
    'created_via',        'onboarding_wizard',
    'created_by_auth',    v_auth_id::text
  );

  -- 6. INSERT ferme — déclenche trigger seed_nouvelle_ferme (L3) qui crée
  --    automatiquement 5 bâtiments standards + autres seeds.
  INSERT INTO public.fermes (nom, code, localisation, telephone,
                             races_principales, metadata, pays, type)
  VALUES (v_nom, v_code, nullif(btrim(coalesce(p_localisation, '')), ''),
          nullif(btrim(coalesce(p_telephone, '')), ''),
          p_races, v_meta, 'CI', 'porcine')
  RETURNING id INTO v_ferme_id;

  -- 7. Lie user → ferme avec rôle admin
  INSERT INTO public.utilisateur_fermes (utilisateur_id, ferme_id, role)
  VALUES (v_user_id, v_ferme_id, 'admin'::role_t)
  ON CONFLICT DO NOTHING;

  -- 8. Promouvoir user à admin sur son profil + marquer onboarded
  UPDATE public.utilisateurs
     SET role         = 'admin'::role_t,
         onboarded_at = now()
   WHERE id = v_user_id;

  RETURN v_ferme_id;
END;
$$;

-- 3) Grants ------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.bootstrap_ferme(text, text, text, text[], jsonb)
  TO authenticated;

COMMIT;
