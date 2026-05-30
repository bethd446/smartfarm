import Link from 'next/link'
import { PageTitle } from '@/components/ui/page-title'
import {
  Wheat,
  Sprout,
  Factory,
  Calculator,
  Calendar,
  Activity,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'

import { NutritionStats } from './_components/nutrition-stats'
import { AlimentationFab } from './_fab'

/* -------------------------------------------------------------------------- */
/*  Hub Alimentation                                                           */
/*  - Bandeau KPI dense (Conso 30j / Coût 30j / IC / Stock j restants)        */
/*  - Registre liste dense numéroté des 6 modules (D2-L2, cf hub sanitaire)   */
/* -------------------------------------------------------------------------- */

type NavCard = {
  href: string
  title: string
  description: string
  icon: typeof Sprout
}

const NAV_CARDS: NavCard[] = [
  {
    href: '/alimentation/matieres',
    title: 'Matières premières',
    description:
      'Catalogue céréales, tourteaux, sous-produits, minéraux et additifs (valeurs FAO / INRAE).',
    icon: Sprout,
  },
  {
    href: '/alimentation/concentres',
    title: 'Concentrés industriels',
    description:
      'Concentrés IVOGRAIN, De Heus, Koudijs, Vitalac — fiches par stade et prix CI.',
    icon: Factory,
  },
  {
    href: '/alimentation/formulation',
    title: 'Formulation',
    description:
      'Calculateur de formules — équilibrer MAT, EM, lysine et coût FCFA/kg.',
    icon: Calculator,
  },
  {
    href: '/alimentation/plans',
    title: 'Plans d’alimentation',
    description:
      'Planification des rations par bande : aliment, dates, kg/jour.',
    icon: Calendar,
  },
  {
    href: '/alimentation/consommations',
    title: 'Consommations',
    description:
      'Saisie quotidienne / hebdomadaire — suivi des distributions et du coût.',
    icon: Activity,
  },
  {
    href: '/alimentation/matieres-prix',
    title: 'Historique prix matières',
    description:
      'Traçabilité des relevés de prix CI dans le temps — sync auto vers prix indicatif.',
    icon: TrendingUp,
  },
]

export default async function AlimentationPage() {
  return (
    <div className="space-y-6">
      {/* En-tête ------------------------------------------------------------ */}
      <div>
        <PageTitle
          eyebrow="LOGISTIQUE"
          icon={<Wheat className="h-9 w-9 text-[var(--sf-primary)]" />}
          className="mb-1"
        >
          Alimentation
        </PageTitle>
        <p className="text-sm text-[var(--sf-muted)]">
          Nutrition porcine — matières premières, formulation, plans et suivi
          des consommations.
        </p>
      </div>

      {/* KPI ---------------------------------------------------------------- */}
      <NutritionStats />

      {/* Modules : registre liste dense numéroté (cf hub sanitaire) --------- */}
      <section aria-labelledby="alimentation-modules-titre">
        <h2
          id="alimentation-modules-titre"
          className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)] mt-2 mb-3"
        >
          Modules alimentation
        </h2>
        <div className="border-t-2" style={{ borderTopColor: 'var(--sf-primary)' }}>
          <ul>
            {NAV_CARDS.map((c, i) => {
              const Icon = c.icon
              return (
                <li key={c.href} className="border-b border-[var(--sf-line)]">
                  <Link
                    href={c.href}
                    className="group flex items-center gap-3 min-h-[56px] px-2 py-3 transition-colors hover:bg-[var(--sf-surface-1)] focus:outline-none focus-visible:bg-[var(--sf-surface-1)] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--sf-primary)]"
                  >
                    <span
                      className="tabular-nums text-[var(--sf-subtle)] text-sm font-semibold shrink-0 w-6 text-right"
                      style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Icon className="h-6 w-6 shrink-0 text-[var(--sf-primary)]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3
                          className="min-w-0 truncate text-[15px] font-semibold leading-tight tracking-[0.01em] text-[var(--sf-ink)]"
                          style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                        >
                          {c.title}
                        </h3>
                      </div>
                      <p
                        className="mt-0.5 text-xs leading-snug text-[var(--sf-muted)] line-clamp-2 md:line-clamp-1"
                        style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
                      >
                        {c.description}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--sf-subtle)] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
      <AlimentationFab />
    </div>
  )
}
