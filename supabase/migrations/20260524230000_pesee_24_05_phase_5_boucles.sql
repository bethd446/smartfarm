-- ============================================================
-- MIGRATION : Pesée 24/05/2026 — Gestion des boucles
-- ============================================================
-- Contexte : Pesée terrain 117 → 111 porcelets en Démarrage 2 / 13smart
-- avec gestion des boucles perdues (17 sans-boucle).
--
-- Changements :
--   1. Colonnes ancienne_boucle + statut_boucle sur animaux
--   2. Vue v_porcelets_a_transferer (≥24kg)
-- ============================================================

-- M1 : Colonnes pour gérer le cycle de vie des boucles
ALTER TABLE animaux
  ADD COLUMN IF NOT EXISTS ancienne_boucle TEXT,
  ADD COLUMN IF NOT EXISTS statut_boucle TEXT DEFAULT 'ok';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'animaux_statut_boucle_chk') THEN
    ALTER TABLE animaux ADD CONSTRAINT animaux_statut_boucle_chk
      CHECK (statut_boucle IN ('ok','a_reboucler','reboucle','perdue','nouvelle'));
  END IF;
END $$;

COMMENT ON COLUMN animaux.ancienne_boucle IS 'Ancien numéro de boucle (avant perte/changement). Utilisé pour traçabilité après rebouclage.';
COMMENT ON COLUMN animaux.statut_boucle IS 'Cycle de vie boucle : ok | a_reboucler (perdue, en attente nouvelle) | reboucle (nouvelle posée) | perdue (animal vivant mais boucle disparue, à confirmer) | nouvelle (animal récemment bouclé)';

-- M2 : Vue v_porcelets_a_transferer
-- Identifie les porcelets ≥24kg en Démarrage 2 qui doivent passer en Croissance
DROP VIEW IF EXISTS v_porcelets_a_transferer CASCADE;

CREATE OR REPLACE VIEW v_porcelets_a_transferer AS
SELECT 
  a.id AS animal_id,
  a.ferme_id,
  a.numero_boucle,
  a.tag,
  a.sexe,
  a.couleur_boucle,
  a.poids_actuel_kg,
  a.date_derniere_pesee,
  a.date_naissance,
  (CURRENT_DATE - a.date_naissance) AS age_jours,
  a.statut_boucle,
  c.numero AS loge_actuelle,
  b.nom AS batiment_actuel,
  (SELECT b2.id FROM batiments b2 
   WHERE b2.ferme_id = a.ferme_id AND b2.phase = 'croissance' 
   LIMIT 1) AS batiment_cible_id,
  (SELECT b2.nom FROM batiments b2 
   WHERE b2.ferme_id = a.ferme_id AND b2.phase = 'croissance' 
   LIMIT 1) AS batiment_cible_nom,
  CASE 
    WHEN a.poids_actuel_kg >= 26 THEN 'URGENT'
    WHEN a.poids_actuel_kg >= 24 THEN 'NORMAL'
    ELSE 'NA'
  END AS priorite_transfert
FROM animaux a
JOIN batiments b ON a.batiment_id = b.id
LEFT JOIN cases c ON a.case_id = c.id
WHERE a.statut = 'actif'
  AND b.phase = 'demarrage_2'
  AND a.poids_actuel_kg >= 24
  AND a.statut_boucle != 'perdue'
ORDER BY a.poids_actuel_kg DESC;

GRANT SELECT ON v_porcelets_a_transferer TO authenticated, anon;

COMMENT ON VIEW v_porcelets_a_transferer IS 'Porcelets en Démarrage 2 ayant atteint le seuil de 24kg pour passage en Croissance. Priorité URGENT ≥26kg, NORMAL 24-26kg.';
