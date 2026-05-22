'use client'

/**
 * Smart Farm — Quick Actions FAB (Floating Action Button)
 * ============================================================================
 * Bouton flottant bottom-right sur /dashboard qui ouvre un bottom-sheet
 * avec 6 quick-actions 1-tap (vocab FR pro obligatoire).
 *
 * Doctrine éleveur 20 ans :
 *   - 1-tap pour les 6 gestes les plus fréquents
 *   - vocabulaire FR pro (Saillie, Mise bas, BCS, Mortalité, Diagnostic, Pesée)
 *   - icônes Lucide (pas d'emoji)
 *   - touch target h-20 mini (gants)
 *   - bottom-right fixed, z-50, safe-area-inset pour iOS
 *
 * Audit B (boutons-vs-texte) → entrée "Quick Actions à créer" tableau ligne 1-6.
 * ============================================================================
 */

import * as React from 'react'
import Link from 'next/link'
import { Plus, Heart, Baby, Activity, Skull, Search, Scale } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

type QuickAction = {
  href: string
  icon: typeof Heart
  label: string
  sub: string
}

/**
 * 6 actions canoniques (vocab FR pro vérifié contre CONTEXT.md).
 * Mapping audit A backlog P0/P1 + audit B QuickActions table.
 */
const ACTIONS: QuickAction[] = [
  {
    href: '/reproduction#new',
    icon: Heart,
    label: 'Saillie',
    sub: "aujourd'hui",
  },
  {
    href: '/mises-bas#new',
    icon: Baby,
    label: 'Mise bas',
    sub: 'confirmer',
  },
  {
    href: '/cheptel#bcs',
    icon: Activity,
    label: 'BCS truie',
    sub: 'mise à jour',
  },
  {
    href: '/sanitaire#mortalite',
    icon: Skull,
    label: 'Mortalité',
    sub: 'déclarer',
  },
  {
    href: '/reproduction#diag',
    icon: Search,
    label: 'Diagnostic',
    sub: 'gestation +',
  },
  {
    href: '/pesees#new',
    icon: Scale,
    label: 'Pesée',
    sub: 'nouvelle',
  },
]

export function QuickActionsFab() {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Actions rapides"
          className={[
            // Position : bottom-right, au-dessus de la bottom-nav mobile (~64px)
            'fixed right-5 bottom-[calc(5rem+env(safe-area-inset-bottom))]',
            'md:bottom-8 z-40',
            // Forme : pastille 64×64
            'h-16 w-16 rounded-full',
            // Style charte Terrain Vivant : vert sahel + stamp shadow
            'bg-[var(--sf-primary)] text-[var(--sf-warm)]',
            'shadow-[0_8px_24px_-4px_rgba(45,74,31,0.45),0_4px_8px_-2px_rgba(0,0,0,0.2)]',
            'ring-2 ring-[var(--sf-warm)]/40',
            // Interaction
            'flex items-center justify-center',
            'transition-transform duration-150 ease-out',
            'hover:scale-105 active:scale-95',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--sf-accent-warm,#A16207)]/60',
          ].join(' ')}
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-w-2xl mx-auto">
        <div className="mb-4">
          <div className="font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted)] font-bold">
            Actions rapides
          </div>
          <h2 className="font-[family-name:var(--sf-font-display)] text-xl font-black tracking-tight text-[var(--sf-ink)] uppercase mt-1">
            Que faites-vous ?
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map((a) => {
            const Icon = a.icon
            return (
              <Link
                key={a.href}
                href={a.href}
                onClick={() => setOpen(false)}
                className={[
                  'group flex h-20 w-full items-center gap-3 px-4',
                  'rounded-xl border-2 border-[var(--sf-line)]',
                  'bg-[var(--sf-surface-0)] hover:bg-[var(--sf-surface-2,#FEF3C7)]',
                  'hover:border-[var(--sf-primary)] active:scale-[0.98]',
                  'transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-primary)]',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex h-12 w-12 shrink-0 items-center justify-center',
                    'rounded-lg bg-[var(--sf-primary)]/10',
                    'group-hover:bg-[var(--sf-primary)] group-hover:text-[var(--sf-warm)]',
                    'text-[var(--sf-primary)] transition-colors',
                  ].join(' ')}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-[family-name:var(--sf-font-display)] uppercase text-sm font-bold tracking-[0.06em] text-[var(--sf-ink)] truncate">
                    {a.label}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.1em] text-[var(--sf-muted)] truncate">
                    {a.sub}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <p className="mt-5 text-[11px] text-[var(--sf-muted)] text-center">
          1 geste = 1 tap. Vocabulaire éleveur pro.
        </p>
      </SheetContent>
    </Sheet>
  )
}
