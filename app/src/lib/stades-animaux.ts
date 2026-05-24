/**
 * Helper centralisé : transitions de stade zootechnique autorisées par catégorie.
 * Utilisé par le Dialog "Changer stade" sur la fiche animal.
 *
 * Catégories animaux (BDD) : truie / cochette / verrat / porcelet_croissance / porc_engraissement
 * Stades autorisés (enum BDD) : truie_vide / truie_gestante / truie_allaitante / cochette
 *                               / verrat / croissance / finition / depart / controle
 */

export type CategorieAnimal =
  | 'truie'
  | 'cochette'
  | 'verrat'
  | 'porcelet_croissance'
  | 'porc_engraissement'

export type StadeAnimal =
  | 'truie_vide'
  | 'truie_gestante'
  | 'truie_allaitante'
  | 'cochette'
  | 'verrat'
  | 'croissance'
  | 'finition'
  | 'depart'
  | 'controle'

export const LIBELLES_STADE: Record<StadeAnimal, string> = {
  truie_vide: 'Truie vide',
  truie_gestante: 'Truie gestante',
  truie_allaitante: 'Truie allaitante',
  cochette: 'Cochette',
  verrat: 'Verrat',
  croissance: 'Croissance',
  finition: 'Finition',
  depart: 'Départ',
  controle: 'Contrôle',
}

/**
 * Retourne la liste des stades sélectionnables pour une catégorie donnée.
 * - truie / cochette → cycle reproducteur femelle
 * - verrat → immutable (1 seule option, le sélecteur est désactivé côté UI)
 * - porcelets / engraissement → stades d'élevage
 */
export function stadesAutorisesPour(
  categorie: CategorieAnimal | string | null | undefined,
): StadeAnimal[] {
  switch (categorie) {
    case 'truie':
    case 'cochette':
      return ['truie_vide', 'truie_gestante', 'truie_allaitante', 'cochette']
    case 'verrat':
      return ['verrat']
    case 'porcelet_croissance':
    case 'porc_engraissement':
      return ['croissance', 'finition', 'depart', 'controle']
    default:
      return [
        'truie_vide',
        'truie_gestante',
        'truie_allaitante',
        'cochette',
        'verrat',
        'croissance',
        'finition',
        'depart',
        'controle',
      ]
  }
}

/**
 * Indique si un changement de stade implique aussi une bascule de catégorie.
 * Cas géré : cochette → truie quand passage à un stade de truie (vide/gestante/allaitante).
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
  'truie_vide',
  'truie_gestante',
  'truie_allaitante',
  'cochette',
  'verrat',
  'croissance',
  'finition',
  'depart',
  'controle',
]
