-- ============================================================================
-- PHASE A.4 — Table cases (sub-jonction batiments) + fix divers
-- ============================================================================

CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  batiment_id uuid NOT NULL REFERENCES batiments(id) ON DELETE CASCADE,
  numero text NOT NULL,
  capacite integer DEFAULT 0,
  type text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY cases_select ON cases FOR SELECT
    USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY cases_modify ON cases FOR ALL
    USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- animaux.case_id : référence optionnelle vers une case dans bâtiment
ALTER TABLE animaux ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES cases(id);

NOTIFY pgrst, 'reload schema';
