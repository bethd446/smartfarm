'use client'

import { useMemo, useState, useTransition } from 'react'
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
import { AlertTriangle, Info, Plus, Syringe } from 'lucide-react'
import { creerActeSanitaire } from './_server-actions'
import { UNITES_DOSE, VOIES_ADMINISTRATION } from './_schemas'

/* -------------------------------------------------------------------------- */
/*  TYPES                                                                     */
/* -------------------------------------------------------------------------- */

export type AnimalOption = { id: string; tag: string; nom?: string | null }
export type BandeOption = { id: string; code?: string | null; nom?: string | null }
export type ProduitOption = {
  id: string
  nom: string
  type: string
  voie: string | null
  delai_attente_j: number | null
  max_jours: number | null
}

type Props = {
  trigger?: React.ReactNode
  animaux: AnimalOption[]
  bandes: BandeOption[]
  produits: ProduitOption[]
  /** Vrai si la table veterinaires_standards est manquante (B1 non appliquée). */
  vetoMissing?: boolean
}

const titleClass =
  'font-[family-name:var(--sf-font-display)] text-xl'

function labelAnimal(a: AnimalOption) {
  return a.nom ? `${a.tag} — ${a.nom}` : a.tag
}
function labelBande(b: BandeOption) {
  return b.nom ? `${b.code ?? '—'} · ${b.nom}` : (b.code ?? b.id)
}

/* -------------------------------------------------------------------------- */
/*  DIALOG                                                                    */
/* -------------------------------------------------------------------------- */

export function DialogActe({
  trigger,
  animaux,
  bandes,
  produits,
  vetoMissing = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [cible, setCible] = useState<'animal' | 'bande'>('animal')

  const [animalId, setAnimalId] = useState('')
  const [bandeId, setBandeId] = useState('')
  const [produitId, setProduitId] = useState('')
  const [dose, setDose] = useState('')
  const [uniteDose, setUniteDose] = useState<(typeof UNITES_DOSE)[number]>('mL')
  const [voie, setVoie] = useState<(typeof VOIES_ADMINISTRATION)[number]>('IM')
  const [dureeJours, setDureeJours] = useState('1')
  const [motif, setMotif] = useState('')
  const [dateAdmin, setDateAdmin] = useState(() =>
    new Date().toISOString().slice(0, 16),
  )
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Produit sélectionné (pour auto-fill voie + délai attente)
  const produit = useMemo(
    () => produits.find((p) => p.id === produitId) ?? null,
    [produits, produitId],
  )

  // Auto-fill voie + délai attente quand produit change
  function onProduitChange(id: string) {
    setProduitId(id)
    const p = produits.find((x) => x.id === id)
    if (p?.voie && VOIES_ADMINISTRATION.includes(p.voie as (typeof VOIES_ADMINISTRATION)[number])) {
      setVoie(p.voie as (typeof VOIES_ADMINISTRATION)[number])
    }
  }

  function reset() {
    setCible('animal')
    setAnimalId('')
    setBandeId('')
    setProduitId('')
    setDose('')
    setUniteDose('mL')
    setVoie('IM')
    setDureeJours('1')
    setMotif('')
    setDateAdmin(new Date().toISOString().slice(0, 16))
    setError(null)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await creerActeSanitaire({
        animal_id: cible === 'animal' ? animalId : '',
        bande_id: cible === 'bande' ? bandeId : '',
        produit_id: produitId,
        dose,
        unite_dose: uniteDose,
        voie,
        duree_jours: dureeJours,
        motif,
        date_administration: dateAdmin,
      })
      if (res.ok) {
        toast.success('Traitement enregistré')
        reset()
        setOpen(false)
      } else {
        setError(res.error)
        toast.error(res.error)
      }
    })
  }

  const delaiAttente = produit?.delai_attente_j ?? null
  const isAntibio = produit?.type === 'antibiotique'

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger
        render={
          (trigger ?? (
            <Button size="lg" className="h-12">
              <Plus className="h-5 w-5 mr-2" />
              Enregistrer traitement
            </Button>
          )) as any
        }
      />
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={titleClass}>
            <Syringe className="inline-block h-5 w-5 mr-2" />
            Enregistrer un traitement
          </DialogTitle>
        </DialogHeader>

        {vetoMissing ? (
          <div className="rounded-md border border-[var(--sf-warning-border,#A16207)] bg-[var(--sf-warning-bg,#FFFBEB)] p-4 text-sm text-[var(--sf-warning-ink,#9A6700)]">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <strong>Référentiel véto manquant.</strong>
                <p className="mt-1">
                  La table <code>veterinaires_standards</code> n&apos;est pas encore peuplée.
                  Appliquer la migration B1 d&apos;abord (sprint Phase B/C).
                </p>
              </div>
            </div>
          </div>
        ) : produits.length === 0 ? (
          <div className="rounded-md border border-[var(--sf-warning-border,#A16207)] bg-[var(--sf-warning-bg,#FFFBEB)] p-4 text-sm">
            Aucun produit véto disponible. Seeder le référentiel d&apos;abord.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {/* Cible */}
            <div>
              <Label className="mb-2 block">Pour qui ?</Label>
              <div
                role="radiogroup"
                aria-label="Cible du traitement"
                className="inline-flex rounded-[4px] border border-[var(--sf-line,rgba(0,0,0,0.18))] overflow-hidden"
              >
                {(['animal', 'bande'] as const).map((v) => {
                  const active = cible === v
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setCible(v)
                        if (v === 'animal') setBandeId('')
                        else setAnimalId('')
                      }}
                      className={[
                        'px-4 h-10 text-[12px] font-[family-name:var(--sf-font-display)] transition-colors',
                        active
                          ? 'bg-[var(--sf-primary)] text-white'
                          : 'bg-transparent text-[var(--sf-ink)] hover:bg-[var(--sf-surface-1,rgba(0,0,0,0.04))]',
                      ].join(' ')}
                    >
                      {v === 'animal' ? 'Un animal' : 'Une bande'}
                    </button>
                  )
                })}
              </div>
            </div>

            {cible === 'animal' ? (
              <div>
                <Label htmlFor="acte-animal">L&apos;animal</Label>
                <Select value={animalId} onValueChange={(v) => setAnimalId(v as string)}>
                  <SelectTrigger id="acte-animal" className="w-full">
                    <SelectValue placeholder="Choisir un animal" />
                  </SelectTrigger>
                  <SelectContent>
                    {animaux.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {labelAnimal(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="acte-bande">La bande</Label>
                <Select value={bandeId} onValueChange={(v) => setBandeId(v as string)}>
                  <SelectTrigger id="acte-bande" className="w-full">
                    <SelectValue placeholder="Choisir une bande" />
                  </SelectTrigger>
                  <SelectContent>
                    {bandes.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {labelBande(b)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Produit véto */}
            <div>
              <Label htmlFor="acte-produit">Produit</Label>
              <Select value={produitId} onValueChange={onProduitChange}>
                <SelectTrigger id="acte-produit" className="w-full">
                  <SelectValue placeholder="Choisir un produit" />
                </SelectTrigger>
                <SelectContent>
                  {produits.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nom} <span className="text-xs text-[var(--sf-muted)]">({p.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {produit?.max_jours && (
                <p className="mt-1 text-xs text-[var(--sf-warning-ink,#9A6700)]">
                  <Info className="inline-block h-3 w-3 mr-1" />
                  Limite : {produit.max_jours} jours max
                </p>
              )}
            </div>

            {/* Encadré antibiotique → ordonnance recommandée */}
            {isAntibio && (
              <div className="rounded-md border border-[var(--sf-warning-border,#A16207)] bg-[var(--sf-warning-bg,#FFFBEB)] p-3 text-xs text-[var(--sf-warning-ink,#9A6700)]">
                <AlertTriangle className="inline-block h-4 w-4 mr-1" />
                Antibiotique : ordonnance vétérinaire recommandée (carnet MIRAH).
              </div>
            )}

            {/* Dose + unité */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="acte-dose">Dose</Label>
                <Input
                  id="acte-dose"
                  type="number"
                  step="0.001"
                  min="0"
                  inputMode="decimal"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="acte-unite">Unité</Label>
                <Select
                  value={uniteDose}
                  onValueChange={(v) => setUniteDose(v as (typeof UNITES_DOSE)[number])}
                >
                  <SelectTrigger id="acte-unite" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITES_DOSE.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Voie + Durée */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="acte-voie">Voie</Label>
                <Select
                  value={voie}
                  onValueChange={(v) => setVoie(v as (typeof VOIES_ADMINISTRATION)[number])}
                >
                  <SelectTrigger id="acte-voie" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOIES_ADMINISTRATION.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="acte-duree">Durée (jours)</Label>
                <Input
                  id="acte-duree"
                  type="number"
                  min="1"
                  max="30"
                  inputMode="numeric"
                  value={dureeJours}
                  onChange={(e) => setDureeJours(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Date administration */}
            <div>
              <Label htmlFor="acte-date">Date d&apos;administration</Label>
              <Input
                id="acte-date"
                type="datetime-local"
                value={dateAdmin}
                onChange={(e) => setDateAdmin(e.target.value)}
                required
              />
            </div>

            {/* Motif */}
            <div>
              <Label htmlFor="acte-motif">Motif (optionnel)</Label>
              <Textarea
                id="acte-motif"
                rows={2}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex : toux porcelet B3-12, prévention sevrage…"
              />
            </div>

            {/* Délai d'attente viande (live) */}
            {delaiAttente !== null && delaiAttente > 0 && (
              <div className="rounded-md border border-[var(--sf-warning-border,#A16207)] bg-[var(--sf-warning-bg,#FFFBEB)] p-3 text-sm text-[var(--sf-warning-ink,#9A6700)]">
                <AlertTriangle className="inline-block h-4 w-4 mr-1" />
                Délai d&apos;attente viande : <strong>{delaiAttente} jours</strong>
                {' '}avant abattage autorisé.
              </div>
            )}

            {error && (
              <div className="text-sm text-[var(--sf-danger-ink,#7A2A1F)] border border-[var(--sf-danger-border,#7A2A1F)] bg-[var(--sf-danger-bg,#FBE9E7)] p-2 rounded">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Enregistrement…' : 'ENREGISTRER'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
