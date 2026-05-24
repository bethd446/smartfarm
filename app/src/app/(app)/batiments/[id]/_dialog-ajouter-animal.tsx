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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { deplacerAnimal } from '../../cheptel/_server-actions'

type AnimalChoix = {
  id: string
  tag: string
  categorie: string | null
  batiment_id: string | null
  batiment_nom: string | null
}

/**
 * F3 — Dialog "Ajouter un animal à ce bâtiment".
 * Choisir un animal (libre ou actuellement dans un autre bâtiment) → transfert.
 */
export function DialogAjouterAnimal({
  batimentDestId,
  batimentDestNom,
  animauxDisponibles,
}: {
  batimentDestId: string
  batimentDestNom: string
  animauxDisponibles: AnimalChoix[]
}) {
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [animalId, setAnimalId] = useState<string>('')
  const [date, setDate] = useState<string>(today)
  const [motif, setMotif] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!animalId) {
      toast.error('Sélectionne un animal')
      return
    }
    setSubmitting(true)
    const res = await deplacerAnimal({
      animalId,
      batimentDestId,
      date,
      motif: motif.trim() || undefined,
    })
    setSubmitting(false)
    if (res.ok) {
      const animal = animauxDisponibles.find((a) => a.id === animalId)
      toast.success('Animal ajouté au bâtiment', {
        description: `${animal?.tag ?? ''} → ${batimentDestNom}`,
      })
      setAnimalId('')
      setMotif('')
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un animal
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            className="uppercase tracking-wide text-2xl"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Ajouter un animal
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Bâtiment de destination</Label>
            <Input value={batimentDestNom} readOnly disabled />
          </div>

          <div>
            <Label>Animal à transférer *</Label>
            <Select
              value={animalId || ''}
              onValueChange={(v) => setAnimalId(v ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un animal">
                  {(value) => {
                    if (!value) return 'Choisir un animal'
                    const a = animauxDisponibles.find((a) => a.id === value)
                    return a ? a.tag : value
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {animauxDisponibles.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[var(--sf-muted)]">
                    Aucun animal disponible.
                  </div>
                ) : (
                  animauxDisponibles.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.tag}
                      {a.categorie ? ` · ${a.categorie}` : ''}
                      {a.batiment_nom
                        ? ` · actuellement dans ${a.batiment_nom}`
                        : ' · sans bâtiment'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date_mouvement">Date du transfert *</Label>
            <Input
              id="date_mouvement"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="motif">Motif (optionnel)</Label>
            <Textarea
              id="motif"
              rows={2}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="ex. entrée en gestation post-sevrage"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || animauxDisponibles.length === 0}
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
