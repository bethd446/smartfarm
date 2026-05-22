'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, ScanLine } from 'lucide-react'
import { BarcodeScanner } from '@/components/barcode-scanner'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { DialogNouvelAnimal } from './_dialog-nouvel-animal'

export function CheptelActions({
  races = [],
}: {
  races?: { id: string; nom: string }[]
}) {
  const [open, setOpen] = useState(false)

  async function handleScan(code: string) {
    const sb = createClient()
    const { data, error } = await sb
      .from('animaux')
      .select('id, tag, nom')
      .eq('tag', code)
      .maybeSingle()

    if (error) {
      toast.error('Erreur lors de la recherche', { description: error.message })
      return
    }
    if (data) {
      toast.success(`Animal trouvé : ${data.nom ?? data.tag}`, {
        description: `Tag ${data.tag}`,
      })
    } else {
      toast.warning('Aucun match', { description: `Code scanné : ${code}` })
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="lg"
        className="h-12 text-base"
        onClick={() => setOpen(true)}
      >
        <ScanLine className="h-5 w-5 mr-2" />
        Scanner
      </Button>
      <DialogNouvelAnimal
        races={races}
        trigger={
          <Button size="lg" className="h-12 text-base">
            <Plus className="h-5 w-5 mr-2" />
            Nouvel animal
          </Button>
        }
      />
      <BarcodeScanner open={open} onOpenChange={setOpen} onScan={handleScan} />
    </div>
  )
}
