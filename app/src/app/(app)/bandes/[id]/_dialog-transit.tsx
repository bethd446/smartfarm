'use client'

import { useMemo, useState } from 'react'

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

import { transitPhase } from './_actions'

/**
 * DialogTransitPhase — saisie d'un transit de phase pour une bande.
 *
 * Affiche un récap live du poids total estimé :
 *   total = nb_M × poids_M + nb_F × poids_F
 *
 * Les champs sont passés tels quels à la Server Action `transitPhase`
 * via FormData (pas de fetch ni de toast — le revalidatePath rafraîchit
 * la page après mutation).
 */
export function DialogTransitPhase({
  bandeId,
  phaseActuelle,
  nbMales,
  nbFemelles,
}: {
  bandeId: string
  phaseActuelle: string | null
  nbMales: number
  nbFemelles: number
}) {
  const [open, setOpen] = useState(false)
  const [phaseApres, setPhaseApres] = useState<string>('')
  const [nM, setNM] = useState<number>(nbMales)
  const [nF, setNF] = useState<number>(nbFemelles)
  const [pM, setPM] = useState<number>(0)
  const [pF, setPF] = useState<number>(0)

  const total = useMemo(() => {
    const t = (pM > 0 ? pM * nM : 0) + (pF > 0 ? pF * nF : 0)
    return t > 0 ? t : null
  }, [pM, pF, nM, nF])

  const phases = [
    { v: 'post_sevrage', l: 'Post-sevrage' },
    { v: 'demarrage', l: 'Démarrage' },
    { v: 'croissance', l: 'Croissance' },
    { v: 'finition', l: 'Finition' },
    { v: 'engraissement', l: 'Engraissement' },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Nouveau transit de phase</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xl">
            Transit de phase
          </DialogTitle>
        </DialogHeader>

        <form action={transitPhase} className="space-y-4">
          <input type="hidden" name="bande_id" value={bandeId} />
          <input
            type="hidden"
            name="phase_avant"
            value={phaseActuelle ?? ''}
          />
          <input type="hidden" name="phase_apres" value={phaseApres} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phase actuelle</Label>
              <div className="text-sm font-mono px-3 py-2 rounded-md bg-[var(--sf-soft,#f5f3ee)] capitalize">
                {phaseActuelle ?? '—'}
              </div>
            </div>
            <div>
              <Label htmlFor="phase-apres">Nouvelle phase</Label>
              <Select value={phaseApres} onValueChange={setPhaseApres}>
                <SelectTrigger id="phase-apres" className="w-full">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {phases.map((p) => (
                    <SelectItem key={p.v} value={p.v}>
                      {p.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nb-m">Nombre de mâles</Label>
              <Input
                id="nb-m"
                name="nb_males"
                type="number"
                min={0}
                value={nM}
                onChange={(e) => setNM(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="nb-f">Nombre de femelles</Label>
              <Input
                id="nb-f"
                name="nb_femelles"
                type="number"
                min={0}
                value={nF}
                onChange={(e) => setNF(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-m">Poids moyen mâles (kg)</Label>
              <Input
                id="p-m"
                name="poids_moyen_m_kg"
                type="number"
                step="0.1"
                min={0}
                value={pM || ''}
                onChange={(e) => setPM(parseFloat(e.target.value) || 0)}
                placeholder="Ex. 32.5"
              />
            </div>
            <div>
              <Label htmlFor="p-f">Poids moyen femelles (kg)</Label>
              <Input
                id="p-f"
                name="poids_moyen_f_kg"
                type="number"
                step="0.1"
                min={0}
                value={pF || ''}
                onChange={(e) => setPF(parseFloat(e.target.value) || 0)}
                placeholder="Ex. 30.0"
              />
            </div>
          </div>

          <div className="rounded-md bg-[var(--sf-soft,#f5f3ee)] px-3 py-2 text-sm">
            <span className="text-[var(--sf-muted)]">
              Poids total estimé :{' '}
            </span>
            <span className="font-mono font-bold tabular-nums">
              {total !== null ? `${total.toFixed(1)} kg` : '—'}
            </span>
            <span className="text-xs text-[var(--sf-muted)] ml-2">
              (M×poids M + F×poids F)
            </span>
          </div>

          <div>
            <Label htmlFor="obs">Observations</Label>
            <Textarea
              id="obs"
              name="observations"
              rows={2}
              placeholder="État sanitaire, hétérogénéité…"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!phaseApres}>
              Enregistrer le transit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
