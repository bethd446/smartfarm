import type { LucideIcon } from 'lucide-react'

/**
 * Tone sémantique d'un KPI technique métier.
 * - good   = dans la cible (vert)
 * - warn   = limite (orange)
 * - bad    = hors cible (rouge)
 * - muted  = pas de données / non calculable
 */
export type KpiTone = 'good' | 'warn' | 'bad' | 'muted'

/** ISSF : 5-7 j idéal, 4-10 acceptable, >10 problème.
 *  Anti-piège brief : < 4j = suspect (retour chaleur non sevré) → warn pas good. */
export function toneIssf(v: number | null | undefined): KpiTone {
  if (v === null || v === undefined) return 'muted'
  const n = Number(v)
  if (!Number.isFinite(n)) return 'muted'
  if (n < 4) return 'warn'
  if (n <= 7) return 'good'
  if (n <= 10) return 'warn'
  return 'bad'
}

/** Productivité numérique : ≥22 cible, 18-22 limite, <18 mauvais. */
export function toneProductivite(v: number | null | undefined): KpiTone {
  if (v === null || v === undefined) return 'muted'
  const n = Number(v)
  if (!Number.isFinite(n)) return 'muted'
  if (n >= 22) return 'good'
  if (n >= 18) return 'warn'
  return 'bad'
}

/** TMM : ≤8% cible, 8-12 limite, >12 mauvais. */
export function toneTmm(v: number | null | undefined): KpiTone {
  if (v === null || v === undefined) return 'muted'
  const n = Number(v)
  if (!Number.isFinite(n)) return 'muted'
  if (n <= 8) return 'good'
  if (n <= 12) return 'warn'
  return 'bad'
}

/** Nés vivants/portée : ≥12 cible, 10-12 limite, <10 faible. */
export function toneNesVivants(v: number | null | undefined): KpiTone {
  if (v === null || v === undefined) return 'muted'
  const n = Number(v)
  if (!Number.isFinite(n)) return 'muted'
  if (n >= 12) return 'good'
  if (n >= 10) return 'warn'
  return 'bad'
}

/** Couleurs CSS sémantiques (tokens design carnet d'élevage). */
export function toneColors(t: KpiTone): { fg: string; bg: string } {
  switch (t) {
    case 'good':
      return { fg: 'var(--sf-primary)', bg: 'var(--sf-surface-2)' }
    case 'warn':
      return { fg: 'var(--sf-accent-deep, #B45309)', bg: 'var(--sf-warm)' }
    case 'bad':
      return { fg: 'var(--sf-danger-ink, #7A2A1F)', bg: 'var(--sf-surface-2)' }
    default:
      return { fg: 'var(--sf-muted)', bg: 'var(--sf-surface-2)' }
  }
}

export interface KpiTechCardProps {
  icon: LucideIcon
  label: string
  sub: string
  value: number | string | null | undefined
  unit?: string
  target?: string
  tone: KpiTone
  digits?: number
}

/**
 * Card KPI technique métier — utilisé sur dashboard et fiche truie.
 * Affiche : icône, label uppercase, valeur tabulaire colorée, sous-titre cible.
 */
export function KpiTechCard({
  icon: Icon,
  label,
  sub,
  value,
  unit = '',
  target,
  tone,
  digits = 1,
}: KpiTechCardProps) {
  const { fg, bg } = toneColors(tone)
  const num = value === null || value === undefined || value === '' ? null : Number(value)
  const hasValue = num !== null && Number.isFinite(num)
  const display = hasValue ? (num as number).toFixed(digits) : null
  return (
    <div
      className="p-5 border border-[var(--sf-line)]"
      style={{ background: bg }}
    >
      <Icon className="h-5 w-5 mb-2" style={{ color: fg }} aria-hidden />
      {hasValue ? (
        <div
          className="text-2xl font-bold tabular-nums"
          style={{ color: fg, fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
        >
          {display}
          {unit ? (
            <span className="text-base ml-1" style={{ color: 'var(--sf-muted)' }}>
              {unit}
            </span>
          ) : null}
        </div>
      ) : (
        <div
          className="text-xs italic leading-snug"
          style={{ color: 'var(--sf-muted)' }}
          title="Minimum 1 cycle complet (sevrage → saillie fécondante) requis pour calculer ce KPI."
        >
          Données insuffisantes — minimum 1 cycle complet (sevrage → saillie fécondante) requis
        </div>
      )}
      <div
        className="mt-1 font-bold text-[var(--sf-ink)]"
        style={{
          fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
        }}
      >
        {label}
      </div>
      <div
        className="mt-1 italic"
        style={{ fontSize: '12px', color: 'var(--sf-muted)' }}
      >
        {sub}
      </div>
      {target ? (
        <div
          className="mt-2"
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--sf-subtle, var(--sf-muted))',
          }}
        >
          {target}
        </div>
      ) : null}
    </div>
  )
}
