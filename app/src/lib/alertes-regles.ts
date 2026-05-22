/**
 * Smart Farm — Métadonnées des 12 règles d'alertes (C3-A)
 * -------------------------------------------------------------------------
 * Source de vérité côté Next pour les libellés affichables, la catégorie
 * fonctionnelle et la gravité par défaut de chaque règle. La détection
 * réelle se fait en SQL via la view `v_alertes_actives` (cf. migration
 * `20260521000001_alertes_views.sql`) — ce fichier ne fait QUE la
 * mise en forme côté UI.
 *
 * Convention d'ID stable : `R{NN}-{slug-kebab-sans-accent}` (les accents
 * ont été retirés pour rester compatibles avec les URL et les noms SQL).
 */

import type { GraviteAlerte } from './alertes-engine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CategorieAlerte =
  | 'reproduction'
  | 'sanitaire'
  | 'nutrition'
  | 'pertes'
  | 'stock'

export type RegleAlerte = {
  /** Libellé court affichable (titre de règle). */
  nom: string
  /** Phrase de contexte (≤ 1 ligne en UI). */
  description: string
  /** Gravité de référence — la vraie gravité provient de la view SQL. */
  gravite_default: GraviteAlerte
  /** Famille fonctionnelle pour les regroupements UI. */
  categorie: CategorieAlerte
}

// ---------------------------------------------------------------------------
// Catalogue des 26 règles (R01 → R26)
// ---------------------------------------------------------------------------

export const REGLES_ALERTES: Record<string, RegleAlerte> = {
  'R01-truie-vide-prolongee': {
    nom: 'Truie vide prolongée',
    description:
      'Truie sans saillie ni diagnostic gestation depuis plus de 30 jours après sevrage (ou > 45 j depuis le dernier événement).',
    gravite_default: 'élevée',
    categorie: 'reproduction',
  },
  'R02-retour-chaleur-non-saillie': {
    nom: 'Retour en chaleur non sailli',
    description:
      'Truie revenue en chaleur (diagnostic négatif) sans nouvelle saillie dans les 25 jours qui suivent.',
    gravite_default: 'moyenne',
    categorie: 'reproduction',
  },
  'R03-gestante-mise-bas-imminente': {
    nom: 'Mise-bas imminente',
    description:
      'Truie gestante avec date prévue de mise-bas dans les 7 prochains jours.',
    gravite_default: 'élevée',
    categorie: 'reproduction',
  },
  'R04-gestante-en-retard': {
    nom: 'Gestante en retard de mise-bas',
    description:
      'Date prévue de mise-bas dépassée de plus de 3 jours sans saisie de mise-bas.',
    gravite_default: 'critique',
    categorie: 'reproduction',
  },
  'R05-porcelets-non-peses': {
    nom: 'Porcelets non pesés',
    description:
      'Bande avec porcelets nés depuis plus de 14 jours sans aucune pesée enregistrée.',
    gravite_default: 'moyenne',
    categorie: 'reproduction',
  },
  'R06-porcelets-non-vaccines-J14': {
    nom: 'Porcelets non vaccinés (J14 Mycoplasma)',
    description:
      'Porcelet âgé de 16 à 25 jours sans vaccination Mycoplasma enregistrée.',
    gravite_default: 'élevée',
    categorie: 'sanitaire',
  },
  'R07-sevrage-en-retard': {
    nom: 'Sevrage en retard',
    description:
      'Mise-bas datant de plus de 35 jours sans sevrage saisi (sevrage prévu vers 28 j).',
    gravite_default: 'moyenne',
    categorie: 'reproduction',
  },
  'R08-mortalite-elevee-7j': {
    nom: 'Mortalité bande élevée (7 j)',
    description:
      'Taux de mortalité de la bande supérieur à 5 % sur les 7 derniers jours.',
    gravite_default: 'critique',
    categorie: 'pertes',
  },
  'R09-mortalite-elevee-30j': {
    nom: 'Mortalité ferme élevée (30 j)',
    description:
      'Taux de mortalité de la ferme entière supérieur à 2 % sur les 30 derniers jours.',
    gravite_default: 'critique',
    categorie: 'pertes',
  },
  'R10-stock-critique': {
    nom: 'Stock critique',
    description:
      'Matière première dont le stock actuel est passé sous le seuil d\u2019alerte.',
    gravite_default: 'élevée',
    categorie: 'stock',
  },
  'R11-aliment-rupture-prevue': {
    nom: 'Rupture de stock prévue',
    description:
      'Matière première en cours de rupture sous 7 jours d\u2019après la consommation moyenne 30 j.',
    gravite_default: 'moyenne',
    categorie: 'nutrition',
  },
  'R12-acte-sanitaire-en-retard': {
    nom: 'Acte sanitaire en retard',
    description:
      'Vaccin ou soin obligatoire en retard de plus de 7 jours sur le calendrier sanitaire.',
    gravite_default: 'élevée',
    categorie: 'sanitaire',
  },
  'R13-truie-anorexie': {
    nom: 'Truie en anorexie',
    description:
      'Consommation aliment chutée de plus de 50 % vs moyenne 7 jours.',
    gravite_default: 'critique',
    categorie: 'sanitaire',
  },
  'R14-cochette-trop-vieille': {
    nom: 'Cochette non saillie >250 j',
    description:
      'Cochette âgée de plus de 250 jours sans saillie enregistrée — risque d\u2019infertilité.',
    gravite_default: 'moyenne',
    categorie: 'reproduction',
  },
  'R15-lot-mortalite-anormale': {
    nom: 'Mortalité anormale du lot',
    description:
      'Lot avec plus de 5 % de mortalité sur les 7 derniers jours.',
    gravite_default: 'critique',
    categorie: 'pertes',
  },
  'R16-mise-bas-tardive': {
    nom: 'Mise-bas tardive',
    description:
      'Saillie positive avec mise-bas attendue depuis plus de 117 jours sans saisie.',
    gravite_default: 'critique',
    categorie: 'reproduction',
  },
  'R17-eau-chute-importante': {
    nom: 'Eau — chute importante de consommation',
    description:
      'Consommation eau du jour en baisse de plus de 20 % vs moyenne 7 jours.',
    gravite_default: 'critique',
    categorie: 'sanitaire',
  },
  'R18-lot-non-analyse': {
    nom: 'Lot maïs/arachide/soja non analysé',
    description:
      'Lot de matière première sensible reçu depuis plus de 7 jours sans analyse mycotoxines.',
    gravite_default: 'moyenne',
    categorie: 'sanitaire',
  },
  'R19-mise-bas-attendue-sans-diag': {
    nom: 'Mise-bas attendue sans diagnostic',
    description:
      'Truie en zone de mise-bas (jour 110-130 post-saillie) sans diagnostic gestation ni mise-bas saisie — examen requis.',
    gravite_default: 'élevée',
    categorie: 'reproduction',
  },
  'R20-iss-trop-long': {
    nom: 'ISS trop long (>10j)',
    description:
      'Intervalle sevrage→saillie supérieur à 10 jours (cible biologique 5-7 j) — détection chaleur ou BCS à vérifier.',
    gravite_default: 'moyenne',
    categorie: 'reproduction',
  },
  'R21-diagnostic-gestation-attendu': {
    nom: 'Diagnostic gestation attendu',
    description:
      'Fenêtre 18-24 j post-saillie — détecter un retour en chaleur ou confirmer la gestation par échographie.',
    gravite_default: 'moyenne',
    categorie: 'reproduction',
  },
  'R22-bande-non-sexee-2-mois': {
    nom: 'Bande non sexée à 2 mois',
    description:
      'Bande active de plus de 60 jours sans sexage — séparer mâles et femelles pour éviter la consanguinité.',
    gravite_default: 'moyenne',
    categorie: 'reproduction',
  },
  'R23-vermifuge-truie-pre-mb': {
    nom: 'Vermifuge truie pré-MB',
    description:
      'Truie gestante à moins de 14 jours de la mise-bas sans vermifuge récent (Ivermectine/Doramectine) — référentiel INRAE.',
    gravite_default: 'élevée',
    categorie: 'sanitaire',
  },
  'R24-fer-porcelet-j3': {
    nom: 'Fer porcelet J3 non administré',
    description:
      'Injection Fer dextran obligatoire J1-J3 post-naissance — anémie tropicale critique (référentiel INRAE/CIRAD).',
    gravite_default: 'critique',
    categorie: 'sanitaire',
  },
  'R25-bcs-sevrage-bas': {
    nom: 'BCS truie bas au sevrage',
    description:
      'Truie sortie de sevrage avec BCS < 2.5 — risque ISS allongé et baisse de fertilité (référentiel IFIP).',
    gravite_default: 'moyenne',
    categorie: 'reproduction',
  },
  'R26-surdensite-batiment': {
    nom: 'Bâtiment en surdensité',
    description:
      'Effectif ≥ 95 % de la capacité — stress, biosécurité dégradée (référentiel FAO/CIRAD).',
    gravite_default: 'moyenne',
    categorie: 'pertes',
  },
}

// ---------------------------------------------------------------------------
// Ordres + libellés FR pro
// ---------------------------------------------------------------------------

/** Ordre canonique d'affichage par gravité décroissante. */
export const ORDRE_GRAVITE: Record<GraviteAlerte, number> = {
  critique: 0,
  'élevée': 1,
  moyenne: 2,
  info: 3,
}

/** Libellé français pro pour chaque gravité (UI). */
export const LABEL_GRAVITE: Record<GraviteAlerte, string> = {
  critique: 'Critique',
  'élevée': 'Élevée',
  moyenne: 'Moyenne',
  info: 'Info',
}

/** Libellé français pro pour chaque catégorie (UI). */
export const LABEL_CATEGORIE: Record<CategorieAlerte, string> = {
  reproduction: 'Reproduction',
  sanitaire: 'Sanitaire',
  nutrition: 'Nutrition',
  pertes: 'Pertes',
  stock: 'Stock',
}

/**
 * Couleurs sémantiques par gravité (tokens design system Smart Farm).
 * Toujours utiliser `var(--sf-*)` — pas de hex en dur côté composant.
 */
export const COULEUR_GRAVITE: Record<
  GraviteAlerte,
  { bg: string; ink: string }
> = {
  critique: {
    bg: 'var(--sf-danger-bg, #F1D4CE)',
    ink: 'var(--sf-danger-ink, #7A2A1F)',
  },
  'élevée': {
    bg: 'var(--sf-danger-bg, #F1D4CE)',
    ink: 'var(--sf-danger-ink, #7A2A1F)',
  },
  moyenne: {
    bg: 'var(--sf-warning-bg, #F5E0B8)',
    ink: 'var(--sf-warning-ink, #5A3E0E)',
  },
  info: {
    bg: 'var(--sf-info-bg, #D6E2EE)',
    ink: 'var(--sf-info-ink, #1F3A55)',
  },
}

// ---------------------------------------------------------------------------
// Lookup par préfixe (R01-* / R02-* …)
// ---------------------------------------------------------------------------

/**
 * Retourne la métadonnée d'une règle à partir d'un `regle_id`.
 *
 * Matche d'abord par clé exacte (cas nominal : `R01-truie-vide-prolongee`),
 * sinon par préfixe `Rxx-` (utile si la view SQL évolue et suffixe le slug,
 * ex. `R01-truie-vide-prolongee-v2`).
 */
export function getRegleMetadata(regle_id: string): RegleAlerte | undefined {
  // Match exact
  const exact = REGLES_ALERTES[regle_id]
  if (exact) return exact

  // Match par préfixe Rxx-
  const m = regle_id.match(/^(R\d{2})-/)
  if (!m) return undefined
  const prefix = m[1] + '-'
  for (const [id, meta] of Object.entries(REGLES_ALERTES)) {
    if (id.startsWith(prefix)) return meta
  }
  return undefined
}
