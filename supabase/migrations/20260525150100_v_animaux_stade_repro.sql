-- ============================================================================
-- Vue v_animaux_stade_repro : stade reproducteur métier par femelle
-- (truie/cochette) — remplace l'affichage du `animaux.statut` brut (`actif`)
-- dans l'onglet cheptel/truies et la fiche truie.
--
-- Bug initial : la colonne "STATUT" du cheptel affiche `animaux.statut`
-- (toujours `actif`) au lieu du stade métier réel
-- (`gestante J60` / `allaitante J18` / `vide` / `pré-saillie`).
--
-- Le code UI (app/src/app/(app)/cheptel/page.tsx:127) consomme déjà
-- v_animaux_stade_repro avec un fallback graceful — cette migration câble
-- la vue absente.
--
-- Stades calculés (priorité descendante) :
--   1. ALLAITANTE : dernière mise_bas <28j ET pas de sevrage rattaché
--   2. GESTANTE   : dernière saillie POSITIF dans la fenêtre [18..114j]
--                   ET pas de mise_bas rattachée à cette saillie
--   3. PRÉ-SAILLIE: cochette femelle jamais saillie (categorie = 'cochette')
--   4. VIDE       : tout le reste (truie sans saillie active, retour, négatif…)
--
-- Référence audit : .claude-memory/CRITIQUE_V2_FULL_2026-05-25.md (Chantier B)
-- Mapping UI : app/src/app/(app)/cheptel/page.tsx:262 STADE_REPRO_MAP
--   → libellés strictement : 'gestante' | 'allaitante' | 'vide' | 'pré-saillie'
-- ============================================================================

DROP VIEW IF EXISTS public.v_animaux_stade_repro CASCADE;

CREATE OR REPLACE VIEW public.v_animaux_stade_repro
WITH (security_invoker = true) AS
WITH derniere_mb AS (
  -- Dernière mise bas par truie (utile pour stade allaitante)
  SELECT DISTINCT ON (mb.truie_id)
    mb.truie_id,
    mb.id        AS mb_id,
    mb.date_mb,
    mb.saillie_id
  FROM public.mises_bas mb
  WHERE mb.deleted_at IS NULL
  ORDER BY mb.truie_id, mb.date_mb DESC
),
sevrage_dernier_mb AS (
  -- Sevrage rattaché à la dernière mise bas (via mb_id direct ou portee)
  SELECT DISTINCT ON (dm.truie_id)
    dm.truie_id,
    sv.date_sevrage
  FROM derniere_mb dm
  JOIN public.sevrages sv
    ON sv.deleted_at IS NULL
   AND (sv.mb_id = dm.mb_id
        OR (sv.truie_id = dm.truie_id AND sv.date_sevrage >= dm.date_mb))
  ORDER BY dm.truie_id, sv.date_sevrage DESC
),
derniere_saillie AS (
  -- Dernière saillie active par truie (non supprimée)
  SELECT DISTINCT ON (s.truie_id)
    s.truie_id,
    s.id            AS saillie_id,
    s.date_saillie,
    s.resultat_diag,
    s.statut
  FROM public.saillies s
  WHERE s.deleted_at IS NULL
  ORDER BY s.truie_id, s.date_saillie DESC
),
diag_positif_derniere_saillie AS (
  -- La dernière saillie a-t-elle un diagnostic POSITIF confirmé ?
  SELECT DISTINCT ds.truie_id
  FROM derniere_saillie ds
  WHERE EXISTS (
    SELECT 1
    FROM public.diagnostics_gestation dg
    WHERE dg.saillie_id = ds.saillie_id
      AND dg.deleted_at IS NULL
      AND dg.resultat = 'positif'
  )
)
SELECT
  a.id,
  a.ferme_id,
  a.tag,
  a.nom,
  a.categorie,
  CASE
    -- 1. ALLAITANTE : MB <28j ET pas de sevrage post-MB
    WHEN dm.date_mb IS NOT NULL
         AND (CURRENT_DATE - dm.date_mb) <= 28
         AND sv.date_sevrage IS NULL
      THEN 'allaitante'

    -- 2. GESTANTE : dernière saillie diag POSITIF (ou résultat enum 'positif'),
    --    dans fenêtre [18..114j], et pas de mise_bas rattachée
    WHEN ds.date_saillie IS NOT NULL
         AND (CURRENT_DATE - ds.date_saillie) BETWEEN 18 AND 114
         AND (ds.resultat_diag = 'positif' OR dp.truie_id IS NOT NULL)
         AND NOT EXISTS (
           SELECT 1
           FROM public.mises_bas mb2
           WHERE mb2.saillie_id = ds.saillie_id
             AND mb2.deleted_at IS NULL
         )
      THEN 'gestante'

    -- 3. PRÉ-SAILLIE : cochette femelle jamais saillie
    WHEN a.categorie = 'cochette'
         AND ds.date_saillie IS NULL
      THEN 'pré-saillie'

    -- 4. VIDE : tout le reste
    ELSE 'vide'
  END AS stade_repro,

  CASE
    -- ALLAITANTE → jours depuis MB
    WHEN dm.date_mb IS NOT NULL
         AND (CURRENT_DATE - dm.date_mb) <= 28
         AND sv.date_sevrage IS NULL
      THEN (CURRENT_DATE - dm.date_mb)::int

    -- GESTANTE → jours post-saillie
    WHEN ds.date_saillie IS NOT NULL
         AND (CURRENT_DATE - ds.date_saillie) BETWEEN 18 AND 114
         AND (ds.resultat_diag = 'positif' OR dp.truie_id IS NOT NULL)
         AND NOT EXISTS (
           SELECT 1
           FROM public.mises_bas mb3
           WHERE mb3.saillie_id = ds.saillie_id
             AND mb3.deleted_at IS NULL
         )
      THEN (CURRENT_DATE - ds.date_saillie)::int

    -- VIDE / PRÉ-SAILLIE → pas de compteur
    ELSE NULL
  END AS jours_stade
FROM public.animaux a
LEFT JOIN derniere_mb                       dm ON dm.truie_id = a.id
LEFT JOIN sevrage_dernier_mb                sv ON sv.truie_id = a.id
LEFT JOIN derniere_saillie                  ds ON ds.truie_id = a.id
LEFT JOIN diag_positif_derniere_saillie     dp ON dp.truie_id = a.id
WHERE a.deleted_at IS NULL
  AND a.sexe = 'F'
  AND a.categorie IN ('truie', 'cochette');

GRANT SELECT ON public.v_animaux_stade_repro TO authenticated, anon, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
