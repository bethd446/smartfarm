-- ============================================================================
-- 20260522180000_seed_batiments_standards.sql
-- F2 — Bootstrap automatique des bâtiments par défaut pour chaque nouvelle ferme
-- ============================================================================
--
-- Crée 5 bâtiments standards (verraterie, gestation, maternité, post-sevrage,
-- engraissement) lors de la création d'une ferme, via trigger AFTER INSERT.
-- Le trigger déclenche aussi les autres seeds existants (matières premières,
-- protocoles, concentrés industriels) de manière défensive (échec silencieux
-- si une fonction n'est pas déployée — utile pour les environnements partiels).
--
-- Schéma `batiments` confirmé : ferme_id uuid, nom text, type text (CHECK
-- constraint: maternité|gestation|verraterie|post-sevrage|engraissement|
-- quarantaine|infirmerie), capacite int, surface_m2 numeric.
-- ============================================================================

-- 1) Fonction de seed des bâtiments standards --------------------------------
CREATE OR REPLACE FUNCTION public.seed_batiments_standards(p_ferme uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.batiments (ferme_id, nom, type, capacite)
  VALUES
    (p_ferme, 'Verraterie',    'verraterie',     8),
    (p_ferme, 'Gestation',     'gestation',     60),
    (p_ferme, 'Maternité',     'maternité',    120),
    (p_ferme, 'Post-sevrage',  'post-sevrage', 250),
    (p_ferme, 'Engraissement', 'engraissement', 400)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 2) Trigger function : appelle tous les seeds disponibles ------------------
CREATE OR REPLACE FUNCTION public.trg_seed_nouvelle_ferme()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Seed bâtiments : critique, doit réussir
  PERFORM public.seed_batiments_standards(NEW.id);

  -- Autres seeds : défensifs (peuvent ne pas exister sur certains envs)
  BEGIN
    PERFORM public.seed_matieres_premieres_standards(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    PERFORM public.seed_concentres_industriels_standards(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    PERFORM public.seed_protocoles_standards(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- 3) Trigger AFTER INSERT ON fermes ------------------------------------------
DROP TRIGGER IF EXISTS seed_nouvelle_ferme ON public.fermes;
CREATE TRIGGER seed_nouvelle_ferme
  AFTER INSERT ON public.fermes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seed_nouvelle_ferme();

-- 4) Grants ------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.seed_batiments_standards(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trg_seed_nouvelle_ferme()       TO authenticated, service_role;
