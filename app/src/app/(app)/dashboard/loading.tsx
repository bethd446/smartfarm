import { Skeleton } from '@/components/ui/skeleton'

/**
 * Smart Farm — Loading state pour /dashboard
 *
 * Squelette qui reflète la structure réelle :
 *   - header (eyebrow + H1)
 *   - KPI hero + stack (2 colonnes asymétriques)
 *   - 4 KPI techniques
 *   - Widgets Alertes + Tip du jour
 *   - Tableau Prochains événements
 *   - Grid 2 colonnes (Naissances / Stocks)
 *
 * Composant Server (pas d'interactivité). Servi automatiquement par
 * Next.js App Router pendant le chargement de page.tsx.
 */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      {/* Header */}
      <header className="space-y-2">
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-9 w-40" />
      </header>

      {/* KPI HERO + stack */}
      <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <Skeleton className="min-h-[280px] w-full" />
        <div className="flex flex-col gap-4 min-h-[280px]">
          <Skeleton className="flex-1" />
          <Skeleton className="flex-1" />
          <Skeleton className="flex-1" />
        </div>
      </section>

      {/* KPI techniques (4) */}
      <section>
        <Skeleton className="h-3 w-60 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </section>

      {/* Widgets Alertes + Tip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[320px]" />
        <Skeleton className="h-[320px]" />
      </div>

      {/* Prochains événements (table card) */}
      <Skeleton className="h-64 w-full" />

      {/* Naissances + Stocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[320px]" />
        <Skeleton className="h-[320px]" />
      </div>
    </div>
  )
}
