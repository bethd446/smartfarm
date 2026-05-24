'use client'

/**
 * Smart Farm — PageFab (Floating Action Button)
 * ============================================================================
 * Bouton d'action principale flottant bottom-right, visible uniquement sur mobile.
 * Positionné au-dessus du bottom-nav (bottom: ~88px).
 *
 * Usage :
 *   <PageFab href="/cheptel/nouveau" icon={Plus} label="Nouvel animal" />
 *   <PageFab onClick={() => setOpen(true)} icon={Heart} label="Nouvelle saillie" />
 *
 * Design System v1.0 :
 *   - FAB Material Design (min 56px)
 *   - Vert sahel --sf-primary
 *   - Visible mobile uniquement (lg:hidden)
 *   - Au-dessus bottom-nav (h-16 + marge = 88px)
 *   - Touch target comfort 56px
 *   - Shadow forte + ring stamp
 * ============================================================================
 */

import * as React from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type PageFabProps = {
  /** Action : soit href (Link) soit onClick (button) */
  href?: string
  onClick?: () => void
  /** Icône Lucide */
  icon: LucideIcon
  /** Label accessibility + tooltip */
  label: string
}

export function PageFab({ href, onClick, icon: Icon, label }: PageFabProps) {
  const className = [
    // Position : bottom-right, au-dessus du bottom-nav mobile (h-16 = 64px + margin = 88px)
    'fixed right-5 bottom-[5.5rem] z-40',
    // Visible mobile uniquement
    'lg:hidden',
    // Forme : pastille 56×56 (FAB Material comfort touch)
    'h-14 w-14 rounded-full',
    // Style charte Terrain Vivant : vert sahel + stamp shadow
    'bg-[var(--sf-primary)] text-[var(--sf-warm)]',
    'shadow-[0_8px_24px_-4px_rgba(45,74,31,0.45),0_4px_8px_-2px_rgba(0,0,0,0.2)]',
    'ring-2 ring-[var(--sf-warm)]/40',
    // Interaction
    'flex items-center justify-center',
    'transition-transform duration-150 ease-out',
    'hover:scale-105 active:scale-95',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--sf-accent-warm,#A16207)]/60',
  ].join(' ')

  const iconEl = <Icon className="h-6 w-6" strokeWidth={2.5} aria-hidden />

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {iconEl}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {iconEl}
    </button>
  )
}
