-- PROD-B : table légère d'observations BCS rapides (1-tap sur fiche /cheptel/[id])
-- audit_logs ne convient pas (CHECK action IN INSERT/UPDATE/DELETE, pas de metadata).
-- Pas de modif aux tables saillies/mises_bas/sevrages (BCS de l'évènement déjà tracé).

BEGIN;

CREATE TABLE IF NOT EXISTS observations_bcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  animal_id uuid NOT NULL REFERENCES animaux(id) ON DELETE CASCADE,
  bcs numeric(2,1) NOT NULL CHECK (bcs BETWEEN 1 AND 5),
  date_observation date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obs_bcs_animal_date
  ON observations_bcs (animal_id, date_observation DESC);

CREATE INDEX IF NOT EXISTS idx_obs_bcs_ferme
  ON observations_bcs (ferme_id);

GRANT SELECT, INSERT ON observations_bcs TO anon, authenticated;

COMMIT;
