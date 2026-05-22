# Brief SA-C — Auto-création événements protocoles (cochettes + porcelets + truies)

## Périmètre
✅ Touche : 1 migration SQL (triggers PL/pgSQL + backfill)
❌ Pas : UI, autres modules. Pas `npm run build`.

## Contexte
Lis CONTEXT.md + CLAUDE.md d'abord.

Audit a noté : protocoles vaccinaux complets en BDD (12 protocoles + 4 cochettes), mais **aucune création automatique d'événements** dans `evenements_prevus` quand un animal arrive en cheptel ou quand une saillie/MB est enregistrée. Résultat : éleveur doit deviner les dates.

## Mission

Créer des triggers Postgres qui auto-créent les événements attendus.

### Logique des triggers

| Trigger | Déclencheur | Crée événements |
|---|---|---|
| **trg_animal_cochette** | INSERT animaux WHERE categorie='cochette' | Vaccin Parvo+Lepto J70, Rouget J150, Erysipèle J165, Vermifuge J165 (depuis date_naissance) |
| **trg_porcelet_nes** | INSERT mises_bas | Fer J1, Castration J5, Mycoplasma primo J14, Mycoplasma rappel J28, Sevrage J28 (depuis date_mise_bas, sur bande_id) |
| **trg_truie_pre_mb** | INSERT diagnostics_gestation WHERE resultat='positif' | Vermifuge truie 14j avant MB (saillie+100j), Vaccin Erysipèle+Parvo 2-3 sem avant MB (saillie+95j) |
| **trg_truie_sevrage** | INSERT sevrages | Programmer diagnostic gestation J21 post-saillie suivante (sera attaché à saillie quand elle aura lieu) — SKIP, trop spéculatif |

### Migration SQL

Fichier : `supabase/migrations/20260522070000_auto_evenements.sql`

```sql
BEGIN;

-- Helper : insert event si pas déjà présent (idempotent)
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
  -- Évite doublons : mêmes type + date + cible
  SELECT id INTO v_id FROM evenements_prevus
  WHERE ferme_id = p_ferme_id
    AND type_evenement = p_type_evenement
    AND date_prevue = p_date_prevue
    AND COALESCE(animal_id::text, '')   = COALESCE(p_animal_id::text, '')
    AND COALESCE(bande_id::text, '')    = COALESCE(p_bande_id::text, '')
    AND COALESCE(saillie_id::text, '')  = COALESCE(p_saillie_id::text, '')
    AND COALESCE(mise_bas_id::text, '') = COALESCE(p_mise_bas_id::text, '')
    AND statut IN ('planifie','en_cours')
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO evenements_prevus (ferme_id, type_evenement, date_prevue, animal_id, bande_id, saillie_id, mise_bas_id, statut, priorite, notes)
    VALUES (p_ferme_id, p_type_evenement, p_date_prevue, p_animal_id, p_bande_id, p_saillie_id, p_mise_bas_id, 'planifie', p_priorite, p_notes)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END $$ LANGUAGE plpgsql;

-- Trigger 1 : cochettes — programme protocole vaccinal complet
CREATE OR REPLACE FUNCTION trg_cochette_protocole() RETURNS trigger AS $$
BEGIN
  IF NEW.categorie = 'cochette' AND NEW.date_naissance IS NOT NULL THEN
    PERFORM ensure_evenement_prevu(NEW.ferme_id, 'vaccin_parvo_lepto_cochette_j70', NEW.date_naissance + 70, NEW.id, NULL, NULL, NULL, 1, 'Auto : protocole cochettes J70 (Parvo+Lepto primo)');
    PERFORM ensure_evenement_prevu(NEW.ferme_id, 'vaccin_parvo_lepto_cochette_j91', NEW.date_naissance + 91, NEW.id, NULL, NULL, NULL, 1, 'Auto : rappel J21 post primo');
    PERFORM ensure_evenement_prevu(NEW.ferme_id, 'vaccin_rouget_cochette_j150',    NEW.date_naissance + 150, NEW.id, NULL, NULL, NULL, 1, 'Auto : Rouget cochette J150');
    PERFORM ensure_evenement_prevu(NEW.ferme_id, 'vaccin_erysipele_parvo_j165',    NEW.date_naissance + 165, NEW.id, NULL, NULL, NULL, 1, 'Auto : Erysipèle + Parvo pré-saillie J165');
    PERFORM ensure_evenement_prevu(NEW.ferme_id, 'vermifuge_cochette_j165',         NEW.date_naissance + 165, NEW.id, NULL, NULL, NULL, 2, 'Auto : Vermifuge pré-saillie J165');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_animal_cochette ON animaux;
CREATE TRIGGER trg_animal_cochette
AFTER INSERT OR UPDATE OF categorie, date_naissance ON animaux
FOR EACH ROW EXECUTE FUNCTION trg_cochette_protocole();

-- Trigger 2 : porcelets nés — programme actes obligatoires
CREATE OR REPLACE FUNCTION trg_mise_bas_porcelets() RETURNS trigger AS $$
DECLARE
  v_ferme uuid;
BEGIN
  -- Récupère ferme_id via la truie (mises_bas n'a pas ferme_id)
  SELECT ferme_id INTO v_ferme FROM animaux WHERE id = NEW.truie_id;
  IF v_ferme IS NULL THEN RETURN NEW; END IF;

  PERFORM ensure_evenement_prevu(v_ferme, 'fer_dextran_porcelets_j1',       NEW.date_mise_bas + 1,  NULL, NEW.bande_id, NULL, NEW.id, 1, 'Auto : Fer dextran porcelets J1');
  PERFORM ensure_evenement_prevu(v_ferme, 'castration_porcelets_j5',         NEW.date_mise_bas + 5,  NULL, NEW.bande_id, NULL, NEW.id, 2, 'Auto : Castration mâles J5');
  PERFORM ensure_evenement_prevu(v_ferme, 'vaccin_mycoplasma_primo_j14',     NEW.date_mise_bas + 14, NULL, NEW.bande_id, NULL, NEW.id, 1, 'Auto : Mycoplasma primo J14');
  PERFORM ensure_evenement_prevu(v_ferme, 'vaccin_mycoplasma_rappel_j28',    NEW.date_mise_bas + 28, NULL, NEW.bande_id, NULL, NEW.id, 1, 'Auto : Mycoplasma rappel J28');
  PERFORM ensure_evenement_prevu(v_ferme, 'sevrage_j28',                     NEW.date_mise_bas + 28, NULL, NEW.bande_id, NULL, NEW.id, 1, 'Auto : Sevrage prévu J28');

  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mise_bas_porcelets ON mises_bas;
CREATE TRIGGER trg_mise_bas_porcelets
AFTER INSERT ON mises_bas
FOR EACH ROW EXECUTE FUNCTION trg_mise_bas_porcelets();

-- Trigger 3 : diagnostic gestation positif → programme vermifuge + vaccin truie pré-MB
CREATE OR REPLACE FUNCTION trg_diag_pos_truie_pre_mb() RETURNS trigger AS $$
DECLARE
  v_saillie record;
  v_ferme uuid;
BEGIN
  IF NEW.resultat = 'positif' THEN
    SELECT s.date_saillie, s.truie_id, s.ferme_id INTO v_saillie
    FROM saillies s WHERE s.id = NEW.saillie_id;

    IF v_saillie IS NULL THEN RETURN NEW; END IF;
    v_ferme := v_saillie.ferme_id;

    -- MB attendue = saillie + 114, vermifuge J-14 = saillie + 100
    PERFORM ensure_evenement_prevu(v_ferme, 'vermifuge_truie_pre_mb', v_saillie.date_saillie + 100, v_saillie.truie_id, NULL, NEW.saillie_id, NULL, 1, 'Auto : Vermifuge truie J-14 pré-MB (INRAE)');
    -- Erysipèle + Parvo truie pré-MB (~3 sem avant) = saillie + 93
    PERFORM ensure_evenement_prevu(v_ferme, 'vaccin_erysipele_parvo_truie_pre_mb', v_saillie.date_saillie + 93, v_saillie.truie_id, NULL, NEW.saillie_id, NULL, 1, 'Auto : Erysipèle+Parvo truie 3 sem avant MB');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_diag_pos_truie ON diagnostics_gestation;
CREATE TRIGGER trg_diag_pos_truie
AFTER INSERT ON diagnostics_gestation
FOR EACH ROW EXECUTE FUNCTION trg_diag_pos_truie_pre_mb();

-- =============================================================
-- BACKFILL : appliquer aux données EXISTANTES
-- =============================================================

-- Cochettes existantes (en simulant l'insert via UPDATE noop)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM animaux WHERE categorie='cochette' AND deleted_at IS NULL AND date_naissance IS NOT NULL LOOP
    PERFORM ensure_evenement_prevu(r.ferme_id, 'vaccin_parvo_lepto_cochette_j70', r.date_naissance + 70, r.id, NULL, NULL, NULL, 1, 'Backfill : protocole cochette J70');
    PERFORM ensure_evenement_prevu(r.ferme_id, 'vaccin_parvo_lepto_cochette_j91', r.date_naissance + 91, r.id, NULL, NULL, NULL, 1, 'Backfill : rappel J21');
    PERFORM ensure_evenement_prevu(r.ferme_id, 'vaccin_rouget_cochette_j150',    r.date_naissance + 150, r.id, NULL, NULL, NULL, 1, 'Backfill : Rouget J150');
    PERFORM ensure_evenement_prevu(r.ferme_id, 'vaccin_erysipele_parvo_j165',    r.date_naissance + 165, r.id, NULL, NULL, NULL, 1, 'Backfill : Erysipèle+Parvo J165');
    PERFORM ensure_evenement_prevu(r.ferme_id, 'vermifuge_cochette_j165',         r.date_naissance + 165, r.id, NULL, NULL, NULL, 2, 'Backfill : Vermifuge J165');
  END LOOP;
END $$;

-- Mises-bas existantes
DO $$
DECLARE
  r record;
  v_ferme uuid;
BEGIN
  FOR r IN SELECT * FROM mises_bas WHERE deleted_at IS NULL LOOP
    SELECT ferme_id INTO v_ferme FROM animaux WHERE id = r.truie_id;
    IF v_ferme IS NOT NULL THEN
      PERFORM ensure_evenement_prevu(v_ferme, 'fer_dextran_porcelets_j1',    r.date_mise_bas + 1,  NULL, r.bande_id, NULL, r.id, 1, 'Backfill : Fer J1');
      PERFORM ensure_evenement_prevu(v_ferme, 'castration_porcelets_j5',     r.date_mise_bas + 5,  NULL, r.bande_id, NULL, r.id, 2, 'Backfill : Castration J5');
      PERFORM ensure_evenement_prevu(v_ferme, 'vaccin_mycoplasma_primo_j14', r.date_mise_bas + 14, NULL, r.bande_id, NULL, r.id, 1, 'Backfill : Mycoplasma primo J14');
      PERFORM ensure_evenement_prevu(v_ferme, 'vaccin_mycoplasma_rappel_j28',r.date_mise_bas + 28, NULL, r.bande_id, NULL, r.id, 1, 'Backfill : Mycoplasma rappel J28');
      PERFORM ensure_evenement_prevu(v_ferme, 'sevrage_j28',                  r.date_mise_bas + 28, NULL, r.bande_id, NULL, r.id, 1, 'Backfill : Sevrage J28');
    END IF;
  END LOOP;
END $$;

-- Diagnostics positifs existants
DO $$
DECLARE
  r record;
  v_saillie record;
BEGIN
  FOR r IN SELECT * FROM diagnostics_gestation WHERE resultat='positif' LOOP
    SELECT s.date_saillie, s.truie_id, s.ferme_id INTO v_saillie FROM saillies s WHERE s.id = r.saillie_id;
    IF v_saillie IS NOT NULL THEN
      PERFORM ensure_evenement_prevu(v_saillie.ferme_id, 'vermifuge_truie_pre_mb', v_saillie.date_saillie + 100, v_saillie.truie_id, NULL, r.saillie_id, NULL, 1, 'Backfill : Vermifuge truie pré-MB');
      PERFORM ensure_evenement_prevu(v_saillie.ferme_id, 'vaccin_erysipele_parvo_truie_pre_mb', v_saillie.date_saillie + 93, v_saillie.truie_id, NULL, r.saillie_id, NULL, 1, 'Backfill : Erysipèle+Parvo truie pré-MB');
    END IF;
  END LOOP;
END $$;

COMMIT;
```

## Vérif

```sql
-- Avant migration
SELECT type_evenement, COUNT(*) FROM evenements_prevus WHERE statut='planifie' GROUP BY type_evenement ORDER BY COUNT(*) DESC;

-- Après migration : nombreux nouveaux types
SELECT type_evenement, COUNT(*) FROM evenements_prevus WHERE statut='planifie' GROUP BY type_evenement ORDER BY COUNT(*) DESC;
```

Test trigger live :
```sql
-- Crée une cochette test
INSERT INTO animaux (ferme_id, tag, sexe, categorie, date_naissance)
SELECT id, 'TEST-COCH-SA-C', 'F', 'cochette', CURRENT_DATE - 60 FROM fermes LIMIT 1;
-- Vérifie qu'on a 5 événements créés
SELECT COUNT(*) FROM evenements_prevus WHERE notes LIKE 'Auto%' AND animal_id = (SELECT id FROM animaux WHERE tag='TEST-COCH-SA-C');
-- Attendu : 5
-- Nettoie le test
DELETE FROM evenements_prevus WHERE animal_id = (SELECT id FROM animaux WHERE tag='TEST-COCH-SA-C');
DELETE FROM animaux WHERE tag='TEST-COCH-SA-C';
```

## Livrable
1. Migration appliquée
2. Triggers actifs : `\dft+ trg_*` montre les 3 triggers
3. Backfill ajoute événements pour cochettes existantes + mises-bas existantes + diagnostics positifs existants
4. Rapport `/root/projects/smartfarm/agents/V2-SPRINT-A/RAPPORT_SA_C.md` ≤ 60 lignes incluant :
   - Compte avant/après backfill
   - Test trigger live confirmé
   - Liste des triggers créés

## Anti-pièges
- `evenements_prevus.statut` est `text` (pas enum) — valeurs vues : 'planifie', 'en_cours', 'realise', 'annule'. Utilise 'planifie'.
- Helper `ensure_evenement_prevu` est **idempotent** (skip si déjà existe) — peux la rappeler sans risque
- Si une table change (ex: `traitements.date_acte` au lieu de `date_traitement`) → adapte les WHERE
- Pas de touche au schéma alertes — c'est SA-A qui fait ça
- Les triggers s'exécuteront sur futurs INSERT après cette migration, le backfill traite l'existant
