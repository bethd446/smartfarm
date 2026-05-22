/**
 * Lexique central — vocabulaire métier Smart Farm
 *
 * Centralise les libellés affichés dans l'app.
 *
 * RÈGLE : français standard, professionnel, accessible.
 * - On utilise les termes zootechniques courants (Saillie, Mise bas, Sevrage)
 * - Pas de tournures folkloriques ("elle a fait", "enlever les petits")
 * - Les abréviations (GMQ, IC, PSTA, BCS) sont toujours suivies de leur sens
 *   au moins une fois, puis utilisables seules
 *
 * Usage :
 *   import { TERRAIN, TYPE_LABELS, PRIORITE_LABEL, CATEGORIE_LABEL, SEXE_LABEL } from '@/lib/terrain-labels'
 */

export const TERRAIN = {
  // Événements
  saillie: {
    titre: 'Saillie',
    singulier: 'Saillie',
    pluriel: 'Saillies',
    verbe: 'enregistrer une saillie',
  },
  mise_bas: {
    titre: 'Mise bas',
    singulier: 'Mise bas',
    pluriel: 'Mises bas',
    verbe: 'enregistrer une mise bas',
  },
  sevrage: {
    titre: 'Sevrage',
    singulier: 'Sevrage',
    pluriel: 'Sevrages',
    verbe: 'enregistrer un sevrage',
  },
  reforme: {
    titre: 'Réforme',
    singulier: 'Réforme',
    verbe: 'réformer',
  },
  gestation: {
    titre: 'Diagnostic de gestation',
    verbe: 'diagnostiquer',
  },
  diagnostic_positif: 'Gestante',
  diagnostic_negatif: 'Vide',

  // Métriques (toujours avec définition au survol)
  prolificite: { court: 'Prolificité', terrain: 'Nombre de porcelets par portée' },
  ic: { court: 'IC', terrain: "Indice de consommation — kg d'aliment pour 1 kg de poids" },
  gmq: { court: 'GMQ', terrain: 'Gain Moyen Quotidien — grammes par jour' },
  psta: { court: 'PSTA', terrain: 'Porcelets Sevrés par Truie et par An' },
  bcs: { court: 'BCS', terrain: 'Note d\'état corporel — de 1 (maigre) à 5 (gras)' },
  mortalite: { court: 'Mortalité', terrain: 'Taux de pertes' },

  // Statuts
  active: 'Actif',
  vendu: 'Vendu',
  abattu: 'Abattu',
  mort: 'Mort',
  reforme_statut: 'Réformé',
} as const

/**
 * Labels affichés pour chaque catégorie d'animal.
 * IMPORTANT : la valeur (clé) reste celle du schema DB.
 * Seul le label visible change.
 */
export const CATEGORIE_LABEL: Record<string, string> = {
  verrat: 'Verrat',
  truie: 'Truie',
  cochette: 'Cochette',
  porcelet: 'Porcelet',
  sevrage: 'Porcelet sevré',
  engraissement: 'Porc en engraissement',
}

export const SEXE_LABEL: Record<string, string> = {
  M: '♂ Mâle',
  F: '♀ Femelle',
  C: 'Castré',
}

export const TYPE_LABELS: Record<string, string> = {
  mise_bas_prevue: 'Mise bas prévue',
  transfert_maternite: 'Transfert maternité',
  sevrage_prevu: 'Sevrage prévu',
  diagnostic_gestation_15j: 'Diagnostic gestation (J+15)',
  diagnostic_gestation_28j: 'Diagnostic gestation (J+28)',
  tarissement: 'Tarissement',
  rappel_vaccinal: 'Rappel vaccinal',
  depart_engraissement: 'Départ engraissement',
}

export const PRIORITE_LABEL: Record<number, string> = {
  1: 'Urgent',
  2: 'Important',
  3: 'Normal',
  4: 'À surveiller',
  5: 'Optionnel',
}

/**
 * Définitions courtes pour les bulles d'info (?) à côté des termes techniques.
 * Français professionnel, formulation simple.
 */
export const TERME_AIDE: Record<string, string> = {
  bande: 'Groupe de truies dont les mises bas sont synchronisées.',
  bcs: 'Note d\'état corporel — de 1 (maigre) à 5 (gras).',
  gmq: 'Gain Moyen Quotidien — grammes pris par jour.',
  ic: 'Indice de Consommation — kg d\'aliment pour 1 kg de poids vif.',
  psta: 'Porcelets Sevrés par Truie et par An.',
  prolificite: 'Nombre moyen de porcelets nés par portée.',
  cochette: 'Jeune femelle non encore saillie ou en attente de sa première mise bas.',
  engraissement: 'Phase de prise de poids avant l\'abattage.',
  sevrage_periode: 'Séparation des porcelets de leur mère.',
  saillie: 'Accouplement du verrat avec la truie (ou insémination).',
  mise_bas: 'Naissance des porcelets.',
  reforme: 'Sortie définitive d\'un reproducteur de l\'élevage.',
}

/**
 * Helper — traduit un résultat de diagnostic gestation en label affiché.
 */
export function diagnosticLabel(resultat: string | null | undefined): string {
  switch (resultat) {
    case 'positif':
      return 'GESTANTE'
    case 'negatif':
      return 'VIDE'
    case 'retour_chaleur':
      return 'RETOUR EN CHALEUR'
    default:
      return resultat ?? '—'
  }
}

/**
 * Helper — nettoie une description en retirant les préfixes techniques type "Backfill —".
 */
export function cleanDescription(desc: string | null | undefined): string {
  if (!desc) return ''
  return desc.replace(/^Backfill\s*[—–-]\s*/i, '').trim()
}

/** Helper d'affichage pour une catégorie animal (avec fallback). */
export function categorieLabel(cat: string | null | undefined): string {
  if (!cat) return '—'
  return CATEGORIE_LABEL[cat] ?? cat
}

/** Helper d'affichage pour le sexe (avec fallback). */
export function sexeLabel(sexe: string | null | undefined): string {
  if (!sexe) return '—'
  return SEXE_LABEL[sexe] ?? sexe
}
