/**
 * Sémantique colorimétrique stricte Smart Farm.
 * Doc senior : Rouge = urgence / action immédiate
 *              Orange = événement attendu / alerte modérée / réforme
 *              Vert = nominal / OK / objectif atteint
 *              Bleu / Violet / Indigo = neutre métier (info, type)
 *
 * Tailwind class fragments only (text-, bg-, border-).
 */

export const SEM_COLORS = {
  urgence: {
    text: 'text-red-700',
    bg: 'bg-red-100',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700 border-red-200',
    badgeHC: 'bg-red-200 text-red-900 border-red-400 font-semibold',
  },
  attendu: {
    text: 'text-orange-700',
    bg: 'bg-orange-100',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    badgeHC: 'bg-orange-200 text-orange-900 border-orange-400 font-semibold',
  },
  nominal: {
    text: 'text-emerald-700',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    badgeHC: 'bg-emerald-200 text-emerald-900 border-emerald-400 font-semibold',
  },
  neutre: {
    text: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeHC: 'bg-slate-200 text-slate-900 border-slate-400 font-semibold',
  },
} as const

export type SemTone = keyof typeof SEM_COLORS

/** Seuils métier centralisés. */
export const SEUILS = {
  /** Taux de portée vivants : >= excellent = vert, >= moyen = orange, sinon rouge. */
  porteVivantsExcellent: 0.9,
  porteVivantsMoyen: 0.7,
  /** Rang de portée au-delà duquel on suggère la réforme d'une truie. */
  rangPorteeReformeMin: 8,
} as const

/** Renvoie le ton sémantique pour un taux de portée vivants (0..1). */
export function toneTauxPortee(ratio: number): SemTone {
  if (ratio >= SEUILS.porteVivantsExcellent) return 'nominal'
  if (ratio >= SEUILS.porteVivantsMoyen) return 'attendu'
  return 'urgence'
}

/** Renvoie le ton sémantique pour un stock vs son seuil d'alerte. */
export function toneStock(stockActuel: number, seuilAlerte: number | null | undefined): SemTone {
  if (seuilAlerte == null) return 'neutre'
  if (stockActuel < seuilAlerte) return 'urgence'
  if (stockActuel < seuilAlerte * 1.25) return 'attendu'
  return 'nominal'
}

/** Renvoie le ton sémantique pour une truie en fonction de son rang de portée et statut. */
export function toneTruie(rangPortee: number | null | undefined, statut: string): SemTone {
  if (statut !== 'actif') return 'neutre'
  if ((rangPortee ?? 0) >= SEUILS.rangPorteeReformeMin) return 'attendu'
  return 'nominal'
}

/** Couleurs sémantiques des actions rapides (mobile-first). */
export const ACTION_COLORS = {
  miseBas: {
    bg: 'bg-violet-600',
    hover: 'hover:bg-violet-700',
    ring: 'focus-visible:ring-violet-400',
  },
  pesee: {
    bg: 'bg-indigo-600',
    hover: 'hover:bg-indigo-700',
    ring: 'focus-visible:ring-indigo-400',
  },
  soin: {
    bg: 'bg-red-600',
    hover: 'hover:bg-red-700',
    ring: 'focus-visible:ring-red-400',
  },
  mouvement: {
    bg: 'bg-emerald-600',
    hover: 'hover:bg-emerald-700',
    ring: 'focus-visible:ring-emerald-400',
  },
} as const
