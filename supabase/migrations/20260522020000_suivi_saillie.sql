-- ===========================================================================
-- 20260522020000_suivi_saillie.sql
-- ---------------------------------------------------------------------------
-- CHANT-A — Retour chaleur post-saillie
--   1) Nouvelle vue v_saillies_a_diagnostiquer : saillies en attente de
--      diagnostic gestation (fenêtre 14-45 j post-saillie), avec phase.
--   2) Recrée v_alertes_actives à l'identique R01-R20 + ajoute la règle R21
--      "Diagnostic gestation attendu" (fenêtre retour chaleur 18-35 j sans
--      diagnostic ni mise-bas).
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Vue v_saillies_a_diagnostiquer
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS v_saillies_a_diagnostiquer;

CREATE VIEW v_saillies_a_diagnostiquer
WITH (security_invoker = true) AS
SELECT
  s.id AS saillie_id,
  s.truie_id,
  a.tag AS truie_tag,
  a.nom AS truie_nom,
  s.date_saillie,
  s.verrat_id,
  v.tag AS verrat_tag,
  s.ferme_id,
  (CURRENT_DATE - s.date_saillie) AS jours_post_saillie,
  CASE
    WHEN (CURRENT_DATE - s.date_saillie) BETWEEN 18 AND 24 THEN 'fenetre_diagnostic'
    WHEN (CURRENT_DATE - s.date_saillie) BETWEEN 25 AND 35 THEN 'fenetre_echographie'
    WHEN (CURRENT_DATE - s.date_saillie) > 35 THEN 'retard'
    ELSE 'attente'
  END AS phase_diagnostic,
  (s.date_saillie + 114) AS date_mb_prevue
FROM saillies s
JOIN animaux a
  ON a.id = s.truie_id
 AND a.statut = 'actif'::statut_animal_t
 AND a.deleted_at IS NULL
LEFT JOIN animaux v ON v.id = s.verrat_id
LEFT JOIN diagnostics_gestation d ON d.saillie_id = s.id
LEFT JOIN mises_bas mb ON mb.saillie_id = s.id AND mb.deleted_at IS NULL
WHERE s.deleted_at IS NULL
  AND d.id IS NULL                 -- pas encore de diagnostic
  AND mb.id IS NULL                -- pas de mise-bas
  AND (CURRENT_DATE - s.date_saillie) BETWEEN 14 AND 45;

GRANT SELECT ON v_saillies_a_diagnostiquer TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) v_alertes_actives — recréée à l'identique (R01-R20) + ajout R21
--    R21 = diagnostic gestation attendu (fenêtre 18-35 j post-saillie sans
--    diagnostic ni mise-bas) — détection retour chaleur.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_alertes_actives
WITH (security_invoker = true) AS
WITH truies_actives AS (
  SELECT a.id, a.tag, a.ferme_id, a.date_naissance, a.date_entree
  FROM animaux a
  WHERE a.categorie = 'truie'::categorie_t
    AND a.statut = 'actif'::statut_animal_t
    AND a.deleted_at IS NULL
), truie_derniere_saillie AS (
  SELECT s.truie_id, max(s.date_saillie) AS derniere_saillie
  FROM saillies s
  WHERE s.deleted_at IS NULL
  GROUP BY s.truie_id
), truie_dernier_sevrage AS (
  SELECT sv.truie_id, max(sv.date_sevrage) AS dernier_sevrage
  FROM sevrages sv
  WHERE sv.deleted_at IS NULL
  GROUP BY sv.truie_id
), truie_derniere_mb AS (
  SELECT mb.truie_id, max(mb.date_mise_bas) AS derniere_mb
  FROM mises_bas mb
  WHERE mb.deleted_at IS NULL
  GROUP BY mb.truie_id
)
-- R01
SELECT 'R01-truie-vide-prolongee'::text AS regle_id,
  'truie'::text AS cible_type,
  t.id::text AS cible_id,
  t.tag AS cible_label,
  'élevée'::text AS gravite,
  ((('Truie '::text || t.tag) || ' vide depuis '::text) || ((CURRENT_DATE - GREATEST(COALESCE(ds.dernier_sevrage, '1900-01-01'::date), COALESCE(dmb.derniere_mb, '1900-01-01'::date), COALESCE(dsa.derniere_saillie, '1900-01-01'::date), COALESCE(t.date_entree, t.date_naissance, '1900-01-01'::date)))::text)) || ' jours'::text AS titre,
  'Aucune saillie ni diagnostic gestation enregistré récemment. Vérifier le suivi reproduction.'::text AS description,
  '/cheptel/'::text || t.id::text AS lien_suggere,
  now() AS detecte_le,
  t.ferme_id
FROM truies_actives t
LEFT JOIN truie_derniere_saillie dsa ON dsa.truie_id = t.id
LEFT JOIN truie_dernier_sevrage ds ON ds.truie_id = t.id
LEFT JOIN truie_derniere_mb dmb ON dmb.truie_id = t.id
WHERE (dsa.derniere_saillie IS NULL OR (CURRENT_DATE - dsa.derniere_saillie) > 45)
  AND (dmb.derniere_mb IS NULL OR (CURRENT_DATE - dmb.derniere_mb) > 35)
  AND (ds.dernier_sevrage IS NULL OR (CURRENT_DATE - ds.dernier_sevrage) > 14)
  AND (dsa.derniere_saillie IS NOT NULL OR dmb.derniere_mb IS NOT NULL OR ds.dernier_sevrage IS NOT NULL OR COALESCE(t.date_entree, t.date_naissance) IS NOT NULL AND (CURRENT_DATE - COALESCE(t.date_entree, t.date_naissance)) > 240)
  AND NOT (dsa.derniere_saillie IS NOT NULL AND (CURRENT_DATE - dsa.derniere_saillie) >= 110 AND (CURRENT_DATE - dsa.derniere_saillie) <= 130)
UNION ALL
-- R02
SELECT 'R02-retour-chaleur-non-saillie'::text AS regle_id,
  'truie'::text AS cible_type,
  s.truie_id::text AS cible_id,
  a.tag AS cible_label,
  'moyenne'::text AS gravite,
  ((('Truie '::text || a.tag) || ' en retour de chaleur sans nouvelle saillie depuis '::text) || ((CURRENT_DATE - d.date_diagnostic)::text)) || ' jours'::text AS titre,
  'Diagnostic gestation négatif / retour chaleur sans nouvelle saillie enregistrée — programmer une nouvelle IA.'::text AS description,
  '/reproduction/saillies?truie='::text || s.truie_id::text AS lien_suggere,
  now() AS detecte_le,
  a.ferme_id
FROM diagnostics_gestation d
JOIN saillies s ON s.id = d.saillie_id AND s.deleted_at IS NULL
JOIN animaux a ON a.id = s.truie_id AND a.deleted_at IS NULL AND a.statut = 'actif'::statut_animal_t
WHERE (d.resultat = ANY (ARRAY['negatif'::resultat_gestation_t, 'retour_chaleur'::resultat_gestation_t]))
  AND (CURRENT_DATE - d.date_diagnostic) > 25
  AND NOT (EXISTS (
    SELECT 1 FROM saillies s2
    WHERE s2.truie_id = s.truie_id AND s2.deleted_at IS NULL AND s2.date_saillie > d.date_diagnostic
  ))
  AND d.date_diagnostic = ((
    SELECT max(d2.date_diagnostic)
    FROM diagnostics_gestation d2
    JOIN saillies s3 ON s3.id = d2.saillie_id
    WHERE s3.truie_id = s.truie_id
      AND (d2.resultat = ANY (ARRAY['negatif'::resultat_gestation_t, 'retour_chaleur'::resultat_gestation_t]))
  ))
UNION ALL
-- R03
SELECT 'R03-gestante-mise-bas-imminente'::text AS regle_id,
  'truie'::text AS cible_type,
  s.truie_id::text AS cible_id,
  a.tag AS cible_label,
  'élevée'::text AS gravite,
  (('Mise-bas prévue dans '::text || ((s.date_saillie + 114 - CURRENT_DATE)::text)) || ' jour(s) — truie '::text) || a.tag AS titre,
  ('Truie gestante, date prévue mise-bas le '::text || ((s.date_saillie + 114)::text)) || '. Préparer la maternité.'::text AS description,
  '/reproduction/mises-bas?truie='::text || s.truie_id::text AS lien_suggere,
  now() AS detecte_le,
  a.ferme_id
FROM saillies s
JOIN animaux a ON a.id = s.truie_id AND a.deleted_at IS NULL AND a.statut = 'actif'::statut_animal_t
JOIN diagnostics_gestation d ON d.saillie_id = s.id AND d.resultat = 'positif'::resultat_gestation_t
WHERE s.deleted_at IS NULL
  AND (s.date_saillie + 114) >= CURRENT_DATE
  AND (s.date_saillie + 114) <= (CURRENT_DATE + 7)
  AND NOT (EXISTS (SELECT 1 FROM mises_bas mb WHERE mb.saillie_id = s.id AND mb.deleted_at IS NULL))
UNION ALL
-- R04
SELECT 'R04-gestante-en-retard'::text AS regle_id,
  'truie'::text AS cible_type,
  s.truie_id::text AS cible_id,
  a.tag AS cible_label,
  'critique'::text AS gravite,
  (('Mise-bas en retard de '::text || ((CURRENT_DATE - (s.date_saillie + 114))::text)) || ' jour(s) — truie '::text) || a.tag AS titre,
  ('Date prévue dépassée le '::text || ((s.date_saillie + 114)::text)) || ' — vérifier l''état de la truie en maternité.'::text AS description,
  '/reproduction/mises-bas?truie='::text || s.truie_id::text AS lien_suggere,
  now() AS detecte_le,
  a.ferme_id
FROM saillies s
JOIN animaux a ON a.id = s.truie_id AND a.deleted_at IS NULL AND a.statut = 'actif'::statut_animal_t
JOIN diagnostics_gestation d ON d.saillie_id = s.id AND d.resultat = 'positif'::resultat_gestation_t
WHERE s.deleted_at IS NULL
  AND (CURRENT_DATE - (s.date_saillie + 114)) > 3
  AND NOT (EXISTS (SELECT 1 FROM mises_bas mb WHERE mb.saillie_id = s.id AND mb.deleted_at IS NULL))
UNION ALL
-- R05
SELECT 'R05-porcelets-non-peses'::text AS regle_id,
  'bande'::text AS cible_type,
  b.id::text AS cible_id,
  b.code AS cible_label,
  'moyenne'::text AS gravite,
  ((('Bande '::text || b.code) || ' : porcelets nés depuis '::text) || ((CURRENT_DATE - min(mb.date_mise_bas))::text)) || ' jours sans pesée enregistrée'::text AS titre,
  'Aucune pesée saisie depuis la mise-bas. Programmer une pesée pour suivre la croissance.'::text AS description,
  '/pesees?bande='::text || b.id::text AS lien_suggere,
  now() AS detecte_le,
  b.ferme_id
FROM bandes b
JOIN mises_bas mb ON mb.bande_id = b.id AND mb.deleted_at IS NULL
WHERE b.deleted_at IS NULL
  AND (b.statut = ANY (ARRAY['active'::statut_bande_t, 'sevree'::statut_bande_t, 'engraissement'::statut_bande_t]))
  AND NOT (EXISTS (
    SELECT 1 FROM pesees p
    WHERE p.bande_id = b.id AND p.deleted_at IS NULL AND p.date_pesee >= mb.date_mise_bas
  ))
GROUP BY b.id, b.code, b.ferme_id
HAVING (CURRENT_DATE - min(mb.date_mise_bas)) > 14
UNION ALL
-- R06
SELECT 'R06-porcelets-non-vaccines-J14'::text AS regle_id,
  'animal'::text AS cible_type,
  a.id::text AS cible_id,
  a.tag AS cible_label,
  'élevée'::text AS gravite,
  ((('Porcelet '::text || a.tag) || ' âgé de '::text) || ((CURRENT_DATE - a.date_naissance)::text)) || ' j sans vaccin Mycoplasma'::text AS titre,
  'Le vaccin Mycoplasma hyopneumoniae (J14) doit être administré entre 14 et 21 jours. Tolérance jusqu''à J25.'::text AS description,
  '/sanitaire/vaccinations?animal='::text || a.id::text AS lien_suggere,
  now() AS detecte_le,
  a.ferme_id
FROM animaux a
WHERE a.categorie = 'porcelet'::categorie_t
  AND a.statut = 'actif'::statut_animal_t
  AND a.deleted_at IS NULL
  AND a.date_naissance IS NOT NULL
  AND (CURRENT_DATE - a.date_naissance) >= 16
  AND (CURRENT_DATE - a.date_naissance) <= 25
  AND NOT (EXISTS (
    SELECT 1 FROM vaccinations v
    WHERE v.animal_id = a.id AND v.deleted_at IS NULL
      AND (v.produit ~~* '%mycoplasma%'::text OR v.produit ~~* '%mycoplas%'::text)
  ))
UNION ALL
-- R07
SELECT 'R07-sevrage-en-retard'::text AS regle_id,
  'bande'::text AS cible_type,
  COALESCE(mb.bande_id, mb.id)::text AS cible_id,
  COALESCE(b.code, 'MB-'::text || "left"(mb.id::text, 8)) AS cible_label,
  'moyenne'::text AS gravite,
  ((('Sevrage en retard pour mise-bas du '::text || mb.date_mise_bas::text) || ' ('::text) || ((CURRENT_DATE - mb.date_mise_bas)::text)) || ' j)'::text AS titre,
  'La mise-bas date de plus de 35 jours sans sevrage enregistré. Programmer le sevrage.'::text AS description,
  CASE
    WHEN mb.bande_id IS NOT NULL THEN '/bandes/'::text || mb.bande_id::text
    ELSE '/reproduction/mises-bas/'::text || mb.id::text
  END AS lien_suggere,
  now() AS detecte_le,
  a.ferme_id
FROM mises_bas mb
JOIN animaux a ON a.id = mb.truie_id
LEFT JOIN bandes b ON b.id = mb.bande_id
WHERE mb.deleted_at IS NULL
  AND (CURRENT_DATE - mb.date_mise_bas) > 35
  AND NOT (EXISTS (SELECT 1 FROM sevrages s WHERE s.mise_bas_id = mb.id AND s.deleted_at IS NULL))
UNION ALL
-- R08
SELECT 'R08-mortalite-elevee-7j'::text AS regle_id,
  'bande'::text AS cible_type,
  b.id::text AS cible_id,
  b.code AS cible_label,
  'critique'::text AS gravite,
  ((('Mortalité élevée bande '::text || b.code) || ' : '::text) || round(count(m.id)::numeric * 100.0 / NULLIF(cda.n, 0)::numeric, 1)::text) || ' % sur 7 j'::text AS titre,
  ('Sur les 7 derniers jours : '::text || count(m.id)::text) || ' mortalité(s) enregistrée(s).'::text AS description,
  '/sanitaire/mortalites?bande='::text || b.id::text AS lien_suggere,
  now() AS detecte_le,
  b.ferme_id
FROM bandes b
JOIN mortalites m ON m.bande_id = b.id AND m.deleted_at IS NULL AND m.date_mort >= (CURRENT_DATE - 7)
JOIN LATERAL (
  SELECT count(*)::integer AS n
  FROM bande_animaux ba
  WHERE ba.bande_id = b.id AND (ba.date_sortie IS NULL OR ba.date_sortie >= (CURRENT_DATE - 7))
) cda ON true
WHERE b.deleted_at IS NULL
GROUP BY b.id, b.code, b.ferme_id, cda.n
HAVING cda.n > 0 AND (count(m.id)::numeric * 100.0 / cda.n::numeric) > 5::numeric
UNION ALL
-- R09
SELECT 'R09-mortalite-elevee-30j'::text AS regle_id,
  'ferme'::text AS cible_type,
  f.id::text AS cible_id,
  f.nom AS cible_label,
  'critique'::text AS gravite,
  ((('Mortalité ferme '::text || f.nom) || ' : '::text) || round(count(m.id)::numeric * 100.0 / NULLIF(eff.n, 0)::numeric, 2)::text) || ' % sur 30 j'::text AS titre,
  ((('Sur les 30 derniers jours : '::text || count(m.id)::text) || ' mortalité(s) pour un effectif vivant de '::text) || eff.n::text) || '.'::text AS description,
  '/sanitaire/mortalites'::text AS lien_suggere,
  now() AS detecte_le,
  f.id AS ferme_id
FROM fermes f
JOIN mortalites m ON m.ferme_id = f.id AND m.deleted_at IS NULL AND m.date_mort >= (CURRENT_DATE - 30)
JOIN LATERAL (
  SELECT count(*)::integer AS n FROM animaux a
  WHERE a.ferme_id = f.id AND a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL
) eff ON true
GROUP BY f.id, f.nom, eff.n
HAVING eff.n > 0 AND (count(m.id)::numeric * 100.0 / eff.n::numeric) > 2::numeric
UNION ALL
-- R10
SELECT 'R10-stock-critique'::text AS regle_id,
  'matiere'::text AS cible_type,
  mp.id::text AS cible_id,
  mp.nom AS cible_label,
  'élevée'::text AS gravite,
  ((((((('Stock critique : '::text || mp.nom) || ' ('::text) || COALESCE(mp.stock_actuel, 0::numeric)::text) || ' '::text) || COALESCE(mp.unite, 'kg'::text)) || ' / seuil '::text) || mp.seuil_alerte::text) || ')'::text AS titre,
  'Le stock actuel est inférieur au seuil d''alerte. Prévoir un réapprovisionnement.'::text AS description,
  '/stocks/'::text || mp.id::text AS lien_suggere,
  now() AS detecte_le,
  mp.ferme_id
FROM matieres_premieres mp
WHERE mp.deleted_at IS NULL
  AND mp.seuil_alerte IS NOT NULL
  AND mp.seuil_alerte > 0::numeric
  AND COALESCE(mp.stock_actuel, 0::numeric) < mp.seuil_alerte
UNION ALL
-- R11
SELECT 'R11-aliment-rupture-prevue'::text AS regle_id,
  'matiere'::text AS cible_type,
  mp.id::text AS cible_id,
  mp.nom AS cible_label,
  'moyenne'::text AS gravite,
  (('Rupture prévue dans '::text || floor(COALESCE(mp.stock_actuel, 0::numeric) / NULLIF(conso.moy_jour, 0::numeric))::text) || ' jour(s) — '::text) || mp.nom AS titre,
  ((((('Conso moyenne 30 j : '::text || round(conso.moy_jour, 1)::text) || ' '::text) || COALESCE(mp.unite, 'kg'::text)) || '/jour. Stock actuel : '::text) || COALESCE(mp.stock_actuel, 0::numeric)::text) || '.'::text AS description,
  '/stocks/'::text || mp.id::text AS lien_suggere,
  now() AS detecte_le,
  mp.ferme_id
FROM matieres_premieres mp
JOIN LATERAL (
  SELECT COALESCE(sum(c.quantite_kg) / 30.0, 0::numeric) AS moy_jour
  FROM consommations_aliment c
  JOIN bandes b ON b.id = c.bande_id
  WHERE b.ferme_id = mp.ferme_id AND c.date >= (CURRENT_DATE - 30)
) conso ON true
WHERE mp.deleted_at IS NULL
  AND (mp.type = ANY (ARRAY['matiere_premiere'::type_stock_t, 'aliment_fini'::type_stock_t]))
  AND conso.moy_jour > 0::numeric
  AND COALESCE(mp.stock_actuel, 0::numeric) > 0::numeric
  AND (COALESCE(mp.stock_actuel, 0::numeric) / conso.moy_jour) < 7::numeric
  AND NOT (mp.seuil_alerte IS NOT NULL AND COALESCE(mp.stock_actuel, 0::numeric) < mp.seuil_alerte)
UNION ALL
-- R12
SELECT 'R12-acte-sanitaire-en-retard'::text AS regle_id,
  'animal'::text AS cible_type,
  a.id::text AS cible_id,
  a.tag AS cible_label,
  'élevée'::text AS gravite,
  ((((('Acte sanitaire en retard : '::text || pv.nom) || ' (animal '::text) || a.tag) || ', '::text) || ((CURRENT_DATE - a.date_naissance - pv.age_jours)::text)) || ' j de retard)'::text AS titre,
  ((('Protocole obligatoire prévu à J'::text || pv.age_jours::text) || ', non administré (animal âgé de '::text) || ((CURRENT_DATE - a.date_naissance)::text)) || ' j).'::text AS description,
  '/sanitaire/vaccinations?animal='::text || a.id::text AS lien_suggere,
  now() AS detecte_le,
  a.ferme_id
FROM animaux a
JOIN protocoles_vaccinaux pv
  ON pv.ferme_id = a.ferme_id
 AND pv.categorie_cible = a.categorie
 AND pv.obligatoire = true
 AND pv.actif = true
 AND pv.age_jours IS NOT NULL
WHERE a.statut = 'actif'::statut_animal_t
  AND a.deleted_at IS NULL
  AND a.date_naissance IS NOT NULL
  AND (CURRENT_DATE - a.date_naissance) > (pv.age_jours + 7)
  AND NOT (EXISTS (
    SELECT 1 FROM vaccinations v
    WHERE v.animal_id = a.id AND v.deleted_at IS NULL AND v.protocole_id = pv.id
  ))
UNION ALL
-- R13
SELECT 'R13-truie-anorexie'::text AS regle_id,
  'bande'::text AS cible_type,
  b.id::text AS cible_id,
  b.code AS cible_label,
  'critique'::text AS gravite,
  ((((((('Chute consommation aliment bande '::text || b.code) || ' : '::text) || round(COALESCE(tx.quantite_recent, 0::numeric), 1)::text) || ' kg vs moyenne 7 j '::text) || round(tx.moyenne_7j, 1)::text) || ' kg (-'::text) || round((1::numeric - COALESCE(tx.quantite_recent, 0::numeric) / NULLIF(tx.moyenne_7j, 0::numeric)) * 100::numeric, 0)::text) || ' %)'::text AS titre,
  'Anorexie suspectée : conso aliment chutée >50%. Bande contient des reproductrices en lactation/gestation — vérifier individuellement les truies (température, comportement).'::text AS description,
  '/bandes/'::text || b.id::text AS lien_suggere,
  now() AS detecte_le,
  b.ferme_id
FROM bandes b
JOIN LATERAL (
  SELECT avg(c.quantite_kg) FILTER (WHERE c.date >= (CURRENT_DATE - 8) AND c.date <= (CURRENT_DATE - 2)) AS moyenne_7j,
         max(c.quantite_kg) FILTER (WHERE c.date >= (CURRENT_DATE - 1)) AS quantite_recent
  FROM consommations_aliment c
  WHERE c.bande_id = b.id
) tx ON true
WHERE b.deleted_at IS NULL
  AND (b.statut = ANY (ARRAY['active'::statut_bande_t, 'sevree'::statut_bande_t]))
  AND tx.moyenne_7j IS NOT NULL
  AND tx.moyenne_7j > 0::numeric
  AND COALESCE(tx.quantite_recent, 0::numeric) < (tx.moyenne_7j * 0.5)
  AND (EXISTS (
    SELECT 1 FROM bande_animaux ba
    JOIN animaux a ON a.id = ba.animal_id
    WHERE ba.bande_id = b.id
      AND (ba.date_sortie IS NULL OR ba.date_sortie >= CURRENT_DATE)
      AND (a.categorie = ANY (ARRAY['truie'::categorie_t, 'cochette'::categorie_t]))
      AND a.statut = 'actif'::statut_animal_t
      AND a.deleted_at IS NULL
  ))
UNION ALL
-- R14
SELECT 'R14-cochette-trop-vieille'::text AS regle_id,
  'truie'::text AS cible_type,
  a.id::text AS cible_id,
  a.tag AS cible_label,
  'moyenne'::text AS gravite,
  ((('Cochette '::text || a.tag) || ' âgée de '::text) || ((CURRENT_DATE - a.date_naissance)::text)) || ' j sans saillie enregistrée'::text AS titre,
  'La cochette dépasse 250 jours sans première saillie. Prévoir mise à la reproduction ou réforme.'::text AS description,
  '/cheptel/'::text || a.id::text AS lien_suggere,
  now() AS detecte_le,
  a.ferme_id
FROM animaux a
LEFT JOIN saillies s ON s.truie_id = a.id AND s.deleted_at IS NULL
WHERE a.categorie = 'cochette'::categorie_t
  AND a.statut = 'actif'::statut_animal_t
  AND a.deleted_at IS NULL
  AND a.date_naissance IS NOT NULL
  AND (CURRENT_DATE - a.date_naissance) > 250
GROUP BY a.id, a.tag, a.ferme_id, a.date_naissance
HAVING count(s.id) = 0
UNION ALL
-- R15
SELECT 'R15-lot-mortalite-anormale'::text AS regle_id,
  'bande'::text AS cible_type,
  b.id::text AS cible_id,
  b.code AS cible_label,
  'critique'::text AS gravite,
  ((((((('Mortalité anormale lot '::text || b.code) || ' : '::text) || count(DISTINCT m.id)::text) || ' morts / '::text) || count(DISTINCT ba.animal_id)::text) || ' animaux ('::text) || round(count(DISTINCT m.id)::numeric * 100.0 / NULLIF(count(DISTINCT ba.animal_id), 0)::numeric, 1)::text) || ' % sur 7 j)'::text AS titre,
  'Taux de mortalité supérieur à 5 % sur 7 jours dans le lot. Investiguer cause sanitaire (autopsie, prélèvements).'::text AS description,
  '/sanitaire/mortalites?bande='::text || b.id::text AS lien_suggere,
  now() AS detecte_le,
  b.ferme_id
FROM bandes b
LEFT JOIN bande_animaux ba ON ba.bande_id = b.id
LEFT JOIN mortalites m
  ON m.animal_id = ba.animal_id
 AND m.date_mort >= (CURRENT_DATE - 7)
 AND m.date_mort <= CURRENT_DATE
 AND m.deleted_at IS NULL
WHERE b.deleted_at IS NULL
  AND (b.date_fin_reelle IS NULL OR b.date_fin_reelle >= CURRENT_DATE)
GROUP BY b.id, b.code, b.ferme_id
HAVING count(DISTINCT ba.animal_id) > 0
   AND (count(DISTINCT m.id)::numeric / NULLIF(count(DISTINCT ba.animal_id), 0)::numeric) > 0.05
UNION ALL
-- R16
SELECT 'R16-mise-bas-tardive'::text AS regle_id,
  'truie'::text AS cible_type,
  s.truie_id::text AS cible_id,
  a.tag AS cible_label,
  'critique'::text AS gravite,
  ((('Mise-bas tardive truie '::text || a.tag) || ' : J'::text) || ((CURRENT_DATE - s.date_saillie)::text)) || ' (saillie positive sans MB)'::text AS titre,
  ('Plus de 117 jours depuis la saillie positive (date saillie : '::text || s.date_saillie::text) || '), aucune mise-bas enregistrée. Vérifier la truie en maternité, risque de momification ou perte de portée.'::text AS description,
  '/reproduction/mises-bas?truie='::text || s.truie_id::text AS lien_suggere,
  now() AS detecte_le,
  a.ferme_id
FROM saillies s
JOIN animaux a ON a.id = s.truie_id AND a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL
JOIN diagnostics_gestation d ON d.saillie_id = s.id AND d.resultat = 'positif'::resultat_gestation_t
LEFT JOIN mises_bas mb ON mb.saillie_id = s.id AND mb.deleted_at IS NULL
WHERE s.deleted_at IS NULL
  AND CURRENT_DATE > (s.date_saillie + 117)
  AND mb.id IS NULL
UNION ALL
-- R17
SELECT 'R17-eau-chute-importante'::text AS regle_id,
  'ferme'::text AS cible_type,
  eau.ferme_id::text AS cible_id,
  COALESCE(f.nom, 'Ferme'::text) AS cible_label,
  'critique'::text AS gravite,
  ((((('Consommation eau du jour en chute '::text || round(eau.variation_pct, 1)::text) || ' % vs moyenne 7 j ('::text) || round(COALESCE(eau.litres_today, 0::numeric), 0)::text) || ' L vs '::text) || round(eau.moy_7j, 0)::text) || ' L/j)'::text AS titre,
  'Chute importante de consommation eau — vérifier compteur, abreuvoirs, état sanitaire des animaux.'::text AS description,
  '/sanitaire/eau'::text AS lien_suggere,
  now() AS detecte_le,
  eau.ferme_id
FROM (
  SELECT consommations_eau.ferme_id,
    avg(consommations_eau.litres) FILTER (WHERE consommations_eau.date >= (CURRENT_DATE - 7) AND consommations_eau.date <= (CURRENT_DATE - 1)) AS moy_7j,
    max(consommations_eau.litres) FILTER (WHERE consommations_eau.date = CURRENT_DATE) AS litres_today,
    (max(consommations_eau.litres) FILTER (WHERE consommations_eau.date = CURRENT_DATE)
      - avg(consommations_eau.litres) FILTER (WHERE consommations_eau.date >= (CURRENT_DATE - 7) AND consommations_eau.date <= (CURRENT_DATE - 1)))
     / NULLIF(avg(consommations_eau.litres) FILTER (WHERE consommations_eau.date >= (CURRENT_DATE - 7) AND consommations_eau.date <= (CURRENT_DATE - 1)), 0::numeric)
     * 100::numeric AS variation_pct
  FROM consommations_eau
  WHERE consommations_eau.deleted_at IS NULL
    AND consommations_eau.date >= (CURRENT_DATE - 7)
    AND consommations_eau.date <= CURRENT_DATE
  GROUP BY consommations_eau.ferme_id
) eau
LEFT JOIN fermes f ON f.id = eau.ferme_id
WHERE eau.moy_7j IS NOT NULL
  AND eau.moy_7j > 0::numeric
  AND eau.litres_today IS NOT NULL
  AND eau.litres_today < (eau.moy_7j * 0.8)
UNION ALL
-- R18
SELECT 'R18-lot-non-analyse'::text AS regle_id,
  'lot'::text AS cible_type,
  l.id::text AS cible_id,
  (mp.nom || ' — lot '::text) || l.reference_lot AS cible_label,
  'moyenne'::text AS gravite,
  ((((('Lot '::text || l.reference_lot) || ' ('::text) || mp.nom) || ') reçu il y a '::text) || ((CURRENT_DATE - l.date_reception)::text)) || ' j sans analyse mycotoxines'::text AS titre,
  'Faire analyser aflatoxine B1, zéaralénone, DON, ochratoxine A, fumonisines — risque sanitaire élevé en zone tropicale humide.'::text AS description,
  '/sanitaire/mycotoxines'::text AS lien_suggere,
  now() AS detecte_le,
  l.ferme_id
FROM lots_matieres_premieres l
JOIN matieres_premieres mp ON mp.id = l.matiere_premiere_id
WHERE l.deleted_at IS NULL
  AND (mp.nom ~~* '%maïs%'::text OR mp.nom ~~* '%mais%'::text OR mp.nom ~~* '%arachide%'::text OR mp.nom ~~* '%soja%'::text)
  AND (CURRENT_DATE - l.date_reception) > 7
  AND l.analyse_aflatoxine_b1_ppb IS NULL
UNION ALL
-- R19
SELECT 'R19-mise-bas-attendue-sans-diag'::text AS regle_id,
  'truie'::text AS cible_type,
  t.id::text AS cible_id,
  t.tag AS cible_label,
  'élevée'::text AS gravite,
  ((((('Truie '::text || t.tag) || ' : mise-bas attendue, J'::text) || ((CURRENT_DATE - dsa.derniere_saillie)::text)) || ' post-saillie ('::text) || dsa.derniere_saillie::text) || ') sans diagnostic ni MB'::text AS titre,
  'Truie en zone de mise-bas (jour 110-130 post-saillie). Aucun diagnostic gestation ni mise-bas n''est saisi : vérifier l''état (mise-bas imminente, mise-bas non saisie, avortement ?), faire un examen et un diagnostic.'::text AS description,
  '/cheptel/'::text || t.id::text AS lien_suggere,
  now() AS detecte_le,
  t.ferme_id
FROM truies_actives t
JOIN truie_derniere_saillie dsa ON dsa.truie_id = t.id
LEFT JOIN truie_derniere_mb dmb ON dmb.truie_id = t.id
WHERE (CURRENT_DATE - dsa.derniere_saillie) >= 110
  AND (CURRENT_DATE - dsa.derniere_saillie) <= 130
  AND (dmb.derniere_mb IS NULL OR dmb.derniere_mb < dsa.derniere_saillie)
  AND NOT (EXISTS (
    SELECT 1 FROM saillies s_d
    JOIN diagnostics_gestation d_d ON d_d.saillie_id = s_d.id
    WHERE s_d.truie_id = t.id AND s_d.deleted_at IS NULL AND s_d.date_saillie = dsa.derniere_saillie
  ))
UNION ALL
-- R20
SELECT 'R20-iss-trop-long'::text AS regle_id,
  'truie'::text AS cible_type,
  sv.truie_id::text AS cible_id,
  a.tag AS cible_label,
  'moyenne'::text AS gravite,
  ((('Truie '::text || a.tag) || ' : ISS = '::text) || ((CURRENT_DATE - sv.date_sevrage)::text)) || ' jours depuis le sevrage sans nouvelle saillie'::text AS titre,
  'Intervalle sevrage-saillie > 10 j (cible 5-7 j). Vérifier détection chaleur, état corporel BCS, alimentation flushing.'::text AS description,
  '/cheptel/'::text || sv.truie_id::text AS lien_suggere,
  now() AS detecte_le,
  a.ferme_id
FROM sevrages sv
JOIN animaux a ON a.id = sv.truie_id AND a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL
LEFT JOIN saillies s ON s.truie_id = sv.truie_id AND s.date_saillie > sv.date_sevrage AND s.deleted_at IS NULL
WHERE sv.deleted_at IS NULL
  AND s.id IS NULL
  AND (CURRENT_DATE - sv.date_sevrage) > 10
  AND sv.date_sevrage = ((
    SELECT max(sv2.date_sevrage) FROM sevrages sv2
    WHERE sv2.truie_id = sv.truie_id AND sv2.deleted_at IS NULL
  ))
UNION ALL
-- ===========================================================================
-- R21 — Diagnostic gestation attendu (fenêtre retour chaleur 18-35 j)
-- ===========================================================================
SELECT 'R21-diagnostic-gestation-attendu'::text AS regle_id,
  'truie'::text AS cible_type,
  s.truie_id::text AS cible_id,
  a.tag AS cible_label,
  'moyenne'::text AS gravite,
  ('Diagnostic gestation à faire pour '::text || a.tag || ' — J+'::text || (CURRENT_DATE - s.date_saillie)::text || ' post-saillie'::text) AS titre,
  'Fenêtre de retour chaleur (18-24j post-saillie). Observer comportement ou faire échographie.'::text AS description,
  ('/reproduction?diagnostic='::text || s.id::text) AS lien_suggere,
  now() AS detecte_le,
  s.ferme_id
FROM saillies s
JOIN animaux a ON a.id = s.truie_id AND a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL
LEFT JOIN diagnostics_gestation d ON d.saillie_id = s.id
LEFT JOIN mises_bas mb ON mb.saillie_id = s.id AND mb.deleted_at IS NULL
WHERE s.deleted_at IS NULL
  AND d.id IS NULL
  AND mb.id IS NULL
  AND (CURRENT_DATE - s.date_saillie) BETWEEN 18 AND 35;

GRANT SELECT ON v_alertes_actives TO anon, authenticated;

COMMIT;
