BEGIN;
UPDATE saillies
SET resultat_diag='negatif',
    statut='echec',
    updated_at=NOW(),
    observations = COALESCE(observations,'') || E'\n[2026-05-24] Saillie historique 05/04 close en echec : technicien confirme une nouvelle saillie 15/05/2026 (la precedente nayant pas pris).'
WHERE id='56e54aa5-090b-4a6f-8c3f-cdd98598f2a8';

INSERT INTO diagnostics_gestation (ferme_id, saillie_id, truie_id, date_diag, resultat, methode, observations)
VALUES (
  'fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
  '56e54aa5-090b-4a6f-8c3f-cdd98598f2a8',
  '4db493d2-14d5-4f37-9168-a280ae13b113',
  '2026-05-15',
  'negatif',
  'retour_chaleur',
  'Diagnostic retroactif : retour en chaleur ayant justifie la re-saillie du 15/05/2026 avec BOBI.'
);
COMMIT;
