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
        // FAB unique VERGER : création via bouton d'en-tête, visible sur tous viewports.
        <Button className="inline-flex">
          <Plus className="h-4 w-4 mr-2" />
          Peser maintenant
        </Button>
      }
    />
  )
}
