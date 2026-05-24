'use client'

import { Plus } from 'lucide-react'
import { DialogNouvelAnimal } from './_dialog-nouvel-animal'

export function CheptelFab({
  races = [],
}: {
  races?: { id: string; nom: string }[]
}) {
  return (
    <DialogNouvelAnimal
      races={races}
      trigger={
        <button
          type="button"
          aria-label="Nouvel animal"
          className={[
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
          ].join(' ')}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
        </button>
      }
    />
  )
}
