import { Syringe, Skull, AlertTriangle, Activity } from 'lucide-react'
import { getSanitaireStats } from '../calendrier/_queries'

/**
 * SanitaireStats - bandeau de stats dense (ex-4 KPI cards hero-metric).
 * Server Component : fait ses queries lui-meme via getSanitaireStats().
 *   1. Couverture vaccinale (30j)
 *   2. Taux mortalité (30j)
 *   3. Actes sanitaires en retard
 *   4. Top cause mortalite (90j)
 *
 * D1-L1 : grille de cards egales -> bandeau registre dense (hairlines + tabular-nums),
 * tons semantiques conserves sur l'icone/valeur, 0 fond de card colore.
 */
export async function SanitaireStats() {
  const stats = await getSanitaireStats()

  const cells = [
    {
      icon: Syringe,
      tone: 'var(--sf-primary, #2D4A1F)',
      period: '30 j',
      label: 'Couverture vaccinale',
      value: stats.couvertureVaccinalePct == null ? '—' : `${stats.couvertureVaccinalePct} %`,
      sub: stats.couvertureLabel,
    },
    {
      icon: Skull,
      tone: 'var(--sf-danger-ink, #7A2A1F)',
      period: '30 j',
      label: 'Taux mortalité',
      value: stats.tauxMortalite30jPct == null ? '—' : `${stats.tauxMortalite30jPct} %`,
      sub: `${stats.morts30j} / ${stats.effectifMoyen} animaux`,
    },
    {
      icon: AlertTriangle,
      tone: 'var(--sf-warning-ink, #5A3E0E)',
      period: 'calendrier',
      label: 'Actes en retard',
      value: `${stats.actesEnRetard}`,
      sub: 'Vaccins / soins a rattraper',
    },
    {
      icon: Activity,
      tone: 'var(--sf-info-ink, #1F3A55)',
      period: '90 j',
      label: 'Cause principale',
      value: stats.topCauseMortalite ?? 'Aucune perte',
      sub: stats.topCauseMortalite ? `${stats.topCauseMortaliteCount} cas` : '—',
      compact: true,
    },
  ]

  return (
    <section
      aria-label="Indicateurs sanitaires"
      className="border-t-2 border-b border-[var(--sf-line)]"
      style={{ borderTopColor: 'var(--sf-primary)' }}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {cells.map((c, i) => {
          const Icon = c.icon
          return (
            <div
              key={c.label}
              className={[
                'min-h-[44px] px-3 py-3 sm:px-4',
                'border-[var(--sf-line)]',
                i % 2 === 1 ? 'border-l' : '',
                'lg:border-l',
                i % 4 === 0 ? 'lg:border-l-0' : '',
                i >= 2 ? 'border-t lg:border-t-0' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <Icon className="h-4 w-4 shrink-0" style={{ color: c.tone }} />
                <span
                  className="text-[10px] uppercase tracking-[0.16em] shrink-0"
                  style={{
                    color: 'var(--sf-subtle, #8A7F6D)',
                    fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  }}
                >
                  {c.period}
                </span>
              </div>
              <div
                className={[
                  'mt-1.5 font-bold tabular-nums leading-tight',
                  c.compact ? 'text-base line-clamp-2' : 'text-2xl',
                ].join(' ')}
                style={{ color: c.tone }}
              >
                {c.value}
              </div>
              <div
                className="mt-1 text-[11px] uppercase tracking-[0.12em] leading-tight"
                style={{
                  color: 'var(--sf-muted, #5C5346)',
                  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                }}
              >
                {c.label}
              </div>
              <div
                className="mt-0.5 text-[11px] tabular-nums leading-tight"
                style={{ color: 'var(--sf-subtle, #8A7F6D)' }}
              >
                {c.sub}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
