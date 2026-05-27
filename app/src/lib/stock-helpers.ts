/**
 * Smart Farm — Helpers Stock
 * ============================================================================
 * Logique partagée "stock en alerte". Source unique pour dashboard + /stock
 * afin d'éviter la divergence des compteurs (cf audit Phase A, item A5).
 * ============================================================================
 */

export type StockItem = {
  stock_actuel: number | null
  seuil_alerte: number | null
}

/** Retourne true si l'article est sous le seuil d'alerte. */
export function isAlerte(s: StockItem): boolean {
  if (s.seuil_alerte == null || s.stock_actuel == null) return false
  return s.stock_actuel < s.seuil_alerte
}
