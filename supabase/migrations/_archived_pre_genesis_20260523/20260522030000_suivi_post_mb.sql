-- Chantier CHANT-C — Suivi post mise-bas (checks J+0 à J+7)
-- Table checks_post_mb : enregistre la surveillance post-mise-bas
-- Vue v_checks_post_mb_attendus : liste les mises-bas nécessitant un check
BEGIN;

CREATE TABLE IF NOT EXISTS checks_post_mb (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mise_bas_id uuid NOT NULL REFERENCES mises_bas(id) ON DELETE CASCADE,
  jour_post_mb integer NOT NULL CHECK (jour_post_mb >= 0),
  date_check date NOT NULL DEFAULT CURRENT_DATE,
  vivants_actuels integer,
  ecrases_24h integer DEFAULT 0,
  morts_autres_24h integer DEFAULT 0,
  bcs_truie numeric(2,1) CHECK (bcs_truie IS NULL OR (bcs_truie >= 1 AND bcs_truie <= 5)),
  truie_lactation_ok boolean,        -- truie produit du lait
  truie_appetit_ok boolean,          -- truie mange
  porcelets_actifs boolean,          -- porcelets vifs, tètent
  observations text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_checks_post_mb_mb_jour
  ON checks_post_mb(mise_bas_id, jour_post_mb);

GRANT SELECT, INSERT, UPDATE ON checks_post_mb TO anon, authenticated;

-- Vue : mises-bas nécessitant un check J+0 à J+7
CREATE OR REPLACE VIEW v_checks_post_mb_attendus
WITH (security_invoker=true) AS
SELECT
  mb.id AS mise_bas_id,
  mb.truie_id,
  a.tag AS truie_tag,
  a.nom AS truie_nom,
  a.ferme_id,
  mb.date_mise_bas,
  mb.nes_vivants,
  (CURRENT_DATE - mb.date_mise_bas) AS jours_post_mb,
  CASE
    WHEN (CURRENT_DATE - mb.date_mise_bas) = 0 THEN 'J0'
    WHEN (CURRENT_DATE - mb.date_mise_bas) = 1 THEN 'J+1'
    WHEN (CURRENT_DATE - mb.date_mise_bas) BETWEEN 2 AND 3 THEN 'J+2-3'
    WHEN (CURRENT_DATE - mb.date_mise_bas) BETWEEN 4 AND 7 THEN 'J+4-7'
    ELSE 'J>7'
  END AS phase_check,
  (SELECT COUNT(*) FROM checks_post_mb c
   WHERE c.mise_bas_id = mb.id AND c.deleted_at IS NULL) AS nb_checks,
  (SELECT MAX(c.jour_post_mb) FROM checks_post_mb c
   WHERE c.mise_bas_id = mb.id AND c.deleted_at IS NULL) AS dernier_jour_check
FROM mises_bas mb
JOIN animaux a ON a.id = mb.truie_id
WHERE mb.deleted_at IS NULL
  AND (CURRENT_DATE - mb.date_mise_bas) BETWEEN 0 AND 7;

GRANT SELECT ON v_checks_post_mb_attendus TO anon, authenticated;

COMMIT;
