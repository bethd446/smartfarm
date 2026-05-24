-- ============================================================
-- MAJ CHEPTEL FERME SMART FARM YAMOUSSOUKRO — 2026-05-24
-- Source : retour technicien terrain
-- ============================================================

BEGIN;

-- ============ B.20 : 2 saillies 04/04 BOBI + ALIGATOR, diag négatif J+50, repasse VIDE
WITH ins_b20a AS (
  INSERT INTO saillies (ferme_id, truie_id, verrat_id, date_saillie, methode, date_diag_prevue, date_mb_prevue, resultat_diag, statut, observations)
  VALUES (
    'fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
    'e5188f52-e9b7-4107-b4aa-bda815eadc1e',
    'caf52e63-c6bb-4411-b9d4-2b0c0c2de210',
    '2026-04-04', 'naturelle',
    '2026-04-25', '2026-07-27',
    'negatif', 'echec',
    'Saillie confirmée terrain. Double cover 04/04 BOBI puis ALIGATOR. Aucun signe gestation à J+50 → diag négatif clinique 2026-05-24.'
  ) RETURNING id
)
INSERT INTO diagnostics_gestation (ferme_id, saillie_id, truie_id, date_diag, resultat, methode, observations)
SELECT 'fdba3bb2-85dd-4ac1-9ab3-713c750980dc', id,
       'e5188f52-e9b7-4107-b4aa-bda815eadc1e',
       '2026-05-24', 'negatif', 'observation',
       'Diagnostic clinique technicien 2026-05-24 : aucun signe gestation J+50.'
FROM ins_b20a;

INSERT INTO saillies (ferme_id, truie_id, verrat_id, date_saillie, methode, date_diag_prevue, date_mb_prevue, resultat_diag, statut, observations)
VALUES (
  'fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
  'e5188f52-e9b7-4107-b4aa-bda815eadc1e',
  '6158dbe4-5fe0-4018-a141-9251ae74a077',
  '2026-04-04', 'naturelle',
  '2026-04-25', '2026-07-27',
  'negatif', 'echec',
  'Second cover ALIGATOR 04/04. Diag négatif clinique 2026-05-24.'
);

UPDATE animaux
SET stade='truie_vide', updated_at=NOW(),
    observations = COALESCE(observations,'') || E'\n[2026-05-24] Saillie 04/04 BOBI+ALIGATOR confirmée mais aucun signe gestation à J+50 → repassée VIDE.'
WHERE id='e5188f52-e9b7-4107-b4aa-bda815eadc1e';


-- ============ B.22 : saillie 12/05 BOBI + diag positif (signes gestation)
WITH ins_b22 AS (
  INSERT INTO saillies (ferme_id, truie_id, verrat_id, date_saillie, methode, date_diag_prevue, date_mb_prevue, resultat_diag, statut, observations)
  VALUES (
    'fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
    '5a63a7f1-225e-4183-9d42-086635fa1345',
    'caf52e63-c6bb-4411-b9d4-2b0c0c2de210',
    '2026-05-12', 'naturelle',
    '2026-06-02', '2026-09-03',
    'positif', 'confirmee',
    'Saillie 12/05 BOBI. Signes gestation à J+12 (confirmation technicien 2026-05-24).'
  ) RETURNING id
)
INSERT INTO diagnostics_gestation (ferme_id, saillie_id, truie_id, date_diag, resultat, methode, observations)
SELECT 'fdba3bb2-85dd-4ac1-9ab3-713c750980dc', id,
       '5a63a7f1-225e-4183-9d42-086635fa1345',
       '2026-05-24', 'positif', 'observation',
       'Diagnostic clinique technicien 2026-05-24 : signes gestation visibles. Confirmation à J+28 (02/06/2026).'
FROM ins_b22;

UPDATE animaux
SET stade='truie_gestante', updated_at=NOW(),
    observations = COALESCE(observations,'') || E'\n[2026-05-24] Saillie 12/05 BOBI + signes gestation.'
WHERE id='5a63a7f1-225e-4183-9d42-086635fa1345';


-- ============ B.24 : saillie 15/05 BOBI (diag à venir)
INSERT INTO saillies (ferme_id, truie_id, verrat_id, date_saillie, methode, date_diag_prevue, date_mb_prevue, resultat_diag, statut, observations)
VALUES (
  'fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
  '4db493d2-14d5-4f37-9168-a280ae13b113',
  'caf52e63-c6bb-4411-b9d4-2b0c0c2de210',
  '2026-05-15', 'naturelle',
  '2026-06-05', '2026-09-06',
  'en_attente', 'en_cours',
  'Saillie 15/05 BOBI. Diagnostic clinique J+28 (05/06/2026).'
);

UPDATE animaux
SET stade='truie_gestante', updated_at=NOW(),
    observations = COALESCE(observations,'') || E'\n[2026-05-24] Saillie 15/05 BOBI confirmée, diag à J+28.'
WHERE id='4db493d2-14d5-4f37-9168-a280ae13b113';


-- ============ B.31 : confirmation positive de la saillie 01/04 avec ALIGATOR
UPDATE saillies
SET resultat_diag='positif',
    verrat_id='6158dbe4-5fe0-4018-a141-9251ae74a077',
    statut='confirmee',
    updated_at=NOW(),
    observations = COALESCE(observations,'') || E'\n[2026-05-24] Saillie confirmée : verrat ALIGATOR + signes gestation.'
WHERE id='dd8d8aa2-a542-4990-89a1-ccd7ce196ea3';

INSERT INTO diagnostics_gestation (ferme_id, saillie_id, truie_id, date_diag, resultat, methode, observations)
VALUES (
  'fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
  'dd8d8aa2-a542-4990-89a1-ccd7ce196ea3',
  'ce24bd54-3221-44f3-b33e-dc8316ba2fe0',
  '2026-05-24', 'positif', 'observation',
  'Diagnostic clinique 2026-05-24 : signes gestation présents à J+53 post-saillie ALIGATOR.'
);


-- ============ B.39 : saillie 05/04 négative, repasse VIDE
UPDATE saillies
SET resultat_diag='negatif',
    statut='echec',
    updated_at=NOW(),
    observations = COALESCE(observations,'') || E'\n[2026-05-24] Diag négatif terrain : repasse vide.'
WHERE id='0f448880-f195-4614-8b93-584d08d79c78';

INSERT INTO diagnostics_gestation (ferme_id, saillie_id, truie_id, date_diag, resultat, methode, observations)
VALUES (
  'fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
  '0f448880-f195-4614-8b93-584d08d79c78',
  'de4ae262-5f93-4e7c-b35c-d81a39f7a450',
  '2026-05-24', 'negatif', 'observation',
  'Diag clinique 2026-05-24 : aucun signe gestation, retour vide.'
);

UPDATE animaux
SET stade='truie_vide', updated_at=NOW(),
    observations = COALESCE(observations,'') || E'\n[2026-05-24] Diag négatif saillie 05/04 → VIDE, à re-saillir.'
WHERE id='de4ae262-5f93-4e7c-b35c-d81a39f7a450';


-- ============ B.76 : sevrage planifié 27/05 — portée 13/13 vivants
DO $$
DECLARE
  v_mb_id uuid;
  v_portee_id uuid;
BEGIN
  SELECT id INTO v_mb_id FROM mises_bas
  WHERE truie_id='141c64aa-3c29-405b-926a-daa905658e2c'
    AND ferme_id='fdba3bb2-85dd-4ac1-9ab3-713c750980dc'
  ORDER BY date_mise_bas DESC LIMIT 1;

  SELECT id INTO v_portee_id FROM portees
  WHERE truie_id='141c64aa-3c29-405b-926a-daa905658e2c'
    AND ferme_id='fdba3bb2-85dd-4ac1-9ab3-713c750980dc'
  ORDER BY date_naissance DESC LIMIT 1;

  IF v_portee_id IS NULL THEN
    INSERT INTO portees (ferme_id, mb_id, truie_id, code_portee, date_naissance, effectif_naissance, effectif_actuel, date_sevrage_prevue)
    VALUES ('fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
            v_mb_id,
            '141c64aa-3c29-405b-926a-daa905658e2c',
            'B76-20260331', '2026-03-31', 13, 13, '2026-05-27')
    RETURNING id INTO v_portee_id;
  ELSE
    UPDATE portees
    SET date_sevrage_prevue='2026-05-27',
        effectif_actuel=13,
        updated_at=NOW()
    WHERE id=v_portee_id;
  END IF;

  INSERT INTO sevrages (ferme_id, portee_id, truie_id, mb_id, date_sevrage, effectif_sevre, age_jours, observations)
  VALUES (
    'fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
    v_portee_id,
    '141c64aa-3c29-405b-926a-daa905658e2c',
    v_mb_id,
    '2026-05-27',
    13, 57,
    'Sevrage planifié confirmé technicien 2026-05-24. Portée 13/13 vivants. Sevrage tardif (57j) — à standardiser.'
  );
END $$;


-- ============ Alerte renouvellement boucles verrats
INSERT INTO alertes_loge (ferme_id, type, severity, animal_id, titre, message, date_evenement, traitee)
VALUES (
  'fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
  'manuelle_zootechnie',
  'warning',
  'caf52e63-c6bb-4411-b9d4-2b0c0c2de210',
  'Renouveler boucle verrat BOBI (B.89)',
  'Boucle à changer prochainement selon technicien (suivi 2026-05-24).',
  '2026-05-24',
  false
);

INSERT INTO alertes_loge (ferme_id, type, severity, animal_id, titre, message, date_evenement, traitee)
VALUES (
  'fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
  'manuelle_zootechnie',
  'warning',
  '6158dbe4-5fe0-4018-a141-9251ae74a077',
  'Renouveler boucle verrat ALIGATOR (B.100)',
  'Boucle à changer prochainement selon technicien (suivi 2026-05-24).',
  '2026-05-24',
  false
);


COMMIT;

-- Vérifs post-commit
SELECT tag, stade
FROM animaux
WHERE ferme_id='fdba3bb2-85dd-4ac1-9ab3-713c750980dc' AND categorie='truie'
ORDER BY tag;
