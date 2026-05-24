export default function CroissanceLoading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="w-32 h-4 bg-[var(--sf-surface-2)] rounded mb-3" />
        <div className="w-48 h-10 bg-[var(--sf-surface-2)] rounded mb-2" />
        <div className="w-96 h-4 bg-[var(--sf-surface-2)] rounded" />
      </div>

      {/* Chart card skeleton */}
      <div className="border border-[var(--sf-line)] rounded-lg p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 h-12 bg-[var(--sf-surface-2)] rounded" />
          <div className="flex-1 h-12 bg-[var(--sf-surface-2)] rounded" />
        </div>
        <div className="w-full h-96 bg-[var(--sf-surface-2)] rounded" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-[var(--sf-line)] rounded-lg p-4">
            <div className="w-32 h-3 bg-[var(--sf-surface-2)] rounded mb-2" />
            <div className="w-20 h-10 bg-[var(--sf-surface-2)] rounded mb-1" />
            <div className="w-24 h-3 bg-[var(--sf-surface-2)] rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="border border-[var(--sf-line)] rounded-lg p-6">
        <div className="w-64 h-6 bg-[var(--sf-surface-2)] rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full h-12 bg-[var(--sf-surface-2)] rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
