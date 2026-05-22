-- Migration: Protocole vaccinal cochettes pré-saillie complet
-- Référentiel IFIP/INRAE
-- Brief TEST-1

BEGIN;

-- 1. Modifier Parvo/Lepto cochettes existant : rappel J21 + J165 (avant 1ère saillie)
UPDATE protocoles_vaccinaux
SET rappels_jours = ARRAY[21, 165],
    description = 'Primo J70, rappel J91 (J21 après primo), rappel pré-saillie J165 (5.5 mois). Référentiel IFIP — protège la portée via colostrum.'
WHERE nom = 'Parvovirose + Leptospirose (cochettes)';

-- 2. Rouget cochettes pré-saillie
INSERT INTO protocoles_vaccinaux (ferme_id, nom, categorie_cible, age_jours, rappels_jours, produit, voie, dose_ml, obligatoire, description)
SELECT id, 'Rouget cochettes pré-saillie', 'cochette', 150, ARRAY[365],
       'Vaccin érysipélothrix rhusiopathiae',
       'IM (encolure)', 2.0, true,
       'Vaccination Rouget cochettes 5 mois (J150). Rappel annuel ensuite. Indispensable en zone tropicale CI (humidité, contact sol).'
FROM fermes WHERE deleted_at IS NULL;

-- 3. Érysipèle + Parvo combiné cochettes pré-saillie
INSERT INTO protocoles_vaccinaux (ferme_id, nom, categorie_cible, age_jours, rappels_jours, produit, voie, dose_ml, obligatoire, description)
SELECT id, 'Érysipèle + Parvo combiné cochette pré-saillie', 'cochette', 165, ARRAY[21],
       'Vaccin combiné (ex: Eryseng Parvo)',
       'IM (encolure)', 2.0, true,
       'Vaccination Érysipèle + Parvovirose 5.5 mois (J165) + rappel J186. Sécurise la 1ère saillie et la 1ère portée.'
FROM fermes WHERE deleted_at IS NULL;

-- 4. Vermifuge pré-saillie
INSERT INTO protocoles_vaccinaux (ferme_id, nom, categorie_cible, age_jours, rappels_jours, produit, voie, dose_ml, obligatoire, description)
SELECT id, 'Vermifuge cochettes pré-saillie', 'cochette', 165, ARRAY[]::integer[],
       'Ivermectine ou Doramectine',
       'SC', 0.3, true,
       'Vermifuge large spectre 5.5 mois (J165, 14j avant saillie). Élimine endo/ectoparasites avant gestation. INRAE recommandation.'
FROM fermes WHERE deleted_at IS NULL;

COMMIT;
