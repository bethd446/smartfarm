'use client'

/**
 * V2 Sprint A — SA-B : Dialog client de saisie d'une observation PPA.
 *
 * Form direct vers Server Action `enregistrerObservationPPA` (FormData).
 * Pas de react-hook-form ici — pattern simple, terrain. Le Server Action
 * gère la validation côté serveur et fait revalidatePath('/sanitaire/ppa').
 */

import { useState, useTransition } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

import { enregistrerObservationPPA } from './_actions'

const titleClass =
  'font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xl'

type SymptomKey =
  | 'hemorragies'
  | 'mortalite_subite'
  | 'prostration'
  | 'inappetence'
  | 'cyanose'
  | 'vomissements'

const SYMPTOMES: { key: SymptomKey; label: string; hint?: string }[] = [
  { key: 'hemorragies', label: 'Hémorragies cutanées', hint: 'Oreilles, abdomen, flancs' },
  { key: 'mortalite_subite', label: 'Mortalité subite', hint: 'Animaux trouvés morts sans signe annonciateur' },
  { key: 'prostration', label: 'Prostration', hint: 'Animal couché, abattu, ne réagit plus' },
  { key: 'inappetence', label: 'Refus aliment', hint: 'Inappétence marquée >24h' },
  { key: 'cyanose', label: 'Cyanose oreilles', hint: 'Coloration bleu/violet des extrémités' },
  { key: 'vomissements', label: 'Vomissements / diarrhée', hint: 'Souvent hémorragique' },
]

export function DialogObservationPPA() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await enregistrerObservationPPA(formData)
      if (res.ok) {
        setOpen(false)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          Nouvelle observation suspecte
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className={titleClass}>Observation suspecte PPA</DialogTitle>
          <DialogDescription>
            Signaler un cas clinique évocateur. Référentiel OIE/WOAH — toute suspicion
            doit être déclarée aux services vétérinaires officiels.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          {/* Bloc 1 : contexte */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="ppa-date">Date observation</Label>
              <Input
                id="ppa-date"
                name="date_observation"
                type="date"
                defaultValue={today}
                required
              />
            </div>
            <div>
              <Label htmlFor="ppa-nb">Nb animaux affectés</Label>
              <Input
                id="ppa-nb"
                name="nb_animaux_affectes"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                defaultValue={1}
                required
              />
            </div>
            <div>
              <Label htmlFor="ppa-niveau">Niveau de suspicion</Label>
              <Select name="niveau_suspicion" defaultValue="moyen">
                <SelectTrigger id="ppa-niveau" className="w-full">
                  <SelectValue placeholder="Niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faible">Faible</SelectItem>
                  <SelectItem value="moyen">Moyen</SelectItem>
                  <SelectItem value="eleve">Élevé</SelectItem>
                  <SelectItem value="tres_eleve">Très élevé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="ppa-temp">Température max relevée (°C)</Label>
            <Input
              id="ppa-temp"
              name="temperature_max"
              type="number"
              step="0.1"
              min={35}
              max={45}
              inputMode="decimal"
              placeholder="Ex. 41.5 (PPA : fièvre >40°C)"
            />
          </div>

          {/* Bloc 2 : symptômes (checklist) */}
          <div className="rounded-md border border-[var(--sf-border,#e5e5e5)] p-3">
            <div className="font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xs font-bold mb-2">
              Symptômes observés
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SYMPTOMES.map((s) => (
                <label
                  key={s.key}
                  htmlFor={`ppa-sym-${s.key}`}
                  className="flex items-start gap-2 cursor-pointer text-sm"
                >
                  <input
                    id={`ppa-sym-${s.key}`}
                    type="checkbox"
                    name={s.key}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="font-medium">{s.label}</span>
                    {s.hint ? (
                      <span className="block text-xs text-[var(--sf-muted,#5C5346)]">
                        {s.hint}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Bloc 3 : déclaration */}
          <div className="rounded-md border border-red-200 bg-red-50/40 dark:bg-red-950/20 dark:border-red-900 p-3 space-y-2">
            <label
              htmlFor="ppa-declare"
              className="flex items-start gap-2 cursor-pointer text-sm"
            >
              <input
                id="ppa-declare"
                type="checkbox"
                name="declare"
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="font-medium text-red-700 dark:text-red-300">
                  Déclaré aux services vétérinaires officiels
                </span>
                <span className="block text-xs text-[var(--sf-muted,#5C5346)]">
                  Obligation légale OIE/WOAH dès la suspicion.
                </span>
              </span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ppa-ddec">Date déclaration</Label>
                <Input id="ppa-ddec" name="date_declaration" type="date" />
              </div>
              <div>
                <Label htmlFor="ppa-ref">Référence / N° dossier</Label>
                <Input
                  id="ppa-ref"
                  name="reference_declaration"
                  type="text"
                  placeholder="Ex. DSV-CI-2026-001"
                />
              </div>
            </div>
          </div>

          {/* Bloc 4 : prélèvement */}
          <div className="rounded-md border border-[var(--sf-border,#e5e5e5)] p-3 space-y-2">
            <label
              htmlFor="ppa-prelev"
              className="flex items-start gap-2 cursor-pointer text-sm"
            >
              <input
                id="ppa-prelev"
                type="checkbox"
                name="prelevement"
                className="mt-1 h-4 w-4"
              />
              <span className="font-medium">Prélèvement effectué</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ppa-dprelev">Date prélèvement</Label>
                <Input id="ppa-dprelev" name="date_prelevement" type="date" />
              </div>
              <div>
                <Label htmlFor="ppa-resultat">Résultat laboratoire</Label>
                <Select name="resultat_laboratoire">
                  <SelectTrigger id="ppa-resultat" className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="negatif">Négatif</SelectItem>
                    <SelectItem value="positif">Positif</SelectItem>
                    <SelectItem value="indetermine">Indéterminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="ppa-obs">Observations complémentaires</Label>
            <Textarea
              id="ppa-obs"
              name="observations"
              rows={3}
              placeholder="Contexte, bande/case concernée, contacts récents, mesures prises…"
            />
          </div>

          {error ? (
            <p className="text-sm text-[var(--sf-danger-ink,#7A2A1F)]">{error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? 'Enregistrement…' : 'Enregistrer l’observation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
