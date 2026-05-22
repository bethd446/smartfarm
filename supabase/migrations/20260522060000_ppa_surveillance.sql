-- ============================================================
-- V2 Sprint A — SA-B : PPA (Peste Porcine Africaine) Surveillance
-- Date : 2026-05-22
-- Référentiel : OIE/WOAH — maladie à déclaration obligatoire
-- ============================================================
-- Périmètre :
--   1. Table `ppa_observations` : journal des observations
--      cliniques suspectes (un événement = un signalement
--      terrain, avec niveau de suspicion + symptômes cochés).
--   2. Vue `v_ppa_surveillance` : KPI agrégés par ferme
--      (observations 30j, suspicions critiques 30j, cas
--      confirmés cumulés, suspicions non déclarées).
--
-- Aucune règle dans v_alertes_actives à ce stade (sera ajoutée
-- ultérieurement avec critères précis).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Table observations PPA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ppa_observations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ferme_id uuid NOT NULL REFERENCES fermes(id),
  date_observation date NOT NULL DEFAULT CURRENT_DATE,
  bande_id uuid REFERENCES bandes(id),
  animal_id uuid REFERENCES animaux(id),
  nb_animaux_affectes integer NOT NULL DEFAULT 1
    CHECK (nb_animaux_affectes >= 1),
  symptomes text[] NOT NULL DEFAULT '{}'::text[],
  temperature_max numeric(3,1),
  hemorragies_observees boolean DEFAULT false,
  mortalite_subite boolean DEFAULT false,
  prostration boolean DEFAULT false,
  inappetence boolean DEFAULT false,
  cyanose_oreilles boolean DEFAULT false,
  vomissements_diarrhees boolean DEFAULT false,
  niveau_suspicion text NOT NULL
    CHECK (niveau_suspicion IN ('faible','moyen','eleve','tres_eleve')),
  observations text,
  declare_aux_autorites boolean DEFAULT false,
  date_declaration date,
  reference_declaration text,
  prelevement_effectue boolean DEFAULT false,
  date_prelevement date,
  resultat_laboratoire text
    CHECK (resultat_laboratoire IS NULL
           OR resultat_laboratoire IN ('en_attente','negatif','positif','indetermine')),
  date_resultat date,
  enregistre_par uuid REFERENCES utilisateurs(id),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ppa_ferme_date
  ON ppa_observations(ferme_id, date_observation DESC);

CREATE INDEX IF NOT EXISTS idx_ppa_niveau
  ON ppa_observations(niveau_suspicion)
  WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON ppa_observations TO anon, authenticated;

COMMENT ON TABLE ppa_observations IS
  'Journal des observations cliniques suspectes de Peste Porcine Africaine (PPA). Référentiel OIE/WOAH — maladie à déclaration obligatoire.';
COMMENT ON COLUMN ppa_observations.niveau_suspicion IS
  'Niveau de suspicion clinique : faible | moyen | eleve | tres_eleve.';
COMMENT ON COLUMN ppa_observations.declare_aux_autorites IS
  'Déclaration faite auprès des Services Vétérinaires officiels (obligation légale OIE).';

-- ------------------------------------------------------------
-- 2. Vue surveillance agrégée par ferme
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_ppa_surveillance
WITH (security_invoker=true) AS
SELECT
  p.ferme_id,
  COUNT(*) FILTER (
    WHERE p.date_observation >= CURRENT_DATE - 30
      AND p.deleted_at IS NULL
  ) AS obs_30j,
  COUNT(*) FILTER (
    WHERE p.niveau_suspicion IN ('eleve','tres_eleve')
      AND p.date_observation >= CURRENT_DATE - 30
      AND p.deleted_at IS NULL
  ) AS suspicions_critiques_30j,
  COUNT(*) FILTER (
    WHERE p.resultat_laboratoire = 'positif'
      AND p.deleted_at IS NULL
  ) AS confirmes_total,
  COUNT(*) FILTER (
    WHERE p.declare_aux_autorites = false
      AND p.niveau_suspicion IN ('eleve','tres_eleve')
      AND p.deleted_at IS NULL
  ) AS suspicions_non_declarees,
  MAX(p.date_observation) FILTER (WHERE p.deleted_at IS NULL) AS derniere_observation
FROM ppa_observations p
GROUP BY p.ferme_id;

GRANT SELECT ON v_ppa_surveillance TO anon, authenticated;

COMMENT ON VIEW v_ppa_surveillance IS
  'KPI surveillance PPA par ferme : observations 30j, suspicions critiques 30j, cas confirmés cumulés, suspicions non déclarées.';

COMMIT;
