-- Migration : prix_matieres_historique
-- Trace historique prix matières premières CI dans le temps.
-- Pattern : INSERT prix → trigger UPDATE matieres_premieres.prix_indicatif_xof_kg
-- Multi-tenant : RLS via current_farm_id() (cf charte §10 règle 4)

BEGIN;

CREATE TABLE IF NOT EXISTS public.prix_matieres_historique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  matiere_id uuid NOT NULL REFERENCES public.matieres_premieres(id) ON DELETE CASCADE,
  date_releve date NOT NULL,
  prix_xof_kg numeric(10, 2) NOT NULL CHECK (prix_xof_kg > 0),
  source text,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS prix_matieres_historique_matiere_idx
  ON public.prix_matieres_historique (matiere_id, date_releve DESC);
CREATE INDEX IF NOT EXISTS prix_matieres_historique_ferme_idx
  ON public.prix_matieres_historique (ferme_id, date_releve DESC);

ALTER TABLE public.prix_matieres_historique ENABLE ROW LEVEL SECURITY;

CREATE POLICY prix_matieres_historique_select
  ON public.prix_matieres_historique
  FOR SELECT
  TO authenticated
  USING (ferme_id = public.current_farm_id());

CREATE POLICY prix_matieres_historique_insert
  ON public.prix_matieres_historique
  FOR INSERT
  TO authenticated
  WITH CHECK (ferme_id = public.current_farm_id());

CREATE POLICY prix_matieres_historique_delete
  ON public.prix_matieres_historique
  FOR DELETE
  TO authenticated
  USING (ferme_id = public.current_farm_id());

GRANT SELECT, INSERT, DELETE ON public.prix_matieres_historique TO authenticated;

-- Trigger : à chaque nouveau relevé, MAJ matieres_premieres.prix_indicatif_xof_kg
-- avec le dernier prix en date (idempotent).
CREATE OR REPLACE FUNCTION public.fn_sync_prix_matiere()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.matieres_premieres
     SET prix_indicatif_xof_kg = NEW.prix_xof_kg
   WHERE id = NEW.matiere_id
     AND ferme_id = NEW.ferme_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_prix_matiere ON public.prix_matieres_historique;
CREATE TRIGGER trg_sync_prix_matiere
  AFTER INSERT ON public.prix_matieres_historique
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_prix_matiere();

COMMIT;
