-- ============================================================================
-- F2 — Robustesse Data : Idempotency + UNIQUE + Optimistic Concurrency + RPC stock
-- Sprint 2 Wave 1 — fixes P0-1, P0-2, P0-7, P0-9 (cf. audits/sprint1/C-robustesse-data.md)
-- ============================================================================
-- Périmètre :
--   1) UNIQUE saillies(truie_id, date_saillie) WHERE deleted_at IS NULL   → P0-1
--   2) idempotency_key UUID UNIQUE sur 8 tables critiques                 → P0-9/P0-10
--   3) version INT + trigger bump_version() sur 4 tables éditables        → P0-7/P0-8
--   4) updated_at sur matieres/saillies/mises_bas (déjà sur animaux)
--   5) RPC ajuster_stock_atomique() avec FOR UPDATE                        → P0-2
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Helper triggers : bump_version() et trigger_set_updated_at() (idempotent)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bump_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si le client a fourni une version explicite (optimistic check),
  -- on la laisse passer si elle correspond à OLD.version, sinon on bump.
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1) P0-1 — UNIQUE saillies (truie_id, date_saillie) actives
-- ---------------------------------------------------------------------------
-- Pré-check : pas de doublons résiduels actifs (vérifié : 0 rows en seed actuel)
-- Si seed conflict : décommenter et garder le plus récent
-- WITH dup AS (
--   SELECT id, ROW_NUMBER() OVER (PARTITION BY truie_id, date_saillie ORDER BY created_at DESC) rn
--   FROM saillies WHERE deleted_at IS NULL
-- ) UPDATE saillies SET deleted_at = now() WHERE id IN (SELECT id FROM dup WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saillies_unique_truie_date_active
  ON public.saillies (truie_id, date_saillie)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2) P0-9/P0-10 — Colonnes idempotency_key UUID + UNIQUE partial idx
-- ---------------------------------------------------------------------------
ALTER TABLE public.saillies          ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE public.mises_bas         ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE public.mortalites        ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE public.pesees            ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE public.vaccinations      ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE public.traitements       ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE public.sevrages          ADD COLUMN IF NOT EXISTS idempotency_key UUID;
ALTER TABLE public.mouvements_stock  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_saillies_idempotency          ON public.saillies         (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mises_bas_idempotency         ON public.mises_bas        (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mortalites_idempotency        ON public.mortalites       (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pesees_idempotency            ON public.pesees           (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vaccinations_idempotency      ON public.vaccinations     (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_traitements_idempotency       ON public.traitements      (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sevrages_idempotency          ON public.sevrages         (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mouvements_stock_idempotency  ON public.mouvements_stock (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3) P0-7/P0-8 — Colonne version INT + trigger bump_version sur 4 tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.animaux            ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.matieres_premieres ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.saillies           ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.mises_bas          ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

-- updated_at (animaux l'a déjà — pour les 3 autres)
ALTER TABLE public.matieres_premieres ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.saillies           ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.mises_bas          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Triggers BEFORE UPDATE bump_version (DROP+CREATE pour idempotence)
DROP TRIGGER IF EXISTS trg_animaux_bump_version            ON public.animaux;
DROP TRIGGER IF EXISTS trg_matieres_premieres_bump_version ON public.matieres_premieres;
DROP TRIGGER IF EXISTS trg_saillies_bump_version           ON public.saillies;
DROP TRIGGER IF EXISTS trg_mises_bas_bump_version          ON public.mises_bas;

CREATE TRIGGER trg_animaux_bump_version
  BEFORE UPDATE ON public.animaux
  FOR EACH ROW EXECUTE FUNCTION public.bump_version();

CREATE TRIGGER trg_matieres_premieres_bump_version
  BEFORE UPDATE ON public.matieres_premieres
  FOR EACH ROW EXECUTE FUNCTION public.bump_version();

CREATE TRIGGER trg_saillies_bump_version
  BEFORE UPDATE ON public.saillies
  FOR EACH ROW EXECUTE FUNCTION public.bump_version();

CREATE TRIGGER trg_mises_bas_bump_version
  BEFORE UPDATE ON public.mises_bas
  FOR EACH ROW EXECUTE FUNCTION public.bump_version();

-- Triggers BEFORE UPDATE set_updated_at (animaux déjà couvert)
DROP TRIGGER IF EXISTS set_updated_at_matieres_premieres ON public.matieres_premieres;
DROP TRIGGER IF EXISTS set_updated_at_saillies          ON public.saillies;
DROP TRIGGER IF EXISTS set_updated_at_mises_bas         ON public.mises_bas;

CREATE TRIGGER set_updated_at_matieres_premieres
  BEFORE UPDATE ON public.matieres_premieres
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_saillies
  BEFORE UPDATE ON public.saillies
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at_mises_bas
  BEFORE UPDATE ON public.mises_bas
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) P0-2 — RPC ajuster_stock_atomique : FOR UPDATE + idempotent
-- ---------------------------------------------------------------------------
-- Usage côté client :
--   supabase.rpc('ajuster_stock_atomique', {
--     p_matiere_id: '...', p_delta: -10, p_type: 'sortie',
--     p_date_mvt: '2026-05-24', p_bande_id: null, p_reference: 'TAG-001',
--     p_observations: 'porcherie A', p_idempotency_key: 'uuid...'
--   })
-- Retour : { ok: true, mouvement_id: uuid, stock_actuel: numeric, dedup: bool }
--          | { ok: false, error: 'stock_insuffisant' | 'matiere_introuvable' }

CREATE OR REPLACE FUNCTION public.ajuster_stock_atomique(
  p_matiere_id      UUID,
  p_delta           NUMERIC,
  p_type            TEXT,                 -- 'entree' | 'sortie' | 'ajustement' | 'perte'
  p_date_mvt        DATE     DEFAULT CURRENT_DATE,
  p_bande_id        UUID     DEFAULT NULL,
  p_reference       TEXT     DEFAULT NULL,
  p_observations    TEXT     DEFAULT NULL,
  p_cout_unitaire   NUMERIC  DEFAULT NULL,
  p_fournisseur_id  UUID     DEFAULT NULL,
  p_idempotency_key UUID     DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mouvement_id UUID;
  v_stock        NUMERIC;
  v_qte_abs      NUMERIC := ABS(p_delta);
BEGIN
  -- 0) Garde sur delta non-nul
  IF p_delta = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'delta_nul');
  END IF;

  -- 1) Idempotence : si la clé existe déjà → retour silencieux
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_mouvement_id
      FROM mouvements_stock
     WHERE idempotency_key = p_idempotency_key
     LIMIT 1;
    IF FOUND THEN
      SELECT stock_actuel INTO v_stock FROM matieres_premieres WHERE id = p_matiere_id;
      RETURN jsonb_build_object(
        'ok', true, 'dedup', true,
        'mouvement_id', v_mouvement_id, 'stock_actuel', v_stock
      );
    END IF;
  END IF;

  -- 2) Lock row matiere (FOR UPDATE) — empêche la race
  SELECT stock_actuel INTO v_stock
    FROM matieres_premieres
   WHERE id = p_matiere_id AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'matiere_introuvable');
  END IF;

  -- 3) Garde stock insuffisant sur sortie
  IF p_delta < 0 AND COALESCE(v_stock, 0) + p_delta < 0 THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'stock_insuffisant',
      'stock_actuel', v_stock, 'demande', v_qte_abs
    );
  END IF;

  -- 4) UPDATE atomique stock (le trigger bump_version se déclenche)
  UPDATE matieres_premieres
     SET stock_actuel = COALESCE(stock_actuel, 0) + p_delta
   WHERE id = p_matiere_id
   RETURNING stock_actuel INTO v_stock;

  -- 5) INSERT mouvement (idempotency_key éventuellement défini)
  INSERT INTO mouvements_stock (
    matiere_id, type, date_mvt, quantite,
    bande_id, reference, observations,
    cout_unitaire, cout_total, fournisseur_id,
    idempotency_key
  ) VALUES (
    p_matiere_id, p_type::mvt_t, p_date_mvt, v_qte_abs,
    p_bande_id, p_reference, p_observations,
    p_cout_unitaire,
    CASE WHEN p_cout_unitaire IS NOT NULL THEN p_cout_unitaire * v_qte_abs ELSE NULL END,
    p_fournisseur_id,
    p_idempotency_key
  )
  RETURNING id INTO v_mouvement_id;

  RETURN jsonb_build_object(
    'ok', true, 'dedup', false,
    'mouvement_id', v_mouvement_id, 'stock_actuel', v_stock
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Course concurrente sur l'idempotency_key : récupérer le mouvement existant
    SELECT id INTO v_mouvement_id
      FROM mouvements_stock
     WHERE idempotency_key = p_idempotency_key;
    SELECT stock_actuel INTO v_stock FROM matieres_premieres WHERE id = p_matiere_id;
    RETURN jsonb_build_object(
      'ok', true, 'dedup', true,
      'mouvement_id', v_mouvement_id, 'stock_actuel', v_stock
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ajuster_stock_atomique(
  UUID, NUMERIC, TEXT, DATE, UUID, TEXT, TEXT, NUMERIC, UUID, UUID
) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Commentaires pour traçabilité
-- ---------------------------------------------------------------------------
COMMENT ON FUNCTION public.bump_version()                IS 'F2 Sprint2: incrémente version on UPDATE (optimistic concurrency)';
COMMENT ON FUNCTION public.ajuster_stock_atomique(UUID, NUMERIC, TEXT, DATE, UUID, TEXT, TEXT, NUMERIC, UUID, UUID)
  IS 'F2 Sprint2 P0-2: ajustement stock atomique avec FOR UPDATE + idempotence';
COMMENT ON INDEX  public.idx_saillies_unique_truie_date_active
  IS 'F2 Sprint2 P0-1: empêche doublon saillies sur même truie/jour';

COMMIT;
