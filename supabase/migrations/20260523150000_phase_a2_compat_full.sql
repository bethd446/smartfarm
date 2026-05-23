-- ============================================================================
-- PHASE A.2 — Stub des 35 tables/vues manquantes encore référencées par le code
-- ============================================================================
-- Objectif : éliminer tous les "Could not find table" / "column X does not exist"
-- Stratégie : 24 tables stub vides + 11 vues stub (depuis tables réelles quand
--             possible), DROP+RECREATE matieres_premieres avec le bon schéma.
-- RLS uniforme : (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id=auth.uid()))
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. matieres_premieres : DROP + RECREATE avec le bon schéma
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS matieres_premieres CASCADE;

CREATE TABLE matieres_premieres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid REFERENCES fermes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  type text,
  unite text DEFAULT 'kg',
  categorie_nutritionnelle text,
  origine text,
  fournisseur text,
  mat_pct numeric,
  em_porc_kcal_kg numeric,
  lysine_pct numeric,
  methionine_pct numeric,
  calcium_pct numeric,
  phosphore_pct numeric,
  fibre_pct numeric,
  matiere_seche_pct numeric,
  prix_indicatif_xof_kg numeric,
  cout_moyen_unite numeric,
  stock_actuel numeric DEFAULT 0,
  seuil_alerte numeric,
  notes_terrain text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE matieres_premieres ENABLE ROW LEVEL SECURITY;
CREATE POLICY matieres_premieres_select ON matieres_premieres FOR SELECT
  USING (ferme_id IS NULL OR ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY matieres_premieres_modify ON matieres_premieres FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 1. animaux_photos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS animaux_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  url text NOT NULL,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE animaux_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY animaux_photos_select ON animaux_photos FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY animaux_photos_modify ON animaux_photos FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 2. biosecurite_audits
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS biosecurite_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  date_audit date NOT NULL DEFAULT CURRENT_DATE,
  score numeric,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE biosecurite_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY biosecurite_audits_select ON biosecurite_audits FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY biosecurite_audits_modify ON biosecurite_audits FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. biosecurite_checklist
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS biosecurite_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  audit_id uuid REFERENCES biosecurite_audits(id) ON DELETE CASCADE,
  item text NOT NULL,
  ok boolean DEFAULT false,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE biosecurite_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY biosecurite_checklist_select ON biosecurite_checklist FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY biosecurite_checklist_modify ON biosecurite_checklist FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. checks_post_mb
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checks_post_mb (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  portee_id uuid REFERENCES portees(id) ON DELETE CASCADE,
  type text,
  fait_le date,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE checks_post_mb ENABLE ROW LEVEL SECURITY;
CREATE POLICY checks_post_mb_select ON checks_post_mb FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY checks_post_mb_modify ON checks_post_mb FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. consommations_aliment
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consommations_aliment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  bande_id uuid REFERENCES bandes(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  formule_id uuid REFERENCES formules(id),
  qte_kg numeric,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE consommations_aliment ENABLE ROW LEVEL SECURITY;
CREATE POLICY consommations_aliment_select ON consommations_aliment FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY consommations_aliment_modify ON consommations_aliment FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 6. consommations_eau
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consommations_eau (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  bande_id uuid REFERENCES bandes(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  qte_l numeric,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE consommations_eau ENABLE ROW LEVEL SECURITY;
CREATE POLICY consommations_eau_select ON consommations_eau FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY consommations_eau_modify ON consommations_eau FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 7. departs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  motif text,
  destination text,
  poids_kg numeric,
  prix_xof numeric,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE departs ENABLE ROW LEVEL SECURITY;
CREATE POLICY departs_select ON departs FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY departs_modify ON departs FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 8. diagnostics_gestation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnostics_gestation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  saillie_id uuid REFERENCES saillies(id) ON DELETE CASCADE,
  truie_id uuid REFERENCES animaux(id),
  date_diag date NOT NULL DEFAULT CURRENT_DATE,
  resultat text,
  methode text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE diagnostics_gestation ENABLE ROW LEVEL SECURITY;
CREATE POLICY diagnostics_gestation_select ON diagnostics_gestation FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY diagnostics_gestation_modify ON diagnostics_gestation FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 9. formulations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS formulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  stade_cible text,
  type_formule text,
  ingredients_json jsonb,
  cout_kg_xof numeric,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE formulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY formulations_select ON formulations FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY formulations_modify ON formulations FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 10. fournisseurs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fournisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  contact text,
  type text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY fournisseurs_select ON fournisseurs FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY fournisseurs_modify ON fournisseurs FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 11. lots_matieres_premieres
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lots_matieres_premieres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  matiere_id uuid REFERENCES matieres_premieres(id) ON DELETE CASCADE,
  lot text,
  date_reception date,
  qte_kg numeric,
  fournisseur_id uuid REFERENCES fournisseurs(id),
  prix_xof_kg numeric,
  ddm date,
  mycotoxine_test jsonb,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE lots_matieres_premieres ENABLE ROW LEVEL SECURITY;
CREATE POLICY lots_matieres_premieres_select ON lots_matieres_premieres FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY lots_matieres_premieres_modify ON lots_matieres_premieres FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 12. mortalites
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mortalites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  portee_id uuid REFERENCES portees(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  cause text,
  poids_kg numeric,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE mortalites ENABLE ROW LEVEL SECURITY;
CREATE POLICY mortalites_select ON mortalites FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY mortalites_modify ON mortalites FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 13. mouvements_stock
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  matiere_id uuid REFERENCES matieres_premieres(id) ON DELETE CASCADE,
  formule_id uuid REFERENCES formules(id) ON DELETE CASCADE,
  type text CHECK (type IN ('entree','sortie','ajustement')),
  qte_kg numeric,
  date date NOT NULL DEFAULT CURRENT_DATE,
  raison text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE mouvements_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY mouvements_stock_select ON mouvements_stock FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY mouvements_stock_modify ON mouvements_stock FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 14. plans_alimentation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans_alimentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  bande_id uuid REFERENCES bandes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  formule_id uuid REFERENCES formules(id),
  date_debut date,
  date_fin date,
  ration_kg_jour numeric,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE plans_alimentation ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_alimentation_select ON plans_alimentation FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY plans_alimentation_modify ON plans_alimentation FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 15. ppa_observations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ppa_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  signe_clinique text[],
  animaux_concernes integer,
  suspicion boolean DEFAULT false,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE ppa_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ppa_observations_select ON ppa_observations FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY ppa_observations_modify ON ppa_observations FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 16. produits_anti_mycotoxines (GLOBAL — ferme_id NULL OK)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produits_anti_mycotoxines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid REFERENCES fermes(id) ON DELETE CASCADE,
  nom_commercial text NOT NULL,
  fournisseur text,
  principe_actif text,
  dose_kg_t numeric,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE produits_anti_mycotoxines ENABLE ROW LEVEL SECURITY;
CREATE POLICY produits_anti_mycotoxines_select ON produits_anti_mycotoxines FOR SELECT
  USING (ferme_id IS NULL OR ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY produits_anti_mycotoxines_modify ON produits_anti_mycotoxines FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 17. protocoles_vaccinaux
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS protocoles_vaccinaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  nom text NOT NULL,
  vaccins jsonb,
  calendrier jsonb,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE protocoles_vaccinaux ENABLE ROW LEVEL SECURITY;
CREATE POLICY protocoles_vaccinaux_select ON protocoles_vaccinaux FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY protocoles_vaccinaux_modify ON protocoles_vaccinaux FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 18. regles_sevrage (GLOBAL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regles_sevrage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid REFERENCES fermes(id) ON DELETE CASCADE,
  age_min_j integer,
  age_max_j integer,
  poids_min_kg numeric,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE regles_sevrage ENABLE ROW LEVEL SECURITY;
CREATE POLICY regles_sevrage_select ON regles_sevrage FOR SELECT
  USING (ferme_id IS NULL OR ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY regles_sevrage_modify ON regles_sevrage FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 19. tips_conseiller (GLOBAL — pas de ferme_id)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tips_conseiller (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid REFERENCES fermes(id) ON DELETE CASCADE,
  titre text NOT NULL,
  contenu text,
  categorie text,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE tips_conseiller ENABLE ROW LEVEL SECURITY;
CREATE POLICY tips_conseiller_select ON tips_conseiller FOR SELECT
  USING (ferme_id IS NULL OR ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY tips_conseiller_modify ON tips_conseiller FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 20. transits_phase
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transits_phase (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  portee_id uuid REFERENCES portees(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  phase_from text,
  phase_to text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  poids_moyen_kg numeric,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE transits_phase ENABLE ROW LEVEL SECURITY;
CREATE POLICY transits_phase_select ON transits_phase FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY transits_phase_modify ON transits_phase FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 21. types_aliment (GLOBAL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS types_aliment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid REFERENCES fermes(id) ON DELETE CASCADE,
  code text,
  libelle text NOT NULL,
  stade_cible text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE types_aliment ENABLE ROW LEVEL SECURITY;
CREATE POLICY types_aliment_select ON types_aliment FOR SELECT
  USING (ferme_id IS NULL OR ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY types_aliment_modify ON types_aliment FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 22. visites_biosecurite
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visites_biosecurite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  date_visite date NOT NULL DEFAULT CURRENT_DATE,
  visiteur text,
  raison text,
  vehicule text,
  douche boolean DEFAULT false,
  vetements boolean DEFAULT false,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE visites_biosecurite ENABLE ROW LEVEL SECURITY;
CREATE POLICY visites_biosecurite_select ON visites_biosecurite FOR SELECT
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));
CREATE POLICY visites_biosecurite_modify ON visites_biosecurite FOR ALL
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- ============================================================================
-- VUES (11)
-- ============================================================================

-- 1. v_bande_effectif
CREATE OR REPLACE VIEW v_bande_effectif
WITH (security_invoker = true) AS
SELECT
  b.id AS bande_id,
  b.ferme_id,
  COALESCE((SELECT COUNT(*) FROM bande_animaux ba WHERE ba.bande_id = b.id AND ba.date_sortie IS NULL), 0)::integer AS effectif
FROM bandes b;
GRANT SELECT ON v_bande_effectif TO authenticated, anon, service_role;

-- 2. v_biosecurite_etat_actuel
CREATE OR REPLACE VIEW v_biosecurite_etat_actuel
WITH (security_invoker = true) AS
SELECT
  f.id AS ferme_id,
  (SELECT score FROM biosecurite_audits ba WHERE ba.ferme_id = f.id AND ba.deleted_at IS NULL ORDER BY ba.date_audit DESC LIMIT 1) AS score,
  (SELECT date_audit FROM biosecurite_audits ba WHERE ba.ferme_id = f.id AND ba.deleted_at IS NULL ORDER BY ba.date_audit DESC LIMIT 1) AS dernier_audit
FROM fermes f;
GRANT SELECT ON v_biosecurite_etat_actuel TO authenticated, anon, service_role;

-- 3. v_calendrier_sanitaire_porcelets (depuis evenements_prevus)
CREATE OR REPLACE VIEW v_calendrier_sanitaire_porcelets
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.ferme_id,
  e.portee_id,
  e.animal_id,
  e.date_prevue,
  e.type,
  e.statut::text AS statut
FROM evenements_prevus e
WHERE (e.type ILIKE 'vaccin%' OR e.type ILIKE 'soin%')
  AND e.deleted_at IS NULL;
GRANT SELECT ON v_calendrier_sanitaire_porcelets TO authenticated, anon, service_role;

-- 4. v_checks_post_mb_attendus (stub depuis portees)
CREATE OR REPLACE VIEW v_checks_post_mb_attendus
WITH (security_invoker = true) AS
SELECT
  p.id AS portee_id,
  p.ferme_id,
  'check_j1'::text AS type,
  1 AS jours_post_mb,
  'a_faire'::text AS statut
FROM portees p
WHERE p.deleted_at IS NULL AND false; -- stub vide
GRANT SELECT ON v_checks_post_mb_attendus TO authenticated, anon, service_role;

-- 5. v_kpi_gmq_par_stade (depuis pesees)
CREATE OR REPLACE VIEW v_kpi_gmq_par_stade
WITH (security_invoker = true) AS
SELECT
  p.ferme_id,
  COALESCE(a.stade::text, 'inconnu') AS stade,
  COALESCE(AVG(p.poids_kg), 0)::numeric(8,2) AS gmq_moyen,
  COUNT(DISTINCT p.animal_id)::integer AS n_animaux
FROM pesees p
LEFT JOIN animaux a ON a.id = p.animal_id
WHERE p.deleted_at IS NULL
GROUP BY p.ferme_id, a.stade;
GRANT SELECT ON v_kpi_gmq_par_stade TO authenticated, anon, service_role;

-- 6. v_kpi_ic_ferme
CREATE OR REPLACE VIEW v_kpi_ic_ferme
WITH (security_invoker = true) AS
SELECT
  f.id AS ferme_id,
  0::numeric(5,2) AS ic,
  'global'::text AS periode
FROM fermes f;
GRANT SELECT ON v_kpi_ic_ferme TO authenticated, anon, service_role;

-- 7. v_kpi_mca_ferme
CREATE OR REPLACE VIEW v_kpi_mca_ferme
WITH (security_invoker = true) AS
SELECT
  f.id AS ferme_id,
  0::numeric(12,2) AS mca_xof,
  'global'::text AS periode
FROM fermes f;
GRANT SELECT ON v_kpi_mca_ferme TO authenticated, anon, service_role;

-- 8. v_ppa_surveillance
CREATE OR REPLACE VIEW v_ppa_surveillance
WITH (security_invoker = true) AS
SELECT
  f.id AS ferme_id,
  COALESCE((SELECT COUNT(*) FROM ppa_observations po
            WHERE po.ferme_id = f.id AND po.deleted_at IS NULL
            AND po.date >= CURRENT_DATE - INTERVAL '30 days'), 0)::integer AS nb_observations_30j,
  CASE
    WHEN (SELECT COUNT(*) FROM ppa_observations po
          WHERE po.ferme_id = f.id AND po.deleted_at IS NULL
          AND po.suspicion = true
          AND po.date >= CURRENT_DATE - INTERVAL '30 days') > 0 THEN 'eleve'
    ELSE 'faible'
  END::text AS niveau_risque
FROM fermes f;
GRANT SELECT ON v_ppa_surveillance TO authenticated, anon, service_role;

-- 9. v_recommandations_anti_mycotoxines (stub vide)
CREATE OR REPLACE VIEW v_recommandations_anti_mycotoxines
WITH (security_invoker = true) AS
SELECT
  f.id AS ferme_id,
  pam.id AS produit_id,
  0::numeric(5,2) AS score,
  ''::text AS raison
FROM fermes f
CROSS JOIN produits_anti_mycotoxines pam
WHERE false; -- stub vide
GRANT SELECT ON v_recommandations_anti_mycotoxines TO authenticated, anon, service_role;

-- 10. v_saillies_a_diagnostiquer (depuis saillies)
CREATE OR REPLACE VIEW v_saillies_a_diagnostiquer
WITH (security_invoker = true) AS
SELECT
  s.id AS saillie_id,
  s.ferme_id,
  s.truie_id,
  a.tag AS truie_tag,
  s.date_saillie,
  s.date_diag_prevue,
  (s.date_diag_prevue - CURRENT_DATE)::integer AS jours_jusqu_diag
FROM saillies s
LEFT JOIN animaux a ON a.id = s.truie_id
WHERE s.deleted_at IS NULL
  AND s.statut::text = 'en_cours'
  AND s.resultat_diag::text = 'en_attente';
GRANT SELECT ON v_saillies_a_diagnostiquer TO authenticated, anon, service_role;

-- 11. mv_kpi_bande / mv_kpi_ferme / mv_kpi_truie — créés comme VUES stub
CREATE OR REPLACE VIEW mv_kpi_bande
WITH (security_invoker = true) AS
SELECT
  b.id AS bande_id,
  b.ferme_id,
  b.nom AS bande_nom,
  0::integer AS effectif,
  0::numeric(8,2) AS gmq_moyen,
  0::numeric(5,2) AS ic,
  0::numeric(5,2) AS taux_mortalite
FROM bandes b;
GRANT SELECT ON mv_kpi_bande TO authenticated, anon, service_role;

CREATE OR REPLACE VIEW mv_kpi_ferme
WITH (security_invoker = true) AS
SELECT
  f.id AS ferme_id,
  f.nom AS ferme_nom,
  (SELECT COUNT(*) FROM animaux a WHERE a.ferme_id = f.id AND a.deleted_at IS NULL)::integer AS effectif_total,
  0::numeric(8,2) AS gmq_moyen,
  0::numeric(5,2) AS ic_global,
  0::numeric(5,2) AS taux_mortalite
FROM fermes f;
GRANT SELECT ON mv_kpi_ferme TO authenticated, anon, service_role;

CREATE OR REPLACE VIEW mv_kpi_truie
WITH (security_invoker = true) AS
SELECT
  a.id AS truie_id,
  a.ferme_id,
  a.tag,
  (SELECT COUNT(*) FROM mises_bas mb WHERE mb.truie_id = a.id AND mb.deleted_at IS NULL)::integer AS nb_portees,
  COALESCE((SELECT AVG(nes_vivants) FROM mises_bas mb WHERE mb.truie_id = a.id AND mb.deleted_at IS NULL), 0)::numeric(5,2) AS portee_moyenne,
  0::numeric(5,2) AS taux_fertilite
FROM animaux a
WHERE a.categorie::text IN ('truie','cochette') AND a.deleted_at IS NULL;
GRANT SELECT ON mv_kpi_truie TO authenticated, anon, service_role;

COMMIT;

-- Force PostgREST cache reload
NOTIFY pgrst, 'reload schema';
