-- =============================================================================
-- V2-C : Alertes métier — 4 nouvelles règles (anorexie, cochette vieille,
--         mortalité anormale, mise-bas tardive)
-- =============================================================================
-- Contexte : la vue v_alertes_actives existe déjà avec 12 règles (R01..R12)
-- après le passage de V2-A (fix_v2s1_p0_bugs.sql).
-- Les IDs R11 et R12 sont DÉJÀ pris par :
--   - R11-aliment-rupture-prevue
--   - R12-acte-sanitaire-en-retard
-- Pour éviter toute collision de regle_id (le front filtre par cet ID), les
-- 4 nouvelles règles du brief V2-C sont publiées avec les IDs R13..R16 :
--   - R13-truie-anorexie         (brief "R11 anorexie truie")
--   - R14-cochette-trop-vieille  (brief "R12 cochette >250j")
--   - R15-lot-mortalite-anormale (brief "R13 mortalité anormale")
--   - R16-mise-bas-tardive       (brief "R14 mise-bas tardive")
--
-- Adaptations dues aux vrais schémas :
--   - consommations_aliment est par-bande (pas par-animal) et sans deleted_at,
--     colonne date = "date" (pas "date_consommation").
--     => R13 cible une BANDE qui contient ≥1 truie/cochette en lactation/gestation
--   - mortalites : colonne date_mort (pas date_mortalite)
--   - bandes : date_fin_reelle / date_fin_prevue (pas date_fin)
--   - diagnostics_gestation n'a PAS de colonne deleted_at
-- =============================================================================

BEGIN;

CREATE OR REPLACE VIEW v_alertes_actives WITH (security_invoker=true) AS
WITH truies_actives AS (
  SELECT a.id, a.tag, a.ferme_id, a.date_naissance, a.date_entree
  FROM animaux a
  WHERE a.categorie = 'truie'::categorie_t
    AND a.statut = 'actif'::statut_animal_t
    AND a.deleted_at IS NULL
),
truie_derniere_saillie AS (
  SELECT s.truie_id, MAX(s.date_saillie) AS derniere_saillie
  FROM saillies s WHERE s.deleted_at IS NULL GROUP BY s.truie_id
),
truie_dernier_sevrage AS (
  SELECT sv.truie_id, MAX(sv.date_sevrage) AS dernier_sevrage
  FROM sevrages sv WHERE sv.deleted_at IS NULL GROUP BY sv.truie_id
),
truie_derniere_mb AS (
  SELECT mb.truie_id, MAX(mb.date_mise_bas) AS derniere_mb
  FROM mises_bas mb WHERE mb.deleted_at IS NULL GROUP BY mb.truie_id
)
-- ---------- R01 : truie vide prolongée ----------
SELECT 'R01-truie-vide-prolongee'::text AS regle_id,
  'truie'::text AS cible_type,
  t.id::text AS cible_id,
  t.tag AS cible_label,
  'élevée'::text AS gravite,
  ('Truie ' || t.tag || ' vide depuis '
   || (CURRENT_DATE - GREATEST(COALESCE(ds.dernier_sevrage,'1900-01-01'::date),
                                COALESCE(dmb.derniere_mb,'1900-01-01'::date),
                                COALESCE(dsa.derniere_saillie,'1900-01-01'::date),
                                COALESCE(t.date_entree, t.date_naissance,'1900-01-01'::date)))::text
   || ' jours')::text AS titre,
  'Aucune saillie ni diagnostic gestation enregistré récemment. Vérifier le suivi reproduction.'::text AS description,
  ('/cheptel/' || t.id::text)::text AS lien_suggere,
  now() AS detecte_le,
  t.ferme_id
FROM truies_actives t
LEFT JOIN truie_derniere_saillie dsa ON dsa.truie_id = t.id
LEFT JOIN truie_dernier_sevrage   ds  ON ds.truie_id  = t.id
LEFT JOIN truie_derniere_mb       dmb ON dmb.truie_id = t.id
WHERE (dsa.derniere_saillie IS NULL OR (CURRENT_DATE - dsa.derniere_saillie) > 45)
  AND (dmb.derniere_mb IS NULL OR (CURRENT_DATE - dmb.derniere_mb) > 35)
  AND (ds.dernier_sevrage IS NULL OR (CURRENT_DATE - ds.dernier_sevrage) > 14)
  AND (dsa.derniere_saillie IS NOT NULL
       OR dmb.derniere_mb   IS NOT NULL
       OR ds.dernier_sevrage IS NOT NULL
       OR (COALESCE(t.date_entree, t.date_naissance) IS NOT NULL
           AND (CURRENT_DATE - COALESCE(t.date_entree, t.date_naissance)) > 240))

UNION ALL
-- ---------- R02 : retour chaleur non saillie ----------
SELECT 'R02-retour-chaleur-non-saillie'::text,
  'truie'::text,
  s.truie_id::text,
  a.tag,
  'moyenne'::text,
  ('Truie ' || a.tag || ' en retour de chaleur sans nouvelle saillie depuis '
   || (CURRENT_DATE - d.date_diagnostic)::text || ' jours')::text,
  'Diagnostic gestation négatif / retour chaleur sans nouvelle saillie enregistrée — programmer une nouvelle IA.'::text,
  ('/reproduction/saillies?truie=' || s.truie_id::text)::text,
  now(),
  a.ferme_id
FROM diagnostics_gestation d
JOIN saillies s ON s.id = d.saillie_id AND s.deleted_at IS NULL
JOIN animaux a  ON a.id = s.truie_id AND a.deleted_at IS NULL AND a.statut = 'actif'::statut_animal_t
WHERE d.resultat = ANY (ARRAY['negatif'::resultat_gestation_t, 'retour_chaleur'::resultat_gestation_t])
  AND (CURRENT_DATE - d.date_diagnostic) > 25
  AND NOT EXISTS (
    SELECT 1 FROM saillies s2
    WHERE s2.truie_id = s.truie_id AND s2.deleted_at IS NULL
      AND s2.date_saillie > d.date_diagnostic)
  AND d.date_diagnostic = (
    SELECT MAX(d2.date_diagnostic)
    FROM diagnostics_gestation d2
    JOIN saillies s3 ON s3.id = d2.saillie_id
    WHERE s3.truie_id = s.truie_id
      AND d2.resultat = ANY (ARRAY['negatif'::resultat_gestation_t, 'retour_chaleur'::resultat_gestation_t]))

UNION ALL
-- ---------- R03 : gestante mise-bas imminente ----------
SELECT 'R03-gestante-mise-bas-imminente'::text,
  'truie'::text,
  s.truie_id::text,
  a.tag,
  'élevée'::text,
  ('Mise-bas prévue dans ' || ((s.date_saillie + 114 - CURRENT_DATE))::text
   || ' jour(s) — truie ' || a.tag)::text,
  ('Truie gestante, date prévue mise-bas le ' || ((s.date_saillie + 114))::text
   || '. Préparer la maternité.')::text,
  ('/reproduction/mises-bas?truie=' || s.truie_id::text)::text,
  now(),
  a.ferme_id
FROM saillies s
JOIN animaux a ON a.id = s.truie_id AND a.deleted_at IS NULL AND a.statut = 'actif'::statut_animal_t
JOIN diagnostics_gestation d ON d.saillie_id = s.id AND d.resultat = 'positif'::resultat_gestation_t
WHERE s.deleted_at IS NULL
  AND (s.date_saillie + 114) >= CURRENT_DATE
  AND (s.date_saillie + 114) <= (CURRENT_DATE + 7)
  AND NOT EXISTS (
    SELECT 1 FROM mises_bas mb WHERE mb.saillie_id = s.id AND mb.deleted_at IS NULL)

UNION ALL
-- ---------- R04 : gestante en retard ----------
SELECT 'R04-gestante-en-retard'::text,
  'truie'::text,
  s.truie_id::text,
  a.tag,
  'critique'::text,
  ('Mise-bas en retard de ' || (CURRENT_DATE - (s.date_saillie + 114))::text
   || ' jour(s) — truie ' || a.tag)::text,
  ('Date prévue dépassée le ' || (s.date_saillie + 114)::text
   || ' — vérifier l''état de la truie en maternité.')::text,
  ('/reproduction/mises-bas?truie=' || s.truie_id::text)::text,
  now(),
  a.ferme_id
FROM saillies s
JOIN animaux a ON a.id = s.truie_id AND a.deleted_at IS NULL AND a.statut = 'actif'::statut_animal_t
JOIN diagnostics_gestation d ON d.saillie_id = s.id AND d.resultat = 'positif'::resultat_gestation_t
WHERE s.deleted_at IS NULL
  AND (CURRENT_DATE - (s.date_saillie + 114)) > 3
  AND NOT EXISTS (
    SELECT 1 FROM mises_bas mb WHERE mb.saillie_id = s.id AND mb.deleted_at IS NULL)

UNION ALL
-- ---------- R05 : porcelets non pesés ----------
SELECT 'R05-porcelets-non-peses'::text,
  'bande'::text,
  b.id::text,
  b.code,
  'moyenne'::text,
  ('Bande ' || b.code || ' : porcelets nés depuis '
   || (CURRENT_DATE - MIN(mb.date_mise_bas))::text || ' jours sans pesée enregistrée')::text,
  'Aucune pesée saisie depuis la mise-bas. Programmer une pesée pour suivre la croissance.'::text,
  ('/pesees?bande=' || b.id::text)::text,
  now(),
  b.ferme_id
FROM bandes b
JOIN mises_bas mb ON mb.bande_id = b.id AND mb.deleted_at IS NULL
WHERE b.deleted_at IS NULL
  AND b.statut = ANY (ARRAY['active'::statut_bande_t, 'sevree'::statut_bande_t, 'engraissement'::statut_bande_t])
  AND NOT EXISTS (
    SELECT 1 FROM pesees p
    WHERE p.bande_id = b.id AND p.deleted_at IS NULL AND p.date_pesee >= mb.date_mise_bas)
GROUP BY b.id, b.code, b.ferme_id
HAVING (CURRENT_DATE - MIN(mb.date_mise_bas)) > 14

UNION ALL
-- ---------- R06 : porcelets non vaccinés J14 ----------
SELECT 'R06-porcelets-non-vaccines-J14'::text,
  'animal'::text,
  a.id::text,
  a.tag,
  'élevée'::text,
  ('Porcelet ' || a.tag || ' âgé de '
   || (CURRENT_DATE - a.date_naissance)::text || ' j sans vaccin Mycoplasma')::text,
  'Le vaccin Mycoplasma hyopneumoniae (J14) doit être administré entre 14 et 21 jours. Tolérance jusqu''à J25.'::text,
  ('/sanitaire/vaccinations?animal=' || a.id::text)::text,
  now(),
  a.ferme_id
FROM animaux a
WHERE a.categorie = 'porcelet'::categorie_t
  AND a.statut = 'actif'::statut_animal_t
  AND a.deleted_at IS NULL
  AND a.date_naissance IS NOT NULL
  AND (CURRENT_DATE - a.date_naissance) >= 16
  AND (CURRENT_DATE - a.date_naissance) <= 25
  AND NOT EXISTS (
    SELECT 1 FROM vaccinations v
    WHERE v.animal_id = a.id AND v.deleted_at IS NULL
      AND (v.produit ILIKE '%mycoplasma%' OR v.produit ILIKE '%mycoplas%'))

UNION ALL
-- ---------- R07 : sevrage en retard ----------
SELECT 'R07-sevrage-en-retard'::text,
  'bande'::text,
  COALESCE(mb.bande_id, mb.id)::text,
  COALESCE(b.code, 'MB-' || LEFT(mb.id::text, 8)),
  'moyenne'::text,
  ('Sevrage en retard pour mise-bas du ' || mb.date_mise_bas::text
   || ' (' || (CURRENT_DATE - mb.date_mise_bas)::text || ' j)')::text,
  'La mise-bas date de plus de 35 jours sans sevrage enregistré. Programmer le sevrage.'::text,
  CASE
    WHEN mb.bande_id IS NOT NULL THEN '/bandes/' || mb.bande_id::text
    ELSE '/reproduction/mises-bas/' || mb.id::text
  END,
  now(),
  a.ferme_id
FROM mises_bas mb
JOIN animaux a ON a.id = mb.truie_id
LEFT JOIN bandes b ON b.id = mb.bande_id
WHERE mb.deleted_at IS NULL
  AND (CURRENT_DATE - mb.date_mise_bas) > 35
  AND NOT EXISTS (
    SELECT 1 FROM sevrages s
    WHERE s.mise_bas_id = mb.id AND s.deleted_at IS NULL)

UNION ALL
-- ---------- R08 : mortalité élevée bande 7j (>5%) ----------
SELECT 'R08-mortalite-elevee-7j'::text,
  'bande'::text,
  b.id::text,
  b.code,
  'critique'::text,
  ('Mortalité élevée bande ' || b.code || ' : '
   || ROUND(COUNT(m.id)::numeric * 100.0 / NULLIF(cda.n,0)::numeric, 1)::text || ' % sur 7 j')::text,
  ('Sur les 7 derniers jours : ' || COUNT(m.id)::text || ' mortalité(s) enregistrée(s).')::text,
  ('/sanitaire/mortalites?bande=' || b.id::text)::text,
  now(),
  b.ferme_id
FROM bandes b
JOIN mortalites m ON m.bande_id = b.id AND m.deleted_at IS NULL AND m.date_mort >= (CURRENT_DATE - 7)
JOIN LATERAL (
  SELECT COUNT(*)::integer AS n
  FROM bande_animaux ba
  WHERE ba.bande_id = b.id
    AND (ba.date_sortie IS NULL OR ba.date_sortie >= (CURRENT_DATE - 7))
) cda ON TRUE
WHERE b.deleted_at IS NULL
GROUP BY b.id, b.code, b.ferme_id, cda.n
HAVING cda.n > 0
   AND (COUNT(m.id)::numeric * 100.0 / cda.n::numeric) > 5::numeric

UNION ALL
-- ---------- R09 : mortalité élevée ferme 30j (>2%) ----------
SELECT 'R09-mortalite-elevee-30j'::text,
  'ferme'::text,
  f.id::text,
  f.nom,
  'critique'::text,
  ('Mortalité ferme ' || f.nom || ' : '
   || ROUND(COUNT(m.id)::numeric * 100.0 / NULLIF(eff.n,0)::numeric, 2)::text || ' % sur 30 j')::text,
  ('Sur les 30 derniers jours : ' || COUNT(m.id)::text
   || ' mortalité(s) pour un effectif vivant de ' || eff.n::text || '.')::text,
  '/sanitaire/mortalites'::text,
  now(),
  f.id
FROM fermes f
JOIN mortalites m ON m.ferme_id = f.id AND m.deleted_at IS NULL AND m.date_mort >= (CURRENT_DATE - 30)
JOIN LATERAL (
  SELECT COUNT(*)::integer AS n
  FROM animaux a
  WHERE a.ferme_id = f.id AND a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL
) eff ON TRUE
GROUP BY f.id, f.nom, eff.n
HAVING eff.n > 0
   AND (COUNT(m.id)::numeric * 100.0 / eff.n::numeric) > 2::numeric

UNION ALL
-- ---------- R10 : stock critique ----------
SELECT 'R10-stock-critique'::text,
  'matiere'::text,
  mp.id::text,
  mp.nom,
  'élevée'::text,
  ('Stock critique : ' || mp.nom || ' (' || COALESCE(mp.stock_actuel,0::numeric)::text
   || ' ' || COALESCE(mp.unite,'kg') || ' / seuil ' || mp.seuil_alerte::text || ')')::text,
  'Le stock actuel est inférieur au seuil d''alerte. Prévoir un réapprovisionnement.'::text,
  ('/stocks/' || mp.id::text)::text,
  now(),
  mp.ferme_id
FROM matieres_premieres mp
WHERE mp.deleted_at IS NULL
  AND mp.seuil_alerte IS NOT NULL
  AND mp.seuil_alerte > 0::numeric
  AND COALESCE(mp.stock_actuel, 0::numeric) < mp.seuil_alerte

UNION ALL
-- ---------- R11 : aliment rupture prévue ----------
SELECT 'R11-aliment-rupture-prevue'::text,
  'matiere'::text,
  mp.id::text,
  mp.nom,
  'moyenne'::text,
  ('Rupture prévue dans '
   || FLOOR(COALESCE(mp.stock_actuel,0::numeric) / NULLIF(conso.moy_jour,0::numeric))::text
   || ' jour(s) — ' || mp.nom)::text,
  ('Conso moyenne 30 j : ' || ROUND(conso.moy_jour,1)::text || ' '
   || COALESCE(mp.unite,'kg') || '/jour. Stock actuel : '
   || COALESCE(mp.stock_actuel,0::numeric)::text || '.')::text,
  ('/stocks/' || mp.id::text)::text,
  now(),
  mp.ferme_id
FROM matieres_premieres mp
JOIN LATERAL (
  SELECT COALESCE(SUM(c.quantite_kg)/30.0, 0::numeric) AS moy_jour
  FROM consommations_aliment c
  JOIN bandes b ON b.id = c.bande_id
  WHERE b.ferme_id = mp.ferme_id AND c.date >= (CURRENT_DATE - 30)
) conso ON TRUE
WHERE mp.deleted_at IS NULL
  AND mp.type = ANY (ARRAY['matiere_premiere'::type_stock_t, 'aliment_fini'::type_stock_t])
  AND conso.moy_jour > 0::numeric
  AND COALESCE(mp.stock_actuel, 0::numeric) > 0::numeric
  AND (COALESCE(mp.stock_actuel,0::numeric) / conso.moy_jour) < 7::numeric
  AND NOT (mp.seuil_alerte IS NOT NULL AND COALESCE(mp.stock_actuel,0::numeric) < mp.seuil_alerte)

UNION ALL
-- ---------- R12 : acte sanitaire en retard ----------
SELECT 'R12-acte-sanitaire-en-retard'::text,
  'animal'::text,
  a.id::text,
  a.tag,
  'élevée'::text,
  ('Acte sanitaire en retard : ' || pv.nom || ' (animal ' || a.tag || ', '
   || (CURRENT_DATE - a.date_naissance - pv.age_jours)::text || ' j de retard)')::text,
  ('Protocole obligatoire prévu à J' || pv.age_jours::text
   || ', non administré (animal âgé de ' || (CURRENT_DATE - a.date_naissance)::text || ' j).')::text,
  ('/sanitaire/vaccinations?animal=' || a.id::text)::text,
  now(),
  a.ferme_id
FROM animaux a
JOIN protocoles_vaccinaux pv ON pv.ferme_id = a.ferme_id
  AND pv.categorie_cible = a.categorie
  AND pv.obligatoire = TRUE
  AND pv.actif = TRUE
  AND pv.age_jours IS NOT NULL
WHERE a.statut = 'actif'::statut_animal_t
  AND a.deleted_at IS NULL
  AND a.date_naissance IS NOT NULL
  AND (CURRENT_DATE - a.date_naissance) > (pv.age_jours + 7)
  AND NOT EXISTS (
    SELECT 1 FROM vaccinations v
    WHERE v.animal_id = a.id AND v.deleted_at IS NULL AND v.protocole_id = pv.id)

-- =============================================================================
-- NOUVELLES RÈGLES V2-C
-- =============================================================================

UNION ALL
-- ---------- R13 : Truie/cochette anorexie (lot < 50% moyenne 7j) ----------
-- Le brief demande "truie anorexique" mais consommations_aliment est par-bande
-- (pas par-animal). On déclenche au niveau bande contenant des truies/cochettes
-- en lactation/gestation quand la conso d'hier ou aujourd'hui est < 50% de la
-- moyenne des 7 jours précédents.
SELECT 'R13-truie-anorexie'::text AS regle_id,
  'bande'::text AS cible_type,
  b.id::text AS cible_id,
  b.code AS cible_label,
  'critique'::text AS gravite,
  ('Chute consommation aliment bande ' || b.code || ' : '
   || ROUND(COALESCE(tx.quantite_recent, 0)::numeric, 1)::text || ' kg vs moyenne 7 j '
   || ROUND(tx.moyenne_7j, 1)::text || ' kg (-'
   || ROUND((1 - COALESCE(tx.quantite_recent,0)/NULLIF(tx.moyenne_7j,0)) * 100, 0)::text
   || ' %)')::text AS titre,
  ('Anorexie suspectée : conso aliment chutée >50%. '
   || 'Bande contient des reproductrices en lactation/gestation — vérifier '
   || 'individuellement les truies (température, comportement).')::text AS description,
  ('/bandes/' || b.id::text)::text AS lien_suggere,
  now() AS detecte_le,
  b.ferme_id
FROM bandes b
JOIN LATERAL (
  SELECT
    AVG(c.quantite_kg) FILTER (WHERE c.date BETWEEN CURRENT_DATE - 8 AND CURRENT_DATE - 2) AS moyenne_7j,
    MAX(c.quantite_kg) FILTER (WHERE c.date >= CURRENT_DATE - 1) AS quantite_recent
  FROM consommations_aliment c
  WHERE c.bande_id = b.id
) tx ON TRUE
WHERE b.deleted_at IS NULL
  AND b.statut = ANY (ARRAY['active'::statut_bande_t, 'sevree'::statut_bande_t])
  AND tx.moyenne_7j IS NOT NULL
  AND tx.moyenne_7j > 0
  AND COALESCE(tx.quantite_recent, 0) < tx.moyenne_7j * 0.5
  AND EXISTS (
    SELECT 1 FROM bande_animaux ba
    JOIN animaux a ON a.id = ba.animal_id
    WHERE ba.bande_id = b.id
      AND (ba.date_sortie IS NULL OR ba.date_sortie >= CURRENT_DATE)
      AND a.categorie IN ('truie'::categorie_t, 'cochette'::categorie_t)
      AND a.statut = 'actif'::statut_animal_t
      AND a.deleted_at IS NULL
  )

UNION ALL
-- ---------- R14 : Cochette non saillie >250 jours ----------
SELECT 'R14-cochette-trop-vieille'::text AS regle_id,
  'truie'::text AS cible_type,
  a.id::text AS cible_id,
  a.tag AS cible_label,
  'moyenne'::text AS gravite,
  ('Cochette ' || a.tag || ' âgée de '
   || (CURRENT_DATE - a.date_naissance)::text
   || ' j sans saillie enregistrée')::text AS titre,
  ('La cochette dépasse 250 jours sans première saillie. '
   || 'Prévoir mise à la reproduction ou réforme.')::text AS description,
  ('/cheptel/' || a.id::text)::text AS lien_suggere,
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
HAVING COUNT(s.id) = 0

UNION ALL
-- ---------- R15 : Mortalité anormale lot (>5% / 7j, alerte critique 'anormale') ----------
-- Doublon partiel de R08 (qui utilise aussi >5% / 7j) mais ciblage et libellé
-- distincts (axe lot/effectif initial vs effectif vivant).
SELECT 'R15-lot-mortalite-anormale'::text AS regle_id,
  'bande'::text AS cible_type,
  b.id::text AS cible_id,
  b.code AS cible_label,
  'critique'::text AS gravite,
  ('Mortalité anormale lot ' || b.code || ' : '
   || COUNT(DISTINCT m.id)::text || ' morts / '
   || COUNT(DISTINCT ba.animal_id)::text || ' animaux ('
   || ROUND(COUNT(DISTINCT m.id)::numeric * 100.0
            / NULLIF(COUNT(DISTINCT ba.animal_id), 0), 1)::text
   || ' % sur 7 j)')::text AS titre,
  ('Taux de mortalité supérieur à 5 % sur 7 jours dans le lot. '
   || 'Investiguer cause sanitaire (autopsie, prélèvements).')::text AS description,
  ('/sanitaire/mortalites?bande=' || b.id::text)::text AS lien_suggere,
  now() AS detecte_le,
  b.ferme_id
FROM bandes b
LEFT JOIN bande_animaux ba ON ba.bande_id = b.id
LEFT JOIN mortalites m ON m.animal_id = ba.animal_id
  AND m.date_mort BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE
  AND m.deleted_at IS NULL
WHERE b.deleted_at IS NULL
  AND (b.date_fin_reelle IS NULL OR b.date_fin_reelle >= CURRENT_DATE)
GROUP BY b.id, b.code, b.ferme_id
HAVING COUNT(DISTINCT ba.animal_id) > 0
   AND COUNT(DISTINCT m.id)::numeric / NULLIF(COUNT(DISTINCT ba.animal_id), 0) > 0.05

UNION ALL
-- ---------- R16 : Mise-bas tardive (>117j depuis saillie positive) ----------
SELECT 'R16-mise-bas-tardive'::text AS regle_id,
  'truie'::text AS cible_type,
  s.truie_id::text AS cible_id,
  a.tag AS cible_label,
  'critique'::text AS gravite,
  ('Mise-bas tardive truie ' || a.tag || ' : J'
   || (CURRENT_DATE - s.date_saillie)::text
   || ' (saillie positive sans MB)')::text AS titre,
  ('Plus de 117 jours depuis la saillie positive (date saillie : '
   || s.date_saillie::text || '), aucune mise-bas enregistrée. '
   || 'Vérifier la truie en maternité, risque de momification ou perte de portée.')::text AS description,
  ('/reproduction/mises-bas?truie=' || s.truie_id::text)::text AS lien_suggere,
  now() AS detecte_le,
  a.ferme_id
FROM saillies s
JOIN animaux a ON a.id = s.truie_id AND a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL
JOIN diagnostics_gestation d ON d.saillie_id = s.id AND d.resultat = 'positif'::resultat_gestation_t
LEFT JOIN mises_bas mb ON mb.saillie_id = s.id AND mb.deleted_at IS NULL
WHERE s.deleted_at IS NULL
  AND CURRENT_DATE > (s.date_saillie + 117)
  AND mb.id IS NULL
;

GRANT SELECT ON v_alertes_actives TO anon, authenticated;

COMMIT;
