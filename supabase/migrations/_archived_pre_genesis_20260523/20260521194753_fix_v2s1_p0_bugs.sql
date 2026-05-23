-- ============================================================================
-- Migration : fix V2-S1 P0 bugs
-- Sprint    : V2-S1
-- Auteur    : Producteur V2-A
-- Date      : 2026-05-21
-- ----------------------------------------------------------------------------
-- Bugs fixés :
--   BUG #1 : R01-truie-vide-prolongee — faux positif sur truie en lactation
--            (T-001 a mis bas il y a 8j, considérée à tort comme "vide").
--            → Réécriture complète de la condition WHERE R01 (les autres
--              règles R02..R12 sont conservées à l'identique).
--   BUG #2 : 31 matières premières à stock 0 kg (noise démo).
--            → UPDATE pour rétablir des stocks confortables et garder
--              3 matières en stock critique (démo réaliste).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- BUG #1 — Recréation de v_alertes_actives avec règle R01 corrigée
-- ----------------------------------------------------------------------------
-- Nouvelle logique R01 (truie vide-prolongée) — TOUTES les conditions doivent
-- être vraies pour qu'une truie soit considérée "vide" :
--   1) Pas de saillie récente : derniere_saillie IS NULL OR > 45j
--   2) Pas en lactation       : derniere_mb     IS NULL OR > 35j
--      (sortie de lactation = sevrage standard 28j + marge 7j)
--   3) IPO dépassé            : dernier_sevrage IS NULL OR > 14j
--      (IPO normal 5-7j ; au-delà 14j = problème)
--   4) Si jamais aucun événement repro : attendre 240j après date_entree
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS v_alertes_actives;

CREATE VIEW v_alertes_actives
  WITH (security_invoker = true)
AS
WITH truies_actives AS (
  SELECT a.id, a.tag, a.ferme_id, a.date_naissance, a.date_entree
  FROM animaux a
  WHERE a.categorie = 'truie'::categorie_t
    AND a.statut = 'actif'::statut_animal_t
    AND a.deleted_at IS NULL
),
truie_derniere_saillie AS (
  SELECT s.truie_id, MAX(s.date_saillie) AS derniere_saillie
  FROM saillies s
  WHERE s.deleted_at IS NULL
  GROUP BY s.truie_id
),
truie_dernier_sevrage AS (
  SELECT sv.truie_id, MAX(sv.date_sevrage) AS dernier_sevrage
  FROM sevrages sv
  WHERE sv.deleted_at IS NULL
  GROUP BY sv.truie_id
),
truie_derniere_mb AS (
  SELECT mb.truie_id, MAX(mb.date_mise_bas) AS derniere_mb
  FROM mises_bas mb
  WHERE mb.deleted_at IS NULL
  GROUP BY mb.truie_id
)
-- ============================================================================
-- R01 — Truie vide prolongée (CORRIGÉ)
-- ============================================================================
SELECT
  'R01-truie-vide-prolongee'::text AS regle_id,
  'truie'::text AS cible_type,
  t.id::text AS cible_id,
  t.tag AS cible_label,
  'élevée'::text AS gravite,
  ('Truie ' || t.tag || ' vide depuis ' ||
    (CURRENT_DATE - GREATEST(
      COALESCE(ds.dernier_sevrage,    '1900-01-01'::date),
      COALESCE(dmb.derniere_mb,       '1900-01-01'::date),
      COALESCE(dsa.derniere_saillie,  '1900-01-01'::date),
      COALESCE(t.date_entree, t.date_naissance, '1900-01-01'::date)
    ))::text || ' jours'
  ) AS titre,
  'Aucune saillie ni diagnostic gestation enregistré récemment. Vérifier le suivi reproduction.'::text AS description,
  ('/cheptel/' || t.id::text) AS lien_suggere,
  now() AS detecte_le,
  t.ferme_id
FROM truies_actives t
LEFT JOIN truie_derniere_saillie dsa ON dsa.truie_id = t.id
LEFT JOIN truie_dernier_sevrage  ds  ON ds.truie_id  = t.id
LEFT JOIN truie_derniere_mb      dmb ON dmb.truie_id = t.id
WHERE
  -- (1) pas de saillie récente
  (dsa.derniere_saillie IS NULL OR (CURRENT_DATE - dsa.derniere_saillie) > 45)
  -- (2) pas en lactation (mise-bas > 35j ou aucune)
  AND (dmb.derniere_mb IS NULL OR (CURRENT_DATE - dmb.derniere_mb) > 35)
  -- (3) IPO dépassé (sevrage > 14j ou aucun)
  AND (ds.dernier_sevrage IS NULL OR (CURRENT_DATE - ds.dernier_sevrage) > 14)
  -- (4) si aucun événement repro : truie installée depuis >240j
  AND (
    dsa.derniere_saillie IS NOT NULL
    OR dmb.derniere_mb     IS NOT NULL
    OR ds.dernier_sevrage  IS NOT NULL
    OR (
      COALESCE(t.date_entree, t.date_naissance) IS NOT NULL
      AND (CURRENT_DATE - COALESCE(t.date_entree, t.date_naissance)) > 240
    )
  )

UNION ALL

-- ============================================================================
-- R02..R12 — INCHANGÉES (recopiées telles quelles depuis pg_get_viewdef)
-- ============================================================================
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
 WHERE (d.resultat = ANY (ARRAY['negatif'::resultat_gestation_t, 'retour_chaleur'::resultat_gestation_t])) AND (CURRENT_DATE - d.date_diagnostic) > 25 AND NOT (EXISTS ( SELECT 1
          FROM saillies s2
         WHERE s2.truie_id = s.truie_id AND s2.deleted_at IS NULL AND s2.date_saillie > d.date_diagnostic)) AND d.date_diagnostic = (( SELECT max(d2.date_diagnostic) AS max
          FROM diagnostics_gestation d2
            JOIN saillies s3 ON s3.id = d2.saillie_id
         WHERE s3.truie_id = s.truie_id AND (d2.resultat = ANY (ARRAY['negatif'::resultat_gestation_t, 'retour_chaleur'::resultat_gestation_t]))))
UNION ALL
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
 WHERE s.deleted_at IS NULL AND (s.date_saillie + 114) >= CURRENT_DATE AND (s.date_saillie + 114) <= (CURRENT_DATE + 7) AND NOT (EXISTS ( SELECT 1
          FROM mises_bas mb
         WHERE mb.saillie_id = s.id AND mb.deleted_at IS NULL))
UNION ALL
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
 WHERE s.deleted_at IS NULL AND (CURRENT_DATE - (s.date_saillie + 114)) > 3 AND NOT (EXISTS ( SELECT 1
          FROM mises_bas mb
         WHERE mb.saillie_id = s.id AND mb.deleted_at IS NULL))
UNION ALL
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
 WHERE b.deleted_at IS NULL AND (b.statut = ANY (ARRAY['active'::statut_bande_t, 'sevree'::statut_bande_t, 'engraissement'::statut_bande_t])) AND NOT (EXISTS ( SELECT 1
          FROM pesees p
         WHERE p.bande_id = b.id AND p.deleted_at IS NULL AND p.date_pesee >= mb.date_mise_bas))
 GROUP BY b.id, b.code, b.ferme_id
HAVING (CURRENT_DATE - min(mb.date_mise_bas)) > 14
UNION ALL
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
 WHERE a.categorie = 'porcelet'::categorie_t AND a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL AND a.date_naissance IS NOT NULL AND (CURRENT_DATE - a.date_naissance) >= 16 AND (CURRENT_DATE - a.date_naissance) <= 25 AND NOT (EXISTS ( SELECT 1
          FROM vaccinations v
         WHERE v.animal_id = a.id AND v.deleted_at IS NULL AND (v.produit ~~* '%mycoplasma%'::text OR v.produit ~~* '%mycoplas%'::text)))
UNION ALL
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
 WHERE mb.deleted_at IS NULL AND (CURRENT_DATE - mb.date_mise_bas) > 35 AND NOT (EXISTS ( SELECT 1
          FROM sevrages s
         WHERE s.mise_bas_id = mb.id AND s.deleted_at IS NULL))
UNION ALL
SELECT 'R08-mortalite-elevee-7j'::text AS regle_id,
   'bande'::text AS cible_type,
   b.id::text AS cible_id,
   b.code AS cible_label,
   'critique'::text AS gravite,
   ((('Mortalité élevée bande '::text || b.code) || ' : '::text) || round(count(m.id)::numeric * 100.0 / NULLIF(count_distinct_anim.n, 0)::numeric, 1)::text) || ' % sur 7 j'::text AS titre,
   ('Sur les 7 derniers jours : '::text || count(m.id)::text) || ' mortalité(s) enregistrée(s).'::text AS description,
   '/sanitaire/mortalites?bande='::text || b.id::text AS lien_suggere,
   now() AS detecte_le,
   b.ferme_id
  FROM bandes b
    JOIN mortalites m ON m.bande_id = b.id AND m.deleted_at IS NULL AND m.date_mort >= (CURRENT_DATE - 7)
    JOIN LATERAL ( SELECT count(*)::integer AS n
          FROM bande_animaux ba
         WHERE ba.bande_id = b.id AND (ba.date_sortie IS NULL OR ba.date_sortie >= (CURRENT_DATE - 7))) count_distinct_anim ON true
 WHERE b.deleted_at IS NULL
 GROUP BY b.id, b.code, b.ferme_id, count_distinct_anim.n
HAVING count_distinct_anim.n > 0 AND (count(m.id)::numeric * 100.0 / count_distinct_anim.n::numeric) > 5::numeric
UNION ALL
SELECT 'R09-mortalite-elevee-30j'::text AS regle_id,
   'ferme'::text AS cible_type,
   f.id::text AS cible_id,
   f.nom AS cible_label,
   'critique'::text AS gravite,
   ((('Mortalité ferme '::text || f.nom) || ' : '::text) || round(count(m.id)::numeric * 100.0 / NULLIF(effectif.n, 0)::numeric, 2)::text) || ' % sur 30 j'::text AS titre,
   ((('Sur les 30 derniers jours : '::text || count(m.id)::text) || ' mortalité(s) pour un effectif vivant de '::text) || effectif.n::text) || '.'::text AS description,
   '/sanitaire/mortalites'::text AS lien_suggere,
   now() AS detecte_le,
   f.id AS ferme_id
  FROM fermes f
    JOIN mortalites m ON m.ferme_id = f.id AND m.deleted_at IS NULL AND m.date_mort >= (CURRENT_DATE - 30)
    JOIN LATERAL ( SELECT count(*)::integer AS n
          FROM animaux a
         WHERE a.ferme_id = f.id AND a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL) effectif ON true
 GROUP BY f.id, f.nom, effectif.n
HAVING effectif.n > 0 AND (count(m.id)::numeric * 100.0 / effectif.n::numeric) > 2::numeric
UNION ALL
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
 WHERE mp.deleted_at IS NULL AND mp.seuil_alerte IS NOT NULL AND mp.seuil_alerte > 0::numeric AND COALESCE(mp.stock_actuel, 0::numeric) < mp.seuil_alerte
UNION ALL
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
    JOIN LATERAL ( SELECT COALESCE(sum(c.quantite_kg) / 30.0, 0::numeric) AS moy_jour
          FROM consommations_aliment c
            JOIN bandes b ON b.id = c.bande_id
         WHERE b.ferme_id = mp.ferme_id AND c.date >= (CURRENT_DATE - 30)) conso ON true
 WHERE mp.deleted_at IS NULL AND (mp.type = ANY (ARRAY['matiere_premiere'::type_stock_t, 'aliment_fini'::type_stock_t])) AND conso.moy_jour > 0::numeric AND COALESCE(mp.stock_actuel, 0::numeric) > 0::numeric AND (COALESCE(mp.stock_actuel, 0::numeric) / conso.moy_jour) < 7::numeric AND NOT (mp.seuil_alerte IS NOT NULL AND COALESCE(mp.stock_actuel, 0::numeric) < mp.seuil_alerte)
UNION ALL
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
    JOIN protocoles_vaccinaux pv ON pv.ferme_id = a.ferme_id AND pv.categorie_cible = a.categorie AND pv.obligatoire = true AND pv.actif = true AND pv.age_jours IS NOT NULL
 WHERE a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL AND a.date_naissance IS NOT NULL AND (CURRENT_DATE - a.date_naissance) > (pv.age_jours + 7) AND NOT (EXISTS ( SELECT 1
          FROM vaccinations v
         WHERE v.animal_id = a.id AND v.deleted_at IS NULL AND v.protocole_id = pv.id));

-- Conserver les GRANTs existants (V1 demo sans auth)
GRANT SELECT ON v_alertes_actives TO anon;
GRANT SELECT ON v_alertes_actives TO authenticated;
GRANT SELECT ON v_alertes_actives TO service_role;

-- ----------------------------------------------------------------------------
-- BUG #2 — Stocks matières premières : 31 à 0 kg → noise démo
-- ----------------------------------------------------------------------------
-- Stratégie :
--   1) Toutes les matières à stock 0 → stock = seuil_alerte * 3 (confortable)
--   2) Repasser exactement 3 matières en stock critique (~40% du seuil) :
--      - Maïs grain                         (céréale base)
--      - Tourteau de soja 48%               (protéine clé)
--      - Prémix vit-min porc croissance     (additif clé)
-- ----------------------------------------------------------------------------

-- (1) Stocks confortables pour toutes les matières à 0
UPDATE matieres_premieres
SET    stock_actuel = ROUND(COALESCE(seuil_alerte, 100) * 3, 0)
WHERE  stock_actuel = 0
  AND  deleted_at IS NULL;

-- (2) Repasser 3 matières en stock critique pour conserver une démo réaliste
UPDATE matieres_premieres
SET    stock_actuel = ROUND(COALESCE(seuil_alerte, 100) * 0.4, 0)
WHERE  deleted_at IS NULL
  AND  nom IN (
    'Maïs grain',
    'Tourteau de soja 48%',
    'Prémix vit-min porc croissance'
  );

COMMIT;
