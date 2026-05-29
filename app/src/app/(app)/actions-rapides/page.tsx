import Link from 'next/link'
import { Baby, Scale, Stethoscope, ArrowRightLeft, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type Action = {
  href: string
  label: string
  icon: typeof Baby
  tone: string
  hint: string
}

const ACTIONS: Action[] = [
  {
    href: '/mises-bas?quick=true',
    label: 'Nouvelle mise bas',
    icon: Baby,
    tone: 'var(--sf-primary)',
    hint: 'Enregistrer une portée',
  },
  {
    href: '/pesees?quick=true',
    label: 'Peser',
    icon: Scale,
    tone: 'var(--sf-info-ink, var(--sf-info))',
    hint: 'Saisir un poids',
  },
  {
    href: '/sanitaire?quick=true',
    label: 'Soin',
    icon: Stethoscope,
    tone: 'var(--sf-danger-ink, var(--sf-danger))',
    hint: 'Vaccin · Traitement',
  },
  {
    href: '/cheptel?quick=true',
    label: 'Déplacer',
    icon: ArrowRightLeft,
    tone: 'var(--sf-accent)',
    hint: 'Transfert · Sortie',
  },
]

export default function ActionsRapidesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="h-8 w-8 text-[var(--sf-accent)]" />
        <div>
          <p
            className="text-xs uppercase tracking-[0.18em] text-[var(--sf-muted)]"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            TERRAIN
          </p>
          <h1
            className="text-3xl text-[var(--sf-ink)] leading-tight"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            Actions rapides
          </h1>
          <p className="text-sm text-[var(--sf-muted)] mt-1">Saisie terrain en un geste — pensé pour les gants.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ACTIONS.map(({ href, label, icon: Icon, tone, hint }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'h-32 rounded-xl border border-[var(--sf-line)] bg-[var(--sf-surface-1)] flex flex-col items-center justify-center gap-2 transition-colors',
              'hover:bg-[var(--sf-surface-2)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sf-surface-1)]',
            )}
          >
            <Icon className="h-8 w-8" style={{ color: tone }} />
            <span
              className="text-xl text-[var(--sf-ink)]"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              {label}
            </span>
            <span className="text-xs text-[var(--sf-muted)]">{hint}</span>
          </Link>
        ))}
      </div>

      <p className="text-xs text-[var(--sf-muted)] text-center pt-4">
        Ces 4 boutons s&apos;actionnent avec des gants. Chaque action ouvre le formulaire pré-rempli en mode rapide.
      </p>
    </div>
  )
}
