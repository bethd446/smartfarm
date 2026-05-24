import { Skeleton } from '@/components/ui/skeleton'

/**
 * Smart Farm — Loading state pour /kpi (Performances)
 *   - header H1 + sous-titre + boutons actions
 *   - KPI Ferme (4 cards)
 *   - Section Truies: header + 4 KPI techniques + tableau ranking (~8 lignes)
 *   - Section Bandes: header + 4 KPI techniques + tableau ranking (~5 lignes)
 */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* KPI Ferme (4 cards) */}
      <section className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </section>

      {/* Section Truies */}
      <section className="space-y-4">
        <Skeleton className="h-7 w-64" />
        
        {/* 4 KPI techniques truies */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>

        {/* Ranking truies */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </section>

      {/* Section Bandes */}
      <section className="space-y-4">
        <Skeleton className="h-7 w-56" />
        
        {/* 4 KPI techniques bandes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>

        {/* Ranking bandes */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </section>
    </div>
  )
}
