'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { DialogNouvelAnimal } from './_dialog-nouvel-animal'

/**
 * Smart Farm — FAB Cheptel (Floating Action Button)
 * ============================================================================
 * Le bouton flottant est rendu HORS du Dialog (sinon Radix asChild clone et
 * écrase le `position: fixed`). L'état d'ouverture du dialog est lifté ici.
 * ============================================================================
 */
export function CheptelFab({
  races = [],
}: {
  races?: { id: string; nom: string }[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Nouvel animal"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: '20px',
          bottom: '88px',
          zIndex: 40,
          width: '56px',
          height: '56px',
          borderRadius: '9999px',
          background: 'var(--sf-primary)',
          color: 'var(--sf-warm, #fffbeb)',
          boxShadow:
            '0 8px 24px -4px rgba(45,74,31,0.45), 0 4px 8px -2px rgba(0,0,0,0.2), inset 0 0 0 2px rgba(255,251,235,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 150ms ease-out',
          border: 0,
          cursor: 'pointer',
        }}
        className="lg:hidden"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
      </button>
      <DialogNouvelAnimal races={races} open={open} onOpenChange={setOpen} />
    </>
  )
}
