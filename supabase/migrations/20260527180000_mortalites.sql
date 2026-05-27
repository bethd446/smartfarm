-- ============================================================================
-- B10 — Module Mortalités avec motifs codifiés (V2 brief §3.3)
-- ============================================================================
-- Objectif :
--   1. ENUM `motif_mortalite` (12 motifs codifiés métier porcin CI)
--   2. TABLE `mortalites` (individuel OU masse/bande, jamais les deux)
--   3. RLS multi-tenant via current_farm_id() + user_farms
--   4. Trigger auto-update `animaux.statut='mort'` si cible individuelle
--
-- Audit V2 : module mortalités INEXISTANT (top P0 hors carnet sanitaire).
-- Évite double saisie : si animal_id NOT NULL → statut animal basculé auto.
-- ============================================================================

-- 1. ENUM motif_mortalite ----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.motif_mortalite AS ENUM (
    'asphyxie',
    'ecrasement',
    'hypothermie',
    'diarrhee',
    'malformation',
    'ppa_suspect',
    'pneumonie',
    'septicemie',
    'cannibalisme',
    'predateur',
    'indetermine',
    'autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABLE mortalites --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mortalites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id          uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  animal_id         uuid REFERENCES public.animaux(id) ON DELETE SET NULL,
  bande_id          uuid REFERENCES public.bandes(id) ON DELETE SET NULL,
  nb_animaux        int NOT NULL DEFAULT 1 CHECK (nb_animaux > 0 AND nb_animaux <= 1000),
  motif             public.motif_mortalite NOT NULL,
  motif_libre       text,
  date_mortalite    date NOT NULL DEFAULT current_date,
  observations      text,
  declarer_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),

  -- Cible exclusive : (animal individuel, nb=1) OU (bande/masse, animal NULL)
  CONSTRAINT chk_mortalite_cible_exclusive CHECK (
    (animal_id IS NOT NULL AND bande_id IS NULL AND nb_animaux = 1)
    OR
    (animal_id IS NULL AND bande_id IS NOT NULL)
  ),

  -- motif='autre' → motif_libre obligatoire (≤200 chars)
  CONSTRAINT chk_mortalite_motif_libre CHECK (
    motif <> 'autre' OR (motif_libre IS NOT NULL AND length(trim(motif_libre)) > 0 AND length(motif_libre) <= 200)
  ),

  -- Date pas dans le futur
  CONSTRAINT chk_mortalite_date_pas_future CHECK (date_mortalite <= current_date)
);

CREATE INDEX IF NOT EXISTS idx_mortalites_ferme_date
  ON public.mortalites(ferme_id, date_mortalite DESC);
CREATE INDEX IF NOT EXISTS idx_mortalites_animal
  ON public.mortalites(animal_id) WHERE animal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mortalites_bande
  ON public.mortalites(bande_id) WHERE bande_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mortalites_motif
  ON public.mortalites(motif);

-- 3. RLS multi-tenant --------------------------------------------------------
ALTER TABLE public.mortalites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mortalites_select ON public.mortalites;
CREATE POLICY mortalites_select ON public.mortalites
  FOR SELECT
  USING (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS mortalites_insert ON public.mortalites;
CREATE POLICY mortalites_insert ON public.mortalites
  FOR INSERT
  WITH CHECK (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS mortalites_update ON public.mortalites;
CREATE POLICY mortalites_update ON public.mortalites
  FOR UPDATE
  USING (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS mortalites_delete ON public.mortalites;
CREATE POLICY mortalites_delete ON public.mortalites
  FOR DELETE
  USING (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mortalites TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. Trigger on_mortalite_insert ---------------------------------------------
-- Si animal_id NOT NULL → marque animal mort + deleted_at = now()
-- Évite double saisie : déclarer mortalité = bascule statut automatique.
CREATE OR REPLACE FUNCTION public.tg_mortalite_marque_animal_mort()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.animal_id IS NOT NULL THEN
    UPDATE public.animaux
       SET statut = 'mort',
           deleted_at = now(),
           cause_sortie = NEW.motif::text,
           date_sortie = NEW.date_mortalite,
           destination = 'MORT',
           updated_at = now()
     WHERE id = NEW.animal_id
       AND ferme_id = NEW.ferme_id
       AND statut <> 'mort'; -- idempotent : pas de double bascule
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mortalite_marque_animal_mort ON public.mortalites;
CREATE TRIGGER trg_mortalite_marque_animal_mort
  AFTER INSERT ON public.mortalites
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_mortalite_marque_animal_mort();

-- Note : pas d'effet auto sur bande_id (masse) — la décrémentation d'effectif
-- bande relève d'une feature future si bandes.effectif_courant existe un jour.

-- 5. COMMENT documentation ---------------------------------------------------
COMMENT ON TABLE public.mortalites IS
  'B10 — Déclarations de mortalité avec motifs codifiés (V2 brief §3.3). '
  'Cible individuelle (animal_id, nb=1) OU masse (bande_id, nb>=1). '
  'Trigger AFTER INSERT bascule animaux.statut=mort si individuel.';

COMMENT ON COLUMN public.mortalites.motif IS
  '12 motifs codifiés : asphyxie, ecrasement, hypothermie, diarrhee, '
  'malformation, ppa_suspect, pneumonie, septicemie, cannibalisme, '
  'predateur, indetermine, autre (motif_libre requis).';

COMMENT ON COLUMN public.mortalites.declarer_user_id IS
  'auth.users.id du déclarant (traçabilité). NULL si user supprimé.';
