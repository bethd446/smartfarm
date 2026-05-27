-- ============================================================================
-- B1 Sprint Phase B/C — Référentiel produits vétérinaires CI
--
-- Table : public.veterinaires_standards
--   Catalogue partagé (ferme_id IS NULL) + extensions par ferme possibles.
--   Sert : sélecteur produit dans actes_sanitaires (Lane B3), suggestions
--   protocoles, traçabilité délai d'attente viande.
--
-- Brief V2 §3.2 — 20 produits référence Côte d'Ivoire (vitamines, toniques,
-- minéraux, antibiotiques, antiparasitaires, vaccins, désinfectants).
--
-- Enums :
--   type_produit_veto : tonique | vitamine | mineral | antibiotique
--                       antiparasitaire | vaccin | desinfectant
--   voie_administration : IM | SC | IV | PO | topique | drench
--
-- RLS : lecture authenticated/anon (catalogue partagé) + isolation ferme si
-- ferme_id renseigné (extensions privées).
--
-- Idempotent : CREATE TABLE IF NOT EXISTS + DO blocks pour enums.
-- ============================================================================

-- 1) ENUMS ------------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE public.type_produit_veto AS ENUM (
    'tonique',
    'vitamine',
    'mineral',
    'antibiotique',
    'antiparasitaire',
    'vaccin',
    'desinfectant'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.voie_administration AS ENUM (
    'IM',
    'SC',
    'IV',
    'PO',
    'topique',
    'drench'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- 2) TABLE ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.veterinaires_standards (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id            uuid NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  nom                 text NOT NULL,
  type                public.type_produit_veto NOT NULL,
  voie                public.voie_administration NULL,
  dose_typique        numeric(10,3) NULL,
  unite_dose          text NULL,
  delai_attente_j     int NOT NULL DEFAULT 0,
  max_jours           int NULL,
  obligatoire_ci      boolean NOT NULL DEFAULT false,
  contre_indications  text[] NULL,
  notes               text NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.veterinaires_standards IS
  'Catalogue produits vétérinaires CI (ferme_id NULL = standard partagé). Brief V2 §3.2.';
COMMENT ON COLUMN public.veterinaires_standards.delai_attente_j IS
  'Délai d''attente viande en jours (réglementaire CI / OMS Codex).';
COMMENT ON COLUMN public.veterinaires_standards.max_jours IS
  'Durée maximale de traitement recommandée (ex: Ucaphoscal=5).';
COMMENT ON COLUMN public.veterinaires_standards.obligatoire_ci IS
  'true = vaccin/traitement réglementairement obligatoire en CI (ex: PPC).';

-- 3) INDEX UNIQUE PARTIEL (nom unique pour les standards ferme_id IS NULL) --
CREATE UNIQUE INDEX IF NOT EXISTS veterinaires_standards_nom_global_uniq
  ON public.veterinaires_standards (nom)
  WHERE ferme_id IS NULL;

-- Index unique par ferme pour extensions privées (un nom unique par ferme)
CREATE UNIQUE INDEX IF NOT EXISTS veterinaires_standards_nom_ferme_uniq
  ON public.veterinaires_standards (ferme_id, nom)
  WHERE ferme_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS veterinaires_standards_type_idx
  ON public.veterinaires_standards (type);

-- 4) RLS --------------------------------------------------------------------
ALTER TABLE public.veterinaires_standards ENABLE ROW LEVEL SECURITY;

-- Lecture : standards partagés visibles à tous + privés visibles à la ferme owner
DROP POLICY IF EXISTS veterinaires_standards_select ON public.veterinaires_standards;
CREATE POLICY veterinaires_standards_select
  ON public.veterinaires_standards
  FOR SELECT
  TO authenticated, anon
  USING (
    ferme_id IS NULL
    OR ferme_id = public.current_farm_id()
  );

-- Insert/Update/Delete : uniquement sur sa propre ferme (jamais sur standards partagés)
DROP POLICY IF EXISTS veterinaires_standards_insert ON public.veterinaires_standards;
CREATE POLICY veterinaires_standards_insert
  ON public.veterinaires_standards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ferme_id IS NOT NULL
    AND ferme_id = public.current_farm_id()
  );

DROP POLICY IF EXISTS veterinaires_standards_update ON public.veterinaires_standards;
CREATE POLICY veterinaires_standards_update
  ON public.veterinaires_standards
  FOR UPDATE
  TO authenticated
  USING (
    ferme_id IS NOT NULL
    AND ferme_id = public.current_farm_id()
  )
  WITH CHECK (
    ferme_id IS NOT NULL
    AND ferme_id = public.current_farm_id()
  );

DROP POLICY IF EXISTS veterinaires_standards_delete ON public.veterinaires_standards;
CREATE POLICY veterinaires_standards_delete
  ON public.veterinaires_standards
  FOR DELETE
  TO authenticated
  USING (
    ferme_id IS NOT NULL
    AND ferme_id = public.current_farm_id()
  );

-- 5) GRANTS ----------------------------------------------------------------
GRANT SELECT ON public.veterinaires_standards TO authenticated, anon, service_role;
GRANT INSERT, UPDATE, DELETE ON public.veterinaires_standards TO authenticated, service_role;

-- 6) Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
