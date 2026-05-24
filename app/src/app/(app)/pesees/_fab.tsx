'use client'

import { useState } from 'react'
import { Scale } from 'lucide-react'
import { DialogPeser } from './_dialog-peser'

/**
 * Smart Farm — FAB Pesées (Floating Action Button)
 * ============================================================================
 * Bouton flottant mobile pour déclencher une nouvelle pesée.
 * Action principale métier : "Peser maintenant"
 * ============================================================================
 */
export function PeseesFab({
  animaux = [],
  bandes = [],
}: {
  animaux?: { id: string; tag: string; nom: string | null }[]
  bandes?: { id: string; nom: string; code: string | null }[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Peser maintenant"
        onClick={() => setOpen(true)}
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
        <Scale className="h-6 w-6" strokeWidth={2.5} aria-hidden />
      </button>
      <DialogPeser animaux={animaux} bandes={bandes} open={open} onOpenChange={setOpen} />
    </>
  )
}
