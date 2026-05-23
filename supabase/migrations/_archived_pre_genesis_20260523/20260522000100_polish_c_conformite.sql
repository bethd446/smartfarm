-- ============================================================================
-- POLISH-C — 4 fix conformité / sécurité (audit V2 Round 2)
-- ============================================================================
--  Fix #1 : Mycotoxines — ajout colonnes OTA (Ochratoxine A) + FUM (Fumonisines
--           FB1+FB2) et reconstruction de la colonne GENERATED `conforme` avec
--           les nouveaux seuils porcins UE (CI = zone tropicale humide).
--  Fix #2 : Biosécurité — checklist persistante : nouvelle table
--           `biosecurite_audits` + vue `v_biosecurite_etat_actuel` (dernier
--           audit par item / ferme).
--  Fix #3 : Alerte R20-iss-trop-long — intervalle sevrage→nouvelle saillie
--           supérieur à 10 jours (cible biologique 5-7 j). Ajout d'une branche
--           UNION ALL dans `v_alertes_actives` (post-POLISH-A, qui a ajouté
--           R19).
--  Fix #4 : Voie IM — précision "encolure (musculature massétère)" partout
--           (mise à jour `protocoles_vaccinaux.voie` IM → "IM (encolure)").
--           Le libellé "entre les côtes" du seed Fer dextran est corrigé
--           directement dans la migration seed source (20260520180001) +
--           UPDATE défensif ici si déjà appliqué.
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX #1 — Mycotoxines : OTA + Fumonisines + colonne `conforme` GENERATED
-- ============================================================================

ALTER TABLE lots_matieres_premieres
  ADD COLUMN IF NOT EXISTS analyse_ochratoxine_a_ppb numeric(8,2);

ALTER TABLE lots_matieres_premieres
  ADD COLUMN IF NOT EXISTS analyse_fumonisine_ppb numeric(10,2);

COMMENT ON COLUMN lots_matieres_premieres.analyse_ochratoxine_a_ppb IS
  'Ochratoxine A en ppb (µg/kg). Seuil UE porcs : ≤ 50 ppb. '
  'Risque élevé sur arachide stockée humide (climat tropical CI).';

COMMENT ON COLUMN lots_matieres_premieres.analyse_fumonisine_ppb IS
  'Fumonisines totales (FB1+FB2) en ppb (µg/kg). Seuil UE porcs sevrés : '
  '≤ 5 000 ppb. Risque maïs en zone tropicale humide.';

-- Reconstruire la colonne `conforme` (GENERATED ALWAYS, pas de data perdue)
-- pour intégrer les deux nouvelles toxines aux seuils porcins UE.
ALTER TABLE lots_matieres_premieres DROP COLUMN IF EXISTS conforme;
ALTER TABLE lots_matieres_premieres
  ADD COLUMN conforme boolean GENERATED ALWAYS AS (
        (analyse_aflatoxine_b1_ppb  IS NULL OR analyse_aflatoxine_b1_ppb  <= 20)
    AND (analyse_zearalenone_ppb    IS NULL OR analyse_zearalenone_ppb    <= 250)
    AND (analyse_don_ppb            IS NULL OR analyse_don_ppb            <= 900)
    AND (analyse_ochratoxine_a_ppb  IS NULL OR analyse_ochratoxine_a_ppb  <= 50)
    AND (analyse_fumonisine_ppb     IS NULL OR analyse_fumonisine_ppb     <= 5000)
  ) STORED;

COMMENT ON COLUMN lots_matieres_premieres.conforme IS
  'Conformité mycotoxines selon seuils UE porcins : Afla B1 ≤ 20, ZEA ≤ 250, '
  'DON ≤ 900, OTA ≤ 50, FUM (FB1+FB2) ≤ 5000 ppb. NULL = non analysé (toléré).';

-- ============================================================================
-- FIX #2 — Biosécurité : table d'audits + vue état actuel
-- ============================================================================

CREATE TABLE IF NOT EXISTS biosecurite_audits (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ferme_id           uuid NOT NULL REFERENCES fermes(id),
  checklist_item_id  uuid NOT NULL REFERENCES biosecurite_checklist(id),
  statut             text NOT NULL CHECK (statut IN ('conforme','non_conforme','non_evalue')),
  date_audit         date NOT NULL DEFAULT CURRENT_DATE,
  observations       text,
  audite_par         uuid REFERENCES utilisateurs(id),
  created_at         timestamptz DEFAULT now(),
  deleted_at         timestamptz
);

COMMENT ON TABLE biosecurite_audits IS
  'Historique des audits checklist biosécurité. Un enregistrement par '
  'évaluation d''un point de checklist. La vue v_biosecurite_etat_actuel '
  'renvoie le dernier audit par item.';

CREATE INDEX IF NOT EXISTS idx_biosecurite_audits_ferme_item
  ON biosecurite_audits(ferme_id, checklist_item_id, date_audit DESC);

CREATE INDEX IF NOT EXISTS idx_biosecurite_audits_deleted
  ON biosecurite_audits(deleted_at) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON biosecurite_audits TO anon, authenticated;

-- Vue : dernier audit (par created_at) pour chaque (ferme, item)
CREATE OR REPLACE VIEW v_biosecurite_etat_actuel
WITH (security_invoker=true) AS
SELECT DISTINCT ON (a.ferme_id, a.checklist_item_id)
  a.ferme_id,
  a.checklist_item_id,
  c.categorie,
  c.item,
  c.obligatoire,
  c.ordre,
  a.statut,
  a.date_audit,
  a.observations,
  a.audite_par,
  a.created_at AS audit_created_at
FROM biosecurite_audits a
JOIN biosecurite_checklist c ON c.id = a.checklist_item_id
WHERE a.deleted_at IS NULL
ORDER BY a.ferme_id, a.checklist_item_id, a.date_audit DESC, a.created_at DESC;

COMMENT ON VIEW v_biosecurite_etat_actuel IS
  'Dernier audit enregistré pour chaque item de checklist biosécurité, '
  'par ferme. Utilisée par /sanitaire/biosecurite pour afficher l''état '
  'courant (conforme / non_conforme).';

GRANT SELECT ON v_biosecurite_etat_actuel TO anon, authenticated;

-- ============================================================================
-- FIX #3 — Alerte R20-iss-trop-long : Intervalle Sevrage-Saillie > 10 jours
-- ============================================================================
-- On récupère la définition POST-POLISH-A (qui a déjà ajouté R19) et on lui
-- ajoute une branche UNION ALL pour R20. La règle détecte les truies dont le
-- dernier sevrage date de plus de 10 jours sans nouvelle saillie enregistrée
-- (cible biologique 5-7 j ; au-delà → suspicion détection chaleur / BCS bas).
-- ============================================================================

CREATE OR REPLACE VIEW v_alertes_actives
WITH (security_invoker=true) AS
WITH truies_actives AS (
  SELECT a.id, a.tag, a.ferme_id, a.date_naissance, a.date_entree
  FROM animaux a
  WHERE a.categorie = 'truie'::categorie_t
    AND a.statut = 'actif'::statut_animal_t
    AND a.deleted_at IS NULL
),
truie_derniere_saillie AS (
  SELECT s.truie_id, max(s.date_saillie) AS derniere_saillie
  FROM saillies s WHERE s.deleted_at IS NULL GROUP BY s.truie_id
),
truie_dernier_sevrage AS (
  SELECT sv.truie_id, max(sv.date_sevrage) AS dernier_sevrage
  FROM sevrages sv WHERE sv.deleted_at IS NULL GROUP BY sv.truie_id
),
truie_derniere_mb AS (
  SELECT mb.truie_id, max(mb.date_mise_bas) AS derniere_mb
  FROM mises_bas mb WHERE mb.deleted_at IS NULL GROUP BY mb.truie_id
)

-- R01 : truie vide prolongée
SELECT 'R01-truie-vide-prolongee'::text AS regle_id,
       'truie'::text AS cible_type,
       t.id::text AS cible_id,
       t.tag AS cible_label,
       'élevée'::text AS gravite,
       (('Truie ' || t.tag) || ' vide depuis ' ||
        ((CURRENT_DATE - GREATEST(
            COALESCE(ds.dernier_sevrage, '1900-01-01'::date),
            COALESCE(dmb.derniere_mb,    '1900-01-01'::date),
            COALESCE(dsa.derniere_saillie,'1900-01-01'::date),
            COALESCE(t.date_entree, t.date_naissance, '1900-01-01'::date)
          ))::text)) || ' jours' AS titre,
       'Aucune saillie ni diagnostic gestation enregistré récemment. Vérifier le suivi reproduction.'::text AS description,
       '/cheptel/' || t.id::text AS lien_suggere,
       now() AS detecte_le,
       t.ferme_id
FROM truies_actives t
  LEFT JOIN truie_derniere_saillie dsa ON dsa.truie_id = t.id
  LEFT JOIN truie_dernier_sevrage  ds  ON ds.truie_id  = t.id
  LEFT JOIN truie_derniere_mb      dmb ON dmb.truie_id = t.id
WHERE (dsa.derniere_saillie IS NULL OR (CURRENT_DATE - dsa.derniere_saillie) > 45)
  AND (dmb.derniere_mb      IS NULL OR (CURRENT_DATE - dmb.derniere_mb)      > 35)
  AND (ds.dernier_sevrage   IS NULL OR (CURRENT_DATE - ds.dernier_sevrage)   > 14)
  AND (dsa.derniere_saillie IS NOT NULL
       OR dmb.derniere_mb IS NOT NULL
       OR ds.dernier_sevrage IS NOT NULL
       OR (COALESCE(t.date_entree, t.date_naissance) IS NOT NULL
           AND (CURRENT_DATE - COALESCE(t.date_entree, t.date_naissance)) > 240))
  AND NOT (dsa.derniere_saillie IS NOT NULL
           AND (CURRENT_DATE - dsa.derniere_saillie) BETWEEN 110 AND 130)

UNION ALL
-- R02 : retour chaleur non sailli
SELECT 'R02-retour-chaleur-non-saillie'::text,
       'truie'::text, s.truie_id::text, a.tag,
       'moyenne'::text,
       ('Truie ' || a.tag || ' en retour de chaleur sans nouvelle saillie depuis ' ||
        ((CURRENT_DATE - d.date_diagnostic)::text)) || ' jours',
       'Diagnostic gestation négatif / retour chaleur sans nouvelle saillie enregistrée — programmer une nouvelle IA.'::text,
       '/reproduction/saillies?truie=' || s.truie_id::text,
       now(), a.ferme_id
FROM diagnostics_gestation d
  JOIN saillies s ON s.id = d.saillie_id AND s.deleted_at IS NULL
  JOIN animaux  a ON a.id = s.truie_id AND a.deleted_at IS NULL AND a.statut = 'actif'::statut_animal_t
WHERE (d.resultat = ANY (ARRAY['negatif'::resultat_gestation_t,'retour_chaleur'::resultat_gestation_t]))
  AND (CURRENT_DATE - d.date_diagnostic) > 25
  AND NOT EXISTS (
        SELECT 1 FROM saillies s2
        WHERE s2.truie_id = s.truie_id AND s2.deleted_at IS NULL
          AND s2.date_saillie > d.date_diagnostic)
  AND d.date_diagnostic = (
        SELECT max(d2.date_diagnostic)
        FROM diagnostics_gestation d2
          JOIN saillies s3 ON s3.id = d2.saillie_id
        WHERE s3.truie_id = s.truie_id
          AND (d2.resultat = ANY (ARRAY['negatif'::resultat_gestation_t,'retour_chaleur'::resultat_gestation_t])))

UNION ALL
-- R03 : mise-bas imminente
SELECT 'R03-gestante-mise-bas-imminente'::text,
       'truie'::text, s.truie_id::text, a.tag,
       'élevée'::text,
       'Mise-bas prévue dans ' || ((s.date_saillie + 114 - CURRENT_DATE)::text) || ' jour(s) — truie ' || a.tag,
       'Truie gestante, date prévue mise-bas le ' || ((s.date_saillie + 114)::text) || '. Préparer la maternité.',
       '/reproduction/mises-bas?truie=' || s.truie_id::text,
       now(), a.ferme_id
FROM saillies s
  JOIN animaux a ON a.id = s.truie_id AND a.deleted_at IS NULL AND a.statut = 'actif'::statut_animal_t
  JOIN diagnostics_gestation d ON d.saillie_id = s.id AND d.resultat = 'positif'::resultat_gestation_t
WHERE s.deleted_at IS NULL
  AND (s.date_saillie + 114) BETWEEN CURRENT_DATE AND (CURRENT_DATE + 7)
  AND NOT EXISTS (SELECT 1 FROM mises_bas mb WHERE mb.saillie_id = s.id AND mb.deleted_at IS NULL)

UNION ALL
-- R04 : gestante en retard
SELECT 'R04-gestante-en-retard'::text,
       'truie'::text, s.truie_id::text, a.tag,
       'critique'::text,
       'Mise-bas en retard de ' || ((CURRENT_DATE - (s.date_saillie + 114))::text) || ' jour(s) — truie ' || a.tag,
       'Date prévue dépassée le ' || ((s.date_saillie + 114)::text) || ' — vérifier l''état de la truie en maternité.',
       '/reproduction/mises-bas?truie=' || s.truie_id::text,
       now(), a.ferme_id
FROM saillies s
  JOIN animaux a ON a.id = s.truie_id AND a.deleted_at IS NULL AND a.statut = 'actif'::statut_animal_t
  JOIN diagnostics_gestation d ON d.saillie_id = s.id AND d.resultat = 'positif'::resultat_gestation_t
WHERE s.deleted_at IS NULL
  AND (CURRENT_DATE - (s.date_saillie + 114)) > 3
  AND NOT EXISTS (SELECT 1 FROM mises_bas mb WHERE mb.saillie_id = s.id AND mb.deleted_at IS NULL)

UNION ALL
-- R05 : porcelets non pesés
SELECT 'R05-porcelets-non-peses'::text,
       'bande'::text, b.id::text, b.code,
       'moyenne'::text,
       'Bande ' || b.code || ' : porcelets nés depuis ' || ((CURRENT_DATE - min(mb.date_mise_bas))::text) || ' jours sans pesée enregistrée',
       'Aucune pesée saisie depuis la mise-bas. Programmer une pesée pour suivre la croissance.'::text,
       '/pesees?bande=' || b.id::text,
       now(), b.ferme_id
FROM bandes b
  JOIN mises_bas mb ON mb.bande_id = b.id AND mb.deleted_at IS NULL
WHERE b.deleted_at IS NULL
  AND b.statut = ANY (ARRAY['active'::statut_bande_t,'sevree'::statut_bande_t,'engraissement'::statut_bande_t])
  AND NOT EXISTS (
        SELECT 1 FROM pesees p
        WHERE p.bande_id = b.id AND p.deleted_at IS NULL AND p.date_pesee >= mb.date_mise_bas)
GROUP BY b.id, b.code, b.ferme_id
HAVING (CURRENT_DATE - min(mb.date_mise_bas)) > 14

UNION ALL
-- R06 : porcelets non vaccinés Mycoplasma J14
SELECT 'R06-porcelets-non-vaccines-J14'::text,
       'animal'::text, a.id::text, a.tag,
       'élevée'::text,
       'Porcelet ' || a.tag || ' âgé de ' || ((CURRENT_DATE - a.date_naissance)::text) || ' j sans vaccin Mycoplasma',
       'Le vaccin Mycoplasma hyopneumoniae (J14) doit être administré entre 14 et 21 jours. Tolérance jusqu''à J25.'::text,
       '/sanitaire/vaccinations?animal=' || a.id::text,
       now(), a.ferme_id
FROM animaux a
WHERE a.categorie = 'porcelet'::categorie_t
  AND a.statut = 'actif'::statut_animal_t
  AND a.deleted_at IS NULL
  AND a.date_naissance IS NOT NULL
  AND (CURRENT_DATE - a.date_naissance) BETWEEN 16 AND 25
  AND NOT EXISTS (
        SELECT 1 FROM vaccinations v
        WHERE v.animal_id = a.id AND v.deleted_at IS NULL
          AND (v.produit ILIKE '%mycoplasma%' OR v.produit ILIKE '%mycoplas%'))

UNION ALL
-- R07 : sevrage en retard
SELECT 'R07-sevrage-en-retard'::text,
       'bande'::text,
       COALESCE(mb.bande_id, mb.id)::text,
       COALESCE(b.code, 'MB-' || left(mb.id::text, 8)),
       'moyenne'::text,
       'Sevrage en retard pour mise-bas du ' || mb.date_mise_bas::text || ' (' || ((CURRENT_DATE - mb.date_mise_bas)::text) || ' j)',
       'La mise-bas date de plus de 35 jours sans sevrage enregistré. Programmer le sevrage.'::text,
       CASE WHEN mb.bande_id IS NOT NULL THEN '/bandes/' || mb.bande_id::text
            ELSE '/reproduction/mises-bas/' || mb.id::text END,
       now(), a.ferme_id
FROM mises_bas mb
  JOIN animaux a ON a.id = mb.truie_id
  LEFT JOIN bandes b ON b.id = mb.bande_id
WHERE mb.deleted_at IS NULL
  AND (CURRENT_DATE - mb.date_mise_bas) > 35
  AND NOT EXISTS (SELECT 1 FROM sevrages s WHERE s.mise_bas_id = mb.id AND s.deleted_at IS NULL)

UNION ALL
-- R08 : mortalité bande 7j
SELECT 'R08-mortalite-elevee-7j'::text,
       'bande'::text, b.id::text, b.code,
       'critique'::text,
       'Mortalité élevée bande ' || b.code || ' : ' || round(count(m.id)::numeric * 100.0 / NULLIF(cda.n, 0)::numeric, 1)::text || ' % sur 7 j',
       'Sur les 7 derniers jours : ' || count(m.id)::text || ' mortalité(s) enregistrée(s).',
       '/sanitaire/mortalites?bande=' || b.id::text,
       now(), b.ferme_id
FROM bandes b
  JOIN mortalites m ON m.bande_id = b.id AND m.deleted_at IS NULL AND m.date_mort >= (CURRENT_DATE - 7)
  JOIN LATERAL (
        SELECT count(*)::integer AS n FROM bande_animaux ba
        WHERE ba.bande_id = b.id AND (ba.date_sortie IS NULL OR ba.date_sortie >= (CURRENT_DATE - 7))
       ) cda ON true
WHERE b.deleted_at IS NULL
GROUP BY b.id, b.code, b.ferme_id, cda.n
HAVING cda.n > 0 AND (count(m.id)::numeric * 100.0 / cda.n::numeric) > 5::numeric

UNION ALL
-- R09 : mortalité ferme 30j
SELECT 'R09-mortalite-elevee-30j'::text,
       'ferme'::text, f.id::text, f.nom,
       'critique'::text,
       'Mortalité ferme ' || f.nom || ' : ' || round(count(m.id)::numeric * 100.0 / NULLIF(eff.n, 0)::numeric, 2)::text || ' % sur 30 j',
       'Sur les 30 derniers jours : ' || count(m.id)::text || ' mortalité(s) pour un effectif vivant de ' || eff.n::text || '.',
       '/sanitaire/mortalites'::text,
       now(), f.id
FROM fermes f
  JOIN mortalites m ON m.ferme_id = f.id AND m.deleted_at IS NULL AND m.date_mort >= (CURRENT_DATE - 30)
  JOIN LATERAL (
        SELECT count(*)::integer AS n FROM animaux a
        WHERE a.ferme_id = f.id AND a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL
       ) eff ON true
GROUP BY f.id, f.nom, eff.n
HAVING eff.n > 0 AND (count(m.id)::numeric * 100.0 / eff.n::numeric) > 2::numeric

UNION ALL
-- R10 : stock critique
SELECT 'R10-stock-critique'::text,
       'matiere'::text, mp.id::text, mp.nom,
       'élevée'::text,
       'Stock critique : ' || mp.nom || ' (' || COALESCE(mp.stock_actuel, 0)::text || ' ' || COALESCE(mp.unite, 'kg') || ' / seuil ' || mp.seuil_alerte::text || ')',
       'Le stock actuel est inférieur au seuil d''alerte. Prévoir un réapprovisionnement.'::text,
       '/stocks/' || mp.id::text,
       now(), mp.ferme_id
FROM matieres_premieres mp
WHERE mp.deleted_at IS NULL
  AND mp.seuil_alerte IS NOT NULL AND mp.seuil_alerte > 0
  AND COALESCE(mp.stock_actuel, 0) < mp.seuil_alerte

UNION ALL
-- R11 : rupture stock prévue
SELECT 'R11-aliment-rupture-prevue'::text,
       'matiere'::text, mp.id::text, mp.nom,
       'moyenne'::text,
       'Rupture prévue dans ' || floor(COALESCE(mp.stock_actuel, 0) / NULLIF(conso.moy_jour, 0))::text || ' jour(s) — ' || mp.nom,
       'Conso moyenne 30 j : ' || round(conso.moy_jour, 1)::text || ' ' || COALESCE(mp.unite, 'kg') || '/jour. Stock actuel : ' || COALESCE(mp.stock_actuel, 0)::text || '.',
       '/stocks/' || mp.id::text,
       now(), mp.ferme_id
FROM matieres_premieres mp
  JOIN LATERAL (
        SELECT COALESCE(sum(c.quantite_kg) / 30.0, 0) AS moy_jour
        FROM consommations_aliment c JOIN bandes b ON b.id = c.bande_id
        WHERE b.ferme_id = mp.ferme_id AND c.date >= (CURRENT_DATE - 30)
       ) conso ON true
WHERE mp.deleted_at IS NULL
  AND mp.type = ANY (ARRAY['matiere_premiere'::type_stock_t,'aliment_fini'::type_stock_t])
  AND conso.moy_jour > 0
  AND COALESCE(mp.stock_actuel, 0) > 0
  AND (COALESCE(mp.stock_actuel, 0) / conso.moy_jour) < 7
  AND NOT (mp.seuil_alerte IS NOT NULL AND COALESCE(mp.stock_actuel, 0) < mp.seuil_alerte)

UNION ALL
-- R12 : acte sanitaire en retard
SELECT 'R12-acte-sanitaire-en-retard'::text,
       'animal'::text, a.id::text, a.tag,
       'élevée'::text,
       'Acte sanitaire en retard : ' || pv.nom || ' (animal ' || a.tag || ', ' || ((CURRENT_DATE - a.date_naissance - pv.age_jours)::text) || ' j de retard)',
       'Protocole obligatoire prévu à J' || pv.age_jours::text || ', non administré (animal âgé de ' || ((CURRENT_DATE - a.date_naissance)::text) || ' j).',
       '/sanitaire/vaccinations?animal=' || a.id::text,
       now(), a.ferme_id
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
  AND NOT EXISTS (
        SELECT 1 FROM vaccinations v
        WHERE v.animal_id = a.id AND v.deleted_at IS NULL AND v.protocole_id = pv.id)

UNION ALL
-- R13 : anorexie bande
SELECT 'R13-truie-anorexie'::text,
       'bande'::text, b.id::text, b.code,
       'critique'::text,
       'Chute consommation aliment bande ' || b.code || ' : ' || round(COALESCE(tx.quantite_recent, 0), 1)::text || ' kg vs moyenne 7 j ' || round(tx.moyenne_7j, 1)::text || ' kg (-' || round((1 - COALESCE(tx.quantite_recent, 0) / NULLIF(tx.moyenne_7j, 0)) * 100, 0)::text || ' %)',
       'Anorexie suspectée : conso aliment chutée >50%. Bande contient des reproductrices en lactation/gestation — vérifier individuellement les truies (température, comportement).'::text,
       '/bandes/' || b.id::text,
       now(), b.ferme_id
FROM bandes b
  JOIN LATERAL (
        SELECT avg(c.quantite_kg) FILTER (WHERE c.date BETWEEN (CURRENT_DATE - 8) AND (CURRENT_DATE - 2)) AS moyenne_7j,
               max(c.quantite_kg) FILTER (WHERE c.date >= (CURRENT_DATE - 1)) AS quantite_recent
        FROM consommations_aliment c WHERE c.bande_id = b.id
       ) tx ON true
WHERE b.deleted_at IS NULL
  AND b.statut = ANY (ARRAY['active'::statut_bande_t,'sevree'::statut_bande_t])
  AND tx.moyenne_7j IS NOT NULL AND tx.moyenne_7j > 0
  AND COALESCE(tx.quantite_recent, 0) < (tx.moyenne_7j * 0.5)
  AND EXISTS (
        SELECT 1 FROM bande_animaux ba JOIN animaux a ON a.id = ba.animal_id
        WHERE ba.bande_id = b.id
          AND (ba.date_sortie IS NULL OR ba.date_sortie >= CURRENT_DATE)
          AND a.categorie = ANY (ARRAY['truie'::categorie_t,'cochette'::categorie_t])
          AND a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL)

UNION ALL
-- R14 : cochette trop vieille
SELECT 'R14-cochette-trop-vieille'::text,
       'truie'::text, a.id::text, a.tag,
       'moyenne'::text,
       'Cochette ' || a.tag || ' âgée de ' || ((CURRENT_DATE - a.date_naissance)::text) || ' j sans saillie enregistrée',
       'La cochette dépasse 250 jours sans première saillie. Prévoir mise à la reproduction ou réforme.'::text,
       '/cheptel/' || a.id::text,
       now(), a.ferme_id
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
-- R15 : mortalité anormale lot
SELECT 'R15-lot-mortalite-anormale'::text,
       'bande'::text, b.id::text, b.code,
       'critique'::text,
       'Mortalité anormale lot ' || b.code || ' : ' || count(DISTINCT m.id)::text || ' morts / ' || count(DISTINCT ba.animal_id)::text || ' animaux (' || round(count(DISTINCT m.id)::numeric * 100.0 / NULLIF(count(DISTINCT ba.animal_id), 0)::numeric, 1)::text || ' % sur 7 j)',
       'Taux de mortalité supérieur à 5 % sur 7 jours dans le lot. Investiguer cause sanitaire (autopsie, prélèvements).'::text,
       '/sanitaire/mortalites?bande=' || b.id::text,
       now(), b.ferme_id
FROM bandes b
  LEFT JOIN bande_animaux ba ON ba.bande_id = b.id
  LEFT JOIN mortalites m
    ON m.animal_id = ba.animal_id
   AND m.date_mort BETWEEN (CURRENT_DATE - 7) AND CURRENT_DATE
   AND m.deleted_at IS NULL
WHERE b.deleted_at IS NULL
  AND (b.date_fin_reelle IS NULL OR b.date_fin_reelle >= CURRENT_DATE)
GROUP BY b.id, b.code, b.ferme_id
HAVING count(DISTINCT ba.animal_id) > 0
   AND (count(DISTINCT m.id)::numeric / NULLIF(count(DISTINCT ba.animal_id), 0)::numeric) > 0.05

UNION ALL
-- R16 : mise-bas tardive
SELECT 'R16-mise-bas-tardive'::text,
       'truie'::text, s.truie_id::text, a.tag,
       'critique'::text,
       'Mise-bas tardive truie ' || a.tag || ' : J' || ((CURRENT_DATE - s.date_saillie)::text) || ' (saillie positive sans MB)',
       'Plus de 117 jours depuis la saillie positive (date saillie : ' || s.date_saillie::text || '), aucune mise-bas enregistrée. Vérifier la truie en maternité, risque de momification ou perte de portée.'::text,
       '/reproduction/mises-bas?truie=' || s.truie_id::text,
       now(), a.ferme_id
FROM saillies s
  JOIN animaux a ON a.id = s.truie_id AND a.statut = 'actif'::statut_animal_t AND a.deleted_at IS NULL
  JOIN diagnostics_gestation d ON d.saillie_id = s.id AND d.resultat = 'positif'::resultat_gestation_t
  LEFT JOIN mises_bas mb ON mb.saillie_id = s.id AND mb.deleted_at IS NULL
WHERE s.deleted_at IS NULL
  AND CURRENT_DATE > (s.date_saillie + 117)
  AND mb.id IS NULL

UNION ALL
-- R17 : eau chute
SELECT 'R17-eau-chute-importante'::text,
       'ferme'::text, eau.ferme_id::text,
       COALESCE(f.nom, 'Ferme'),
       'critique'::text,
       'Consommation eau du jour en chute ' || round(eau.variation_pct, 1)::text || ' % vs moyenne 7 j (' || round(COALESCE(eau.litres_today, 0), 0)::text || ' L vs ' || round(eau.moy_7j, 0)::text || ' L/j)',
       'Chute importante de consommation eau — vérifier compteur, abreuvoirs, état sanitaire des animaux.'::text,
       '/sanitaire/eau'::text,
       now(), eau.ferme_id
FROM (
  SELECT consommations_eau.ferme_id,
         avg(consommations_eau.litres) FILTER (WHERE consommations_eau.date BETWEEN (CURRENT_DATE - 7) AND (CURRENT_DATE - 1)) AS moy_7j,
         max(consommations_eau.litres) FILTER (WHERE consommations_eau.date = CURRENT_DATE) AS litres_today,
         (max(consommations_eau.litres) FILTER (WHERE consommations_eau.date = CURRENT_DATE)
          - avg(consommations_eau.litres) FILTER (WHERE consommations_eau.date BETWEEN (CURRENT_DATE - 7) AND (CURRENT_DATE - 1)))
         / NULLIF(avg(consommations_eau.litres) FILTER (WHERE consommations_eau.date BETWEEN (CURRENT_DATE - 7) AND (CURRENT_DATE - 1)), 0) * 100 AS variation_pct
  FROM consommations_eau
  WHERE consommations_eau.deleted_at IS NULL
    AND consommations_eau.date BETWEEN (CURRENT_DATE - 7) AND CURRENT_DATE
  GROUP BY consommations_eau.ferme_id
) eau
  LEFT JOIN fermes f ON f.id = eau.ferme_id
WHERE eau.moy_7j IS NOT NULL AND eau.moy_7j > 0
  AND eau.litres_today IS NOT NULL
  AND eau.litres_today < (eau.moy_7j * 0.8)

UNION ALL
-- R18 : lot maïs/arachide/soja non analysé
SELECT 'R18-lot-non-analyse'::text,
       'lot'::text, l.id::text,
       (mp.nom || ' — lot ' || l.reference_lot),
       'moyenne'::text,
       'Lot ' || l.reference_lot || ' (' || mp.nom || ') reçu il y a ' || ((CURRENT_DATE - l.date_reception)::text) || ' j sans analyse mycotoxines',
       'Faire analyser aflatoxine B1, zéaralénone, DON, ochratoxine A, fumonisines — risque sanitaire élevé en zone tropicale humide.'::text,
       '/sanitaire/mycotoxines'::text,
       now(), l.ferme_id
FROM lots_matieres_premieres l
  JOIN matieres_premieres mp ON mp.id = l.matiere_premiere_id
WHERE l.deleted_at IS NULL
  AND (mp.nom ILIKE '%maïs%' OR mp.nom ILIKE '%mais%' OR mp.nom ILIKE '%arachide%' OR mp.nom ILIKE '%soja%')
  AND (CURRENT_DATE - l.date_reception) > 7
  AND l.analyse_aflatoxine_b1_ppb IS NULL

UNION ALL
-- R19 : mise-bas attendue sans diag (POLISH-A)
SELECT 'R19-mise-bas-attendue-sans-diag'::text,
       'truie'::text, t.id::text, t.tag,
       'élevée'::text,
       'Truie ' || t.tag || ' : mise-bas attendue, J' || ((CURRENT_DATE - dsa.derniere_saillie)::text) || ' post-saillie (' || dsa.derniere_saillie::text || ') sans diagnostic ni MB',
       'Truie en zone de mise-bas (jour 110-130 post-saillie). Aucun diagnostic gestation ni mise-bas n''est saisi : vérifier l''état (mise-bas imminente, mise-bas non saisie, avortement ?), faire un examen et un diagnostic.'::text,
       '/cheptel/' || t.id::text,
       now(), t.ferme_id
FROM truies_actives t
  JOIN truie_derniere_saillie dsa ON dsa.truie_id = t.id
  LEFT JOIN truie_derniere_mb dmb ON dmb.truie_id = t.id
WHERE (CURRENT_DATE - dsa.derniere_saillie) BETWEEN 110 AND 130
  AND (dmb.derniere_mb IS NULL OR dmb.derniere_mb < dsa.derniere_saillie)
  AND NOT EXISTS (
        SELECT 1 FROM saillies s_d
          JOIN diagnostics_gestation d_d ON d_d.saillie_id = s_d.id
        WHERE s_d.truie_id = t.id
          AND s_d.deleted_at IS NULL
          AND s_d.date_saillie = dsa.derniere_saillie)

UNION ALL
-- R20 : ISS trop long (POLISH-C) — sevrage→saillie > 10 jours
SELECT 'R20-iss-trop-long'::text AS regle_id,
       'truie'::text AS cible_type,
       sv.truie_id::text AS cible_id,
       a.tag AS cible_label,
       'moyenne'::text AS gravite,
       ('Truie ' || a.tag || ' : ISS = ' || (CURRENT_DATE - sv.date_sevrage)::text || ' jours depuis le sevrage sans nouvelle saillie') AS titre,
       'Intervalle sevrage-saillie > 10 j (cible 5-7 j). Vérifier détection chaleur, état corporel BCS, alimentation flushing.'::text AS description,
       ('/cheptel/' || sv.truie_id::text) AS lien_suggere,
       now() AS detecte_le,
       a.ferme_id
FROM sevrages sv
  JOIN animaux a
    ON a.id = sv.truie_id
   AND a.statut = 'actif'::statut_animal_t
   AND a.deleted_at IS NULL
  LEFT JOIN saillies s
    ON s.truie_id = sv.truie_id
   AND s.date_saillie > sv.date_sevrage
   AND s.deleted_at IS NULL
WHERE sv.deleted_at IS NULL
  AND s.id IS NULL                                  -- aucune saillie postérieure
  AND (CURRENT_DATE - sv.date_sevrage) > 10
  AND sv.date_sevrage = (
        SELECT max(sv2.date_sevrage) FROM sevrages sv2
        WHERE sv2.truie_id = sv.truie_id AND sv2.deleted_at IS NULL);

COMMENT ON VIEW v_alertes_actives IS
  '20 règles d''alertes métier Smart Farm (POLISH-A : R19, POLISH-C : R20).';

GRANT SELECT ON v_alertes_actives TO anon, authenticated;

-- ============================================================================
-- FIX #4 — Voie IM : précision "encolure (musculature massétère)"
-- ============================================================================

-- Précision du libellé voie pour tous les protocoles IM existants
-- (la table protocoles_vaccinaux n'a pas de colonne deleted_at)
UPDATE protocoles_vaccinaux
SET voie = 'IM (encolure)'
WHERE voie = 'IM';

-- Correction défensive du libellé "entre les côtes" s'il a été inséré via le
-- seed avant patch (fer dextran). Le fichier seed source a aussi été corrigé.
UPDATE protocoles_vaccinaux
SET description = replace(
      description,
      'Injection unique J1-J3 entre les côtes.',
      'Injection unique J1-J3 en encolure (musculature massétère).'
    )
WHERE description ILIKE '%entre les côtes%';

COMMIT;
