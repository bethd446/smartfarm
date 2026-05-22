import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { PageTitle } from '@/components/ui/page-title'
import {
  Wheat,
  Sprout,
  Factory,
  Calculator,
  Calendar,
  Activity,
  ChevronRight,
} from 'lucide-react'

import { NutritionStats } from './_components/nutrition-stats'

/* -------------------------------------------------------------------------- */
/*  Hub Alimentation — refonte C6                                              */
/*  - 4 KPI cards (Conso 30j / Coût 30j / IC / Stock j restants)              */
/*  - 5 cards de navigation                                                    */
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

      {/* Cards de navigation ----------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {NAV_CARDS.map((c) => {
          const Icon = c.icon
          return (
            <Link key={c.href} href={c.href} className="group">
              <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="rounded-lg p-2.5 shrink-0"
                      style={{
                        background: 'var(--sf-bg, #F5F1E8)',
                        color: 'var(--sf-primary, #2D4A1F)',
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-base text-[var(--sf-ink,#1a1a1a)]">
                          {c.title}
                        </h3>
                        <ChevronRight className="h-4 w-4 text-[var(--sf-muted,#5C5346)] group-hover:text-[var(--sf-primary,#2D4A1F)] transition-colors" />
                      </div>
                      <p className="text-xs text-[var(--sf-muted,#5C5346)] mt-1 leading-relaxed">
                        {c.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
