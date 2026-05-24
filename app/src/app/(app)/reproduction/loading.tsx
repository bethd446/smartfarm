import { Skeleton } from '@/components/ui/skeleton'

/**
 * Smart Farm — Loading state pour /reproduction
 *   - header H1 + sous-titre + bouton action
 *   - 2 KPI cards (Saillies totales, À diagnostiquer)
 *   - Section Saillies (header + tableau ~6 lignes)
 *   - Section Diagnostics (header + tableau ~6 lignes)
 */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-40" />
      </div>

      {/* KPI Cards (2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>

      {/* Section Saillies */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>

      {/* Section Diagnostics */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-52" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
