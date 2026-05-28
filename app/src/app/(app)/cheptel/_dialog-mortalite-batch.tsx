'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Skull } from 'lucide-react'
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
import {
  MOTIFS_MORTALITE,
  MOTIF_LABELS,
  type MotifMortalite,
} from '../mortalites/_schemas'
import { enregistrerMortaliteBatch } from './_server-actions'
import type { AnimalLite } from './_dialog-changer-stade-batch'

const MAX_BADGES_VISIBLE = 10

export function DialogMortaliteBatch({
  open,
  onOpenChange,
  animaux,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  animaux: AnimalLite[]
  onSuccess?: () => void
}) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [dateDeces, setDateDeces] = useState<string>(today)
  const [motif, setMotif] = useState<MotifMortalite | ''>('')
  const [motifLibre, setMotifLibre] = useState('')
  const [observations, setObservations] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const visibleTags = animaux.slice(0, MAX_BADGES_VISIBLE)
  const overflowCount = Math.max(0, animaux.length - MAX_BADGES_VISIBLE)
  const motifAutre = motif === 'autre'
  const motifLibreOk =
    !motifAutre || (motifLibre.trim().length > 0 && motifLibre.length <= 200)

  function reset() {
    setDateDeces(today)
    setMotif('')
    setMotifLibre('')
    setObservations('')
    setConfirmed(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!motif || !dateDeces || !confirmed || !motifLibreOk) return
    setSubmitting(true)
    try {
      const res = await enregistrerMortaliteBatch({
        ids: animaux.map((a) => a.id),
        date_deces: dateDeces,
        motif,
        motif_libre: motifAutre ? motifLibre.trim() : undefined,
        observations: observations.trim() || undefined,
      })
      if (res.ok) {
        toast.success(
          `${res.count} mortalité${res.count > 1 ? 's' : ''} enregistrée${res.count > 1 ? 's' : ''}`,
        )
        reset()
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
            className="uppercase tracking-wide text-2xl"
            style={{
              fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
              color: 'var(--sf-danger-ink, #7A2A1F)',
            }}
          >
            <Skull className="inline h-5 w-5 mr-2 -mt-1" />
            Marquer mortalité — {animaux.length} animal{animaux.length > 1 ? 'aux' : ''}
          </DialogTitle>
        </DialogHeader>

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
            <Label htmlFor="date-deces-batch">Date du décès *</Label>
            <Input
              id="date-deces-batch"
              type="date"
              value={dateDeces}
              max={today}
              onChange={(e) => setDateDeces(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Motif *</Label>
            <Select value={motif} onValueChange={(v) => setMotif(v as MotifMortalite)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un motif" />
              </SelectTrigger>
              <SelectContent>
                {MOTIFS_MORTALITE.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MOTIF_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {motifAutre && (
            <div>
              <Label htmlFor="motif-libre-batch">Précision motif *</Label>
              <Input
                id="motif-libre-batch"
                type="text"
                value={motifLibre}
                onChange={(e) => setMotifLibre(e.target.value)}
                maxLength={200}
                placeholder="Décrire la cause (max 200 caractères)"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="observations-mortalite-batch">Observations (optionnel)</Label>
            <Textarea
              id="observations-mortalite-batch"
              rows={3}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              maxLength={2000}
              placeholder="Contexte clinique, lot concerné, mesures prises…"
            />
          </div>

          <div
            className="rounded-md border px-3 py-2 text-sm flex items-start gap-2"
            style={{
              background: 'var(--sf-danger-bg, #F1D4CE)',
              borderColor: 'var(--sf-danger-border, #D89C92)',
              color: 'var(--sf-danger-ink, #7A2A1F)',
            }}
          >
            <input
              id="confirm-mortalite-batch"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 cursor-pointer accent-[var(--sf-danger-ink,#7A2A1F)]"
            />
            <label htmlFor="confirm-mortalite-batch" className="cursor-pointer">
              Je confirme l&apos;enregistrement de {animaux.length} décès — action irréversible
              (animaux basculés en statut <code>mort</code>).
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                submitting || !motif || !dateDeces || !confirmed || !motifLibreOk
              }
              style={{
                background: 'var(--sf-danger-ink, #7A2A1F)',
                color: '#FFFFFF',
              }}
            >
              {submitting ? 'Enregistrement…' : `Enregistrer ${animaux.length} décès`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
