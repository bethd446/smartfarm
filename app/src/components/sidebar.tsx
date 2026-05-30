'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { deconnexionAction } from '@/app/(auth)/_actions'
import { GlobalSearch } from '@/components/global-search'
import {
  NAV_ITEMS, NAV_GROUPS,
  type SidebarUser, type SidebarFerme,
  getInitiales, getNomComplet, getRoleLabel, getBrandSubline,
} from '@/lib/nav'
import { AlertTriangle, LogOut } from 'lucide-react'

// ---------------------------------------------------------------------------
// V2-HARMONIE (HARM-A) — sidebar desktop. La nav vit dans @/lib/nav (source
// unique partagée avec mobile-drawer.tsx) pour éviter toute désynchro.
// Structure BEM .sidebar__* — styles dans design-v1.css.
// ---------------------------------------------------------------------------
export interface SidebarProps {
  user: SidebarUser | null
  ferme: SidebarFerme | null
}

/**
 * Sidebar desktop/tablette large (≥lg = 1024px) — 256px largeur fixe.
 * Sous lg, la sidebar est cachée (cf. design-v1.css line 160 + classe Tailwind),
 * le MobileDrawer + BottomNav prennent le relais.
 *
 * Markup BEM strict (.sidebar__brand / .sidebar__nav / .sidebar__group-title /
 * .sidebar__item / .sidebar__user etc.) — styles 100% dans design-v1.css.
 * Active state : border-left 2px + bg semi-transparent (cf. .is-active CSS).
 */
export function Sidebar({ user, ferme }: SidebarProps) {
  const pathname = usePathname()

  const initiales = getInitiales(user)
  const nomComplet = getNomComplet(user)
  const roleLabel = getRoleLabel(user)
  const subline = getBrandSubline(user, ferme)

  return (
    <aside
      className={cn('sidebar', 'hidden lg:flex sticky top-0')}
      role="navigation"
      aria-label="Navigation principale"
    >
      <div className="sidebar__brand">
        <div className="sidebar__glyph">
          <img src="/glyph-smartfarm.svg" alt="" width={40} height={40} />
        </div>
        <div className="min-w-0">
          <div className="sidebar__farm truncate">
            {ferme?.nom ?? 'Smart Farm'}
          </div>
          <div className="sidebar__id numeric truncate">{subline}</div>
        </div>
      </div>

      {/* Bandeau d'alerte si user pas lié à une ferme */}
      {user && !ferme && (
        <Link
          href="/onboarding"
          className={cn(
            'mx-3 mt-3 rounded-md border border-amber-500/40 bg-amber-500/10',
            'text-amber-200 hover:bg-amber-500/20 transition-colors',
            'flex items-center gap-2 p-2 text-[11px] leading-tight',
          )}
          title="Aucune ferme. Configurez votre exploitation."
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Aucune ferme.<br />
            <span className="text-amber-100 underline">Configurer mon exploitation →</span>
          </span>
        </Link>
      )}

      {/* GlobalSearch desktop (sticky position) */}
      <div className="px-3 py-2">
        <GlobalSearch />
      </div>

      <nav className="sidebar__nav">
        {NAV_GROUPS.map(group => (
          <div className="sidebar__group" key={group}>
            <div className="sidebar__group-title">{group}</div>
            {NAV_ITEMS.filter(n => n.group === group).map(item => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
    </aside>
  )
}
