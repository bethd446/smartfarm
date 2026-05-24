'use client'

import { Activity } from 'lucide-react'
import { DialogConsommation, type ConsoRow } from './_dialog-conso'

export function ConsommationsFab({
  bandes = [],
  formules = [],
}: {
  bandes?: { id: string; code: string; nom: string }[]
  formules?: { id: string; nom: string }[]
}) {
  return (
    <DialogConsommation
      bandes={bandes}
      formules={formules}
      trigger={
        <button
          type="button"
          aria-label="Saisir consommation"
          className={[
            'fixed right-5 bottom-[5.5rem] z-40',
            'lg:hidden',
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
          <Activity className="h-6 w-6" strokeWidth={2.5} aria-hidden />
        </button>
      }
    />
  )
}
