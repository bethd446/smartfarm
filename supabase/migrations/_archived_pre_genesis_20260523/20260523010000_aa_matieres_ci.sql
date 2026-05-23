-- ============================================================================
-- D4-B — AA Thr / Trp / Cys pour matières premières CI hors Maïs / Soja
-- ============================================================================
--  Référentiel : NRC 2012 Nutrient Requirements of Swine + tables FAO.
--  Valeurs en % matière brute (total, pas SID), cohérentes avec colonnes
--  threonine_pct / tryptophane_pct / cystine_pct de matieres_premieres.
--
--  Idempotent : on n'écrase QUE les colonnes NULL ou à 0 → relance safe.
--  Garde-fou : exclusion explicite Maïs / Soja (déjà seedés en migration
--  20260522000000_polish_a_metier.sql), exclusion soft-delete.
--
--  Hors scope : Lys / Met (déjà présents, valeurs locales conservées),
--  aliments composés commerciaux (De Heus, IVOGRAIN, Koudijs, Vitalac),
--  additifs purs (DL-Met, L-Lys), prémix, minéraux, huiles, désinfectants,
--  vaccins. Mil et Cacao : non présents en base à ce jour.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Manioc / Cassava (NRC 2012)
-- ----------------------------------------------------------------------------
UPDATE matieres_premieres SET
  threonine_pct   = COALESCE(NULLIF(threonine_pct,   0), 0.05),
  tryptophane_pct = COALESCE(NULLIF(tryptophane_pct, 0), 0.02),
  cystine_pct     = COALESCE(NULLIF(cystine_pct,     0), 0.03)
WHERE (nom ILIKE '%manioc%' OR nom ILIKE '%cassava%')
  AND nom NOT ILIKE '%maïs%' AND nom NOT ILIKE '%soja%'
  AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- Sorgho (NRC 2012)
-- ----------------------------------------------------------------------------
UPDATE matieres_premieres SET
  threonine_pct   = COALESCE(NULLIF(threonine_pct,   0), 0.27),
  tryptophane_pct = COALESCE(NULLIF(tryptophane_pct, 0), 0.10),
  cystine_pct     = COALESCE(NULLIF(cystine_pct,     0), 0.16)
WHERE nom ILIKE '%sorgho%'
  AND nom NOT ILIKE '%maïs%' AND nom NOT ILIKE '%soja%'
  AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- Riz / Brisure riz / Son de riz (NRC 2012 — valeurs son de riz)
-- ----------------------------------------------------------------------------
UPDATE matieres_premieres SET
  threonine_pct   = COALESCE(NULLIF(threonine_pct,   0), 0.28),
  tryptophane_pct = COALESCE(NULLIF(tryptophane_pct, 0), 0.09),
  cystine_pct     = COALESCE(NULLIF(cystine_pct,     0), 0.18)
WHERE (nom ILIKE '%riz%' OR nom ILIKE '%brisure%')
  AND nom NOT ILIKE '%maïs%' AND nom NOT ILIKE '%soja%'
  AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- Son de blé (NRC 2012)
-- ----------------------------------------------------------------------------
UPDATE matieres_premieres SET
  threonine_pct   = COALESCE(NULLIF(threonine_pct,   0), 0.42),
  tryptophane_pct = COALESCE(NULLIF(tryptophane_pct, 0), 0.26),
  cystine_pct     = COALESCE(NULLIF(cystine_pct,     0), 0.30)
WHERE nom ILIKE '%son de blé%'
  AND nom NOT ILIKE '%maïs%' AND nom NOT ILIKE '%soja%'
  AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- Drèches de brasserie / DDGS (NRC 2012)
-- ----------------------------------------------------------------------------
UPDATE matieres_premieres SET
  threonine_pct   = COALESCE(NULLIF(threonine_pct,   0), 1.05),
  tryptophane_pct = COALESCE(NULLIF(tryptophane_pct, 0), 0.21),
  cystine_pct     = COALESCE(NULLIF(cystine_pct,     0), 0.56)
WHERE (nom ILIKE '%drêche%' OR nom ILIKE '%drèche%' OR nom ILIKE '%dreche%' OR nom ILIKE '%ddgs%')
  AND nom NOT ILIKE '%maïs%' AND nom NOT ILIKE '%soja%'
  AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- Tourteau de coton (NRC 2012)
-- ----------------------------------------------------------------------------
UPDATE matieres_premieres SET
  threonine_pct   = COALESCE(NULLIF(threonine_pct,   0), 1.20),
  tryptophane_pct = COALESCE(NULLIF(tryptophane_pct, 0), 0.45),
  cystine_pct     = COALESCE(NULLIF(cystine_pct,     0), 0.65)
WHERE nom ILIKE '%tourteau%coton%'
  AND nom NOT ILIKE '%maïs%' AND nom NOT ILIKE '%soja%'
  AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- Tourteau d'arachide (NRC 2012)
-- ----------------------------------------------------------------------------
UPDATE matieres_premieres SET
  threonine_pct   = COALESCE(NULLIF(threonine_pct,   0), 1.20),
  tryptophane_pct = COALESCE(NULLIF(tryptophane_pct, 0), 0.50),
  cystine_pct     = COALESCE(NULLIF(cystine_pct,     0), 0.55)
WHERE nom ILIKE '%tourteau%arachide%'
  AND nom NOT ILIKE '%maïs%' AND nom NOT ILIKE '%soja%'
  AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- Tourteau de palmiste (NRC 2012)
-- ----------------------------------------------------------------------------
UPDATE matieres_premieres SET
  threonine_pct   = COALESCE(NULLIF(threonine_pct,   0), 0.65),
  tryptophane_pct = COALESCE(NULLIF(tryptophane_pct, 0), 0.20),
  cystine_pct     = COALESCE(NULLIF(cystine_pct,     0), 0.30)
WHERE nom ILIKE '%tourteau%palmiste%'
  AND nom NOT ILIKE '%maïs%' AND nom NOT ILIKE '%soja%'
  AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- Farine de poisson (NRC 2012)
-- ----------------------------------------------------------------------------
UPDATE matieres_premieres SET
  threonine_pct   = COALESCE(NULLIF(threonine_pct,   0), 2.45),
  tryptophane_pct = COALESCE(NULLIF(tryptophane_pct, 0), 0.65),
  cystine_pct     = COALESCE(NULLIF(cystine_pct,     0), 0.55)
WHERE nom ILIKE '%farine%poisson%'
  AND nom NOT ILIKE '%maïs%' AND nom NOT ILIKE '%soja%'
  AND deleted_at IS NULL;

COMMIT;
