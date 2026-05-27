'use client'

import * as React from 'react'
import { Sidebar, type SidebarUser, type SidebarFerme } from '@/components/sidebar'
import { BottomNav } from '@/components/bottom-nav'
import { MobileDrawer } from '@/components/mobile-drawer'
import { GlobalSearch } from '@/components/global-search'
import { QuickActionsFab } from '@/components/quick-actions-fab'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * AppShell : client wrapper qui orchestre la nav responsive.
 *
 * Garde la sidebar (desktop/tablette), un header mobile sticky avec hamburger,
 * la bottom-nav (mobile) et le mobile-drawer (déclenché depuis le hamburger
 * ou depuis le slot "Plus" de la bottom-nav).
 *
 * Le layout serveur Next.js délègue ici toute la chrome qui a besoin de state.
 *
 * L2 Sprint 1 : reçoit `user` et `ferme` en props (fetchés SSR par le layout)
 * et les propage à la Sidebar + MobileDrawer pour rendre l'identité réelle.
 */
export interface AppShellProps {
  children: React.ReactNode
  /** Nombre d'alertes actives (V2-G — passé en SSR par le layout). */
  alertesCount?: number
  /** User connecté (SSR — null si non connecté ou pas de profil utilisateurs). */
  user?: SidebarUser | null
  /** Ferme principale du user (SSR — null si pas de liaison utilisateur_fermes). */
  ferme?: SidebarFerme | null
}

export function AppShell({
  children,
  alertesCount = 0,
  user = null,
  ferme = null,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} ferme={ferme} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile/tablette (caché ≥lg, où la sidebar prend le relais) */}
        <header
          className={cn(
            'lg:hidden sticky top-0 z-30 h-14',
            'flex items-center gap-3 px-3',
            'bg-[var(--sf-surface-1)] border-b border-[var(--sf-line,rgba(0,0,0,0.08))]',
          )}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-md',
              'text-[var(--sf-ink,#1a1a1a)] hover:bg-black/5',
              'focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--sf-primary,#2D4A1F)]',
            )}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-md bg-[#FFFBEB] flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/glyph-smartfarm.svg" alt="Smart Farm" className="h-7 w-7" />
            </div>
            <div className="font-[family-name:var(--sf-font-display)] uppercase tracking-wide text-base text-[var(--sf-ink,#1a1a1a)] truncate">
              {ferme?.nom ?? 'Smart Farm'}
            </div>
          </div>
          <GlobalSearch />
        </header>

        <main className="flex-1 min-w-0 overflow-x-hidden bg-[var(--sf-surface-1)] pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 min-w-0">
            {children}
          </div>
        </main>
      </div>

      <BottomNav onOpenMore={() => setDrawerOpen(true)} alertesCount={alertesCount} />
      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        user={user}
        ferme={ferme}
      />
      <QuickActionsFab />
    </div>
  )
}
