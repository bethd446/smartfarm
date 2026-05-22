'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

import {
  creerVaccination,
  creerTraitement,
  creerMortalite,
} from './_server-actions'

/* -------------------------------------------------------------------------- */
/*  TYPES                                                                     */
/* -------------------------------------------------------------------------- */

type AnimalOption = { id: string; tag: string; nom?: string | null }
type BandeOption = { id: string; code?: string | null; nom?: string | null }

type CommonProps = {
  trigger: React.ReactNode
  animaux: AnimalOption[]
  bandes: BandeOption[]
}

/* -------------------------------------------------------------------------- */
/*  HELPERS UI                                                                */
/* -------------------------------------------------------------------------- */

function CibleSwitch({
  cible,
  onChange,
}: {
  cible: 'animal' | 'bande'
  onChange: (v: 'animal' | 'bande') => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Cible du soin"
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
            onClick={() => onChange(v)}
            className={[
              'px-4 h-10 text-[12px] font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] transition-colors',
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
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-[var(--sf-danger-bg,#7A2A1F)] mt-1">{message}</p>
}

function labelAnimal(a: AnimalOption) {
  return a.nom ? `${a.tag} — ${a.nom}` : a.tag
}
function labelBande(b: BandeOption) {
  return b.nom ? `${b.code ?? '—'} · ${b.nom}` : (b.code ?? b.id)
}

const titleClass =
  'font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xl'

/* -------------------------------------------------------------------------- */
/*  SCHEMAS (client side, alignés sur les Server Actions)                     */
/* -------------------------------------------------------------------------- */

const schemaVaccin = z
  .object({
    animal_id: z.string().uuid().optional().or(z.literal('')),
    bande_id: z.string().uuid().optional().or(z.literal('')),
    date_vaccination: z.string().min(1, 'Date requise'),
    produit: z.string().min(1, 'Produit requis'),
    lot: z.string().optional().or(z.literal('')),
    dose_ml: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
    veterinaire: z.string().optional().or(z.literal('')),
    observations: z.string().optional().or(z.literal('')),
  })
  .refine((d) => !!d.animal_id || !!d.bande_id, {
    message: 'Choisir un animal OU une bande',
    path: ['animal_id'],
  })
type VaccinForm = z.input<typeof schemaVaccin>

const schemaSoin = z
  .object({
    animal_id: z.string().uuid().optional().or(z.literal('')),
    bande_id: z.string().uuid().optional().or(z.literal('')),
    date_debut: z.string().min(1, 'Date de début requise'),
    date_fin: z.string().optional().or(z.literal('')),
    motif: z.string().min(1, 'Motif requis'),
    produit: z.string().optional().or(z.literal('')),
    posologie: z.string().optional().or(z.literal('')),
    voie: z.string().optional().or(z.literal('')),
    veterinaire: z.string().optional().or(z.literal('')),
    cout: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
    observations: z.string().optional().or(z.literal('')),
  })
  .refine((d) => !!d.animal_id || !!d.bande_id, {
    message: 'Choisir un animal OU une bande',
    path: ['animal_id'],
  })
type SoinForm = z.input<typeof schemaSoin>

const schemaPerte = z
  .object({
    animal_id: z.string().uuid().optional().or(z.literal('')),
    bande_id: z.string().uuid().optional().or(z.literal('')),
    date_mort: z.string().min(1, 'Date requise'),
    cause: z.string().min(1, 'Cause requise'),
    diagnostic: z.string().optional().or(z.literal('')),
    autopsie: z.boolean().default(false),
    observations: z.string().optional().or(z.literal('')),
  })
  .refine((d) => !!d.animal_id || !!d.bande_id, {
    message: 'Choisir un animal OU une bande',
    path: ['animal_id'],
  })
type PerteForm = z.input<typeof schemaPerte>

/* -------------------------------------------------------------------------- */
/*  1. NOUVEAU VACCIN                                                         */
/* -------------------------------------------------------------------------- */

export function DialogNouveauVaccin({ trigger, animaux, bandes }: CommonProps) {
  const [open, setOpen] = useState(false)
  const [cible, setCible] = useState<'animal' | 'bande'>('animal')
  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VaccinForm>({
    resolver: zodResolver(schemaVaccin) as any,
    defaultValues: {
      date_vaccination: today,
      animal_id: '',
      bande_id: '',
      produit: '',
      lot: '',
      dose_ml: '',
      veterinaire: '',
      observations: '',
    },
  })

  function switchCible(v: 'animal' | 'bande') {
    setCible(v)
    if (v === 'animal') setValue('bande_id', '')
    else setValue('animal_id', '')
  }

  async function onSubmit(data: VaccinForm) {
    const payload = {
      ...data,
      animal_id: cible === 'animal' ? data.animal_id : '',
      bande_id: cible === 'bande' ? data.bande_id : '',
    }
    const res = await creerVaccination(payload)
    if (res.ok) {
      toast.success('Vaccin enregistré')
      reset()
      setCible('animal')
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  const animalId = watch('animal_id')
  const bandeId = watch('bande_id')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as any} />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className={titleClass}>Nouveau vaccin</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-2 block">Pour qui ?</Label>
            <CibleSwitch cible={cible} onChange={switchCible} />
          </div>

          {cible === 'animal' ? (
            <div>
              <Label htmlFor="vac-animal">L&apos;animal</Label>
              <Select
                value={animalId || ''}
                onValueChange={(v) => setValue('animal_id', (v as string | null) ?? '', { shouldValidate: true })}
              >
                <SelectTrigger id="vac-animal" className="w-full">
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
              <FieldError message={errors.animal_id?.message} />
            </div>
          ) : (
            <div>
              <Label htmlFor="vac-bande">La bande</Label>
              <Select
                value={bandeId || ''}
                onValueChange={(v) => setValue('bande_id', (v as string | null) ?? '', { shouldValidate: true })}
              >
                <SelectTrigger id="vac-bande" className="w-full">
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
              <FieldError message={errors.bande_id?.message} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vac-date">Date</Label>
              <Input id="vac-date" type="date" {...register('date_vaccination')} />
              <FieldError message={errors.date_vaccination?.message} />
            </div>
            <div>
              <Label htmlFor="vac-dose">Dose (ml)</Label>
              <Input
                id="vac-dose"
                type="number"
                step="0.1"
                inputMode="decimal"
                {...register('dose_ml')}
              />
              <FieldError message={errors.dose_ml?.message as string | undefined} />
            </div>
          </div>

          <div>
            <Label htmlFor="vac-produit">Produit</Label>
            <Input id="vac-produit" {...register('produit')} placeholder="Ex. Suvaxyn PRRS MLV" />
            <FieldError message={errors.produit?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vac-lot">N° de lot</Label>
              <Input id="vac-lot" {...register('lot')} />
            </div>
            <div>
              <Label htmlFor="vac-vet">Vétérinaire</Label>
              <Input id="vac-vet" {...register('veterinaire')} />
            </div>
          </div>

          <div>
            <Label htmlFor="vac-obs">Observations</Label>
            <Textarea id="vac-obs" rows={2} {...register('observations')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  2. NOUVEAU SOIN (traitement)                                              */
/* -------------------------------------------------------------------------- */

export function DialogNouveauSoin({ trigger, animaux, bandes }: CommonProps) {
  const [open, setOpen] = useState(false)
  const [cible, setCible] = useState<'animal' | 'bande'>('animal')
  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SoinForm>({
    resolver: zodResolver(schemaSoin) as any,
    defaultValues: {
      date_debut: today,
      animal_id: '',
      bande_id: '',
      motif: '',
      produit: '',
      posologie: '',
      voie: '',
      veterinaire: '',
      cout: '',
      observations: '',
      date_fin: '',
    },
  })

  function switchCible(v: 'animal' | 'bande') {
    setCible(v)
    if (v === 'animal') setValue('bande_id', '')
    else setValue('animal_id', '')
  }

  async function onSubmit(data: SoinForm) {
    const payload = {
      ...data,
      animal_id: cible === 'animal' ? data.animal_id : '',
      bande_id: cible === 'bande' ? data.bande_id : '',
    }
    const res = await creerTraitement(payload)
    if (res.ok) {
      toast.success('Soin enregistré')
      reset()
      setCible('animal')
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  const animalId = watch('animal_id')
  const bandeId = watch('bande_id')
  const voie = watch('voie')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as any} />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className={titleClass}>Nouveau soin</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-2 block">Pour qui ?</Label>
            <CibleSwitch cible={cible} onChange={switchCible} />
          </div>

          {cible === 'animal' ? (
            <div>
              <Label htmlFor="soin-animal">L&apos;animal</Label>
              <Select
                value={animalId || ''}
                onValueChange={(v) => setValue('animal_id', (v as string | null) ?? '', { shouldValidate: true })}
              >
                <SelectTrigger id="soin-animal" className="w-full">
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
              <FieldError message={errors.animal_id?.message} />
            </div>
          ) : (
            <div>
              <Label htmlFor="soin-bande">La bande</Label>
              <Select
                value={bandeId || ''}
                onValueChange={(v) => setValue('bande_id', (v as string | null) ?? '', { shouldValidate: true })}
              >
                <SelectTrigger id="soin-bande" className="w-full">
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
              <FieldError message={errors.bande_id?.message} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="soin-debut">Début</Label>
              <Input id="soin-debut" type="date" {...register('date_debut')} />
              <FieldError message={errors.date_debut?.message} />
            </div>
            <div>
              <Label htmlFor="soin-fin">Fin (optionnel)</Label>
              <Input id="soin-fin" type="date" {...register('date_fin')} />
            </div>
          </div>

          <div>
            <Label htmlFor="soin-motif">Motif</Label>
            <Input id="soin-motif" {...register('motif')} placeholder="Ex. Diarrhée néonatale" />
            <FieldError message={errors.motif?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="soin-produit">Produit</Label>
              <Input id="soin-produit" {...register('produit')} />
            </div>
            <div>
              <Label htmlFor="soin-voie">Voie</Label>
              <Select
                value={voie || ''}
                onValueChange={(v) => setValue('voie', (v as string | null) ?? '')}
              >
                <SelectTrigger id="soin-voie" className="w-full">
                  <SelectValue placeholder="Voie d'administration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IM">Intramusculaire (IM)</SelectItem>
                  <SelectItem value="SC">Sous-cutanée (SC)</SelectItem>
                  <SelectItem value="IV">Intraveineuse (IV)</SelectItem>
                  <SelectItem value="Orale">Orale</SelectItem>
                  <SelectItem value="Topique">Topique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="soin-posologie">Posologie</Label>
              <Input id="soin-posologie" {...register('posologie')} placeholder="Ex. 1 ml/10 kg" />
            </div>
            <div>
              <Label htmlFor="soin-vet">Vétérinaire</Label>
              <Input id="soin-vet" {...register('veterinaire')} />
            </div>
          </div>

          <div>
            <Label htmlFor="soin-cout">Coût (FCFA)</Label>
            <Input
              id="soin-cout"
              type="number"
              step="1"
              inputMode="numeric"
              {...register('cout')}
            />
            <FieldError message={errors.cout?.message as string | undefined} />
          </div>

          <div>
            <Label htmlFor="soin-obs">Observations</Label>
            <Textarea id="soin-obs" rows={2} {...register('observations')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="accent" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  3. NOUVELLE PERTE (mortalité)                                             */
/* -------------------------------------------------------------------------- */

export function DialogNouvellePerte({ trigger, animaux, bandes }: CommonProps) {
  const [open, setOpen] = useState(false)
  const [cible, setCible] = useState<'animal' | 'bande'>('animal')
  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PerteForm>({
    resolver: zodResolver(schemaPerte) as any,
    defaultValues: {
      date_mort: today,
      animal_id: '',
      bande_id: '',
      cause: '',
      diagnostic: '',
      autopsie: false,
      observations: '',
    },
  })

  function switchCible(v: 'animal' | 'bande') {
    setCible(v)
    if (v === 'animal') setValue('bande_id', '')
    else setValue('animal_id', '')
  }

  async function onSubmit(data: PerteForm) {
    const payload = {
      ...data,
      animal_id: cible === 'animal' ? data.animal_id : '',
      bande_id: cible === 'bande' ? data.bande_id : '',
    }
    const res = await creerMortalite(payload)
    if (res.ok) {
      toast.success('Perte enregistrée')
      reset()
      setCible('animal')
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  const animalId = watch('animal_id')
  const bandeId = watch('bande_id')
  const autopsie = watch('autopsie')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as any} />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className={titleClass}>Nouvelle perte</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="mb-2 block">Pour qui ?</Label>
            <CibleSwitch cible={cible} onChange={switchCible} />
          </div>

          {cible === 'animal' ? (
            <div>
              <Label htmlFor="perte-animal">L&apos;animal</Label>
              <Select
                value={animalId || ''}
                onValueChange={(v) => setValue('animal_id', (v as string | null) ?? '', { shouldValidate: true })}
              >
                <SelectTrigger id="perte-animal" className="w-full">
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
              <FieldError message={errors.animal_id?.message} />
              <p className="text-[11px] text-[var(--sf-muted,#5C5346)] mt-1">
                L&apos;animal sera marqué automatiquement comme « mort ».
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="perte-bande">La bande</Label>
              <Select
                value={bandeId || ''}
                onValueChange={(v) => setValue('bande_id', (v as string | null) ?? '', { shouldValidate: true })}
              >
                <SelectTrigger id="perte-bande" className="w-full">
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
              <FieldError message={errors.bande_id?.message} />
            </div>
          )}

          <div>
            <Label htmlFor="perte-date">Date</Label>
            <Input id="perte-date" type="date" {...register('date_mort')} />
            <FieldError message={errors.date_mort?.message} />
          </div>

          <div>
            <Label htmlFor="perte-cause">Cause</Label>
            <Input id="perte-cause" {...register('cause')} placeholder="Ex. Maladie, écrasement, accident…" />
            <FieldError message={errors.cause?.message} />
          </div>

          <div>
            <Label htmlFor="perte-diag">Diagnostic</Label>
            <Input id="perte-diag" {...register('diagnostic')} />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!autopsie}
              onChange={(e) => setValue('autopsie', e.target.checked)}
              className="size-5 accent-[var(--sf-primary)]"
            />
            <span className="text-sm text-[var(--sf-ink)]">Autopsie réalisée</span>
          </label>

          <div>
            <Label htmlFor="perte-obs">Observations</Label>
            <Textarea id="perte-obs" rows={2} {...register('observations')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
