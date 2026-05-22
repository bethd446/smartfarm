/**
 * lib/nutrition-data.ts — Référentiel statique nutrition porcine
 *
 * Données NRC 2012 (Nutrient Requirements of Swine, 11th rev.) croisées
 * avec INRA 2018 (Tables INRA-CIRAD-AFZ valeurs nutritionnelles aliments)
 * et IFIP Mémento Porc 2022.
 *
 * Adaptations Afrique de l'Ouest : seuils légèrement plus conservateurs
 * (chaleur tropicale → ingestion réduite → besoins en concentration
 * énergétique et AA accrus de 3-5%).
 */

/* -------------------------------------------------------------------------- */
/*  Stades physiologiques                                                     */
/* -------------------------------------------------------------------------- */

export const STADES_PORC = [
  'porcelet_1',   // 5-15 kg, post-sevrage précoce
  'porcelet_2',   // 15-30 kg, post-sevrage
  'croissance',   // 30-60 kg
  'finition',     // 60-110 kg
  'gestante',     // truie gestante
  'allaitante',   // truie allaitante
  'verrat',       // verrat reproducteur
] as const

export type StadePorc = (typeof STADES_PORC)[number]

export const LABEL_STADE: Record<StadePorc, string> = {
  porcelet_1: 'Porcelet 1er âge (5-15 kg)',
  porcelet_2: 'Porcelet 2e âge (15-30 kg)',
  croissance: 'Croissance (30-60 kg)',
  finition: 'Finition (60-110 kg)',
  gestante: 'Truie gestante',
  allaitante: 'Truie allaitante',
  verrat: 'Verrat reproducteur',
}

/* -------------------------------------------------------------------------- */
/*  Besoins nutritionnels par stade                                           */
/*                                                                            */
/*  Valeurs MINIMALES recommandées (sur matière sèche, sauf prix).            */
/*  Sources :                                                                 */
/*    - NRC 2012 tables 17-1 à 17-7                                           */
/*    - INRA 2018 (porc)                                                      */
/*    - IFIP Mémento porc 2022                                                */
/* -------------------------------------------------------------------------- */

export type BesoinNutritionnel = {
  stade: StadePorc
  mat_min_pct: number          // MAT mini (protéine brute)
  em_min_kcal_kg: number       // Énergie métabolisable mini, kcal/kg
  lysine_min_pct: number       // Lysine totale mini
  methionine_min_pct: number   // Méthionine totale mini
  calcium_min_pct: number      // Ca mini
  phosphore_min_pct: number    // P total mini
  fibre_max_pct: number        // Cellulose brute maxi
  ration_kg_jour: [number, number]  // fourchette indicative (kg/j/animal)
}

export const BESOINS_NUTRITIONNELS: Record<StadePorc, BesoinNutritionnel> = {
  // Source : NRC 2012 « Nutrient Requirements of Swine », tables 17-1 (porcelet/
  // croissance/finition) et 17-7 (truie gestante/allaitante/verrat).
  porcelet_1: {
    stade: 'porcelet_1',
    mat_min_pct: 21.0,         // NRC 2012 table 17-1 (5–15 kg)
    em_min_kcal_kg: 3400,
    lysine_min_pct: 1.35,
    methionine_min_pct: 0.42,
    calcium_min_pct: 0.85,
    phosphore_min_pct: 0.65,
    fibre_max_pct: 4.0,
    ration_kg_jour: [0.3, 0.7],
  },
  porcelet_2: {
    stade: 'porcelet_2',
    mat_min_pct: 19.0,         // NRC 2012 table 17-1 (15–30 kg)
    em_min_kcal_kg: 3300,
    lysine_min_pct: 1.15,
    methionine_min_pct: 0.36,
    calcium_min_pct: 0.80,
    phosphore_min_pct: 0.62,
    fibre_max_pct: 5.0,
    ration_kg_jour: [0.7, 1.3],
  },
  croissance: {
    stade: 'croissance',
    mat_min_pct: 17.0,         // NRC 2012 table 17-1 (30–60 kg)
    em_min_kcal_kg: 3250,
    lysine_min_pct: 0.95,
    methionine_min_pct: 0.30,
    calcium_min_pct: 0.75,
    phosphore_min_pct: 0.58,
    fibre_max_pct: 6.0,
    ration_kg_jour: [1.5, 2.5],
  },
  finition: {
    stade: 'finition',
    mat_min_pct: 14.5,         // NRC 2012 table 17-1 (60–110 kg)
    em_min_kcal_kg: 3200,
    lysine_min_pct: 0.78,
    methionine_min_pct: 0.25,
    calcium_min_pct: 0.70,
    phosphore_min_pct: 0.55,
    fibre_max_pct: 7.0,
    ration_kg_jour: [2.5, 3.5],
  },
  gestante: {
    stade: 'gestante',
    mat_min_pct: 13.0,         // NRC 2012 table 17-7 (truie gestante)
    em_min_kcal_kg: 3100,
    lysine_min_pct: 0.55,
    methionine_min_pct: 0.20,
    calcium_min_pct: 0.90,
    phosphore_min_pct: 0.70,
    fibre_max_pct: 8.0,
    ration_kg_jour: [2.2, 2.8],
  },
  allaitante: {
    stade: 'allaitante',
    mat_min_pct: 18.0,         // NRC 2012 table 17-7 (truie allaitante)
    em_min_kcal_kg: 3300,
    lysine_min_pct: 1.05,
    methionine_min_pct: 0.32,
    calcium_min_pct: 0.95,
    phosphore_min_pct: 0.75,
    fibre_max_pct: 5.0,
    ration_kg_jour: [4.5, 6.5],
  },
  verrat: {
    stade: 'verrat',
    mat_min_pct: 14.0,         // NRC 2012 table 17-7 (verrat)
    em_min_kcal_kg: 3150,
    lysine_min_pct: 0.65,
    methionine_min_pct: 0.22,
    calcium_min_pct: 0.85,
    phosphore_min_pct: 0.65,
    fibre_max_pct: 7.0,
    ration_kg_jour: [2.5, 3.0],
  },
}

/* -------------------------------------------------------------------------- */
/*  Catégories nutritionnelles (alignées sur la migration SQL)               */
/* -------------------------------------------------------------------------- */

export const CATEGORIES_NUTRITIONNELLES = [
  'céréale',
  'tourteau',
  'sous_produit',
  'origine_animale',
  'minéral',
  'additif',
  'concentré_commercial',
] as const
export type CategorieNutritionnelle = (typeof CATEGORIES_NUTRITIONNELLES)[number]

export const LABEL_CATEGORIE: Record<CategorieNutritionnelle, string> = {
  céréale: 'Céréale',
  tourteau: 'Tourteau',
  sous_produit: 'Sous-produit',
  origine_animale: 'Origine animale',
  minéral: 'Minéral',
  additif: 'Additif',
  concentré_commercial: 'Concentré commercial',
}

export const ORIGINES = ['locale_ci', 'importee', 'industrielle'] as const
export type Origine = (typeof ORIGINES)[number]

export const LABEL_ORIGINE: Record<Origine, string> = {
  locale_ci: 'Locale CI',
  importee: 'Importée',
  industrielle: 'Industrielle',
}

export const FOURNISSEURS_CONCENTRES = [
  'IVOGRAIN',
  'De Heus',
  'Koudijs',
  'Vitalac',
  'Maridave',
] as const
