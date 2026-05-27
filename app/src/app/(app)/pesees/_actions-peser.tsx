'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { DialogPeser } from './_dialog-peser'

export function ActionsPeser({
  animaux,
  bandes,
  defaultOpen,
  defaultAnimalId,
}: {
  animaux: { id: string; tag: string; nom: string | null }[]
  bandes: { id: string; nom: string; code: string | null }[]
  defaultOpen?: boolean
  defaultAnimalId?: string
}) {
  return (
    <DialogPeser
      animaux={animaux}
      bandes={bandes}
      defaultOpen={defaultOpen}
      defaultAnimalId={defaultAnimalId}
      trigger={
        // Audit mobile 2026-05-25 — masqué <lg (FAB suffit en mobile, dédoublonner CTA).
        <Button className="hidden lg:inline-flex">
          <Plus className="h-4 w-4 mr-2" />
          Peser maintenant
        </Button>
      }
    />
  )
}
