-- ============================================================================
-- Migration V2-D : BCS truie aux 3 moments clés + écrasés post-naissance
-- + vue historique BCS truie
-- ----------------------------------------------------------------------------
-- - Ajoute bcs_truie (numeric 2,1, 1..5) sur saillies, mises_bas, sevrages
-- - Ajoute ecrases (integer >=0) sur mises_bas (perte post-naissance,
--   en plus de nes_morts qui représente les mort-nés)
-- - Crée une vue v_bcs_historique_truie consolidant les évaluations BCS
--   par truie (utilisée par la fiche animal)
-- ============================================================================

BEGIN;

-- ─── BCS au moment de la saillie ─────────────────────────────────────────────
ALTER TABLE saillies
  ADD COLUMN IF NOT EXISTS bcs_truie numeric(2,1)
    CHECK (bcs_truie IS NULL OR (bcs_truie >= 1 AND bcs_truie <= 5));

COMMENT ON COLUMN saillies.bcs_truie IS
  'Body Condition Score de la truie à la saillie (1=très maigre, 3=optimal, 5=grasse)';

-- ─── BCS à la mise-bas + écrasés post-naissance ──────────────────────────────
ALTER TABLE mises_bas
  ADD COLUMN IF NOT EXISTS bcs_truie numeric(2,1)
    CHECK (bcs_truie IS NULL OR (bcs_truie >= 1 AND bcs_truie <= 5));

COMMENT ON COLUMN mises_bas.bcs_truie IS
  'Body Condition Score de la truie à la mise-bas (1=très maigre, 3=optimal, 5=grasse)';

ALTER TABLE mises_bas
  ADD COLUMN IF NOT EXISTS ecrases integer DEFAULT 0
    CHECK (ecrases IS NULL OR ecrases >= 0);

COMMENT ON COLUMN mises_bas.ecrases IS
  'Porcelets écrasés en post-naissance (en plus de nes_morts qui sont les mort-nés)';

-- ─── BCS au sevrage ──────────────────────────────────────────────────────────
ALTER TABLE sevrages
  ADD COLUMN IF NOT EXISTS bcs_truie numeric(2,1)
    CHECK (bcs_truie IS NULL OR (bcs_truie >= 1 AND bcs_truie <= 5));

COMMENT ON COLUMN sevrages.bcs_truie IS
  'Body Condition Score de la truie au sevrage (1=très maigre, 3=optimal, 5=grasse)';

-- ─── Vue historique BCS truie ────────────────────────────────────────────────
-- Consolide les évaluations BCS sur les 3 événements (saillie, mise-bas,
-- sevrage) pour une truie donnée. Consommée par la fiche animal.
-- security_invoker=true → RLS sur tables sous-jacentes appliqué à l'appelant.
CREATE OR REPLACE VIEW v_bcs_historique_truie
WITH (security_invoker=true) AS
SELECT
    truie_id,
    date_saillie       AS date_obs,
    bcs_truie,
    'saillie'::text    AS evenement,
    ferme_id
FROM saillies
WHERE bcs_truie IS NOT NULL
  AND deleted_at IS NULL
UNION ALL
SELECT
    truie_id,
    date_mise_bas      AS date_obs,
    bcs_truie,
    'mise_bas'::text   AS evenement,
    NULL::uuid         AS ferme_id
FROM mises_bas
WHERE bcs_truie IS NOT NULL
  AND deleted_at IS NULL
UNION ALL
SELECT
    truie_id,
    date_sevrage       AS date_obs,
    bcs_truie,
    'sevrage'::text    AS evenement,
    NULL::uuid         AS ferme_id
FROM sevrages
WHERE bcs_truie IS NOT NULL
  AND deleted_at IS NULL;

COMMENT ON VIEW v_bcs_historique_truie IS
  'Historique consolidé du BCS truie sur saillies, mises-bas et sevrages';

GRANT SELECT ON v_bcs_historique_truie TO anon, authenticated;

COMMIT;
