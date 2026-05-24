-- ============================================================================
-- SMART FARM — Rations technicien + règles dynamiques
-- Date: 2026-05-24
-- Source: RATION_ALIMENTAIRE_PORCS.docx (technicien Christophe)
--
-- 1. MAJ rations bâtiments 13smart (médianes des fourchettes technicien)
-- 2. Création bâtiment "Truies vides" sur 13smart
-- 3. Alignement Démo (mêmes valeurs technicien)
-- 4. Vue v_ration_recommandee_animal avec règles dynamiques :
--    - Verrat en monte → 3,0 kg (flag manuel via animaux.observations 'en_monte')
--    - Truie gestation J60-84 (dernières 3 sem) → +0,5 kg
--    - Truie allaitante : 4,75 base + 0,3/porcelet au-delà de 10
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MAJ RATIONS BÂTIMENTS 13SMART (médianes fourchettes technicien)
-- ============================================================================
DO $$
DECLARE
  v_ferme_13smart uuid := 'fdba3bb2-85dd-4ac1-9ab3-713c750980dc';
  v_ferme_demo    uuid := '3ed3960d-39e4-4b1b-8a12-bb28aff92fdf';
BEGIN
  -- 13SMART : update rations existantes selon médianes technicien
  UPDATE batiments SET ration_kg_jour_par_sujet = 2.25, updated_at = NOW()
    WHERE ferme_id = v_ferme_13smart AND phase = 'verraterie';
  UPDATE batiments SET ration_kg_jour_par_sujet = 3.25, updated_at = NOW()
    WHERE ferme_id = v_ferme_13smart AND phase = 'gestation';
  UPDATE batiments SET ration_kg_jour_par_sujet = 4.75, updated_at = NOW()
    WHERE ferme_id = v_ferme_13smart AND phase = 'maternite';
  UPDATE batiments SET ration_kg_jour_par_sujet = 1.00, updated_at = NOW()
    WHERE ferme_id = v_ferme_13smart AND phase = 'demarrage_1';
  UPDATE batiments SET ration_kg_jour_par_sujet = 1.40, updated_at = NOW()
    WHERE ferme_id = v_ferme_13smart AND phase = 'demarrage_2';
  UPDATE batiments SET ration_kg_jour_par_sujet = 1.90, updated_at = NOW()
    WHERE ferme_id = v_ferme_13smart AND phase = 'croissance';
  UPDATE batiments SET ration_kg_jour_par_sujet = 2.80, updated_at = NOW()
    WHERE ferme_id = v_ferme_13smart AND phase = 'finition';

  -- 13SMART : ajouter "Truies vides" si absent
  INSERT INTO batiments (ferme_id, nom, type, phase, capacite, ration_kg_jour_par_sujet, ordre_cycle, surface_m2)
  SELECT v_ferme_13smart, 'Truies vides', 'porcin', 'gestation_vide', 20, 2.75, 2, 60
  WHERE NOT EXISTS (
    SELECT 1 FROM batiments WHERE ferme_id = v_ferme_13smart AND phase = 'gestation_vide'
  );

  -- 13SMART : réordonner cycle complet
  UPDATE batiments SET ordre_cycle = 1 WHERE ferme_id = v_ferme_13smart AND phase = 'verraterie';
  UPDATE batiments SET ordre_cycle = 2 WHERE ferme_id = v_ferme_13smart AND phase = 'gestation_vide';
  UPDATE batiments SET ordre_cycle = 3 WHERE ferme_id = v_ferme_13smart AND phase = 'gestation';
  UPDATE batiments SET ordre_cycle = 4 WHERE ferme_id = v_ferme_13smart AND phase = 'maternite';
  UPDATE batiments SET ordre_cycle = 5 WHERE ferme_id = v_ferme_13smart AND phase = 'demarrage_1';
  UPDATE batiments SET ordre_cycle = 6 WHERE ferme_id = v_ferme_13smart AND phase = 'demarrage_2';
  UPDATE batiments SET ordre_cycle = 7 WHERE ferme_id = v_ferme_13smart AND phase = 'croissance';
  UPDATE batiments SET ordre_cycle = 8 WHERE ferme_id = v_ferme_13smart AND phase = 'finition';

  -- ============================================================================
  -- 2. DÉMO : aligner sur mêmes valeurs (cohérence onboarding nouveaux users)
  -- ============================================================================
  UPDATE batiments SET ration_kg_jour_par_sujet = 2.25, updated_at = NOW()
    WHERE ferme_id = v_ferme_demo AND phase = 'verraterie';
  UPDATE batiments SET ration_kg_jour_par_sujet = 2.75, updated_at = NOW()
    WHERE ferme_id = v_ferme_demo AND phase = 'gestation_vide';
  UPDATE batiments SET ration_kg_jour_par_sujet = 3.25, updated_at = NOW()
    WHERE ferme_id = v_ferme_demo AND phase = 'gestation';
  UPDATE batiments SET ration_kg_jour_par_sujet = 4.75, updated_at = NOW()
    WHERE ferme_id = v_ferme_demo AND phase = 'maternite';
  UPDATE batiments SET ration_kg_jour_par_sujet = 1.00, updated_at = NOW()
    WHERE ferme_id = v_ferme_demo AND phase = 'demarrage_1';
  UPDATE batiments SET ration_kg_jour_par_sujet = 1.40, updated_at = NOW()
    WHERE ferme_id = v_ferme_demo AND phase = 'demarrage_2';
  UPDATE batiments SET ration_kg_jour_par_sujet = 1.90, updated_at = NOW()
    WHERE ferme_id = v_ferme_demo AND phase = 'croissance';
  UPDATE batiments SET ration_kg_jour_par_sujet = 2.80, updated_at = NOW()
    WHERE ferme_id = v_ferme_demo AND phase = 'finition';
END $$;

-- ============================================================================
-- 3. VUE v_ration_recommandee_animal — calcul par animal avec règles dynamiques
-- ============================================================================
DROP VIEW IF EXISTS v_ration_recommandee_animal CASCADE;

CREATE VIEW v_ration_recommandee_animal
WITH (security_invoker = true)
AS
WITH derniere_saillie_truie AS (
  SELECT DISTINCT ON (s.truie_id)
    s.truie_id,
    s.date_saillie,
    s.date_mb_prevue,
    s.resultat_diag,
    s.statut
  FROM saillies s
  WHERE s.deleted_at IS NULL
    AND s.resultat_diag = 'positif'
  ORDER BY s.truie_id, s.date_saillie DESC
),
derniere_mb_truie AS (
  SELECT DISTINCT ON (mb.truie_id)
    mb.truie_id,
    COALESCE(mb.date_mise_bas, mb.date_mb) AS date_mb,
    COALESCE(mb.nes_vivants, 0) - COALESCE(mb.ecrases, 0) AS porcelets_vivants
  FROM mises_bas mb
  WHERE mb.deleted_at IS NULL
    AND COALESCE(mb.date_mise_bas, mb.date_mb) IS NOT NULL
  ORDER BY mb.truie_id, COALESCE(mb.date_mise_bas, mb.date_mb) DESC
)
SELECT
  a.id            AS animal_id,
  a.ferme_id,
  a.tag,
  a.nom,
  a.categorie,
  a.sexe,
  b.id            AS batiment_id,
  b.nom           AS batiment_nom,
  b.phase         AS batiment_phase,
  b.ration_kg_jour_par_sujet AS ration_batiment_base,
  -- Règle dynamique : ration recommandée par animal
  CASE
    -- Verrat en monte (flag manuel 'en_monte' dans observations)
    WHEN a.categorie = 'verrat'
         AND a.observations ILIKE '%en_monte%'
      THEN 3.00
    WHEN a.categorie = 'verrat'
      THEN 2.25  -- médiane 2-2,5
    -- Truie gestante : +0,5 kg dans les 3 dernières semaines (J84-J114 ; durée gestation 114j)
    WHEN a.categorie = 'truie'
         AND b.phase = 'gestation'
         AND ds.date_saillie IS NOT NULL
         AND (CURRENT_DATE - ds.date_saillie) BETWEEN 84 AND 114
      THEN 3.75  -- 3,25 + 0,5
    WHEN a.categorie = 'truie' AND b.phase = 'gestation'
      THEN 3.25  -- médiane 3-3,5
    -- Truie allaitante : 4,75 base 10 porcelets + 0,3/porcelet au-delà
    WHEN a.categorie = 'truie' AND b.phase = 'maternite' AND dmb.porcelets_vivants IS NOT NULL
      THEN GREATEST(4.50,
             4.75 + GREATEST(0, dmb.porcelets_vivants - 10) * 0.30
           )
    WHEN a.categorie = 'truie' AND b.phase = 'maternite'
      THEN 4.75
    -- Truie vide
    WHEN a.categorie = 'truie' AND b.phase = 'gestation_vide'
      THEN 2.75  -- médiane 2,5-3
    -- Porcelets / Engraissement : ration du bâtiment (déjà table technicien)
    ELSE b.ration_kg_jour_par_sujet
  END AS ration_recommandee_kg_j,
  -- Justification textuelle pour debug/UI
  CASE
    WHEN a.categorie = 'verrat' AND a.observations ILIKE '%en_monte%'
      THEN 'Verrat en monte : 3,0 kg (flag manuel)'
    WHEN a.categorie = 'verrat'
      THEN 'Verrat base : 2,25 kg'
    WHEN a.categorie = 'truie' AND b.phase = 'gestation'
         AND ds.date_saillie IS NOT NULL
         AND (CURRENT_DATE - ds.date_saillie) BETWEEN 84 AND 114
      THEN 'Truie gestation J' || (CURRENT_DATE - ds.date_saillie) || ' : +0,5 kg fin gestation = 3,75 kg'
    WHEN a.categorie = 'truie' AND b.phase = 'gestation'
      THEN 'Truie gestation base : 3,25 kg'
    WHEN a.categorie = 'truie' AND b.phase = 'maternite' AND dmb.porcelets_vivants IS NOT NULL
      THEN 'Truie allaitante ' || dmb.porcelets_vivants || ' porcelets : ' ||
           ROUND((4.75 + GREATEST(0, dmb.porcelets_vivants - 10) * 0.30)::numeric, 2) || ' kg'
    WHEN a.categorie = 'truie' AND b.phase = 'maternite'
      THEN 'Truie allaitante base 10 porcelets : 4,75 kg'
    WHEN a.categorie = 'truie' AND b.phase = 'gestation_vide'
      THEN 'Truie vide : 2,75 kg (technique fleshing)'
    ELSE 'Ration bâtiment ' || b.phase || ' : ' || b.ration_kg_jour_par_sujet || ' kg'
  END AS justification,
  ds.date_saillie,
  ds.date_mb_prevue,
  dmb.porcelets_vivants
FROM animaux a
LEFT JOIN batiments b ON b.id = a.batiment_id
LEFT JOIN derniere_saillie_truie ds ON ds.truie_id = a.id
LEFT JOIN derniere_mb_truie dmb ON dmb.truie_id = a.id
WHERE a.deleted_at IS NULL;

GRANT SELECT ON v_ration_recommandee_animal TO anon, authenticated;

COMMIT;
