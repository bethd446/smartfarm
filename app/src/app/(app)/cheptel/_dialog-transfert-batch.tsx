'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Truck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { transfererBatch } from './_server-actions'
import type { AnimalLite } from './_dialog-changer-stade-batch'

type BatimentLite = { id: string; nom: string; type: string }

const MAX_BADGES_VISIBLE = 10

export function DialogTransfertBatch({
  open,
  onOpenChange,
  animaux,
  batiments,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  animaux: AnimalLite[]
  batiments?: BatimentLite[]
  onSuccess?: () => void
}) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [batimentDestId, setBatimentDestId] = useState<string>('')
  const [date, setDate] = useState<string>(today)
  const [motif, setMotif] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const visibleTags = animaux.slice(0, MAX_BADGES_VISIBLE)
  const overflowCount = Math.max(0, animaux.length - MAX_BADGES_VISIBLE)
  const batimentsList = batiments ?? []
  const noBatiment = batimentsList.length === 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!batimentDestId || !date) return
    setSubmitting(true)
    try {
      const res = await transfererBatch({
        ids: animaux.map((a) => a.id),
        batiment_dest_id: batimentDestId,
        date,
        motif: motif.trim() || undefined,
      })
      if (res.ok) {
        const nomBat =
          batimentsList.find((b) => b.id === batimentDestId)?.nom ?? 'bâtiment'
        toast.success(
          `${res.count} animal${res.count > 1 ? 'aux' : ''} transféré${res.count > 1 ? 's' : ''} vers ${nomBat}`,
        )
        setBatimentDestId('')
        setMotif('')
        setDate(today)
        onOpenChange(false)
        onSuccess?.()
        router.refresh()
      } else {
        toast.error('Erreur', { description: res.error })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle
            className="tracking-wide text-2xl"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            <Truck className="inline h-5 w-5 mr-2 -mt-1" />
            Transférer — {animaux.length} animal{animaux.length > 1 ? 'aux' : ''}
          </DialogTitle>
        </DialogHeader>

        {noBatiment ? (
          <div className="space-y-4">
            <div
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                background: 'var(--sf-warning-bg, #FEF3C7)',
                borderColor: 'var(--sf-warning-border, #D97706)',
                color: 'var(--sf-warning-ink, #7C2D12)',
              }}
            >
              Aucun bâtiment disponible — passez la prop <code>batiments</code> côté
              <code> page.tsx</code> cheptel pour activer ce dialog.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tags sélectionnés */}
            <div>
              <Label className="mb-2 block">Sélection</Label>
              <div className="flex flex-wrap gap-1.5">
                {visibleTags.map((a) => (
                  <Badge key={a.id} variant="outline" className="font-mono">
                    {a.tag}
                  </Badge>
                ))}
                {overflowCount > 0 && (
                  <Badge variant="secondary">+{overflowCount} autres</Badge>
                )}
              </div>
            </div>

            <div>
              <Label>Bâtiment de destination *</Label>
              <Select
                value={batimentDestId}
                onValueChange={(v) => setBatimentDestId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un bâtiment" />
                </SelectTrigger>
                <SelectContent>
                  {batimentsList.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nom}
                      {b.type ? ` — ${b.type}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-transfert-batch">Date *</Label>
              <Input
                id="date-transfert-batch"
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="motif-transfert-batch">Motif (optionnel)</Label>
              <Textarea
                id="motif-transfert-batch"
                rows={3}
                placeholder="Ex : densité élevée, regroupement par lot, sevrage…"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                maxLength={500}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting || !batimentDestId || !date}>
                {submitting ? 'Transfert…' : `Transférer ${animaux.length}`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
