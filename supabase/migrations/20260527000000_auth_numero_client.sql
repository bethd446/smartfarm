-- =========================================================================
-- R8 — Authentification Supabase + Numéro client unique SF-XXXXXX
-- -------------------------------------------------------------------------
-- Contexte (audit K4 V3) : aucune auth applicative. Cette migration prépare
-- la table `utilisateurs` existante pour Supabase Auth :
--   1) ajoute la colonne `numero_client TEXT UNIQUE` (format SF-XXXXXX)
--   2) backfill le compte démo
--   3) fonction `generer_numero_client()` (random 6 digits, collision retry)
--   4) trigger `on_auth_user_created` qui auto-crée la ligne `utilisateurs`
--      à chaque INSERT dans `auth.users` + génère le numéro client
--   5) policy RLS additionnelle pour permettre le SELECT par numéro_client
--      en mode anonyme (résolution numéro->email côté Server Action login),
--      MAIS uniquement via une fonction SECURITY DEFINER restreinte —
--      pas d'exposition directe de la table.
--
-- Choix tech : on étend `utilisateurs` plutôt que créer une table `profils`
-- séparée, car `utilisateurs` existe déjà avec auth_id, FK partout (5 tables),
-- RLS complète, role_t enum. Pas de duplication.
-- =========================================================================

BEGIN;

-- 1. Ajout colonne numero_client + index ----------------------------------
ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS numero_client TEXT,
  ADD COLUMN IF NOT EXISTS derniere_connexion TIMESTAMPTZ;

-- Backfill du compte démo (déterministe : SF-000001)
UPDATE public.utilisateurs
SET numero_client = 'SF-000001'
WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'
  AND numero_client IS NULL;

-- Contrainte UNIQUE (différée car données préexistantes possibles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'utilisateurs_numero_client_key'
  ) THEN
    ALTER TABLE public.utilisateurs
      ADD CONSTRAINT utilisateurs_numero_client_key UNIQUE (numero_client);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_utilisateurs_numero_client
  ON public.utilisateurs(numero_client);

-- 2. Fonction de génération numéro client unique --------------------------
-- Format : SF-XXXXXX (6 chiffres). ~1M combinaisons. Si collision : retry.
CREATE OR REPLACE FUNCTION public.generer_numero_client()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_num    TEXT;
  v_exists BOOLEAN;
  v_tries  INT := 0;
BEGIN
  LOOP
    v_num := 'SF-' || LPAD((floor(random() * 999999))::INT::TEXT, 6, '0');
    SELECT EXISTS(
      SELECT 1 FROM public.utilisateurs WHERE numero_client = v_num
    ) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_num;
    END IF;
    v_tries := v_tries + 1;
    IF v_tries > 50 THEN
      -- Sécurité : extrêmement improbable mais on raise plutôt que boucle infinie
      RAISE EXCEPTION 'Impossible de générer un numéro client unique après 50 tentatives';
    END IF;
  END LOOP;
END;
$$;

-- 3. Trigger auto-création utilisateur sur signup auth.users -------------
-- Lorsque Supabase Auth crée un utilisateur (signup magic link / password),
-- on synchronise immédiatement une ligne `public.utilisateurs` avec un
-- numéro client généré. La metadata `nom_complet` est récupérée si fournie.
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nom_complet TEXT;
  v_nom         TEXT;
  v_prenom      TEXT;
BEGIN
  -- Si déjà mappé (rare : import / re-signup avec même auth_id) → no-op
  IF EXISTS (SELECT 1 FROM public.utilisateurs WHERE auth_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_nom_complet := COALESCE(NEW.raw_user_meta_data->>'nom_complet', NEW.email);

  -- Split naïf prénom / nom (sur le premier espace)
  IF position(' ' IN v_nom_complet) > 0 THEN
    v_prenom := split_part(v_nom_complet, ' ', 1);
    v_nom    := substring(v_nom_complet FROM position(' ' IN v_nom_complet) + 1);
  ELSE
    v_prenom := v_nom_complet;
    v_nom    := NULL;
  END IF;

  INSERT INTO public.utilisateurs (
    auth_id, email, nom, prenom, role, actif, numero_client
  ) VALUES (
    NEW.id,
    NEW.email,
    v_nom,
    v_prenom,
    'viewer'::role_t,                  -- rôle par défaut, à promouvoir par admin
    true,
    public.generer_numero_client()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.on_auth_user_created();

-- 4. Fonction publique pour résoudre numéro_client → email --------------
-- Le login par numéro client nécessite, côté Server Action, de retrouver
-- l'email correspondant. RLS bloque le SELECT anonyme sur `utilisateurs`.
-- On expose une fonction SECURITY DEFINER étroite : prend un numéro, rend
-- l'email associé (ou NULL). Pas de listing, pas de iteration possible.
-- Rate-limiting et brute force surveillés côté Server Action.
CREATE OR REPLACE FUNCTION public.email_par_numero_client(p_numero TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Normaliser : SF-XXXXXX en majuscules
  p_numero := upper(trim(p_numero));
  IF p_numero !~ '^SF-[0-9]{6}$' THEN
    RETURN NULL;
  END IF;
  SELECT email INTO v_email
  FROM public.utilisateurs
  WHERE numero_client = p_numero
    AND actif = true
    AND deleted_at IS NULL
  LIMIT 1;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.email_par_numero_client(TEXT) TO anon, authenticated;

-- 5. Permettre à un user authentifié de lire SA PROPRE ligne -------------
-- La policy existante `utilisateurs_select` utilise `current_user_internal_id()`
-- qui dépend de la jointure auth_id → utilisateurs.id. On l'augmente pour
-- explicitement autoriser le SELECT par auth_id = auth.uid().
DROP POLICY IF EXISTS utilisateurs_select_by_auth ON public.utilisateurs;
CREATE POLICY utilisateurs_select_by_auth ON public.utilisateurs
  FOR SELECT TO authenticated
  USING (auth_id = auth.uid());

-- 6. Update colonne derniere_connexion (helper, appelée par Server Action)
CREATE OR REPLACE FUNCTION public.touch_derniere_connexion()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.utilisateurs
  SET derniere_connexion = now()
  WHERE auth_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_derniere_connexion() TO authenticated;

COMMIT;

-- =========================================================================
-- Tests à exécuter post-migration :
--   SELECT email_par_numero_client('SF-000001');   -- => demo@smartfarm.local
--   SELECT email_par_numero_client('SF-999999');   -- => NULL
--   SELECT email_par_numero_client('invalid');     -- => NULL (regex bloque)
--   SELECT generer_numero_client();                -- => SF-XXXXXX
-- =========================================================================
