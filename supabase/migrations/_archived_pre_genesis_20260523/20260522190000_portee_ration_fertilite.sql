-- ============================================================================
-- Migration : Portées + Rations adaptatives + 10 bâtiments + Fertilité
-- Date      : 2026-05-22
-- Auteur    : Hermes (Sprint 3 — gestion porcine pro)
-- Contexte  : Intégration cahier des charges Christophe
--             - ID portée auto à la mise-bas → traçabilité avant boucle (J60)
--             - 10 bâtiments standardisés (avec observation + quarantaine)
--             - Ration journalière calculée par sujet × phase × condition
--             - Vues fertilité truies/verrats avec suggestion réforme
--             - Catalogue 13 aliments CI (DE HEUS, Vitalac, Maridav, Nutrika)
-- ============================================================================

BEGIN;

-- ─── 1. ENUM phase étendu + types bâtiments ─────────────────────────────────
-- Ajoute demarrage_1, demarrage_2, observation, quarantaine au check constraint bandes
ALTER TABLE bandes
DROP CONSTRAINT IF EXISTS bandes_phase_courante_check;

ALTER TABLE bandes
ADD CONSTRAINT bandes_phase_courante_check
CHECK ((phase_courante IS NULL) OR (phase_courante = ANY (ARRAY[
  'post_sevrage','demarrage','demarrage_1','demarrage_2',
  'croissance','finition','engraissement',
  'observation','quarantaine'
]::text[])));

-- Élargir batiments.type pour accepter croissance, finition, demarrage, observation
ALTER TABLE batiments
DROP CONSTRAINT IF EXISTS batiments_type_check;

ALTER TABLE batiments
ADD CONSTRAINT batiments_type_check
CHECK (type = ANY (ARRAY[
  'maternité','gestation','verraterie','post-sevrage','engraissement',
  'quarantaine','infirmerie','observation',
  'demarrage','croissance','finition'
]::text[]));

-- ─── 2. PORTÉES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portees (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ferme_id        uuid NOT NULL REFERENCES fermes(id),
  truie_id        uuid NOT NULL REFERENCES animaux(id),
  verrat_id       uuid REFERENCES animaux(id),
  mise_bas_id     uuid REFERENCES mises_bas(id),
  bande_id        uuid REFERENCES bandes(id),
  code            text NOT NULL,                  -- P-YYYYMM-NNN
  date_naissance  date NOT NULL,
  nb_nes_vivants  integer NOT NULL DEFAULT 0,
  nb_nes_morts    integer NOT NULL DEFAULT 0,
  poids_total_kg  numeric(8,2),
  observations    text,
  created_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz,
  UNIQUE (ferme_id, code)
);

CREATE INDEX IF NOT EXISTS idx_portees_truie ON portees(truie_id);
CREATE INDEX IF NOT EXISTS idx_portees_mise_bas ON portees(mise_bas_id);
CREATE INDEX IF NOT EXISTS idx_portees_ferme_date ON portees(ferme_id, date_naissance DESC);

ALTER TABLE portees ENABLE ROW LEVEL SECURITY;

CREATE POLICY portees_select ON portees FOR SELECT USING (user_has_farm_access(ferme_id));
CREATE POLICY portees_insert ON portees FOR INSERT WITH CHECK (user_has_farm_access(ferme_id));
CREATE POLICY portees_update ON portees FOR UPDATE
  USING (user_has_farm_access(ferme_id) AND current_user_role() <> 'viewer'::role_t);
CREATE POLICY portees_delete ON portees FOR DELETE
  USING (user_has_farm_access(ferme_id) AND current_user_role() = 'admin'::role_t);

GRANT SELECT, INSERT, UPDATE, DELETE ON portees TO authenticated;

-- ─── 3. animaux : enrichissement traçabilité + suivi physique ────────────────
ALTER TABLE animaux ADD COLUMN IF NOT EXISTS portee_id uuid REFERENCES portees(id);
ALTER TABLE animaux ADD COLUMN IF NOT EXISTS poids_actuel_kg numeric(6,2);
ALTER TABLE animaux ADD COLUMN IF NOT EXISTS batiment_id uuid REFERENCES batiments(id);
ALTER TABLE animaux ADD COLUMN IF NOT EXISTS boucle_posee_le date;
ALTER TABLE animaux ADD COLUMN IF NOT EXISTS phase_courante text;

CREATE INDEX IF NOT EXISTS idx_animaux_portee ON animaux(portee_id);
CREATE INDEX IF NOT EXISTS idx_animaux_batiment ON animaux(batiment_id);

-- ─── 4. batiments : ration adaptative + phase ────────────────────────────────
ALTER TABLE batiments ADD COLUMN IF NOT EXISTS phase text;
ALTER TABLE batiments ADD COLUMN IF NOT EXISTS ration_kg_jour_min numeric(5,2);
ALTER TABLE batiments ADD COLUMN IF NOT EXISTS ration_kg_jour_max numeric(5,2);
ALTER TABLE batiments ADD COLUMN IF NOT EXISTS aliment_recommande text;
ALTER TABLE batiments ADD COLUMN IF NOT EXISTS notes_aliment text;

ALTER TABLE batiments DROP CONSTRAINT IF EXISTS batiments_phase_check;
ALTER TABLE batiments ADD CONSTRAINT batiments_phase_check
  CHECK ((phase IS NULL) OR (phase = ANY (ARRAY[
    'verraterie','truie_vide','truie_gestante','maternite',
    'post_sevrage','demarrage_2','croissance','finition',
    'observation','quarantaine'
  ]::text[])));

-- ─── 5. TRIGGER : mise-bas → portée auto + porcelets pré-créés ───────────────
CREATE OR REPLACE FUNCTION trg_creer_portee_apres_mise_bas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_ferme_id     uuid;
  v_verrat_id    uuid;
  v_code         text;
  v_portee_id    uuid;
  v_compteur     integer;
  v_yyyymm       text;
  i              integer;
  v_poids_moyen  numeric(5,2);
BEGIN
  -- Récupérer ferme + verrat depuis la saillie
  SELECT a.ferme_id, s.verrat_id INTO v_ferme_id, v_verrat_id
  FROM animaux a
  LEFT JOIN saillies s ON s.id = NEW.saillie_id
  WHERE a.id = NEW.truie_id;

  -- Code chronologique : P-YYYYMM-NNN
  v_yyyymm := to_char(NEW.date_mise_bas, 'YYMM');
  SELECT COALESCE(MAX(SUBSTRING(code FROM 'P-' || v_yyyymm || '-(\d+)')::int), 0) + 1
    INTO v_compteur
  FROM portees
  WHERE ferme_id = v_ferme_id AND code LIKE 'P-' || v_yyyymm || '-%';

  v_code := 'P-' || v_yyyymm || '-' || lpad(v_compteur::text, 3, '0');

  -- Créer la portée
  INSERT INTO portees (
    ferme_id, truie_id, verrat_id, mise_bas_id, bande_id,
    code, date_naissance, nb_nes_vivants, nb_nes_morts, poids_total_kg
  ) VALUES (
    v_ferme_id, NEW.truie_id, v_verrat_id, NEW.id, NEW.bande_id,
    v_code, NEW.date_mise_bas,
    COALESCE(NEW.nes_vivants, 0), COALESCE(NEW.nes_morts, 0),
    NEW.poids_portee_kg
  ) RETURNING id INTO v_portee_id;

  -- Pré-créer les porcelets (sans tag définitif, boucle posée vers J60)
  v_poids_moyen := CASE
    WHEN NEW.nes_vivants > 0 AND NEW.poids_portee_kg IS NOT NULL
    THEN ROUND(NEW.poids_portee_kg / NEW.nes_vivants, 2)
    ELSE 1.4  -- moyenne CI standard
  END;

  FOR i IN 1..COALESCE(NEW.nes_vivants, 0) LOOP
    INSERT INTO animaux (
      ferme_id, tag, sexe, categorie,
      date_naissance, date_entree, mere_id, pere_id,
      portee_id, poids_naissance_kg, poids_actuel_kg,
      statut, observations
    ) VALUES (
      v_ferme_id,
      v_code || '-' || lpad(i::text, 2, '0'),  -- ex: P-2605-001-01
      CASE WHEN i % 2 = 0 THEN 'F' ELSE 'M' END::sexe_t,  -- 50/50, sexage ajusté à J60
      'porcelet'::categorie_t,
      NEW.date_mise_bas, NEW.date_mise_bas,
      NEW.truie_id, v_verrat_id,
      v_portee_id, v_poids_moyen, v_poids_moyen,
      'actif'::statut_animal_t,
      'Porcelet portée ' || v_code || ' — boucle à poser au sexage J60'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_portee_auto_mise_bas ON mises_bas;
CREATE TRIGGER trg_portee_auto_mise_bas
AFTER INSERT ON mises_bas
FOR EACH ROW
EXECUTE FUNCTION trg_creer_portee_apres_mise_bas();

-- ─── 6. VUE fertilité TRUIES ─────────────────────────────────────────────────
DROP VIEW IF EXISTS v_fertilite_truies CASCADE;
CREATE VIEW v_fertilite_truies WITH (security_invoker = true) AS
WITH s AS (
  SELECT
    a.id AS truie_id, a.ferme_id, a.tag, a.nom,
    a.date_entree,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(a.date_naissance, a.date_entree))) AS age_annees,
    COUNT(DISTINCT sa.id) AS nb_saillies,
    COUNT(DISTINCT mb.id) AS nb_mises_bas,
    COALESCE(AVG(mb.nes_vivants), 0)::numeric(5,2) AS nes_vivants_moy,
    COALESCE(AVG(mb.nes_totaux), 0)::numeric(5,2) AS nes_totaux_moy,
    COALESCE(SUM(mb.nes_vivants), 0) AS total_nes_vivants,
    COUNT(DISTINCT CASE WHEN dg.resultat = 'retour_chaleur' THEN dg.id END) AS nb_retours_chaleur,
    MAX(mb.date_mise_bas) AS derniere_mise_bas,
    MIN(sa.date_saillie) AS premiere_saillie
  FROM animaux a
  LEFT JOIN saillies sa ON sa.truie_id = a.id AND sa.deleted_at IS NULL
  LEFT JOIN mises_bas mb ON mb.truie_id = a.id AND mb.deleted_at IS NULL
  LEFT JOIN diagnostics_gestation dg ON dg.saillie_id = sa.id
  WHERE a.categorie = 'truie' AND a.statut = 'actif' AND a.deleted_at IS NULL
  GROUP BY a.id, a.ferme_id, a.tag, a.nom, a.date_entree, a.date_naissance
)
SELECT
  truie_id, ferme_id, tag, nom, age_annees,
  nb_saillies, nb_mises_bas,
  nes_vivants_moy, nes_totaux_moy, total_nes_vivants,
  nb_retours_chaleur,
  derniere_mise_bas,
  CASE
    WHEN nb_saillies > 0
    THEN ROUND((nb_mises_bas::numeric / nb_saillies) * 100, 1)
    ELSE NULL
  END AS taux_fertilite_pct,
  -- Note de performance 0-100
  CASE
    WHEN nb_mises_bas = 0 THEN NULL
    ELSE LEAST(100,
      ROUND(
        (nes_vivants_moy / 12.0 * 60) +                    -- 60pts pour 12 vivants/portée
        (CASE WHEN nb_retours_chaleur = 0 THEN 30 ELSE GREATEST(0, 30 - nb_retours_chaleur * 10) END) +
        (CASE WHEN nb_mises_bas >= 2 THEN 10 ELSE 0 END), 0)
    )
  END AS note_perf,
  -- Suggestion réforme : critères Christophe
  CASE
    WHEN nb_mises_bas >= 8 THEN 'reformer:age_carrière'
    WHEN nb_mises_bas >= 2 AND nes_vivants_moy < 8 THEN 'reformer:productivité_basse'
    WHEN nb_retours_chaleur >= 2 THEN 'reformer:infertilité'
    WHEN nb_mises_bas >= 1 AND nes_vivants_moy >= 12 THEN 'garder:excellente'
    WHEN nb_mises_bas >= 1 AND nes_vivants_moy >= 10 THEN 'garder:correcte'
    WHEN nb_mises_bas = 0 AND nb_saillies = 0 THEN 'attente:non_saillie'
    ELSE 'observer:en_évaluation'
  END AS recommandation
FROM s
ORDER BY note_perf DESC NULLS LAST;

GRANT SELECT ON v_fertilite_truies TO authenticated;

-- ─── 7. VUE fertilité VERRATS ────────────────────────────────────────────────
DROP VIEW IF EXISTS v_fertilite_verrats CASCADE;
CREATE VIEW v_fertilite_verrats WITH (security_invoker = true) AS
WITH s AS (
  SELECT
    a.id AS verrat_id, a.ferme_id, a.tag, a.nom,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, COALESCE(a.date_naissance, a.date_entree))) AS age_annees,
    COUNT(DISTINCT sa.id) AS nb_saillies,
    COUNT(DISTINCT CASE WHEN dg.resultat = 'positif' THEN sa.id END) AS nb_saillies_fecondes,
    COUNT(DISTINCT CASE WHEN dg.resultat = 'negatif' THEN sa.id END) AS nb_saillies_neg,
    COUNT(DISTINCT CASE WHEN dg.resultat = 'retour_chaleur' THEN sa.id END) AS nb_retours,
    MAX(sa.date_saillie) AS derniere_saillie
  FROM animaux a
  LEFT JOIN saillies sa ON sa.verrat_id = a.id AND sa.deleted_at IS NULL
  LEFT JOIN diagnostics_gestation dg ON dg.saillie_id = sa.id
  WHERE a.categorie = 'verrat' AND a.statut = 'actif' AND a.deleted_at IS NULL
  GROUP BY a.id, a.ferme_id, a.tag, a.nom, a.date_entree, a.date_naissance
)
SELECT
  verrat_id, ferme_id, tag, nom, age_annees,
  nb_saillies, nb_saillies_fecondes, nb_saillies_neg, nb_retours, derniere_saillie,
  CASE
    WHEN nb_saillies > 0
    THEN ROUND((nb_saillies_fecondes::numeric / nb_saillies) * 100, 1)
    ELSE NULL
  END AS taux_fecondite_pct,
  CASE
    WHEN nb_saillies = 0 THEN NULL
    ELSE LEAST(100, ROUND((nb_saillies_fecondes::numeric / GREATEST(nb_saillies,1)) * 100, 0))
  END AS note_perf,
  CASE
    WHEN nb_saillies >= 10 AND (nb_saillies_fecondes::numeric / nb_saillies) < 0.70
      THEN 'reformer:fécondité_basse'
    WHEN age_annees >= 5 THEN 'reformer:age_carrière'
    WHEN nb_saillies >= 10 AND (nb_saillies_fecondes::numeric / nb_saillies) >= 0.85
      THEN 'garder:excellent'
    WHEN nb_saillies >= 5 AND (nb_saillies_fecondes::numeric / nb_saillies) >= 0.70
      THEN 'garder:correct'
    WHEN nb_saillies < 5 THEN 'observer:peu_de_donnees'
    ELSE 'observer:en_évaluation'
  END AS recommandation
FROM s
ORDER BY note_perf DESC NULLS LAST;

GRANT SELECT ON v_fertilite_verrats TO authenticated;

-- ─── 8. VUE ration adaptative : besoin alimentaire par bâtiment / jour ──────
DROP VIEW IF EXISTS v_batiment_ration_jour CASCADE;
CREATE VIEW v_batiment_ration_jour WITH (security_invoker = true) AS
WITH effectifs AS (
  SELECT
    b.id AS batiment_id, b.ferme_id, b.nom, b.phase, b.capacite,
    b.ration_kg_jour_min, b.ration_kg_jour_max, b.aliment_recommande,
    COUNT(a.id) FILTER (WHERE a.statut = 'actif') AS nb_sujets,
    COUNT(a.id) FILTER (WHERE a.statut = 'actif' AND a.categorie = 'truie') AS nb_truies,
    COUNT(a.id) FILTER (WHERE a.statut = 'actif' AND a.categorie = 'verrat') AS nb_verrats,
    COUNT(a.id) FILTER (WHERE a.statut = 'actif' AND a.categorie = 'porcelet') AS nb_porcelets,
    AVG(a.poids_actuel_kg) FILTER (WHERE a.statut = 'actif' AND a.poids_actuel_kg IS NOT NULL)::numeric(6,2) AS poids_moyen
  FROM batiments b
  LEFT JOIN animaux a ON a.batiment_id = b.id AND a.deleted_at IS NULL
  WHERE b.deleted_at IS NULL
  GROUP BY b.id, b.ferme_id, b.nom, b.phase, b.capacite,
           b.ration_kg_jour_min, b.ration_kg_jour_max, b.aliment_recommande
)
SELECT
  batiment_id, ferme_id, nom, phase, capacite, nb_sujets,
  nb_truies, nb_verrats, nb_porcelets, poids_moyen,
  ration_kg_jour_min, ration_kg_jour_max, aliment_recommande,
  -- Ration totale journalière (kg/jour) = effectif × ration moyenne
  ROUND(
    nb_sujets * COALESCE((ration_kg_jour_min + ration_kg_jour_max) / 2.0, 0)
  , 2) AS besoin_kg_jour_moyen,
  -- Besoin mensuel (30j)
  ROUND(
    nb_sujets * COALESCE((ration_kg_jour_min + ration_kg_jour_max) / 2.0, 0) * 30
  , 2) AS besoin_kg_30j,
  -- Taux occupation
  CASE WHEN capacite > 0
    THEN ROUND((nb_sujets::numeric / capacite) * 100, 0)
    ELSE NULL
  END AS taux_occupation_pct
FROM effectifs;

GRANT SELECT ON v_batiment_ration_jour TO authenticated;

-- ─── 9. VUE consanguinité — risque saillie père/fille ou frère/sœur ─────────
DROP VIEW IF EXISTS v_consanguinite_risque CASCADE;
CREATE VIEW v_consanguinite_risque WITH (security_invoker = true) AS
SELECT
  t.id AS truie_id, t.tag AS truie_tag, t.nom AS truie_nom,
  v.id AS verrat_id, v.tag AS verrat_tag, v.nom AS verrat_nom,
  CASE
    WHEN t.pere_id = v.id THEN 'pere_fille'
    WHEN t.mere_id IS NOT NULL AND t.mere_id = v.mere_id THEN 'demi_freres'
    WHEN t.mere_id IS NOT NULL AND t.pere_id IS NOT NULL
         AND t.mere_id = v.mere_id AND t.pere_id = v.pere_id
         THEN 'freres_complets'
    ELSE NULL
  END AS lien,
  t.ferme_id
FROM animaux t, animaux v
WHERE t.categorie = 'truie' AND t.statut = 'actif' AND t.deleted_at IS NULL
  AND v.categorie = 'verrat' AND v.statut = 'actif' AND v.deleted_at IS NULL
  AND t.ferme_id = v.ferme_id
  AND (
    t.pere_id = v.id
    OR (t.mere_id IS NOT NULL AND t.mere_id = v.mere_id)
  );

GRANT SELECT ON v_consanguinite_risque TO authenticated;

-- ─── 10. RPC : transferer_bande_phase ────────────────────────────────────────
-- Wizard transfert : marque sujets morts auto + déplace les survivants
CREATE OR REPLACE FUNCTION transferer_bande_phase(
  p_bande_id        uuid,
  p_phase_apres     text,
  p_batiment_apres  uuid,
  p_sujets_present  uuid[],      -- IDs des animaux confirmés présents
  p_poids_observes  jsonb        -- {"animal_id": poids_kg, ...} optionnel
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_ferme_id      uuid;
  v_phase_avant   text;
  v_bat_avant     uuid;
  v_nb_avant      integer;
  v_nb_morts      integer;
  v_nb_males      integer;
  v_nb_femelles   integer;
  v_poids_moy_m   numeric(6,2);
  v_poids_moy_f   numeric(6,2);
  v_animal        record;
BEGIN
  -- Récupérer contexte bande
  SELECT ferme_id, phase_courante INTO v_ferme_id, v_phase_avant
  FROM bandes WHERE id = p_bande_id;

  IF v_ferme_id IS NULL THEN
    RAISE EXCEPTION 'Bande introuvable: %', p_bande_id;
  END IF;

  -- Compter effectif avant transit
  SELECT COUNT(*) INTO v_nb_avant
  FROM bande_animaux ba
  JOIN animaux a ON a.id = ba.animal_id
  WHERE ba.bande_id = p_bande_id
    AND ba.date_sortie IS NULL
    AND a.statut = 'actif' AND a.deleted_at IS NULL;

  v_nb_morts := v_nb_avant - array_length(p_sujets_present, 1);

  -- Marquer les sujets manquants comme morts (présumés)
  FOR v_animal IN
    SELECT a.id, a.tag
    FROM bande_animaux ba
    JOIN animaux a ON a.id = ba.animal_id
    WHERE ba.bande_id = p_bande_id
      AND ba.date_sortie IS NULL
      AND a.statut = 'actif' AND a.deleted_at IS NULL
      AND a.id <> ALL(p_sujets_present)
  LOOP
    UPDATE animaux
      SET statut = 'mort'::statut_animal_t,
          observations = COALESCE(observations,'') || ' [Mort présumé au transit ' || CURRENT_DATE || ']'
      WHERE id = v_animal.id;
    INSERT INTO mortalites (ferme_id, animal_id, date_mort, cause)
      VALUES (v_ferme_id, v_animal.id, CURRENT_DATE, 'Transfert phase — absent lors comptage')
      ON CONFLICT DO NOTHING;
  END LOOP;

  -- Mettre à jour poids actuels des sujets présents
  IF p_poids_observes IS NOT NULL THEN
    UPDATE animaux a
      SET poids_actuel_kg = (p_poids_observes->>a.id::text)::numeric
      WHERE a.id = ANY(p_sujets_present)
        AND p_poids_observes ? a.id::text;
  END IF;

  -- Déplacer les sujets présents vers nouveau bâtiment + phase
  UPDATE animaux
    SET batiment_id = p_batiment_apres,
        phase_courante = p_phase_apres
    WHERE id = ANY(p_sujets_present);

  -- Stats transit
  SELECT
    COUNT(*) FILTER (WHERE sexe = 'M'),
    COUNT(*) FILTER (WHERE sexe = 'F'),
    AVG(poids_actuel_kg) FILTER (WHERE sexe = 'M')::numeric(6,2),
    AVG(poids_actuel_kg) FILTER (WHERE sexe = 'F')::numeric(6,2)
  INTO v_nb_males, v_nb_femelles, v_poids_moy_m, v_poids_moy_f
  FROM animaux
  WHERE id = ANY(p_sujets_present);

  -- Enregistrer dans transits_phase
  INSERT INTO transits_phase (
    ferme_id, bande_id, phase_avant, phase_apres, date_transit,
    nb_males, nb_femelles, poids_moyen_m_kg, poids_moyen_f_kg,
    observations
  ) VALUES (
    v_ferme_id, p_bande_id, COALESCE(v_phase_avant, 'inconnu'), p_phase_apres, CURRENT_DATE,
    v_nb_males, v_nb_femelles, v_poids_moy_m, v_poids_moy_f,
    CASE WHEN v_nb_morts > 0
      THEN format('Transit avec %s morts présumés', v_nb_morts)
      ELSE 'Transit complet sans perte'
    END
  );

  -- Mettre à jour la bande
  UPDATE bandes
    SET phase_courante = p_phase_apres
    WHERE id = p_bande_id;

  RETURN jsonb_build_object(
    'ok', true,
    'nb_transferes', array_length(p_sujets_present, 1),
    'nb_morts', v_nb_morts,
    'phase_apres', p_phase_apres
  );
END;
$$;

GRANT EXECUTE ON FUNCTION transferer_bande_phase(uuid, text, uuid, uuid[], jsonb) TO authenticated;

-- ─── 11. RPC : poser_boucle (sexage J60) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION poser_boucle_porcelet(
  p_animal_id uuid,
  p_tag_definitif text,
  p_sexe_confirme text DEFAULT NULL,
  p_poids_kg numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_ok boolean;
BEGIN
  UPDATE animaux
    SET tag = p_tag_definitif,
        sexe = COALESCE(p_sexe_confirme::sexe_t, sexe),
        poids_actuel_kg = COALESCE(p_poids_kg, poids_actuel_kg),
        boucle_posee_le = CURRENT_DATE,
        observations = COALESCE(observations,'') || ' [Boucle posée ' || CURRENT_DATE || ']'
    WHERE id = p_animal_id
    RETURNING true INTO v_ok;
  RETURN jsonb_build_object('ok', COALESCE(v_ok, false), 'tag', p_tag_definitif);
END;
$$;

GRANT EXECUTE ON FUNCTION poser_boucle_porcelet(uuid, text, text, numeric) TO authenticated;

-- ─── 12. TRIGGER seed_nouvelle_ferme : 10 bâtiments standards ─────────────────
CREATE OR REPLACE FUNCTION trg_seed_batiments_ferme()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Si bâtiments déjà existants pour cette ferme, on skip
  IF EXISTS (SELECT 1 FROM batiments WHERE ferme_id = NEW.id LIMIT 1) THEN
    RETURN NEW;
  END IF;

  INSERT INTO batiments (ferme_id, nom, type, phase, capacite, ration_kg_jour_min, ration_kg_jour_max, aliment_recommande, notes_aliment) VALUES
    (NEW.id, 'Verraterie',         'verraterie',   'verraterie',   8,   2.0, 2.5,
     'Aliment Croissance maison (mais 60% + Maridav Croissance 5%)',
     'Augmenter à 3 kg/j en monte ou prélèvement de semence'),
    (NEW.id, 'Truies vides',       'gestation',    'truie_vide',   30,  2.5, 3.0,
     'Aliment Truie gestante (mais 58% + Maridav Truie 5%)',
     'Flushing 7-10j avant insémination pour stimuler chaleurs'),
    (NEW.id, 'Truies gestantes',   'gestation',    'truie_gestante', 60, 3.0, 3.5,
     'Aliment Truie gestante (mais 58-61% + Maridav Truie 5% + son blé)',
     '+0.5 kg/j les 3 dernières semaines avant mise-bas'),
    (NEW.id, 'Maternité',          'maternité',    'maternite',    120, 4.5, 6.0,
     'Aliment Truie allaitante (mais 58-67% + Maridav Truie 5% + Vitalac Truie 1.5%)',
     'Base 4.5-5 kg pour 10 porcelets, +0.3 kg/j par porcelet supplémentaire'),
    (NEW.id, 'Post-sevrage / Démarrage 1', 'post-sevrage', 'post_sevrage', 300, 0.6, 1.2,
     'Pré-starter Romelko (DE HEUS) ou Ecolac (VITALAC)',
     'Sevrage J28 → 2 mois. Transit Démarrage 2 vers 15 kg'),
    (NEW.id, 'Démarrage 2',        'demarrage',    'demarrage_2',  300, 1.2, 1.8,
     'Aliment Démarrage (mais 75% + Maridav Démarrage 5% + lysine)',
     '15-25 kg. Transit Croissance dès atteinte 25 kg (tolérance 24)'),
    (NEW.id, 'Croissance',         'croissance',   'croissance',   400, 1.5, 2.5,
     'Aliment Croissance (mais 68-72% + KPC 5% ou Maridav Croissance 5%)',
     '25-65 kg. Ration progressive selon poids (1.2→2.5 kg/j)'),
    (NEW.id, 'Finition',           'finition',     'finition',     400, 2.5, 3.0,
     'Aliment Finition (mais 67-70% + Maridav Croissance 5% + son blé 15%)',
     '65-100 kg. Objectif abattage à 100 kg vers 6 mois'),
    (NEW.id, 'Observation',        'observation',  'observation',   30, 0.0, 0.0,
     'Aliment selon stade du sujet placé',
     'Booster porcelets en retard de croissance / récupération post-maladie'),
    (NEW.id, 'Quarantaine',        'quarantaine',  'quarantaine',   20, 0.0, 0.0,
     'Aliment selon stade du sujet placé',
     'Isolement sujets malades, nouveaux entrants, observation 21j');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_nouvelle_ferme ON fermes;
CREATE TRIGGER trg_seed_nouvelle_ferme
AFTER INSERT ON fermes
FOR EACH ROW EXECUTE FUNCTION trg_seed_batiments_ferme();

-- ─── 13. UPGRADE bâtiments Smart Farm CI-01 (existante) ──────────────────────
-- Phase 1 : renommer Post-sevrage existant + ajouter colonnes ration
DO $$
DECLARE
  v_ferme_id uuid := '3b350176-d45c-4fea-a67e-eae4a5714aa3';
BEGIN
  -- Renommer Post-sevrage → "Post-sevrage / Démarrage 1" + set capacité 300
  UPDATE batiments
    SET nom = 'Post-sevrage / Démarrage 1',
        phase = 'post_sevrage',
        capacite = 300,
        ration_kg_jour_min = 0.6, ration_kg_jour_max = 1.2,
        aliment_recommande = 'Pré-starter Romelko (DE HEUS) ou Ecolac (VITALAC)',
        notes_aliment = 'Sevrage J28 → 2 mois. Transit Démarrage 2 vers 15 kg'
    WHERE ferme_id = v_ferme_id AND type = 'post-sevrage' AND deleted_at IS NULL;

  -- Update Verraterie
  UPDATE batiments
    SET phase = 'verraterie', capacite = 8,
        ration_kg_jour_min = 2.0, ration_kg_jour_max = 2.5,
        aliment_recommande = 'Aliment Croissance maison (mais 60% + Maridav Croissance 5%)',
        notes_aliment = 'Augmenter à 3 kg/j en monte ou prélèvement de semence'
    WHERE ferme_id = v_ferme_id AND type = 'verraterie' AND deleted_at IS NULL;

  -- Split Gestation existant → garder en "Truies gestantes" + créer "Truies vides"
  UPDATE batiments
    SET nom = 'Truies gestantes', phase = 'truie_gestante', capacite = 60,
        ration_kg_jour_min = 3.0, ration_kg_jour_max = 3.5,
        aliment_recommande = 'Aliment Truie gestante (mais 58-61% + Maridav Truie 5%)',
        notes_aliment = '+0.5 kg/j les 3 dernières semaines avant mise-bas'
    WHERE ferme_id = v_ferme_id AND type = 'gestation' AND deleted_at IS NULL;

  -- Maternité
  UPDATE batiments
    SET phase = 'maternite', capacite = 120,
        ration_kg_jour_min = 4.5, ration_kg_jour_max = 6.0,
        aliment_recommande = 'Aliment Truie allaitante (Maridav Truie 5% + Vitalac Truie 1.5%)',
        notes_aliment = 'Base 4.5-5 kg pour 10 porcelets, +0.3 kg/j par porcelet sup.'
    WHERE ferme_id = v_ferme_id AND type = 'maternité' AND deleted_at IS NULL;

  -- Engraissement existant → "Croissance"
  UPDATE batiments
    SET nom = 'Croissance', type = 'croissance', phase = 'croissance', capacite = 400,
        ration_kg_jour_min = 1.5, ration_kg_jour_max = 2.5,
        aliment_recommande = 'Aliment Croissance (KPC 5% ou Maridav Croissance 5%)',
        notes_aliment = '25-65 kg. Ration progressive selon poids'
    WHERE ferme_id = v_ferme_id AND type = 'engraissement' AND deleted_at IS NULL;

  -- Créer bâtiments manquants
  INSERT INTO batiments (ferme_id, nom, type, phase, capacite, ration_kg_jour_min, ration_kg_jour_max, aliment_recommande, notes_aliment)
  VALUES
    (v_ferme_id, 'Truies vides', 'gestation', 'truie_vide', 30, 2.5, 3.0,
     'Aliment Truie gestante (mais 58% + Maridav Truie 5%)',
     'Flushing 7-10j avant insémination'),
    (v_ferme_id, 'Démarrage 2', 'demarrage', 'demarrage_2', 300, 1.2, 1.8,
     'Aliment Démarrage (mais 75% + Maridav Démarrage 5% + lysine)',
     '15-25 kg. Transit Croissance dès atteinte 25 kg'),
    (v_ferme_id, 'Finition', 'finition', 'finition', 400, 2.5, 3.0,
     'Aliment Finition (mais 67-70% + Maridav Croissance 5%)',
     '65-100 kg. Objectif abattage à 100 kg vers 6 mois'),
    (v_ferme_id, 'Observation', 'observation', 'observation', 30, 0.0, 0.0,
     'Aliment selon stade', 'Booster porcelets en retard de croissance'),
    (v_ferme_id, 'Quarantaine', 'quarantaine', 'quarantaine', 20, 0.0, 0.0,
     'Aliment selon stade', 'Isolement 21j sujets malades / nouveaux entrants')
  ON CONFLICT DO NOTHING;

  -- Assigner cheptel existant aux bâtiments adaptés
  -- Truies → Truies gestantes (par défaut, on précisera plus tard via UI)
  UPDATE animaux SET batiment_id = (SELECT id FROM batiments WHERE ferme_id = v_ferme_id AND nom = 'Truies gestantes')
    WHERE ferme_id = v_ferme_id AND categorie = 'truie' AND batiment_id IS NULL AND deleted_at IS NULL;
  -- Verrats → Verraterie
  UPDATE animaux SET batiment_id = (SELECT id FROM batiments WHERE ferme_id = v_ferme_id AND nom = 'Verraterie')
    WHERE ferme_id = v_ferme_id AND categorie = 'verrat' AND batiment_id IS NULL AND deleted_at IS NULL;
  -- Porcelets BD2 → Démarrage 2
  UPDATE animaux SET batiment_id = (SELECT id FROM batiments WHERE ferme_id = v_ferme_id AND nom = 'Démarrage 2'),
                     phase_courante = 'demarrage_2'
    WHERE ferme_id = v_ferme_id AND categorie = 'porcelet' AND batiment_id IS NULL AND deleted_at IS NULL;
END $$;

-- ─── 14. CATALOGUE ALIMENTS CI (matieres_premieres) ──────────────────────────
-- Audit schema matieres_premieres
DO $$
DECLARE
  v_ferme_id uuid := '3b350176-d45c-4fea-a67e-eae4a5714aa3';
  v_has_cols boolean;
BEGIN
  -- Vérifier colonnes existantes
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='matieres_premieres' AND column_name='fournisseur'
  ) INTO v_has_cols;

  IF NOT v_has_cols THEN
    ALTER TABLE matieres_premieres ADD COLUMN IF NOT EXISTS fournisseur text;
    ALTER TABLE matieres_premieres ADD COLUMN IF NOT EXISTS prix_xof_sac numeric(10,2);
    ALTER TABLE matieres_premieres ADD COLUMN IF NOT EXISTS poids_sac_kg numeric(6,2);
    ALTER TABLE matieres_premieres ADD COLUMN IF NOT EXISTS categorie_aliment text;
    ALTER TABLE matieres_premieres ADD COLUMN IF NOT EXISTS phase_cible text;
  END IF;
END $$;

-- Note : on ne seed pas matieres_premieres ici car le schéma peut varier.
-- Le seed du catalogue se fait dans un script séparé après audit.

COMMIT;
