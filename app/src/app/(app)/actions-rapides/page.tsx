import Link from 'next/link'
import { Baby, Scale, Stethoscope, ArrowRightLeft, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type Action = {
  href: string
  label: string
  icon: typeof Baby
  classes: string
  hint: string
}

const ACTIONS: Action[] = [
  {
    href: '/mises-bas?quick=true',
    label: 'Nouvelle mise bas',
    icon: Baby,
    classes:
      'bg-[var(--apri-bg)] text-[var(--apri-d)] border-[var(--line)] hover:bg-[var(--apri)] hover:text-white focus-visible:ring-[var(--apri)]',
    hint: 'Enregistrer une portée',
  },
  {
    href: '/pesees?quick=true',
    label: 'Peser',
    icon: Scale,
    classes:
      'bg-[var(--sage-bg)] text-[var(--sage-d)] border-[var(--line)] hover:bg-[var(--sage)] hover:text-white focus-visible:ring-[var(--sage)]',
    hint: 'Saisir un poids',
  },
  {
    href: '/sanitaire?quick=true',
    label: 'Soin',
    icon: Stethoscope,
    classes:
      'bg-[var(--bad-bg)] text-[var(--bad-d)] border-[var(--line)] hover:bg-[var(--bad)] hover:text-white focus-visible:ring-[var(--bad)]',
    hint: 'Vaccin · Traitement',
  },
  {
    href: '/cheptel?quick=true',
    label: 'Déplacer',
    icon: ArrowRightLeft,
    classes:
      'bg-[var(--plum-bg)] text-[var(--berry)] border-[var(--line)] hover:bg-[var(--berry)] hover:text-white focus-visible:ring-[var(--berry)]',
    hint: 'Transfert · Sortie',
  },
]

export default function ActionsRapidesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--apri-bg)] text-[var(--apri-d)]">
          <Zap className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--disp)] tracking-tight text-[var(--ink)]">
            Actions rapides
          </h1>
          <p className="text-sm text-[var(--mut)] mt-1">Saisie terrain en un geste — pensé pour les gants.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ACTIONS.map(({ href, label, icon: Icon, classes, hint }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'min-h-32 rounded-[var(--rl)] border text-xl font-bold font-[family-name:var(--disp)] flex flex-col items-center justify-center gap-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
              classes,
            )}
          >
            <Icon className="h-8 w-8" />
            <span>{label}</span>
            <span className="text-xs font-normal font-[family-name:var(--body)] opacity-80">{hint}</span>
          </Link>
        ))}
      </div>

      <p className="text-xs text-[var(--mut)] text-center pt-4">
        Ces 4 boutons s'actionnent avec des gants. Chaque action ouvre le formulaire pré-rempli en mode rapide.
      </p>
    </div>
  )
}
