-- ============================================================
-- MIGRATION : Vue v_historique_pesees_animal + GMQ entre pesées
-- ============================================================
-- Crée une vue qui retourne l'historique chronologique des pesées
-- par animal avec calcul du GMQ entre chaque pesée consécutive.
--
-- Usage UI :
--   SELECT * FROM v_historique_pesees_animal
--   WHERE animal_id = '<uuid>' ORDER BY date_pesee;
-- ============================================================

DROP VIEW IF EXISTS v_historique_pesees_animal CASCADE;

CREATE OR REPLACE VIEW v_historique_pesees_animal AS
WITH pesees_ordonnees AS (
  SELECT 
    p.animal_id,
    p.date_pesee,
    p.poids_kg,
    p.contexte,
    p.observations,
    ROW_NUMBER() OVER (PARTITION BY p.animal_id ORDER BY p.date_pesee) AS rang,
    LAG(p.date_pesee) OVER (PARTITION BY p.animal_id ORDER BY p.date_pesee) AS pesee_precedente_date,
    LAG(p.poids_kg) OVER (PARTITION BY p.animal_id ORDER BY p.date_pesee) AS pesee_precedente_kg
  FROM pesees p
  WHERE p.deleted_at IS NULL
)
SELECT 
  po.animal_id,
  a.tag,
  a.numero_boucle,
  a.sexe,
  a.couleur_boucle,
  a.statut_boucle,
  a.statut,
  c.numero AS loge_actuelle,
  b.nom AS batiment_actuel,
  po.date_pesee,
  po.poids_kg,
  po.contexte,
  po.rang AS rang_pesee,
  po.pesee_precedente_date,
  po.pesee_precedente_kg,
  CASE WHEN po.pesee_precedente_date IS NOT NULL 
    THEN (po.date_pesee - po.pesee_precedente_date)
  END AS intervalle_jours,
  CASE WHEN po.pesee_precedente_date IS NOT NULL AND po.date_pesee > po.pesee_precedente_date
    THEN ROUND(
      ((po.poids_kg - po.pesee_precedente_kg) * 1000 / (po.date_pesee - po.pesee_precedente_date))::numeric, 0
    )
  END AS gmq_g_jour,
  a.ferme_id
FROM pesees_ordonnees po
JOIN animaux a ON po.animal_id = a.id
LEFT JOIN cases c ON a.case_id = c.id
LEFT JOIN batiments b ON a.batiment_id = b.id
ORDER BY a.tag, po.date_pesee;

GRANT SELECT ON v_historique_pesees_animal TO authenticated, anon;

COMMENT ON VIEW v_historique_pesees_animal IS 
'Historique chronologique des pesées par animal avec calcul GMQ (g/jour) entre chaque pesée consécutive. Une ligne par pesée. Le GMQ est NULL pour la première pesée (pas de précédente).';
