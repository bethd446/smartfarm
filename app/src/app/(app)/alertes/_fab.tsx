'use client'

import { Plus } from 'lucide-react'

/**
 * FAB pour alertes : wrapper simple qui duplique le bouton desktop en version FAB mobile.
 * Le DialogAlerteManuelle est déjà sur la page, on crée juste un second trigger mobile.
 */
export function AlertesFab() {
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Nouvelle alerte manuelle"
        onClick={() => {
          // Déclencher le clic sur le bouton desktop existant
          const btn = document.querySelector<HTMLButtonElement>(
            'button:has(.lucide-plus):not([aria-label])'
          )
          btn?.click()
        }}
        className={[
          'fixed right-5 bottom-[5.5rem] z-40',
          'h-14 w-14 rounded-full',
          'bg-[var(--sf-primary)] text-[var(--sf-warm)]',
          'shadow-[0_8px_24px_-4px_rgba(45,74,31,0.45),0_4px_8px_-2px_rgba(0,0,0,0.2)]',
          'ring-2 ring-[var(--sf-warm)]/40',
          'flex items-center justify-center',
          'transition-transform duration-150 ease-out',
          'hover:scale-105 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--sf-accent-warm,#A16207)]/60',
        ].join(' ')}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
}


