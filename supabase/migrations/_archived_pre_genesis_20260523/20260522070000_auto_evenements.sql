-- =============================================================
-- Sprint A SA-C : Auto-création événements protocoles
-- Triggers PL/pgSQL + backfill données existantes
-- =============================================================
BEGIN;

-- -------------------------------------------------------------
-- Étendre le CHECK constraint type_evenement pour accepter
-- les nouveaux types auto-créés par les triggers.
-- -------------------------------------------------------------
ALTER TABLE evenements_prevus
  DROP CONSTRAINT IF EXISTS evenements_prevus_type_evenement_check;

ALTER TABLE evenements_prevus
  ADD CONSTRAINT evenements_prevus_type_evenement_check
  CHECK (type_evenement = ANY (ARRAY[
    -- types historiques
    'mise_bas_prevue',
    'transfert_maternite',
    'sevrage_prevu',
    'diagnostic_gestation_15j',
    'diagnostic_gestation_28j',
    'tarissement',
    'rappel_vaccinal',
    'depart_engraissement',
    -- protocole cochettes
    'vaccin_parvo_lepto_cochette_j70',
    'vaccin_parvo_lepto_cochette_j91',
    'vaccin_rouget_cochette_j150',
    'vaccin_erysipele_parvo_j165',
    'vermifuge_cochette_j165',
    -- actes porcelets
    'fer_dextran_porcelets_j1',
    'castration_porcelets_j5',
    'vaccin_mycoplasma_primo_j14',
    'vaccin_mycoplasma_rappel_j28',
    'sevrage_j28',
    -- truie pré-MB
    'vermifuge_truie_pre_mb',
    'vaccin_erysipele_parvo_truie_pre_mb'
  ]));

-- -------------------------------------------------------------
-- Helper : insert event si pas déjà présent (idempotent)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION ensure_evenement_prevu(
  p_ferme_id uuid,
  p_type_evenement text,
  p_date_prevue date,
  p_animal_id uuid DEFAULT NULL,
  p_bande_id uuid DEFAULT NULL,
  p_saillie_id uuid DEFAULT NULL,
  p_mise_bas_id uuid DEFAULT NULL,
  p_priorite integer DEFAULT 2,
  p_notes text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Évite doublons : mêmes type + date + cible (NULL-safe)
  SELECT id INTO v_id FROM evenements_prevus
  WHERE ferme_id = p_ferme_id
    AND type_evenement = p_type_evenement
    AND date_prevue   = p_date_prevue
    AND COALESCE(animal_id::text, '')   = COALESCE(p_animal_id::text, '')
    AND COALESCE(bande_id::text, '')    = COALESCE(p_bande_id::text, '')
    AND COALESCE(saillie_id::text, '')  = COALESCE(p_saillie_id::text, '')
    AND COALESCE(mise_bas_id::text, '') = COALESCE(p_mise_bas_id::text, '')
    AND statut IN ('planifie','retard')
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO evenements_prevus (
      ferme_id, type_evenement, date_prevue,
      animal_id, bande_id, saillie_id, mise_bas_id,
      statut, priorite, notes
    ) VALUES (
      p_ferme_id, p_type_evenement, p_date_prevue,
      p_animal_id, p_bande_id, p_saillie_id, p_mise_bas_id,
      'planifie', p_priorite, p_notes
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- -------------------------------------------------------------
-- Trigger 1 : cochettes → protocole vaccinal complet
-- J70 Parvo+Lepto primo, J91 rappel, J150 Rouget,
-- J165 Erysipèle+Parvo + Vermifuge pré-saillie
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_cochette_protocole() RETURNS trigger AS $$
BEGIN
  IF NEW.categorie = 'cochette'
     AND NEW.date_naissance IS NOT NULL
     AND NEW.ferme_id IS NOT NULL
     AND NEW.deleted_at IS NULL THEN

    PERFORM ensure_evenement_prevu(NEW.ferme_id, 'vaccin_parvo_lepto_cochette_j70',
      NEW.date_naissance + 70,  NEW.id, NULL, NULL, NULL, 1,
      'Auto : protocole cochettes J70 (Parvo+Lepto primo)');
    PERFORM ensure_evenement_prevu(NEW.ferme_id, 'vaccin_parvo_lepto_cochette_j91',
      NEW.date_naissance + 91,  NEW.id, NULL, NULL, NULL, 1,
      'Auto : rappel J21 post primo');
    PERFORM ensure_evenement_prevu(NEW.ferme_id, 'vaccin_rouget_cochette_j150',
      NEW.date_naissance + 150, NEW.id, NULL, NULL, NULL, 1,
      'Auto : Rouget cochette J150');
    PERFORM ensure_evenement_prevu(NEW.ferme_id, 'vaccin_erysipele_parvo_j165',
      NEW.date_naissance + 165, NEW.id, NULL, NULL, NULL, 1,
      'Auto : Erysipèle + Parvo pré-saillie J165');
    PERFORM ensure_evenement_prevu(NEW.ferme_id, 'vermifuge_cochette_j165',
      NEW.date_naissance + 165, NEW.id, NULL, NULL, NULL, 2,
      'Auto : Vermifuge pré-saillie J165');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_animal_cochette ON animaux;
CREATE TRIGGER trg_animal_cochette
AFTER INSERT OR UPDATE OF categorie, date_naissance ON animaux
FOR EACH ROW EXECUTE FUNCTION trg_cochette_protocole();

-- -------------------------------------------------------------
-- Trigger 2 : mise-bas → actes porcelets obligatoires
-- J1 Fer, J5 Castration, J14 Mycoplasma primo, J28 rappel, J28 Sevrage
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_mise_bas_porcelets() RETURNS trigger AS $$
DECLARE
  v_ferme uuid;
BEGIN
  -- mises_bas n'a pas ferme_id → on récupère via la truie
  SELECT ferme_id INTO v_ferme FROM animaux WHERE id = NEW.truie_id;
  IF v_ferme IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM ensure_evenement_prevu(v_ferme, 'fer_dextran_porcelets_j1',
    NEW.date_mise_bas + 1,  NULL, NEW.bande_id, NULL, NEW.id, 1,
    'Auto : Fer dextran porcelets J1');
  PERFORM ensure_evenement_prevu(v_ferme, 'castration_porcelets_j5',
    NEW.date_mise_bas + 5,  NULL, NEW.bande_id, NULL, NEW.id, 2,
    'Auto : Castration mâles J5');
  PERFORM ensure_evenement_prevu(v_ferme, 'vaccin_mycoplasma_primo_j14',
    NEW.date_mise_bas + 14, NULL, NEW.bande_id, NULL, NEW.id, 1,
    'Auto : Mycoplasma primo J14');
  PERFORM ensure_evenement_prevu(v_ferme, 'vaccin_mycoplasma_rappel_j28',
    NEW.date_mise_bas + 28, NULL, NEW.bande_id, NULL, NEW.id, 1,
    'Auto : Mycoplasma rappel J28');
  PERFORM ensure_evenement_prevu(v_ferme, 'sevrage_j28',
    NEW.date_mise_bas + 28, NULL, NEW.bande_id, NULL, NEW.id, 1,
    'Auto : Sevrage prévu J28');

  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mise_bas_porcelets ON mises_bas;
CREATE TRIGGER trg_mise_bas_porcelets
AFTER INSERT ON mises_bas
FOR EACH ROW EXECUTE FUNCTION trg_mise_bas_porcelets();

-- -------------------------------------------------------------
-- Trigger 3 : diagnostic gestation positif → vermifuge + vaccin truie pré-MB
-- Vermifuge J-14 (saillie+100), Erysipèle+Parvo ~3sem avant MB (saillie+93)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_diag_pos_truie_pre_mb() RETURNS trigger AS $$
DECLARE
  v_date_saillie date;
  v_truie_id     uuid;
  v_ferme_id     uuid;
BEGIN
  IF NEW.resultat = 'positif' THEN
    SELECT s.date_saillie, s.truie_id, s.ferme_id
      INTO v_date_saillie, v_truie_id, v_ferme_id
    FROM saillies s
    WHERE s.id = NEW.saillie_id;

    IF v_date_saillie IS NULL OR v_ferme_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Vermifuge truie 14j avant MB attendue (saillie + 100)
    PERFORM ensure_evenement_prevu(v_ferme_id, 'vermifuge_truie_pre_mb',
      v_date_saillie + 100, v_truie_id, NULL, NEW.saillie_id, NULL, 1,
      'Auto : Vermifuge truie J-14 pré-MB (INRAE)');
    -- Erysipèle + Parvo truie ~3 sem avant MB (saillie + 93)
    PERFORM ensure_evenement_prevu(v_ferme_id, 'vaccin_erysipele_parvo_truie_pre_mb',
      v_date_saillie + 93, v_truie_id, NULL, NEW.saillie_id, NULL, 1,
      'Auto : Erysipèle+Parvo truie 3 sem avant MB');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_diag_pos_truie ON diagnostics_gestation;
CREATE TRIGGER trg_diag_pos_truie
AFTER INSERT ON diagnostics_gestation
FOR EACH ROW EXECUTE FUNCTION trg_diag_pos_truie_pre_mb();

-- =============================================================
-- BACKFILL : appliquer aux données existantes
-- =============================================================

-- Cochettes existantes
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT * FROM animaux
    WHERE categorie='cochette' AND deleted_at IS NULL AND date_naissance IS NOT NULL
  LOOP
    PERFORM ensure_evenement_prevu(r.ferme_id, 'vaccin_parvo_lepto_cochette_j70',
      r.date_naissance + 70,  r.id, NULL, NULL, NULL, 1,
      'Backfill : protocole cochette J70');
    PERFORM ensure_evenement_prevu(r.ferme_id, 'vaccin_parvo_lepto_cochette_j91',
      r.date_naissance + 91,  r.id, NULL, NULL, NULL, 1,
      'Backfill : rappel J21');
    PERFORM ensure_evenement_prevu(r.ferme_id, 'vaccin_rouget_cochette_j150',
      r.date_naissance + 150, r.id, NULL, NULL, NULL, 1,
      'Backfill : Rouget J150');
    PERFORM ensure_evenement_prevu(r.ferme_id, 'vaccin_erysipele_parvo_j165',
      r.date_naissance + 165, r.id, NULL, NULL, NULL, 1,
      'Backfill : Erysipèle+Parvo J165');
    PERFORM ensure_evenement_prevu(r.ferme_id, 'vermifuge_cochette_j165',
      r.date_naissance + 165, r.id, NULL, NULL, NULL, 2,
      'Backfill : Vermifuge J165');
  END LOOP;
END $$;

-- Mises-bas existantes
DO $$
DECLARE
  r       record;
  v_ferme uuid;
BEGIN
  FOR r IN SELECT * FROM mises_bas WHERE deleted_at IS NULL LOOP
    SELECT ferme_id INTO v_ferme FROM animaux WHERE id = r.truie_id;
    IF v_ferme IS NOT NULL THEN
      PERFORM ensure_evenement_prevu(v_ferme, 'fer_dextran_porcelets_j1',
        r.date_mise_bas + 1,  NULL, r.bande_id, NULL, r.id, 1,
        'Backfill : Fer J1');
      PERFORM ensure_evenement_prevu(v_ferme, 'castration_porcelets_j5',
        r.date_mise_bas + 5,  NULL, r.bande_id, NULL, r.id, 2,
        'Backfill : Castration J5');
      PERFORM ensure_evenement_prevu(v_ferme, 'vaccin_mycoplasma_primo_j14',
        r.date_mise_bas + 14, NULL, r.bande_id, NULL, r.id, 1,
        'Backfill : Mycoplasma primo J14');
      PERFORM ensure_evenement_prevu(v_ferme, 'vaccin_mycoplasma_rappel_j28',
        r.date_mise_bas + 28, NULL, r.bande_id, NULL, r.id, 1,
        'Backfill : Mycoplasma rappel J28');
      PERFORM ensure_evenement_prevu(v_ferme, 'sevrage_j28',
        r.date_mise_bas + 28, NULL, r.bande_id, NULL, r.id, 1,
        'Backfill : Sevrage J28');
    END IF;
  END LOOP;
END $$;

-- Diagnostics gestation positifs existants
DO $$
DECLARE
  r              record;
  v_date_saillie date;
  v_truie_id     uuid;
  v_ferme_id     uuid;
BEGIN
  FOR r IN SELECT * FROM diagnostics_gestation WHERE resultat='positif' LOOP
    SELECT s.date_saillie, s.truie_id, s.ferme_id
      INTO v_date_saillie, v_truie_id, v_ferme_id
    FROM saillies s WHERE s.id = r.saillie_id;

    IF v_date_saillie IS NOT NULL AND v_ferme_id IS NOT NULL THEN
      PERFORM ensure_evenement_prevu(v_ferme_id, 'vermifuge_truie_pre_mb',
        v_date_saillie + 100, v_truie_id, NULL, r.saillie_id, NULL, 1,
        'Backfill : Vermifuge truie pré-MB');
      PERFORM ensure_evenement_prevu(v_ferme_id, 'vaccin_erysipele_parvo_truie_pre_mb',
        v_date_saillie + 93,  v_truie_id, NULL, r.saillie_id, NULL, 1,
        'Backfill : Erysipèle+Parvo truie pré-MB');
    END IF;
  END LOOP;
END $$;

COMMIT;
