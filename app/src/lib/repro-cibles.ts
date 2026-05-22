/**
 * Smart Farm — Cibles biologiques reproduction truie (BCS par stade)
 * ------------------------------------------------------------------
 * Source : INRAE 2018 « Alimentation des animaux monogastriques »
 *          + IFIP « Mémento de l'éleveur de porc » (2013)
 *          + INRAE / IFIP référentiel BCS truie 1-5 (Young / Aherne)
 *
 * Échelle BCS utilisée : 1.0 (très maigre) → 5.0 (obèse), pas de 0.5.
 *
 * Utilisation typique :
 *   import { CIBLES_BCS, bcsAlerte } from '@/lib/repro-cibles'
 *
 *   const verdict = bcsAlerte('saillie', truie.bcs_actuel)
 *   if (verdict === 'maigre') ...
 *
 * Aucune dépendance React / Supabase — fichier 100 % pur.
 */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Stades physiologiques pour le suivi BCS truie.
 *
 * Convention :
 *   - saillie       : 0-7 j avant / après IA (poids d'attaque cycle reproducteur)
 *   - mi_gestation  : J30 → J85
 *   - fin_gestation : J86 → J110
 *   - mise_bas     : J−2 → J+2 autour de la mise-bas
 *   - sevrage       : jour du sevrage (J21-J28 selon ferme)
 */
export type StadeBCS =
  | 'saillie'
  | 'mi_gestation'
  | 'fin_gestation'
  | 'mise_bas'
  | 'sevrage'

/** Fenêtre BCS pour un stade donné (échelle 1-5). */
export type CibleBCS = {
  /** Limite basse — en dessous : truie *maigre* (risque infertilité, mortalité néonatale). */
  min: number
  /** Optimum biologique (référence pour le conseiller). */
  ideal: number
  /** Limite haute — au-dessus : truie *grasse* (dystocie, MMA, sevrage compliqué). */
  max: number
}

/** Verdict synthétique pour l'UI / les alertes. */
export type VerdictBCS = 'ok' | 'maigre' | 'grasse'

/* -------------------------------------------------------------------------- */
/*  Cibles BCS par stade (INRAE / IFIP)                                       */
/* -------------------------------------------------------------------------- */

/**
 * Cibles biologiques BCS truie par stade physiologique.
 *
 *   - Saillie       : 3.0 — 3.5 — 4.0  (entrée cycle : ni trop maigre, ni trop grasse)
 *   - Mi-gestation  : 3.5 — 3.5 — 4.0  (reconstitution douce des réserves)
 *   - Fin-gestation : 3.5 — 4.0 — 4.5  (mobilisation prochaine, doit être bien équipée)
 *   - Mise-bas     : 3.5 — 4.0 — 4.5  (>4.5 = risque dystocie & MMA)
 *   - Sevrage       : 2.5 — 3.0 — 3.5  (perte normale de 0.5-1 point pendant lactation)
 *
 * Les bornes correspondent à l'écart-type ± 1 du référentiel INRAE/IFIP.
 */
export const CIBLES_BCS: Record<StadeBCS, CibleBCS> = {
  saillie:       { min: 3.0, ideal: 3.5, max: 4.0 },
  mi_gestation:  { min: 3.5, ideal: 3.5, max: 4.0 },
  fin_gestation: { min: 3.5, ideal: 4.0, max: 4.5 },
  mise_bas:      { min: 3.5, ideal: 4.0, max: 4.5 },
  sevrage:       { min: 2.5, ideal: 3.0, max: 3.5 },
} as const

/**
 * Libellés français pro pour l'UI (cards, headers, badges).
 */
export const LABEL_STADE_BCS: Record<StadeBCS, string> = {
  saillie:       'Saillie / IA',
  mi_gestation:  'Mi-gestation',
  fin_gestation: 'Fin de gestation',
  mise_bas:      'Mise-bas',
  sevrage:       'Sevrage',
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Verdict BCS pour une truie à un stade donné.
 *
 *   - `'maigre'` si bcs < min  (déficit énergétique / réserves insuffisantes)
 *   - `'grasse'` si bcs > max  (excès, risque dystocie / MMA / refus aliment)
 *   - `'ok'`     sinon
 *
 * Les valeurs limites (=min ou =max) sont considérées comme `ok`.
 *
 * @param stade Stade physiologique de la truie.
 * @param bcs   Note BCS observée (1-5).
 */
export function bcsAlerte(stade: StadeBCS, bcs: number): VerdictBCS {
  if (!Number.isFinite(bcs)) return 'ok'
  const cible = CIBLES_BCS[stade]
  if (bcs < cible.min) return 'maigre'
  if (bcs > cible.max) return 'grasse'
  return 'ok'
}

/**
 * Variante structurée : retourne le verdict + la cible utilisée + l'écart
 * absolu au plus proche bord de la fenêtre. Utile pour afficher
 * « 0.3 points sous le minimum » dans une UI conseiller.
 */
export function evaluerBCS(stade: StadeBCS, bcs: number): {
  verdict: VerdictBCS
  cible: CibleBCS
  ecart_au_min: number
  ecart_au_max: number
  ecart_a_ideal: number
} {
  const cible = CIBLES_BCS[stade]
  const verdict = bcsAlerte(stade, bcs)
  return {
    verdict,
    cible,
    ecart_au_min:  bcs - cible.min,
    ecart_au_max:  bcs - cible.max,
    ecart_a_ideal: bcs - cible.ideal,
  }
}
