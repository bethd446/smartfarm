-- =============================================================================
-- B3 — Création table actes_sanitaires (carnet véto MIRAH-compatible)
-- 2026-05-27
--
-- Stocke chaque administration de produit véto (vitamine, antibiotique,
-- vaccin, antiparasitaire, désinfectant, mineral, tonique).
-- Cible exclusive : un animal_id OU une bande_id (CHECK XOR).
--
-- Dépend de :
--   - public.fermes (existante)
--   - public.animaux (existante)
--   - public.bandes (existante)
--   - public.veterinaires_standards (Lane B1 parallèle)
--     → FK DEFERRABLE INITIALLY DEFERRED pour permettre l'ordre d'application
--   - auth.users (Supabase Auth)
--
-- RLS multi-tenant via ferme_id ∈ user_farms (user authentifié).
-- =============================================================================

-- ---------- Pré-requis : extension pgcrypto (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Pré-requis graceful : si veterinaires_standards absente,
-- on crée un stub temporaire pour ne pas faire planter cette migration.
-- Lane B1 remplacera proprement la définition.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'veterinaires_standards' AND relnamespace = 'public'::regnamespace
  ) THEN
    CREATE TABLE public.veterinaires_standards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nom text NOT NULL,
      type text NOT NULL DEFAULT 'tonique',
      voie text NULL,
      delai_attente_j int NOT NULL DEFAULT 0,
      max_jours int NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    COMMENT ON TABLE public.veterinaires_standards IS
      'STUB B3 — sera remplacé par migration B1. Ne pas seeder ici.';
    RAISE NOTICE 'B3 stub veterinaires_standards créé (B1 pas encore appliquée)';
  END IF;
END $$;

-- =============================================================================
-- 1. TABLE actes_sanitaires
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.actes_sanitaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,

  -- Cible exclusive : animal OU bande (XOR enforced via CHECK)
  animal_id uuid NULL REFERENCES public.animaux(id) ON DELETE SET NULL,
  bande_id  uuid NULL REFERENCES public.bandes(id)  ON DELETE SET NULL,

  -- Produit administré (référentiel partagé B1)
  produit_id uuid NOT NULL
    REFERENCES public.veterinaires_standards(id)
    DEFERRABLE INITIALLY DEFERRED,

  -- Posologie réelle
  dose         numeric(10,3) NOT NULL CHECK (dose > 0),
  unite_dose   text          NOT NULL,
  voie         text          NOT NULL,
  duree_jours  int           NOT NULL DEFAULT 1 CHECK (duree_jours BETWEEN 1 AND 30),

  -- Métadonnées
  motif           text NULL,
  ordonnance_url  text NULL,
  operateur_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Dates
  date_administration timestamptz NOT NULL DEFAULT now(),
  delai_attente_viande_jours int NULL,
  -- date_fin_delai_attente : calculée via trigger BEFORE INSERT/UPDATE (Postgres refuse les GENERATED non-immutable sur cast date)
  date_fin_delai_attente date NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- Contrainte XOR : exactement une cible (animal OU bande, pas les deux, pas zéro)
  CONSTRAINT actes_sanitaires_cible_xor CHECK (
    (animal_id IS NOT NULL AND bande_id IS NULL) OR
    (animal_id IS NULL AND bande_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.actes_sanitaires IS
  'Carnet sanitaire MIRAH : chaque administration véto (vitamine, antibio, vaccin, antipar, désinfectant). Cible XOR animal|bande.';
COMMENT ON COLUMN public.actes_sanitaires.date_fin_delai_attente IS
  'Date à partir de laquelle la viande est commercialisable (calculée auto).';
COMMENT ON COLUMN public.actes_sanitaires.duree_jours IS
  'Durée du traitement en jours (1-30). Garde-fou Ucaphoscal: 5j max (côté serveur).';

-- =============================================================================
-- 2. INDEX (lecture rapide carnet ferme, filtres par animal/bande/délai)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_actes_ferme_date
  ON public.actes_sanitaires (ferme_id, date_administration DESC);

CREATE INDEX IF NOT EXISTS idx_actes_animal
  ON public.actes_sanitaires (animal_id)
  WHERE animal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_actes_bande
  ON public.actes_sanitaires (bande_id)
  WHERE bande_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_actes_fin_delai
  ON public.actes_sanitaires (date_fin_delai_attente)
  WHERE date_fin_delai_attente IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_actes_produit
  ON public.actes_sanitaires (produit_id);

-- =============================================================================
-- 3. TRIGGER copy_delai_attente — auto-fill delai depuis veterinaires_standards
-- =============================================================================
CREATE OR REPLACE FUNCTION public.actes_sanitaires_copy_delai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.delai_attente_viande_jours IS NULL AND NEW.produit_id IS NOT NULL THEN
    SELECT vs.delai_attente_j
      INTO NEW.delai_attente_viande_jours
    FROM public.veterinaires_standards vs
    WHERE vs.id = NEW.produit_id;
  END IF;
  -- Calcule aussi date_fin_delai_attente (remplace l'ancienne GENERATED column qui était non-immutable)
  IF NEW.delai_attente_viande_jours IS NULL THEN
    NEW.date_fin_delai_attente := NULL;
  ELSE
    NEW.date_fin_delai_attente := (NEW.date_administration::date + NEW.delai_attente_viande_jours * INTERVAL '1 day')::date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_actes_sanitaires_copy_delai ON public.actes_sanitaires;
CREATE TRIGGER trg_actes_sanitaires_copy_delai
  BEFORE INSERT OR UPDATE ON public.actes_sanitaires
  FOR EACH ROW
  EXECUTE FUNCTION public.actes_sanitaires_copy_delai();

-- =============================================================================
-- 4. RLS multi-tenant (filtre ferme_id ∈ user_farms du user authentifié)
-- =============================================================================
ALTER TABLE public.actes_sanitaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS actes_sanitaires_select_own_ferme ON public.actes_sanitaires;
CREATE POLICY actes_sanitaires_select_own_ferme
  ON public.actes_sanitaires
  FOR SELECT
  TO authenticated
  USING (
    ferme_id IN (
      SELECT user_farms.ferme_id FROM public.user_farms
      WHERE user_farms.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS actes_sanitaires_insert_own_ferme ON public.actes_sanitaires;
CREATE POLICY actes_sanitaires_insert_own_ferme
  ON public.actes_sanitaires
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ferme_id IN (
      SELECT user_farms.ferme_id FROM public.user_farms
      WHERE user_farms.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS actes_sanitaires_update_own_ferme ON public.actes_sanitaires;
CREATE POLICY actes_sanitaires_update_own_ferme
  ON public.actes_sanitaires
  FOR UPDATE
  TO authenticated
  USING (
    ferme_id IN (
      SELECT user_farms.ferme_id FROM public.user_farms
      WHERE user_farms.user_id = auth.uid()
    )
  )
  WITH CHECK (
    ferme_id IN (
      SELECT user_farms.ferme_id FROM public.user_farms
      WHERE user_farms.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS actes_sanitaires_delete_own_ferme ON public.actes_sanitaires;
CREATE POLICY actes_sanitaires_delete_own_ferme
  ON public.actes_sanitaires
  FOR DELETE
  TO authenticated
  USING (
    ferme_id IN (
      SELECT user_farms.ferme_id FROM public.user_farms
      WHERE user_farms.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 5. GRANTS (sans GRANT explicite, RLS policies ne suffisent pas — cf brain L175)
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actes_sanitaires TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- 6. Vérif post-migration
-- =============================================================================
DO $$
DECLARE v_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'actes_sanitaires'
      AND relnamespace = 'public'::regnamespace
  ) INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'Migration KO : actes_sanitaires introuvable';
  END IF;
  RAISE NOTICE 'Migration OK : actes_sanitaires créée + RLS + trigger copy_delai';
END $$;
