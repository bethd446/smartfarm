-- ============================================================================
-- C9 — Module Adoptions / égalisation portées maternité (V2 brief §10)
-- ============================================================================
-- Objectif :
--   1. ENUM `motif_adoption` (5 motifs codifiés zootech IFIP)
--   2. TABLE `adoptions` (transfert porcelets entre 2 mises-bas, même ferme)
--   3. RLS multi-tenant via current_farm_id() + user_farms
--   4. Trigger AFTER INSERT : ajuste `mises_bas.nes_vivants` source/destination
--      (source -= N, destination += N) — compteurs collectifs portée.
--
-- Audit V2 §10 : adoption = pratique quotidienne maternité (truie A 14 porcelets
-- → max ~10 tétines → transfert 4 vers truie B perte/sous-capacité).
-- Pas de table `porcelets_individuels` en BDD : porcelets restent collectifs au
-- niveau portée (mises_bas.nes_vivants) jusqu'au sevrage où ils sont
-- individualisés en `animaux`. L'adoption travaille donc sur compteurs portée.
-- ============================================================================

-- 1. ENUM motif_adoption -----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.motif_adoption AS ENUM (
    'surcharge_donneuse',
    'perte_receveuse',
    'egalisation_taille',
    'sante_porcelet',
    'autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABLE adoptions ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.adoptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id            uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  date_adoption       date NOT NULL DEFAULT current_date,
  mb_source_id        uuid NOT NULL REFERENCES public.mises_bas(id) ON DELETE CASCADE,
  mb_destination_id   uuid NOT NULL REFERENCES public.mises_bas(id) ON DELETE CASCADE,
  nb_porcelets        int  NOT NULL CHECK (nb_porcelets > 0 AND nb_porcelets <= 20),
  motif_adoption      public.motif_adoption NOT NULL,
  motif_libre         text,
  operateur_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observations        text,
  created_at          timestamptz NOT NULL DEFAULT now(),

  -- Source ≠ destination (pas d'adoption sur soi-même)
  CONSTRAINT chk_adoption_mb_distinctes CHECK (mb_source_id <> mb_destination_id),

  -- motif='autre' → motif_libre obligatoire (≤200 chars)
  CONSTRAINT chk_adoption_motif_libre CHECK (
    motif_adoption <> 'autre'
    OR (motif_libre IS NOT NULL AND length(trim(motif_libre)) > 0 AND length(motif_libre) <= 200)
  ),

  -- Date pas dans le futur
  CONSTRAINT chk_adoption_date_pas_future CHECK (date_adoption <= current_date)
);

CREATE INDEX IF NOT EXISTS idx_adoptions_ferme_date
  ON public.adoptions(ferme_id, date_adoption DESC);
CREATE INDEX IF NOT EXISTS idx_adoptions_source
  ON public.adoptions(mb_source_id);
CREATE INDEX IF NOT EXISTS idx_adoptions_destination
  ON public.adoptions(mb_destination_id);

-- 3. Trigger BEFORE INSERT : valide cohérence ferme + capacité source --------
-- Garantit que les 2 MB appartiennent à la même ferme que l'adoption (anti
-- cross-ferme malgré RLS) et que la source a assez de porcelets vivants.
CREATE OR REPLACE FUNCTION public.tg_adoption_valide_coherence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_ferme_source uuid;
  v_ferme_dest   uuid;
  v_vivants_src  int;
BEGIN
  SELECT ferme_id, nes_vivants
    INTO v_ferme_source, v_vivants_src
    FROM public.mises_bas WHERE id = NEW.mb_source_id;

  SELECT ferme_id INTO v_ferme_dest
    FROM public.mises_bas WHERE id = NEW.mb_destination_id;

  IF v_ferme_source IS NULL OR v_ferme_dest IS NULL THEN
    RAISE EXCEPTION 'Adoption : mise-bas source ou destination introuvable';
  END IF;

  IF v_ferme_source <> NEW.ferme_id OR v_ferme_dest <> NEW.ferme_id THEN
    RAISE EXCEPTION 'Adoption : les deux mises-bas doivent appartenir a la meme ferme que l''adoption';
  END IF;

  IF NEW.nb_porcelets > v_vivants_src THEN
    RAISE EXCEPTION 'Adoption : nb_porcelets (%) superieur aux vivants restants source (%)',
      NEW.nb_porcelets, v_vivants_src;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_adoption_valide_coherence ON public.adoptions;
CREATE TRIGGER trg_adoption_valide_coherence
  BEFORE INSERT ON public.adoptions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_adoption_valide_coherence();

-- 4. Trigger AFTER INSERT : ajuste compteurs nes_vivants ---------------------
-- Source perd N porcelets (transferes), destination en gagne N.
-- updated_at touche pour reactivite UI / cache.
CREATE OR REPLACE FUNCTION public.tg_adoption_ajuste_compteurs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mises_bas
     SET nes_vivants = GREATEST(0, nes_vivants - NEW.nb_porcelets),
         updated_at  = now()
   WHERE id = NEW.mb_source_id;

  UPDATE public.mises_bas
     SET nes_vivants = nes_vivants + NEW.nb_porcelets,
         updated_at  = now()
   WHERE id = NEW.mb_destination_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_adoption_ajuste_compteurs ON public.adoptions;
CREATE TRIGGER trg_adoption_ajuste_compteurs
  AFTER INSERT ON public.adoptions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_adoption_ajuste_compteurs();

-- 5. RLS multi-tenant --------------------------------------------------------
ALTER TABLE public.adoptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS adoptions_select ON public.adoptions;
CREATE POLICY adoptions_select ON public.adoptions
  FOR SELECT
  USING (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS adoptions_insert ON public.adoptions;
CREATE POLICY adoptions_insert ON public.adoptions
  FOR INSERT
  WITH CHECK (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS adoptions_update ON public.adoptions;
CREATE POLICY adoptions_update ON public.adoptions
  FOR UPDATE
  USING (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS adoptions_delete ON public.adoptions;
CREATE POLICY adoptions_delete ON public.adoptions
  FOR DELETE
  USING (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.adoptions TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. COMMENT documentation ---------------------------------------------------
COMMENT ON TABLE public.adoptions IS
  'C9 — Transferts de porcelets entre 2 mises-bas (egalisation tetines IFIP). '
  'mb_source perd nb_porcelets vivants, mb_destination en gagne autant. '
  'Triggers : valide ferme/capacite (BEFORE) + ajuste compteurs (AFTER).';

COMMENT ON COLUMN public.adoptions.motif_adoption IS
  '5 motifs : surcharge_donneuse, perte_receveuse, egalisation_taille, '
  'sante_porcelet, autre (motif_libre obligatoire).';

COMMENT ON COLUMN public.adoptions.operateur_user_id IS
  'auth.users.id de l''operateur ayant realise l''adoption (tracabilite).';
