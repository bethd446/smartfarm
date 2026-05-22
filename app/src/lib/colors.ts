/**
 * Sémantique colorimétrique stricte Smart Farm — R7-P3.
 *
 * Doc senior : Rouge / danger = urgence / action immédiate
 *              Or / warning   = événement attendu / alerte modérée / réforme
 *              Vert / success = nominal / OK / objectif atteint
 *              Neutre         = info type, état stable
 *
 * STRATÉGIE : tous les retours utilisent les tokens CSS `--sf-{tone}-{bg|ink|border}`
 * définis dans `globals.css` (light + dark). Plus aucune classe Tailwind palette par
 * défaut (bg-red-100, text-emerald-700, etc.) — celles-ci ne suivent pas le mode dark.
 *
 * Mapping tones :
 *   urgence  → danger   (rouge)
 *   attendu  → warning  (or)
 *   nominal  → success  (vert)
 *   neutre   → neutral  (gris)
 *   info     → info     (bleu)
 */

export const SEM_COLORS = {
  urgence: {
    text: 'text-[var(--sf-danger-ink)]',
    bg: 'bg-[var(--sf-danger-bg)]',
    border: 'border-[var(--sf-danger-border)]',
    badge:
      'bg-[var(--sf-danger-bg)] text-[var(--sf-danger-ink)] border-[var(--sf-danger-border)]',
    badgeHC:
      'bg-[var(--sf-danger-bg)] text-[var(--sf-danger-ink)] border-[var(--sf-danger-border)] font-semibold',
  },
  attendu: {
    text: 'text-[var(--sf-warning-ink)]',
    bg: 'bg-[var(--sf-warning-bg)]',
    border: 'border-[var(--sf-warning-border)]',
    badge:
      'bg-[var(--sf-warning-bg)] text-[var(--sf-warning-ink)] border-[var(--sf-warning-border)]',
    badgeHC:
      'bg-[var(--sf-warning-bg)] text-[var(--sf-warning-ink)] border-[var(--sf-warning-border)] font-semibold',
  },
  nominal: {
    text: 'text-[var(--sf-success-ink)]',
    bg: 'bg-[var(--sf-success-bg)]',
    border: 'border-[var(--sf-success-border)]',
    badge:
      'bg-[var(--sf-success-bg)] text-[var(--sf-success-ink)] border-[var(--sf-success-border)]',
    badgeHC:
      'bg-[var(--sf-success-bg)] text-[var(--sf-success-ink)] border-[var(--sf-success-border)] font-semibold',
  },
  neutre: {
    text: 'text-[var(--sf-neutral-ink)]',
    bg: 'bg-[var(--sf-neutral-bg)]',
    border: 'border-[var(--sf-neutral-border)]',
    badge:
      'bg-[var(--sf-neutral-bg)] text-[var(--sf-neutral-ink)] border-[var(--sf-neutral-border)]',
    badgeHC:
      'bg-[var(--sf-neutral-bg)] text-[var(--sf-neutral-ink)] border-[var(--sf-neutral-border)] font-semibold',
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

/**
 * Couleurs sémantiques des actions rapides (mobile-first) — R7-P3 tokenisé.
 * Avant : palette arc-en-ciel (violet/indigo/red/emerald) hors charte Terre & Mil.
 * Après : 4 tons sémantiques mappés sur les tokens semantic.
 *   miseBas  → primary (vert sahel, événement central élevage)
 *   pesee    → accent-warm (or, action de mesure)
 *   soin     → danger (rouge, action sanitaire prioritaire)
 *   mouvement → primary-soft (vert clair, action neutre élevage)
 */
export const ACTION_COLORS = {
  miseBas: {
    bg: 'bg-[var(--sf-primary)]',
    hover: 'hover:bg-[var(--sf-primary-deep)]',
    ring: 'focus-visible:ring-[var(--sf-primary)]',
  },
  pesee: {
    bg: 'bg-[var(--sf-accent-warm)]',
    hover: 'hover:bg-[var(--sf-accent-warm)]/90',
    ring: 'focus-visible:ring-[var(--sf-accent-warm)]',
  },
  soin: {
    bg: 'bg-[var(--sf-danger)]',
    hover: 'hover:bg-[var(--sf-danger)]/90',
    ring: 'focus-visible:ring-[var(--sf-danger)]',
  },
  mouvement: {
    bg: 'bg-[var(--sf-primary-soft)]',
    hover: 'hover:bg-[var(--sf-primary)]',
    ring: 'focus-visible:ring-[var(--sf-primary-soft)]',
  },
} as const
