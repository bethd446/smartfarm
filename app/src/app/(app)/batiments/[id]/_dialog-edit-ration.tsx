'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil } from 'lucide-react'
import { updateBatimentRation } from './_actions'

/**
 * Dialog inline — édite la ration_kg_jour_par_sujet d'un bâtiment.
 *
 * Pattern non-silencieux (cf. CONTEXT.md leçons 2026-05-23) :
 *  - console.error sur échec
 *  - toast.error visible
 *  - return {ok:false, error} côté server action, exploité côté client
 */
export function DialogEditRation({
  batimentId,
  batimentNom,
  rationActuelle,
}: {
  batimentId: string
  batimentNom: string
  rationActuelle: number | null
}) {
  const [open, setOpen] = useState(false)
  const [ration, setRation] = useState<string>(
    rationActuelle !== null ? rationActuelle.toString() : '',
  )
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const r = parseFloat(ration.replace(',', '.'))
    if (!Number.isFinite(r) || r < 0) {
      toast.error('Ration invalide', { description: 'Entrer un nombre positif (kg/jour/sujet)' })
      return
    }
    if (r > 10) {
      toast.error('Ration aberrante', { description: '> 10 kg/jour/sujet : vérifier la saisie' })
      return
    }
    setSubmitting(true)
    const res = await updateBatimentRation({ batimentId, ration: r })
    setSubmitting(false)
    if (res.ok) {
      toast.success('Ration mise à jour', {
        description: `${batimentNom} → ${r.toFixed(2)} kg/jour/sujet`,
      })
      setOpen(false)
    } else {
      console.error('[DialogEditRation] échec', res.error)
      toast.error('Erreur', { description: res.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Éditer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ration journalière — {batimentNom}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ration">Quantité par sujet (kg / jour)</Label>
            <Input
              id="ration"
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={ration}
              onChange={(e) => setRation(e.target.value)}
              placeholder="ex. 1.2"
              autoFocus
              required
            />
            <p className="text-xs text-[var(--sf-muted)]">
              Ration moyenne par animal présent. Sera multipliée par l’effectif actif pour
              calculer la consommation quotidienne.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
