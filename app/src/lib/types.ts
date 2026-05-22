/**
 * Smart Farm — types métier (générés à la main pour le brouillon)
 * En prod : `supabase gen types typescript --local`
 */

export type Ferme = {
  id: string
  nom: string
  code: string
  localisation: string | null
  pays: string
  type: string
}

export type Animal = {
  id: string
  ferme_id: string
  tag: string
  nom: string | null
  sexe: 'M' | 'F'
  categorie: 'verrat' | 'truie' | 'cochette' | 'porcelet' | 'sevrage' | 'engraissement'
  race_id: string | null
  date_naissance: string | null
  statut: 'actif' | 'vendu' | 'abattu' | 'mort' | 'reforme'
}

/**
 * Sortie d'un animal (vente, abattage, réforme, transfert, etc.).
 * La colonne SQL réelle s'appelle `acheteur` (et non `destination`).
 */
export type Departure = {
  id: string
  animal_id: string | null
  bande_id: string | null
  ferme_id: string
  date_depart: string
  motif: 'vente' | 'abattage' | 'reforme' | 'transfert' | 'autre'
  nb_animaux: number | null
  poids_total_kg: number | null
  prix_kg: number | null
  montant_total: number | null
  acheteur: string | null
  observations: string | null
}

export type Bande = {
  id: string
  ferme_id: string
  nom: string
  code: string
  date_debut: string
  date_fin_prevue: string | null
  statut: 'preparation' | 'active' | 'sevree' | 'engraissement' | 'finie'
}

export type Saillie = {
  id: string
  truie_id: string
  verrat_id: string | null
  date_saillie: string
  methode: 'naturelle' | 'IA' | 'IA_double'
  rang_porte: number | null
}

export type MiseBas = {
  id: string
  truie_id: string
  date_mise_bas: string
  nes_totaux: number
  nes_vivants: number
  nes_morts: number
  momifies: number
  poids_portee_kg: number | null
}

export type MatierePremiere = {
  id: string
  nom: string
  type: string
  unite: string
  stock_actuel: number
  seuil_alerte: number | null
  cout_moyen_unite: number | null
}
