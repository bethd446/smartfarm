'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, PiggyBank, Heart, Bell, MoreHorizontal,
} from 'lucide-react'

type Slot = {
  href?: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  /** Si défini, ne navigue pas et appelle ce handler à la place (slot "Plus"). */
  action?: 'more'
  /** Si true, affiche le badge alertes en haut à droite. */
  withAlertesBadge?: boolean
}

// ---------------------------------------------------------------------------
// V2-G : bottom-nav 5 slots
//   [Accueil] [Cheptel] [Reproduction] [Alertes 🔴] [Plus]
// Le FAB "Actions rapides" glisse dans le drawer Plus (groupe Pilotage).
// ---------------------------------------------------------------------------
const SLOTS: Slot[] = [
  { href: '/dashboard',    label: 'Accueil',      icon: LayoutDashboard },
  { href: '/cheptel',      label: 'Cheptel',      icon: PiggyBank },
  { href: '/reproduction', label: 'Repro',       icon: Heart },
  { href: '/alertes',      label: 'Alertes',      icon: Bell, withAlertesBadge: true },
  { label: 'Plus',         icon: MoreHorizontal, action: 'more' },
]

export interface BottomNavProps {
  onOpenMore: () => void
  /** Nombre d'alertes actives (SELECT COUNT(*) FROM v_alertes_actives). */
  alertesCount?: number
}

/**
 * Bottom nav 5 slots, visible UNIQUEMENT en mobile (<md).
 *
 * Slot "Alertes" porte un badge rouge avec le nombre d'alertes actives.
 * Slot "Plus" déclenche le drawer mobile via `onOpenMore`.
 */
export function BottomNav({ onOpenMore, alertesCount = 0 }: BottomNavProps) {
  const pathname = usePathname()

  const isActive = (href?: string) => {
    if (!href) return false
    const cleanHref = href.split('?')[0]
    return pathname === cleanHref || pathname.startsWith(cleanHref + '/')
  }

  return (
    <nav
      aria-label="Navigation principale mobile"
      className={cn(
        'fixed bottom-0 inset-x-0 z-40 flex lg:hidden',
        'h-16 items-stretch justify-around',
        'bg-[var(--sf-surface-1)] border-t border-[var(--sf-line,rgba(0,0,0,0.08))]',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      {SLOTS.map(slot => {
        if (slot.action === 'more') {
          return (
            <button
              key="more"
              type="button"
              onClick={onOpenMore}
              aria-label="Plus de pages"
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0',
                'text-[var(--sf-muted,#6b6b6b)] hover:text-[var(--sf-ink,#1a1a1a)] active:text-[var(--sf-ink,#1a1a1a)]',
                'focus:outline-none focus-visible:bg-black/5',
              )}
            >
              <slot.icon className="h-5 w-5" />
              <span className="text-[11px] leading-none uppercase tracking-wider">{slot.label}</span>
            </button>
          )
        }
        return (
          <SlotLink
            key={slot.href}
            slot={slot}
            active={isActive(slot.href)}
            alertesCount={slot.withAlertesBadge ? alertesCount : 0}
          />
        )
      })}
    </nav>
  )
}

function SlotLink({
  slot,
  active,
  alertesCount,
}: {
  slot: Slot
  active: boolean
  alertesCount: number
}) {
  const Icon = slot.icon
  const showBadge = slot.withAlertesBadge && alertesCount > 0
  return (
    <Link
      href={slot.href!}
      aria-current={active ? 'page' : undefined}
      aria-label={
        slot.withAlertesBadge && alertesCount > 0
          ? `${slot.label} (${alertesCount} active${alertesCount > 1 ? 's' : ''})`
          : slot.label
      }
      className={cn(
        'flex-1 flex flex-col items-center justify-center gap-1 min-w-0',
        'focus:outline-none focus-visible:bg-black/5',
        active
          ? 'text-[var(--sf-primary,#2D4A1F)]'
          : 'text-[var(--sf-muted,#6b6b6b)] hover:text-[var(--sf-ink,#1a1a1a)]',
      )}
    >
      {/*
        V2-FIX C — Slot icône + badge en overlay propre.
        Le wrapper `relative inline-flex` ne contient QUE l'icône, donc le
        badge `absolute` ne peut JAMAIS se coller au label en dessous
        (qui est un sibling sous le flex-col du Link).
      */}
      <span className="relative inline-flex shrink-0">
        <Icon className="h-5 w-5" aria-hidden="true" />
        {showBadge && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute -top-1.5 -right-2 z-10',
              'min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center',
              'rounded-full bg-red-600 text-white',
              'text-[11px] font-bold leading-none tabular-nums',
              'ring-2 ring-[var(--sf-surface-0)]',
            )}
          >
            {alertesCount > 99 ? '99+' : alertesCount}
          </span>
        )}
      </span>
      <span className={cn(
        'text-[11px] leading-none uppercase tracking-wider truncate max-w-full px-1',
        active && 'font-semibold',
      )}>
        {slot.label}
      </span>
    </Link>
  )
}
