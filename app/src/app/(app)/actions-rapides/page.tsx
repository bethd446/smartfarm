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
    label: 'Mise-bas',
    icon: Baby,
    classes: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-400',
    hint: 'Enregistrer une portée',
  },
  {
    href: '/pesees?quick=true',
    label: 'Pesée',
    icon: Scale,
    classes: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-400',
    hint: 'Saisir un poids',
  },
  {
    href: '/sanitaire?quick=true',
    label: 'Soin',
    icon: Stethoscope,
    classes: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-400',
    hint: 'Vaccin · Traitement',
  },
  {
    href: '/cheptel?quick=true',
    label: 'Mouvement',
    icon: ArrowRightLeft,
    classes: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-400',
    hint: 'Transfert · Sortie',
  },
]

export default function ActionsRapidesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="h-8 w-8 text-amber-500" />
        <div>
          <h1 className="text-3xl font-bold">Actions rapides</h1>
          <p className="text-sm text-slate-500 mt-1">Saisie terrain en un geste — optimisé tactile gants.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ACTIONS.map(({ href, label, icon: Icon, classes, hint }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'h-32 rounded-xl text-white text-xl font-bold flex flex-col items-center justify-center gap-2 shadow-md transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
              classes,
            )}
          >
            <Icon className="h-8 w-8" />
            <span>{label}</span>
            <span className="text-xs font-normal opacity-90">{hint}</span>
          </Link>
        ))}
      </div>

      <p className="text-xs text-slate-500 text-center pt-4">
        Astuce : ces 4 boutons sont conçus pour être actionnés avec des gants. Chaque action ouvre le formulaire pré-rempli en mode rapide.
      </p>
    </div>
  )
}
