-- ============================================================================
-- C6-A — Référentiel nutritionnel CI : colonnes manquantes + seeds
-- ============================================================================
--
-- Ajoute à `matieres_premieres` les colonnes nutritionnelles + commerciales,
-- puis seed :
--   * 19 matières premières locales / disponibles en Côte d'Ivoire
--   * 11 concentrés industriels (marques réelles distribuées en CI)
--
-- Sources (citées dans les notes de chaque entrée) :
--   * NRC 2012 (Nutrient Requirements of Swine, 11th rev.)
--   * INRA 2018 (Tables INRA-CIRAD-AFZ valeurs nutritionnelles aliments)
--   * FAO 2013 (Pig nutrition in tropical conditions)
--   * CIRAD — Mémentos élevage porcin Afrique de l'Ouest
--   * IFIP — Mémento porc 2022
--   * Prix indicatifs FCFA/kg : enquêtes terrain Abidjan/Bouaké 2024
--     (à ajuster par l'utilisateur final)
-- ============================================================================

-- 1) Colonnes additionnelles ------------------------------------------------
alter table matieres_premieres
  add column if not exists categorie_nutritionnelle text,
  add column if not exists mat_pct                  numeric,
  add column if not exists em_porc_kcal_kg          numeric,
  add column if not exists lysine_pct               numeric,
  add column if not exists methionine_pct           numeric,
  add column if not exists calcium_pct              numeric,
  add column if not exists phosphore_pct            numeric,
  add column if not exists fibre_pct                numeric,
  add column if not exists matiere_seche_pct        numeric default 88,
  add column if not exists origine                  text,
  add column if not exists fournisseur              text,
  add column if not exists prix_indicatif_xof_kg    numeric,
  add column if not exists notes_terrain            text;

comment on column matieres_premieres.categorie_nutritionnelle is
  'céréale | tourteau | sous_produit | minéral | origine_animale | additif | concentré_commercial';
comment on column matieres_premieres.mat_pct is
  'Matière Azotée Totale (protéine brute, % MS) — source INRA 2018';
comment on column matieres_premieres.em_porc_kcal_kg is
  'Énergie Métabolisable porc, kcal/kg MS — source INRA 2018 / NRC 2012';
comment on column matieres_premieres.origine is
  'locale_ci | importee | industrielle';
comment on column matieres_premieres.prix_indicatif_xof_kg is
  'Prix indicatif FCFA/kg (référence CI 2024, à actualiser)';

-- 2) Fonction seed idempotente -----------------------------------------------
create or replace function public.seed_matieres_premieres_standards(p_ferme uuid)
returns int
language plpgsql
as $$
declare
  v_count int := 0;
begin
  -- On retire d'abord les matières seedées (marquées [STANDARD] dans observations)
  -- pour préserver les saisies utilisateur.
  delete from matieres_premieres
   where ferme_id = p_ferme
     and observations like '[STANDARD]%';

  insert into matieres_premieres
    (ferme_id, nom, type, unite, categorie_nutritionnelle,
     mat_pct, em_porc_kcal_kg, lysine_pct, methionine_pct,
     calcium_pct, phosphore_pct, fibre_pct, matiere_seche_pct,
     origine, fournisseur, prix_indicatif_xof_kg, cout_moyen_unite,
     stock_actuel, seuil_alerte, observations, notes_terrain)
  values
    -- ============== CÉRÉALES & SUBSTITUTS ============================
    (p_ferme, 'Maïs grain', 'matiere_premiere', 'kg', 'céréale',
     8.0, 3300, 0.25, 0.18, 0.03, 0.28, 2.5, 87,
     'locale_ci', null, 280, 280, 0, 100,
     '[STANDARD] Source INRA 2018. Base énergétique principale.',
     'Achat post-récolte (oct-déc) recommandé. Risque mycotoxines en stockage humide.'),

    (p_ferme, 'Sorgho grain', 'matiere_premiere', 'kg', 'céréale',
     10.0, 3250, 0.22, 0.16, 0.04, 0.30, 2.6, 88,
     'locale_ci', null, 260, 260, 0, 100,
     '[STANDARD] Source INRA 2018. Alternative au maïs en saison sèche.',
     'Préférer variétés faibles tanins (< 1%). Disponible Nord-CI.'),

    (p_ferme, 'Manioc séché', 'matiere_premiere', 'kg', 'céréale',
     2.5, 3200, 0.10, 0.04, 0.15, 0.10, 4.0, 87,
     'locale_ci', null, 200, 200, 0, 100,
     '[STANDARD] Source FAO 2013 / CIRAD. Substitut maïs partiel (max 30%).',
     'Cossettes séchées indispensables (HCN). Très pauvre en protéine — équilibrer avec tourteau.'),

    (p_ferme, 'Patate douce séchée', 'matiere_premiere', 'kg', 'céréale',
     4.0, 3100, 0.20, 0.08, 0.10, 0.10, 3.5, 88,
     'locale_ci', null, 220, 220, 0, 100,
     '[STANDARD] Source CIRAD. Énergie alternative locale.',
     'Disponibilité saisonnière. Bien sécher avant stockage.'),

    -- ============== SOUS-PRODUITS ====================================
    (p_ferme, 'Son de blé', 'matiere_premiere', 'kg', 'sous_produit',
     16.0, 2200, 0.65, 0.25, 0.13, 1.20, 11.0, 88,
     'locale_ci', null, 180, 180, 0, 100,
     '[STANDARD] Source INRA 2018. Encombrant, bon pour truies gestantes.',
     'Sous-produit minoteries d''Abidjan. Limiter à 15-20% en finition (fibre).'),

    (p_ferme, 'Son de riz', 'matiere_premiere', 'kg', 'sous_produit',
     13.0, 2700, 0.55, 0.30, 0.07, 1.80, 10.0, 89,
     'locale_ci', null, 150, 150, 0, 100,
     '[STANDARD] Source INRA 2018. Riche en huile (rancissement rapide).',
     'Préférer son non déshuilé pour énergie. Stocker < 2 mois.'),

    (p_ferme, 'Drêches de brasserie sèches', 'matiere_premiere', 'kg', 'sous_produit',
     25.0, 2300, 0.85, 0.45, 0.30, 0.55, 16.0, 91,
     'locale_ci', 'SOLIBRA', 200, 200, 0, 100,
     '[STANDARD] Source INRA 2018. Bon complément protéique économique.',
     'Disponible auprès SOLIBRA Abidjan. Forme sèche obligatoire pour conservation.'),

    -- ============== TOURTEAUX ========================================
    (p_ferme, 'Tourteau de soja 48%', 'matiere_premiere', 'kg', 'tourteau',
     47.0, 3300, 3.00, 0.68, 0.30, 0.65, 6.0, 88,
     'importee', null, 480, 480, 0, 100,
     '[STANDARD] Source INRA 2018. Référence protéique mondiale.',
     'Importé (Argentine/Brésil) via Abidjan port. Toaster (anti-trypsique).'),

    (p_ferme, 'Tourteau d''arachide', 'matiere_premiere', 'kg', 'tourteau',
     45.0, 3100, 1.55, 0.50, 0.18, 0.60, 8.0, 92,
     'locale_ci', null, 350, 350, 0, 100,
     '[STANDARD] Source INRA 2018 / CIRAD. Bonne dispo locale.',
     'ATTENTION aflatoxines : contrôler avant usage. Limiter porcelets < 25kg.'),

    (p_ferme, 'Tourteau de coton', 'matiere_premiere', 'kg', 'tourteau',
     41.0, 2700, 1.65, 0.55, 0.20, 1.00, 14.0, 91,
     'locale_ci', null, 220, 220, 0, 100,
     '[STANDARD] Source INRA 2018. Sous-produit huileries CI.',
     'LIMITE : 5% maxi de la ration (gossypol). Interdit aux truies gestantes.'),

    (p_ferme, 'Tourteau de palmiste', 'matiere_premiere', 'kg', 'tourteau',
     16.0, 2400, 0.55, 0.30, 0.30, 0.55, 18.0, 92,
     'locale_ci', null, 130, 130, 0, 100,
     '[STANDARD] Source INRA 2018. Sous-produit huile de palme CI.',
     'Très fibreux : max 10-15% ration. Plutôt truies gestantes / finition tardive.'),

    -- ============== ORIGINE ANIMALE ==================================
    (p_ferme, 'Farine de poisson 60%', 'matiere_premiere', 'kg', 'origine_animale',
     60.0, 3000, 4.80, 1.70, 6.00, 3.20, 1.0, 91,
     'importee', null, 950, 950, 0, 50,
     '[STANDARD] Source NRC 2012. Excellente qualité AA + Ca/P.',
     'Importation Mauritanie/Sénégal. Vérifier teneur sel < 5%. Indispensable porcelets.'),

    -- ============== MINÉRAUX =========================================
    (p_ferme, 'Carbonate de calcium (coquilles)', 'matiere_premiere', 'kg', 'minéral',
     0.0, 0, 0.00, 0.00, 38.00, 0.00, 0.0, 99,
     'locale_ci', null, 80, 80, 0, 50,
     '[STANDARD] Source INRA 2018. Calcaire broyé ou coquilles d''huîtres.',
     'Disponible localement (carrières CI). Dosage 0,5-1,5% ration.'),

    (p_ferme, 'Phosphate bicalcique', 'matiere_premiere', 'kg', 'minéral',
     0.0, 0, 0.00, 0.00, 24.00, 18.00, 0.0, 99,
     'importee', null, 450, 450, 0, 50,
     '[STANDARD] Source INRA 2018. Apport conjoint Ca + P assimilable.',
     'Importé. Dosage 0,8-1,2% ration. Qualité alimentaire (fluor < 0,1%).'),

    (p_ferme, 'Sel marin', 'matiere_premiere', 'kg', 'minéral',
     0.0, 0, 0.00, 0.00, 0.30, 0.00, 0.0, 99,
     'locale_ci', null, 150, 150, 0, 50,
     '[STANDARD] Source NRC 2012. NaCl. Dosage 0,3-0,5% ration.',
     'Salines CI disponibles. Sel iodé recommandé.'),

    -- ============== ADDITIFS =========================================
    (p_ferme, 'Huile de palme', 'matiere_premiere', 'kg', 'additif',
     0.0, 8500, 0.00, 0.00, 0.00, 0.00, 0.0, 99,
     'locale_ci', 'PALMCI / SIFCA', 850, 850, 0, 50,
     '[STANDARD] Source INRA 2018. Source énergie concentrée.',
     'Production CI (PALMCI/SIFCA). Dosage 2-5% pour densifier ration porcelet/truie.'),

    (p_ferme, 'L-Lysine HCl', 'matiere_premiere', 'kg', 'additif',
     0.0, 0, 78.00, 0.00, 0.00, 0.00, 0.0, 98,
     'importee', null, 2200, 2200, 0, 20,
     '[STANDARD] Source NRC 2012. AA cristallin pour équilibrage. MAT et EM mis à 0 : la lysine cristalline n''apporte pas de MAT/EM utilisables dans le calcul de ration (corrige biais de surdosage).',
     'Importé. Dosage 0,1-0,3% ration. Économise 3-5% tourteau soja.'),

    (p_ferme, 'DL-Méthionine', 'matiere_premiere', 'kg', 'additif',
     0.0, 0, 0.00, 99.00, 0.00, 0.00, 0.0, 99,
     'importee', null, 3500, 3500, 0, 20,
     '[STANDARD] Source NRC 2012. 2e AA limitant en porc. MAT et EM mis à 0 : la méthionine cristalline n''apporte pas de MAT/EM utilisables (corrige biais de surdosage).',
     'Importé. Dosage 0,05-0,15% ration.'),

    (p_ferme, 'Prémix vit-min porc croissance', 'matiere_premiere', 'kg', 'additif',
     0.0, 0, 0.00, 0.00, 12.00, 8.00, 0.0, 95,
     'importee', null, 1800, 1800, 0, 20,
     '[STANDARD] Source IFIP. CMV croissance-finition complet.',
     'Dosage 0,3-0,5% ration. Marques : Provimi, Trouw, BIOLAC.'),

    (p_ferme, 'Prémix vit-min truie gestante/allaitante', 'matiere_premiere', 'kg', 'additif',
     0.0, 0, 0.00, 0.00, 15.00, 10.00, 0.0, 95,
     'importee', null, 2000, 2000, 0, 20,
     '[STANDARD] Source IFIP. CMV reproduction renforcé Ca/P/oligo.',
     'Dosage 0,5% ration. Vitamine E + sélénium renforcés.');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 3) Fonction seed concentrés industriels ------------------------------------
create or replace function public.seed_concentres_industriels_standards(p_ferme uuid)
returns int
language plpgsql
as $$
declare
  v_count int := 0;
begin
  delete from matieres_premieres
   where ferme_id = p_ferme
     and categorie_nutritionnelle = 'concentré_commercial'
     and observations like '[STANDARD]%';

  insert into matieres_premieres
    (ferme_id, nom, type, unite, categorie_nutritionnelle,
     mat_pct, em_porc_kcal_kg, lysine_pct, methionine_pct,
     calcium_pct, phosphore_pct, fibre_pct, matiere_seche_pct,
     origine, fournisseur, prix_indicatif_xof_kg, cout_moyen_unite,
     stock_actuel, seuil_alerte, observations, notes_terrain)
  values
    -- ============== IVOGRAIN (leader CI) =============================
    -- Réf : catalogue IVOGRAIN Côte d'Ivoire (filiale historique CI)
    (p_ferme, 'IVOGRAIN Porcelet 1er âge', 'aliment_fini', 'kg', 'concentré_commercial',
     20.0, 3300, 1.30, 0.45, 0.90, 0.65, 3.5, 88,
     'industrielle', 'IVOGRAIN', 650, 650, 0, 50,
     '[STANDARD] Aliment complet porcelet 7-15 kg.',
     'Distribué Abidjan/Bouaké. Confirmer disponibilité saisonnière.'),

    (p_ferme, 'IVOGRAIN Porc Croissance', 'aliment_fini', 'kg', 'concentré_commercial',
     17.0, 3150, 1.00, 0.32, 0.80, 0.60, 5.0, 88,
     'industrielle', 'IVOGRAIN', 480, 480, 0, 50,
     '[STANDARD] Aliment complet porc 25-60 kg.',
     null),

    (p_ferme, 'IVOGRAIN Porc Finition', 'aliment_fini', 'kg', 'concentré_commercial',
     15.0, 3100, 0.85, 0.28, 0.75, 0.55, 5.5, 88,
     'industrielle', 'IVOGRAIN', 440, 440, 0, 50,
     '[STANDARD] Aliment complet porc 60-110 kg.',
     null),

    (p_ferme, 'IVOGRAIN Truie Gestante', 'aliment_fini', 'kg', 'concentré_commercial',
     14.0, 2900, 0.65, 0.25, 0.95, 0.70, 7.0, 88,
     'industrielle', 'IVOGRAIN', 420, 420, 0, 50,
     '[STANDARD] Aliment truies gestantes.',
     null),

    (p_ferme, 'IVOGRAIN Truie Allaitante', 'aliment_fini', 'kg', 'concentré_commercial',
     18.0, 3250, 1.10, 0.35, 0.95, 0.75, 4.5, 88,
     'industrielle', 'IVOGRAIN', 510, 510, 0, 50,
     '[STANDARD] Aliment truies allaitantes haute production.',
     null),

    -- ============== De Heus (Pays-Bas, importé) ======================
    -- Réf : catalogue De Heus Animal Nutrition, gamme PigStart/Grow/Finish
    (p_ferme, 'De Heus Pre-Starter', 'aliment_fini', 'kg', 'concentré_commercial',
     21.0, 3400, 1.40, 0.48, 0.85, 0.65, 3.0, 89,
     'industrielle', 'De Heus', 780, 780, 0, 30,
     '[STANDARD] Pré-starter porcelet 5-12 kg, haute qualité.',
     'Importé Pays-Bas via distributeur agréé Abidjan.'),

    (p_ferme, 'De Heus Starter', 'aliment_fini', 'kg', 'concentré_commercial',
     19.0, 3300, 1.25, 0.42, 0.85, 0.62, 3.5, 89,
     'industrielle', 'De Heus', 680, 680, 0, 30,
     '[STANDARD] Starter porcelet 12-25 kg.',
     null),

    (p_ferme, 'De Heus Grower', 'aliment_fini', 'kg', 'concentré_commercial',
     16.5, 3200, 1.00, 0.32, 0.80, 0.58, 4.5, 88,
     'industrielle', 'De Heus', 540, 540, 0, 30,
     '[STANDARD] Croissance 25-60 kg.',
     null),

    (p_ferme, 'De Heus Finisher', 'aliment_fini', 'kg', 'concentré_commercial',
     14.5, 3100, 0.80, 0.27, 0.75, 0.55, 5.5, 88,
     'industrielle', 'De Heus', 490, 490, 0, 30,
     '[STANDARD] Finition 60-110 kg.',
     null),

    -- ============== Koudijs (NUTRECO, importé) =======================
    (p_ferme, 'Koudijs Porc Croissance', 'aliment_fini', 'kg', 'concentré_commercial',
     17.0, 3200, 1.05, 0.33, 0.82, 0.60, 4.8, 88,
     'industrielle', 'Koudijs', 560, 560, 0, 30,
     '[STANDARD] Aliment complet croissance — filiale NUTRECO.',
     'À confirmer disponibilité distributeur CI 2024.'),

    -- ============== Vitalac (France, importé) ========================
    (p_ferme, 'Vitalac Porc Croissance', 'aliment_fini', 'kg', 'concentré_commercial',
     17.5, 3250, 1.10, 0.35, 0.85, 0.62, 4.5, 88,
     'industrielle', 'Vitalac', 600, 600, 0, 30,
     '[STANDARD] Gamme française premium, distribution CI.',
     'À confirmer présence sur marché ivoirien — historiquement présent Afrique de l''Ouest.');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 4) Exécution des seeds sur la ferme DEMO -----------------------------------
select public.seed_matieres_premieres_standards('00000000-0000-0000-0000-000000000001'::uuid);
select public.seed_concentres_industriels_standards('00000000-0000-0000-0000-000000000001'::uuid);
