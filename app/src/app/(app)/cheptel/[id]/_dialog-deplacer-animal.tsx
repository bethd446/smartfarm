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
import { ArrowRightLeft } from 'lucide-react'
import { deplacerAnimal } from '../_server-actions'

type Batiment = {
  id: string
  nom: string
  type?: string | null
}

/**
 * F3 — Dialog "Déplacer un animal vers un autre bâtiment".
 * Bâtiment source read-only, destination = select (sauf source), date + motif.
 */
export function DialogDeplacerAnimal({
  animalId,
  animalTag,
  batimentSourceId,
  batimentSourceNom,
  batiments,
  trigger,
}: {
  animalId: string
  animalTag: string
  batimentSourceId: string | null
  batimentSourceNom: string | null
  batiments: Batiment[]
  trigger?: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [batimentDestId, setBatimentDestId] = useState<string>('')
  const [date, setDate] = useState<string>(today)
  const [motif, setMotif] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const destOptions = batiments.filter((b) => b.id !== batimentSourceId)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!batimentDestId) {
      toast.error('Sélectionne le bâtiment de destination')
      return
    }
    if (!date) {
      toast.error('Date requise')
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
      const destNom =
        destOptions.find((b) => b.id === batimentDestId)?.nom ?? 'destination'
      toast.success('Animal déplacé', {
        description: `${animalTag} → ${destNom}`,
      })
      setMotif('')
      setBatimentDestId('')
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <ArrowRightLeft className="h-4 w-4 mr-2" />
      Déplacer vers un autre bâtiment
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? defaultTrigger} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            className="uppercase tracking-wide text-2xl"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Déplacer l&apos;animal
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Bâtiment actuel</Label>
            <Input
              value={batimentSourceNom ?? '— aucun —'}
              readOnly
              disabled
            />
          </div>

          <div>
            <Label>Nouveau bâtiment *</Label>
            <Select
              value={batimentDestId || ''}
              onValueChange={(v) => setBatimentDestId(v ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir le bâtiment">
                  {(value) => {
                    if (!value) return 'Choisir le bâtiment'
                    const b = destOptions.find((b) => b.id === value)
                    return b ? b.nom : value
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {destOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[var(--sf-muted)]">
                    Aucun autre bâtiment disponible.
                  </div>
                ) : (
                  destOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nom}
                      {b.type ? ` · ${b.type}` : ''}
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
              placeholder="ex. transfert maternité → gestation post-sevrage"
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
              disabled={submitting || destOptions.length === 0}
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
