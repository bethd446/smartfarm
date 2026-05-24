-- ============================================================================
-- 20260524 — Nutrition prédictive : composition formules + projection stock
-- ============================================================================
-- Objectif :
--   1. Table `formules_composants` (matieres_premieres % par formule)
--   2. Vue `v_stock_projection_ferme` : conso quotidienne / stock dispo /
--      jours restants / date d'épuisement par formule.
--
-- Multi-tenant : RLS via auth.uid() + user_farms (cohérent avec stack).
-- ============================================================================

-- 1. TABLE -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.formules_composants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  formule_id uuid NOT NULL REFERENCES public.formules(id) ON DELETE CASCADE,
  matiere_id uuid NOT NULL REFERENCES public.matieres_premieres(id) ON DELETE RESTRICT,
  pct numeric(5,2) NOT NULL CHECK (pct >= 0 AND pct <= 100),
  ordre int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_formules_composants_formule
  ON public.formules_composants(formule_id);
CREATE INDEX IF NOT EXISTS idx_formules_composants_ferme
  ON public.formules_composants(ferme_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_formules_composants_formule_matiere
  ON public.formules_composants(formule_id, matiere_id);

-- RLS
ALTER TABLE public.formules_composants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fcomp_select ON public.formules_composants;
CREATE POLICY fcomp_select ON public.formules_composants
  FOR SELECT
  USING (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS fcomp_insert ON public.formules_composants;
CREATE POLICY fcomp_insert ON public.formules_composants
  FOR INSERT
  WITH CHECK (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS fcomp_update ON public.formules_composants;
CREATE POLICY fcomp_update ON public.formules_composants
  FOR UPDATE
  USING (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS fcomp_delete ON public.formules_composants;
CREATE POLICY fcomp_delete ON public.formules_composants
  FOR DELETE
  USING (
    ferme_id IN (
      SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.formules_composants TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 2. VUE PROJECTION STOCK ----------------------------------------------------
-- Calcule pour chaque formule de chaque ferme :
--   - conso_quotidienne_kg : Σ (effectif_actif_batiment × ration_kg_jour) où aliment_id = formule.id
--   - stock_kg_actuel : Σ (matiere.stock_actuel × pct/100) / (Σ pct/100)
--     (capacité limitante : on prend min des stocks / pct par composant)
--   - jours_restants & date_epuisement

DROP VIEW IF EXISTS public.v_stock_projection_ferme CASCADE;

CREATE VIEW public.v_stock_projection_ferme
WITH (security_invoker = true)
AS
WITH conso AS (
  -- Conso quotidienne par formule (somme batiments où aliment_id = formule)
  SELECT
    b.aliment_id AS formule_id,
    b.ferme_id,
    SUM(
      COALESCE(b.ration_kg_jour_par_sujet, 0)
      * COALESCE(eff.nb_actifs, 0)
    ) AS conso_quotidienne_kg
  FROM public.batiments b
  LEFT JOIN (
    SELECT batiment_id, COUNT(*) AS nb_actifs
    FROM public.animaux
    WHERE statut = 'actif' AND deleted_at IS NULL
    GROUP BY batiment_id
  ) eff ON eff.batiment_id = b.id
  WHERE b.aliment_id IS NOT NULL
    AND b.deleted_at IS NULL
  GROUP BY b.aliment_id, b.ferme_id
),
stock_par_formule AS (
  -- Capacité limitante : pour chaque formule, on calcule pour chaque composant
  -- combien de kg de formule on peut produire (= stock_matiere / (pct/100)).
  -- Le min sur tous les composants = stock formule équivalent disponible.
  SELECT
    fc.formule_id,
    fc.ferme_id,
    MIN(
      CASE
        WHEN fc.pct > 0 THEN mp.stock_actuel / (fc.pct / 100.0)
        ELSE NULL
      END
    ) AS stock_kg_actuel
  FROM public.formules_composants fc
  JOIN public.matieres_premieres mp ON mp.id = fc.matiere_id
  WHERE mp.deleted_at IS NULL
  GROUP BY fc.formule_id, fc.ferme_id
)
SELECT
  f.id AS formule_id,
  f.ferme_id,
  f.nom AS formule_nom,
  f.stade AS formule_stade,
  COALESCE(c.conso_quotidienne_kg, 0)::numeric(12,2) AS conso_quotidienne_kg,
  COALESCE(s.stock_kg_actuel, 0)::numeric(12,2) AS stock_kg_actuel,
  CASE
    WHEN COALESCE(c.conso_quotidienne_kg, 0) > 0
    THEN FLOOR(COALESCE(s.stock_kg_actuel, 0) / c.conso_quotidienne_kg)::int
    ELSE NULL
  END AS jours_restants,
  CASE
    WHEN COALESCE(c.conso_quotidienne_kg, 0) > 0
    THEN (CURRENT_DATE + (FLOOR(COALESCE(s.stock_kg_actuel, 0) / c.conso_quotidienne_kg) || ' days')::interval)::date
    ELSE NULL
  END AS date_epuisement
FROM public.formules f
LEFT JOIN conso c ON c.formule_id = f.id AND c.ferme_id = f.ferme_id
LEFT JOIN stock_par_formule s ON s.formule_id = f.id AND s.ferme_id = f.ferme_id
WHERE f.deleted_at IS NULL;

GRANT SELECT ON public.v_stock_projection_ferme TO authenticated;
GRANT SELECT ON public.v_stock_projection_ferme TO anon;

-- ============================================================================
-- END
-- ============================================================================
