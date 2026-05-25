'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import {
  type SidebarUser,
  type SidebarFerme,
  getInitiales,
  getNomComplet,
  getRoleLabel,
} from '@/components/sidebar'
import {
  LayoutDashboard, PiggyBank, Heart, Baby,
  Stethoscope, Wheat, Package, TrendingUp, Settings, Building2, Bell,
  Sparkles, AlertTriangle,
  X, LogOut,
} from 'lucide-react'
import { deconnexionAction } from '@/app/(auth)/_actions'

// ---------------------------------------------------------------------------
// V2-HARMONIE (HARM-A) — doit rester aligné 1:1 avec sidebar.tsx
//   5 groupes / 14 menus — Pilotage/Élevage/Santé/Alimentation/Système
// Refonte v1.0 : classes BEM .sidebar__* (styles design-v1.css)
// ---------------------------------------------------------------------------
const nav = [
  // Pilotage
  { href: '/dashboard',             label: 'Tableau de bord',       icon: LayoutDashboard, group: 'Pilotage' },
  { href: '/alertes',               label: 'Alertes',               icon: Bell,            group: 'Pilotage' },
  { href: '/kpi',                   label: 'Performances',          icon: TrendingUp,      group: 'Pilotage' },

  // Élevage
  { href: '/cheptel',               label: 'Cheptel',               icon: PiggyBank,       group: 'Élevage' },
  { href: '/batiments',             label: 'Bâtiments',             icon: Building2,       group: 'Élevage' },
  { href: '/reproduction',          label: 'Reproduction',          icon: Heart,           group: 'Élevage' },
  { href: '/mises-bas',             label: 'Mises bas',             icon: Baby,            group: 'Élevage' },

  // Santé
  { href: '/sanitaire',             label: 'Sanitaire',             icon: Stethoscope,     group: 'Santé' },

  // Alimentation
  { href: '/alimentation',          label: 'Alimentation',          icon: Wheat,           group: 'Alimentation' },
  { href: '/stock',                 label: 'Stock',                 icon: Package,         group: 'Alimentation' },

  // Système
  { href: '/assistant',             label: 'Assistant',             icon: Sparkles,        group: 'Système' },
  { href: '/parametres',            label: 'Paramètres',            icon: Settings,        group: 'Système' },
]

export interface MobileDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: SidebarUser | null
  ferme?: SidebarFerme | null
}

function getBrandSubline(user: SidebarUser | null, ferme: SidebarFerme | null): string {
  const code = user?.numero_client?.trim() || ''
  const loc = ferme?.localisation?.trim() || ''
  if (code && loc) return `${code} · ${loc}`
  if (code) return code
  if (loc) return loc
  return 'Élevage porcin · CI'
}

/**
 * Mobile drawer plein écran (slide from left) — variante mobile de la sidebar.
 * Réutilise le markup BEM .sidebar__* (mêmes styles design-v1.css), mais le
 * conteneur Radix Dialog force display:flex (CSS sidebar le cache sous 768px,
 * on contre via inline style — ce composant n'apparaît jamais sur desktop).
 */
export function MobileDrawer({ open, onOpenChange, user = null, ferme = null }: MobileDrawerProps) {
  const pathname = usePathname()
  const groups = Array.from(new Set(nav.map(n => n.group)))

  const initiales = getInitiales(user)
  const nomComplet = getNomComplet(user)
  const roleLabel = getRoleLabel(user)
  const subline = getBrandSubline(user, ferme)

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
          // sidebar (256px) + slide animation. !flex pour défier le media-query qui cache .sidebar.
          className={cn(
            'sidebar !flex',
            'fixed inset-y-0 left-0 z-50 shadow-2xl outline-none',
            'w-[min(88vw,288px)]',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-left',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left',
            'duration-200',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Navigation principale</DialogPrimitive.Title>

          <div className="sidebar__brand">
            <div className="sidebar__glyph">
              <img src="/glyph-smartfarm.svg" alt="" width={40} height={40} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="sidebar__farm truncate">{ferme?.nom ?? 'Smart Farm'}</div>
              <div className="sidebar__id numeric truncate">{subline}</div>
            </div>
            <DialogPrimitive.Close
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--sf-primary,#2D4A1F)]"
              aria-label="Fermer le menu"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Bandeau d'alerte si user pas lié à une ferme */}
          {user && !ferme && (
            <Link
              href="/onboarding"
              onClick={() => onOpenChange(false)}
              className={cn(
                'mx-3 mt-3 rounded-md border border-amber-500/40 bg-amber-500/10',
                'text-amber-200 hover:bg-amber-500/20 transition-colors',
                'flex items-center gap-2 p-3 text-[11px] leading-tight',
              )}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Aucune ferme.<br />
                <span className="text-amber-100 underline">Configurer mon exploitation →</span>
              </span>
            </Link>
          )}

          <nav className="sidebar__nav">
            {groups.map(group => (
              <div className="sidebar__group" key={group}>
                <div className="sidebar__group-title">{group}</div>
                {nav.filter(n => n.group === group).map(item => {
                  const active = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn('sidebar__item', active && 'is-active')}
                    >
                      <span className="sidebar__ic" aria-hidden>
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="sidebar__user">
            <div
              className="sidebar__avatar flex items-center justify-center text-[12px] font-bold text-white/90"
              aria-hidden
            >
              {initiales}
            </div>
            <div className="flex-1 min-w-0">
              <div className="sidebar__user-name">{nomComplet}</div>
              <div className="sidebar__user-role">{roleLabel}</div>
            </div>
            <form action={deconnexionAction}>
              <button
                type="submit"
                className="sidebar__logout"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
