-- ===========================================================================
-- V2-B : Calendrier sanitaire porcelets (actes obligatoires post-mise-bas)
-- ---------------------------------------------------------------------------
-- Projette pour chaque mise-bas récente les actes sanitaires attendus sur les
-- porcelets nés : Fer J1, Castration J3, Mycoplasmose H1 J7, H2 J21, Pesée J28.
--
-- Fenêtre : J-14 → J+60 par rapport à CURRENT_DATE pour limiter le volume.
-- Source ferme_id : via la truie (animaux.ferme_id) car mises_bas n'a pas
-- cette colonne en propre.
-- ===========================================================================

CREATE OR REPLACE VIEW v_calendrier_sanitaire_porcelets
WITH (security_invoker = true) AS
WITH actes_planifies AS (
  SELECT
    mb.id                                     AS mise_bas_id,
    mb.bande_id,
    mb.truie_id,
    a.tag                                     AS truie_tag,
    a.ferme_id                                AS ferme_id,
    mb.date_mise_bas,
    mb.nes_vivants,
    acte.libelle,
    acte.type_acte,
    acte.jour_offset,
    (mb.date_mise_bas + acte.jour_offset)::date AS date_prevue,
    acte.gravite
  FROM mises_bas mb
  JOIN animaux a ON a.id = mb.truie_id
  CROSS JOIN LATERAL (
    VALUES
      ('Injection Fer dextran 200 mg'::text,        'traitement'::text,  1,  'élevée'::text),
      ('Coupe queue / castration (optionnel)'::text,'traitement'::text,  3,  'moyenne'::text),
      ('Vaccination Mycoplasmose H1'::text,         'vaccination'::text, 7,  'élevée'::text),
      ('Vaccination Mycoplasmose H2'::text,         'vaccination'::text, 21, 'élevée'::text),
      ('Pesée sevrage'::text,                       'traitement'::text,  28, 'moyenne'::text)
  ) AS acte(libelle, type_acte, jour_offset, gravite)
  WHERE mb.deleted_at IS NULL
)
SELECT
  -- ID synthétique stable pour le rendu front
  (mise_bas_id::text || ':' || libelle) AS acte_id,
  mise_bas_id,
  bande_id,
  truie_id,
  truie_tag,
  ferme_id,
  date_mise_bas,
  nes_vivants,
  libelle      AS acte,
  type_acte,
  jour_offset,
  date_prevue,
  gravite,
  CASE
    WHEN date_prevue < CURRENT_DATE                     THEN 'retard'
    WHEN date_prevue = CURRENT_DATE                     THEN 'aujourd_hui'
    WHEN date_prevue <= CURRENT_DATE + INTERVAL '7 days'  THEN 'semaine'
    WHEN date_prevue <= CURRENT_DATE + INTERVAL '30 days' THEN 'mois'
    ELSE 'lointain'
  END AS statut_temporel
FROM actes_planifies
WHERE date_prevue >= CURRENT_DATE - INTERVAL '14 days'
  AND date_prevue <= CURRENT_DATE + INTERVAL '60 days';

GRANT SELECT ON v_calendrier_sanitaire_porcelets TO anon, authenticated;

COMMENT ON VIEW v_calendrier_sanitaire_porcelets IS
  'V2-B — Actes sanitaires attendus sur porcelets par mise-bas '
  '(Fer J1, Castration J3, Mycoplasmose H1 J7 / H2 J21, Pesée J28). '
  'Fenêtre [-14j, +60j] autour de CURRENT_DATE.';
