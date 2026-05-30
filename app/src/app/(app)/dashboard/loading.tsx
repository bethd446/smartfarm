import { Skeleton } from '@/components/ui/skeleton'

/**
 * Smart Farm — Loading state pour /dashboard (macrostructure Workbench)
 *
 * Reflète la structure réelle du poste de travail :
 *   - en-tête lite (eyebrow + H1 + relevé d'atelier en bande)
 *   - Zone 1 « À traiter » : 2 établis (alertes / échéances)
 *   - Zone 2 « Relevé technique » : bande de KPI
 *   - Zone 3 « Activité récente » : 2 établis (naissances / stock) + note de pied
 *
 * Composant Server. Servi automatiquement par Next.js App Router pendant
 * le chargement de page.tsx.
 */
export default function Loading() {
  return (
    <div className="space-y-6 lg:space-y-7" aria-busy="true" aria-live="polite">
      {/* En-tête lite + relevé d'atelier */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[var(--sf-primary)] pb-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="flex gap-px">
          <Skeleton className="h-14 w-[84px]" />
          <Skeleton className="h-14 w-[84px]" />
          <Skeleton className="h-14 w-[84px]" />
          <Skeleton className="h-14 w-[84px]" />
        </div>
      </header>

      {/* Zone 1 — À traiter (2 établis) */}
      <section>
        <Skeleton className="mb-3 h-4 w-52" />
        <div className="grid grid-cols-1 gap-px border border-[var(--sf-line)] lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </section>

      {/* Zone 2 — Relevé technique */}
      <section>
        <Skeleton className="mb-3 h-4 w-44" />
        <div className="grid grid-cols-2 gap-px md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </section>

      {/* Zone 3 — Activité récente (2 établis) + note de pied */}
      <section>
        <Skeleton className="mb-3 h-4 w-44" />
        <div className="grid grid-cols-1 gap-px border border-[var(--sf-line)] lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="mt-3 h-24 w-full" />
      </section>
    </div>
  )
}
