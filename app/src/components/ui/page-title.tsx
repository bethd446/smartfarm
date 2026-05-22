import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/**
 * <PageTitle> — composant unique pour les H1 de page (R7-P3).
 *
 * Remplace les <h1 className="..."> ad-hoc qui généraient 4 styles différents
 * sur 14 pages. Source unique : Big Shoulders Display, text-4xl black uppercase,
 * tracking ouvert, eyebrow optionnel au-dessus, icône Lucide optionnelle.
 *
 * Usage :
 *   <PageTitle eyebrow="PILOTAGE" icon={<LayoutDashboard className="h-7 w-7 text-[var(--sf-primary)]" />}>
 *     Tableau de bord
 *   </PageTitle>
 */
export function PageTitle({
  children,
  icon,
  eyebrow,
  className,
}: {
  children: ReactNode
  icon?: ReactNode
  eyebrow?: string
  className?: string
}) {
  return (
    <header className={cn('mb-6 space-y-1', className)}>
      {eyebrow && (
        <p className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted)] font-bold">
          {eyebrow}
        </p>
      )}
      <h1 className="font-[family-name:var(--sf-font-display)] text-4xl font-black uppercase tracking-[0.02em] text-[var(--sf-ink)] flex items-center gap-3">
        {icon}
        {children}
      </h1>
    </header>
  )
}
