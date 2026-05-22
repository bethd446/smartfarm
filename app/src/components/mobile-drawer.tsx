'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import type { SidebarUser, SidebarFerme } from '@/components/sidebar'
import {
  LayoutDashboard, PiggyBank, Layers, Heart, Baby,
  Stethoscope, Wheat, Package, TrendingUp, Settings, Building2, Bell,
  Sparkles, AlertTriangle,
  X, LogOut,
} from 'lucide-react'
import { deconnexionAction } from '@/app/(auth)/_actions'

// ---------------------------------------------------------------------------
// V2-HARMONIE (HARM-A) — doit rester aligné 1:1 avec sidebar.tsx
//   5 groupes / 11 menus
// ---------------------------------------------------------------------------
const nav = [
  // Pilotage
  { href: '/dashboard',             label: 'Tableau de bord',       icon: LayoutDashboard, group: 'Pilotage' },
  { href: '/alertes',               label: 'Alertes',               icon: Bell,            group: 'Pilotage' },
  { href: '/kpi',                   label: 'Performances',          icon: TrendingUp,      group: 'Pilotage' },

  // Élevage
  { href: '/cheptel',               label: 'Cheptel',               icon: PiggyBank,       group: 'Élevage' },
  { href: '/bandes',                label: 'Bandes',                icon: Layers,          group: 'Élevage' },
  { href: '/batiments',             label: 'Bâtiments',             icon: Building2,       group: 'Élevage' },
  { href: '/reproduction',          label: 'Reproduction',          icon: Heart,           group: 'Élevage' },
  { href: '/mises-bas',             label: 'Mises bas',             icon: Baby,            group: 'Élevage' },

  // Santé
  { href: '/sanitaire',             label: 'Sanitaire',             icon: Stethoscope,     group: 'Santé' },
  { href: '/sanitaire/ppa',         label: 'PPA',                   icon: AlertTriangle,   group: 'Santé' },

  // Logistique
  { href: '/alimentation',          label: 'Alimentation',          icon: Wheat,           group: 'Logistique' },
  { href: '/stock',                 label: 'Stock',                 icon: Package,         group: 'Logistique' },

  // Système
  { href: '/assistant',             label: 'Assistant',             icon: Sparkles,        group: 'Système' },
  { href: '/parametres',            label: 'Paramètres',            icon: Settings,        group: 'Système' },
]

export interface MobileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** L2 Sprint 1 — user/ferme injectés par AppShell (eux-mêmes fetchés SSR). */
  user?: SidebarUser | null
  ferme?: SidebarFerme | null
}

/**
 * Mobile drawer plein écran (slide from left).
 * Wrapper sur Radix Dialog — contrôlé via props (open / onOpenChange).
 * Contient l'intégralité du menu sidebar groupé.
 * Ferme automatiquement au clic sur un item de navigation.
 *
 * L2 Sprint 1 : header affiche le nom de la ferme réelle (ou "Smart Farm" si
 * pas de ferme liée) + bannière "Aucune ferme" qui pointe vers /onboarding.
 */
export function MobileDrawer({ open, onOpenChange, user = null, ferme = null }: MobileDrawerProps) {
  const pathname = usePathname()
  const groups = Array.from(new Set(nav.map(n => n.group)))

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col w-[88vw] max-w-[320px]',
            'bg-[#1a1a1a] dark:bg-[#0d0c09] text-white/90 shadow-2xl outline-none',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-left',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left',
            'duration-200',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Navigation principale</DialogPrimitive.Title>

          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#FFFBEB] flex items-center justify-center shadow overflow-hidden">
              <img src="/glyph-smartfarm.svg" alt="Smart Farm" className="h-9 w-9" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base text-white truncate">{ferme?.nom ?? 'Smart Farm'}</div>
              <div className="text-[10px] text-white/70 uppercase tracking-[0.15em] truncate">Élevage porcin · Côte d&apos;Ivoire</div>
              {ferme?.localisation && (
                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5 truncate">
                  {ferme.localisation} <span aria-hidden>🇨🇮</span>
                </div>
              )}
            </div>
            <DialogPrimitive.Close
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--sf-primary,#2D4A1F)]"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* L2 Sprint 1 — bandeau "Aucune ferme" si user pas lié */}
          {user && !ferme && (
            <Link
              href="/onboarding"
              onClick={() => onOpenChange(false)}
              className={cn(
                'mx-3 mt-3 rounded-md border border-amber-500/40 bg-amber-500/10',
                'text-amber-200 hover:bg-amber-500/20 transition-colors',
                'flex items-center gap-2 p-3',
              )}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-[11px] leading-tight">
                Aucune ferme.<br />
                <span className="text-amber-100 underline">Configurer mon exploitation →</span>
              </span>
            </Link>
          )}

          <nav className="flex-1 overflow-y-auto p-3 space-y-4">
            {groups.map(group => (
              <div key={group}>
                <div className="text-[10px] uppercase tracking-wider text-white/50 px-2 mb-1.5">{group}</div>
                <ul className="space-y-0.5">
                  {nav.filter(n => n.group === group).map(item => {
                    const active = pathname === item.href
                    const Icon = item.icon
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => onOpenChange(false)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex items-center gap-3 px-3 h-12 rounded-md text-base transition-colors',
                            active
                              ? 'bg-[var(--sf-primary)] text-white font-semibold'
                              : 'text-white/70 hover:bg-white/5 hover:text-white',
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Bouton Déconnexion mobile (L1/B1) */}
          <div className="border-t border-slate-800 p-3">
            <form action={deconnexionAction}>
              <button
                type="submit"
                aria-label="Déconnexion"
                className={cn(
                  'flex items-center gap-3 w-full px-3 h-12 rounded-md transition-colors',
                  'text-base font-semibold uppercase tracking-[0.08em]',
                  'text-white/80 hover:bg-white/5 hover:text-white',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                )}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span>Déconnexion</span>
              </button>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
