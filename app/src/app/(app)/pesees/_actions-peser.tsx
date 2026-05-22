'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { DialogPeser } from './_dialog-peser'

export function ActionsPeser({
  animaux,
  bandes,
}: {
  animaux: { id: string; tag: string; nom: string | null }[]
  bandes: { id: string; nom: string; code: string | null }[]
}) {
  return (
    <DialogPeser
      animaux={animaux}
      bandes={bandes}
      trigger={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Peser maintenant
        </Button>
      }
    />
  )
}
