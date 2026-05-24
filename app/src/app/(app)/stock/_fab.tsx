'use client'

import { Plus } from 'lucide-react'
import { DialogEntreeStock } from './_dialogs-stock'

/**
 * Smart Farm — FAB Stock (Floating Action Button)
 * ============================================================================
 * Bouton flottant mobile qui ouvre le dialog d'ajout d'une entrée stock.
 * Pattern mirror de sanitaire/_fab.tsx adapté au contexte Stock.
 * Utilise DialogEntreeStock avec un trigger personnalisé en FAB.
 * ============================================================================
 */
export function StockFab() {
  return (
    <DialogEntreeStock
      trigger={
        <button
          aria-label="Ajouter une entrée stock"
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
      matieres={[]}
      fournisseurs={[]}
    />
  )
}
