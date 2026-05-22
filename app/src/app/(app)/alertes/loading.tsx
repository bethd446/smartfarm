import { Skeleton } from '@/components/ui/skeleton'

/**
 * Smart Farm — Loading state pour /alertes
 *   - header H1 + sous-titre
 *   - 4 KPI cards (total / critique / élevée / moyenne)
 *   - barre filtres
 *   - liste groupée
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>

      {/* KPI Cards (4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>

      {/* Barre filtres */}
      <Skeleton className="h-20 w-full" />

      {/* Liste */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  )
}
