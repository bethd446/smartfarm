import { Skeleton } from '@/components/ui/skeleton'

export default function KpiLoading() {
  return (
    <div className="pb-8">
      {/* En-tête de planche */}
      <div className="pt-1 pb-5" style={{ borderTop: '3px solid var(--sf-primary)' }}>
        <Skeleton className="h-3 w-56 mb-3" />
        <Skeleton className="h-9 w-80 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Bandeau-figure + registre support */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr]">
        <div className="py-8 lg:py-10 lg:pr-10" style={{ borderBottom: '1px solid var(--sf-line)' }}>
          <Skeleton className="h-3 w-44 mb-4" />
          <Skeleton className="h-28 w-64 mb-4" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="lg:pl-10 lg:border-l lg:border-[var(--sf-line)]">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-4"
              style={{ borderBottom: '1px solid var(--sf-line)', borderTop: i === 0 ? '1px solid var(--sf-line)' : undefined }}
            >
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Planche performance par bande */}
      <div className="pt-9">
        <Skeleton className="h-6 w-56 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>

      {/* Deux planches truies */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-9 pt-9 md:grid-cols-2">
        {[0, 1].map((c) => (
          <div key={c}>
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
