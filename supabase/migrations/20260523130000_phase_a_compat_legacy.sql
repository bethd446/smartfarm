-- ============================================================================
-- PHASE A — Migration compat (Option C : Hybride vues compat + stub tables)
-- ============================================================================
-- Objectif : le code Next.js legacy ne crashe plus.
-- Stratégie : ajouter colonnes manquantes en GENERATED ALWAYS où possible,
--             créer tables stub vides pour features non implémentées,
--             pas de breaking change sur le schéma GENESIS V2.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. mises_bas : colonnes alias + colonnes physiques manquantes
-- ----------------------------------------------------------------------------
-- date_mise_bas (alias de date_mb) — colonne générée
ALTER TABLE mises_bas
  ADD COLUMN IF NOT EXISTS date_mise_bas date GENERATED ALWAYS AS (date_mb) STORED;

-- nes_morts (alias de morts_nes) — colonne générée
ALTER TABLE mises_bas
  ADD COLUMN IF NOT EXISTS nes_morts integer GENERATED ALWAYS AS (morts_nes) STORED;

-- nes_totaux (calculé) — colonne générée
ALTER TABLE mises_bas
  ADD COLUMN IF NOT EXISTS nes_totaux integer
    GENERATED ALWAYS AS (COALESCE(nes_vivants,0) + COALESCE(morts_nes,0) + COALESCE(momifies,0)) STORED;

-- duree_minutes (alias de duree_mb_minutes) — colonne générée
ALTER TABLE mises_bas
  ADD COLUMN IF NOT EXISTS duree_minutes integer GENERATED ALWAYS AS (duree_mb_minutes) STORED;

-- Colonnes physiques manquantes — nullable
ALTER TABLE mises_bas ADD COLUMN IF NOT EXISTS ecrases integer;
ALTER TABLE mises_bas ADD COLUMN IF NOT EXISTS poids_portee_kg numeric;
ALTER TABLE mises_bas ADD COLUMN IF NOT EXISTS bcs_truie numeric;
ALTER TABLE mises_bas ADD COLUMN IF NOT EXISTS bande_id uuid;  -- FK ajoutée plus tard quand bandes existera
ALTER TABLE mises_bas ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS mises_bas_idempotency_key_uniq
  ON mises_bas(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. animaux : alias numero_boucle + rang_porte
-- ----------------------------------------------------------------------------
ALTER TABLE animaux
  ADD COLUMN IF NOT EXISTS numero_boucle text GENERATED ALWAYS AS (tag) STORED;
ALTER TABLE animaux
  ADD COLUMN IF NOT EXISTS rang_porte integer;  -- physique nullable, sera fill plus tard

-- ----------------------------------------------------------------------------
-- 3. saillies : bande_id stub
-- ----------------------------------------------------------------------------
ALTER TABLE saillies ADD COLUMN IF NOT EXISTS bande_id uuid;

-- ----------------------------------------------------------------------------
-- 4. Tables stub vides (le code lit, on retourne 0 rows sans crash)
-- ----------------------------------------------------------------------------

-- BANDES (conduite en bandes — feature future)
CREATE TABLE IF NOT EXISTS bandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  code text,
  date_debut date,
  date_fin date,
  statut text DEFAULT 'active' CHECK (statut IN ('active','sevrée','archivée')),
  phase_courante text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE bandes ENABLE ROW LEVEL SECURITY;
CREATE POLICY bandes_select ON bandes FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY bandes_modify ON bandes FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- BANDE_ANIMAUX (liaison N-N)
CREATE TABLE IF NOT EXISTS bande_animaux (
  bande_id uuid REFERENCES bandes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  date_entree date DEFAULT CURRENT_DATE,
  date_sortie date,
  PRIMARY KEY (bande_id, animal_id)
);
ALTER TABLE bande_animaux ENABLE ROW LEVEL SECURITY;
CREATE POLICY bande_animaux_select ON bande_animaux FOR SELECT
  USING (bande_id IN (SELECT id FROM bandes));
CREATE POLICY bande_animaux_modify ON bande_animaux FOR ALL
  USING (bande_id IN (SELECT id FROM bandes));

-- SEVRAGES
CREATE TABLE IF NOT EXISTS sevrages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  portee_id uuid REFERENCES portees(id) ON DELETE CASCADE,
  truie_id uuid REFERENCES animaux(id),
  date_sevrage date NOT NULL,
  effectif_sevre integer,
  poids_moyen_kg numeric,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE sevrages ENABLE ROW LEVEL SECURITY;
CREATE POLICY sevrages_select ON sevrages FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY sevrages_modify ON sevrages FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- VACCINATIONS
CREATE TABLE IF NOT EXISTS vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  bande_id uuid REFERENCES bandes(id),
  vaccin text NOT NULL,
  date_administration date NOT NULL,
  date_rappel_prevu date,
  voie_administration text,
  lot_vaccin text,
  veterinaire text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY vaccinations_select ON vaccinations FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY vaccinations_modify ON vaccinations FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- TRAITEMENTS
CREATE TABLE IF NOT EXISTS traitements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  bande_id uuid REFERENCES bandes(id),
  motif text,
  medicament text NOT NULL,
  posologie text,
  date_debut date NOT NULL,
  date_fin date,
  veterinaire text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE traitements ENABLE ROW LEVEL SECURITY;
CREATE POLICY traitements_select ON traitements FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY traitements_modify ON traitements FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- OBSERVATIONS_BCS
CREATE TABLE IF NOT EXISTS observations_bcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  date_observation date NOT NULL DEFAULT CURRENT_DATE,
  bcs numeric NOT NULL CHECK (bcs >= 1 AND bcs <= 5),
  contexte text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE observations_bcs ENABLE ROW LEVEL SECURITY;
CREATE POLICY observations_bcs_select ON observations_bcs FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY observations_bcs_modify ON observations_bcs FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- FORMULES (alimentation — alias structurel de donnees_metier formules)
CREATE TABLE IF NOT EXISTS formules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid REFERENCES fermes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  stade text,
  type_formule text CHECK (type_formule IN ('aliment_complet','faf_concentre','faf_integrale')),
  description text,
  ingredients jsonb,
  cout_kg_fcfa numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE formules ENABLE ROW LEVEL SECURITY;
CREATE POLICY formules_select ON formules FOR SELECT
  USING (ferme_id IS NULL OR ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY formules_modify ON formules FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- INGREDIENTS (alimentation — alias de matieres_premieres)
CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid REFERENCES fermes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  categorie text,
  pb_pct numeric,
  en_mj_kg numeric,
  cout_kg_fcfa numeric,
  fournisseur text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY ingredients_select ON ingredients FOR SELECT
  USING (ferme_id IS NULL OR ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY ingredients_modify ON ingredients FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. Vues compat (legacy view names)
-- ----------------------------------------------------------------------------

-- v_calendrier_repro (alias de v_calendrier_reproductif)
CREATE OR REPLACE VIEW v_calendrier_repro
WITH (security_invoker = true) AS
SELECT * FROM v_calendrier_reproductif;
GRANT SELECT ON v_calendrier_repro TO authenticated, anon, service_role;

-- v_kpi_techniques_ferme (KPI agrégés ferme)
CREATE OR REPLACE VIEW v_kpi_techniques_ferme
WITH (security_invoker = true) AS
SELECT
  f.id AS ferme_id,
  f.nom AS ferme_nom,
  (SELECT COUNT(*) FROM animaux a WHERE a.ferme_id = f.id AND a.categorie = 'truie' AND a.deleted_at IS NULL) AS nb_truies,
  (SELECT COUNT(*) FROM animaux a WHERE a.ferme_id = f.id AND a.categorie = 'verrat' AND a.deleted_at IS NULL) AS nb_verrats,
  (SELECT COUNT(*) FROM animaux a WHERE a.ferme_id = f.id AND a.stade = 'truie_gestante' AND a.deleted_at IS NULL) AS nb_gestantes,
  (SELECT COUNT(*) FROM animaux a WHERE a.ferme_id = f.id AND a.stade = 'truie_allaitante' AND a.deleted_at IS NULL) AS nb_allaitantes,
  (SELECT COALESCE(AVG(nes_vivants), 0)::numeric(5,2)
     FROM mises_bas mb WHERE mb.ferme_id = f.id AND mb.deleted_at IS NULL AND mb.date_mb >= CURRENT_DATE - INTERVAL '12 months') AS portee_moyenne_12m,
  (SELECT COUNT(*) FROM portees p WHERE p.ferme_id = f.id AND p.deleted_at IS NULL AND p.date_sortie_finition IS NULL) AS nb_portees_actives
FROM fermes f;
GRANT SELECT ON v_kpi_techniques_ferme TO authenticated, anon, service_role;

-- v_kpi_techniques_truie (par truie individuelle)
CREATE OR REPLACE VIEW v_kpi_techniques_truie
WITH (security_invoker = true) AS
SELECT
  a.id AS truie_id,
  a.ferme_id,
  a.tag,
  a.nom,
  (SELECT COUNT(*) FROM mises_bas mb WHERE mb.truie_id = a.id AND mb.deleted_at IS NULL) AS nb_portees,
  (SELECT COALESCE(SUM(nes_vivants), 0) FROM mises_bas mb WHERE mb.truie_id = a.id AND mb.deleted_at IS NULL) AS total_nes_vivants,
  (SELECT COALESCE(AVG(nes_vivants), 0)::numeric(5,2) FROM mises_bas mb WHERE mb.truie_id = a.id AND mb.deleted_at IS NULL) AS portee_moyenne,
  (SELECT MAX(date_mb) FROM mises_bas mb WHERE mb.truie_id = a.id AND mb.deleted_at IS NULL) AS derniere_mb
FROM animaux a
WHERE a.categorie IN ('truie', 'cochette') AND a.deleted_at IS NULL;
GRANT SELECT ON v_kpi_techniques_truie TO authenticated, anon, service_role;

-- v_score_truie (score composite — stub simple)
CREATE OR REPLACE VIEW v_score_truie
WITH (security_invoker = true) AS
SELECT
  k.truie_id,
  k.ferme_id,
  k.tag,
  k.nom,
  k.nb_portees,
  k.portee_moyenne,
  CASE
    WHEN k.portee_moyenne >= 11 THEN 'A'
    WHEN k.portee_moyenne >= 9  THEN 'B'
    WHEN k.portee_moyenne >= 7  THEN 'C'
    ELSE 'D'
  END AS classe,
  (LEAST(k.portee_moyenne * 8, 100))::numeric(5,2) AS score_global
FROM v_kpi_techniques_truie k;
GRANT SELECT ON v_score_truie TO authenticated, anon, service_role;

-- v_bcs_historique_truie (lit observations_bcs vide pour l'instant)
CREATE OR REPLACE VIEW v_bcs_historique_truie
WITH (security_invoker = true) AS
SELECT
  o.animal_id AS truie_id,
  o.ferme_id,
  o.date_observation,
  o.bcs,
  o.contexte,
  o.observations
FROM observations_bcs o
ORDER BY o.date_observation DESC;
GRANT SELECT ON v_bcs_historique_truie TO authenticated, anon, service_role;

COMMIT;

-- Force PostgREST cache reload
NOTIFY pgrst, 'reload schema';
