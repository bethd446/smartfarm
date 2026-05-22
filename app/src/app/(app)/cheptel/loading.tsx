import { Skeleton } from '@/components/ui/skeleton'

/**
 * Smart Farm — Loading state pour /cheptel
 *   - header H1 + sous-titre + bouton action
 *   - tableau (8 colonnes, ~8 lignes)
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-12 w-44" />
      </div>

      {/* Tableau */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
