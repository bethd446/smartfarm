/**
 * Helper centralisé : transitions de stade zootechnique autorisées par catégorie.
 * Utilisé par le Dialog "Changer stade" (fiche animal + bulk porcelets).
 *
 * Sync 2026-05-25 (S5 Lane 1) : enum aligné avec BDD prod `stade_porc` (11 valeurs).
 * Catégories animaux (BDD `categorie_animal`, 8 valeurs) :
 *   truie / cochette / verrat / porcelet_lait / porcelet_sevre /
 *   porcelet_croissance / porc_engraissement / reforme
 * Stades autorisés (BDD `stade_porc`, 11 valeurs) :
 *   lactation / demarrage_1 / demarrage_2 / croissance / finition /
 *   cochette / truie_vide / truie_gestante / truie_allaitante / verrat / reforme
 */

export type CategorieAnimal =
  | 'truie'
  | 'cochette'
  | 'verrat'
  | 'porcelet_lait'
  | 'porcelet_sevre'
  | 'porcelet_croissance'
  | 'porc_engraissement'
  | 'reforme'

export type StadeAnimal =
  | 'lactation'
  | 'demarrage_1'
  | 'demarrage_2'
  | 'croissance'
  | 'finition'
  | 'cochette'
  | 'truie_vide'
  | 'truie_gestante'
  | 'truie_allaitante'
  | 'verrat'
  | 'reforme'

export const LIBELLES_STADE: Record<StadeAnimal, string> = {
  lactation: 'Lactation',
  demarrage_1: 'Démarrage 1',
  demarrage_2: 'Démarrage 2',
  croissance: 'Croissance',
  finition: 'Finition',
  cochette: 'Cochette',
  truie_vide: 'Truie vide',
  truie_gestante: 'Truie gestante',
  truie_allaitante: 'Truie allaitante',
  verrat: 'Verrat',
  reforme: 'Réforme',
}

/**
 * Retourne la liste des stades sélectionnables pour une catégorie donnée.
 * Aligné parcours linéaire métier S4+ :
 *   Maternité (lactation) → Démarrage 1 → Démarrage 2 → Croissance → Finition → Réforme
 *   + cycle reproducteur femelle pour truies/cochettes
 *   + verrat immutable
 */
export function stadesAutorisesPour(
  categorie: CategorieAnimal | string | null | undefined,
): StadeAnimal[] {
  switch (categorie) {
    case 'truie':
    case 'cochette':
      return ['truie_vide', 'truie_gestante', 'truie_allaitante', 'cochette', 'reforme']
    case 'verrat':
      return ['verrat']
    case 'porcelet_lait':
      return ['lactation', 'demarrage_1']
    case 'porcelet_sevre':
      return ['demarrage_1', 'demarrage_2', 'croissance']
    case 'porcelet_croissance':
      return ['demarrage_2', 'croissance', 'finition']
    case 'porc_engraissement':
      return ['croissance', 'finition', 'reforme']
    case 'reforme':
      return ['reforme']
    default:
      return [
        'lactation',
        'demarrage_1',
        'demarrage_2',
        'croissance',
        'finition',
        'cochette',
        'truie_vide',
        'truie_gestante',
        'truie_allaitante',
        'verrat',
        'reforme',
      ]
  }
}

/**
 * Indique si un changement de stade implique aussi une bascule de catégorie.
 * Cas géré : cochette → truie quand passage à un stade de truie (vide/gestante/allaitante).
 * Hors scope S5 Lane 1 : bascules porcelet_lait → porcelet_sevre etc. (mini-sprint dédié).
 */
export function nouvelleCategoriePourStade(
  categorieActuelle: CategorieAnimal | string,
  nouveauStade: StadeAnimal,
): CategorieAnimal | null {
  if (
    categorieActuelle === 'cochette' &&
    (nouveauStade === 'truie_vide' ||
      nouveauStade === 'truie_gestante' ||
      nouveauStade === 'truie_allaitante')
  ) {
    return 'truie'
  }
  return null
}

export const TOUS_LES_STADES: StadeAnimal[] = [
  'lactation',
  'demarrage_1',
  'demarrage_2',
  'croissance',
  'finition',
  'cochette',
  'truie_vide',
  'truie_gestante',
  'truie_allaitante',
  'verrat',
  'reforme',
]
