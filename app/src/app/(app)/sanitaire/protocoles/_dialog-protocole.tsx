'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Plus } from 'lucide-react'
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
  schemaProtocole,
  CATEGORIES_PROTOCOLE,
  VOIES_ADMIN,
  type ProtocoleInput,
  type CategorieProtocole,
  type VoieAdmin,
} from './_schemas'
import { creerProtocole, modifierProtocole } from './_actions'

export type ProtocoleRow = {
  id: string
  nom: string
  description: string | null
  categorie_cible: CategorieProtocole | null
  age_jours: number | null
  produit: string | null
  voie: string | null
  dose_ml: number | null
  rappels_jours: number[] | null
  obligatoire: boolean
  actif: boolean
}

type Mode = 'create' | 'edit'

type Props = {
  // Optionnel : trigger par défaut dérivé du mode (rendu côté client) pour
  // éviter le mismatch d'hydratation du passage RSC→Client + Radix asChild.
  trigger?: React.ReactNode
  mode?: Mode
  initial?: ProtocoleRow | null
}

const titleClass =
  'font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xl'

const LABEL_CATEGORIE: Record<CategorieProtocole, string> = {
  verrat: 'Verrat',
  truie: 'Truie',
  cochette: 'Cochette',
  porcelet: 'Porcelet',
  sevrage: 'Sevrage',
  engraissement: 'Engraissement',
}

const LABEL_VOIE: Record<VoieAdmin, string> = {
  IM: 'Intramusculaire (IM)',
  SC: 'Sous-cutanée (SC)',
  IV: 'Intraveineuse (IV)',
  Orale: 'Orale',
  Topique: 'Topique',
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1">{message}</p>
  )
}

export function DialogProtocole({ trigger, mode = 'create', initial = null }: Props) {
  const [open, setOpen] = useState(false)

  const defaultValues: ProtocoleInput = {
    id: initial?.id ?? '',
    nom: initial?.nom ?? '',
    description: initial?.description ?? '',
    categorie_cible: (initial?.categorie_cible ?? '') as CategorieProtocole | '',
    age_jours: initial?.age_jours ?? '',
    produit: initial?.produit ?? '',
    voie: (initial?.voie as VoieAdmin | null) ?? '',
    dose_ml: initial?.dose_ml ?? '',
    rappels_jours: (initial?.rappels_jours ?? []).join(', '),
    obligatoire: initial?.obligatoire ?? false,
    actif: initial?.actif ?? true,
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProtocoleInput>({
    resolver: zodResolver(schemaProtocole) as never,
    defaultValues,
  })

  // Si on ré-ouvre une édition après un revalidate, recaler les valeurs
  useEffect(() => {
    if (open) reset(defaultValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  const categorie = watch('categorie_cible')
  const voie = watch('voie')
  const obligatoire = watch('obligatoire')
  const actif = watch('actif')

  async function onSubmit(data: ProtocoleInput) {
    const res =
      mode === 'edit'
        ? await modifierProtocole(data)
        : await creerProtocole(data)
    if (res.ok) {
      toast.success(
        mode === 'edit' ? 'Protocole mis à jour' : 'Protocole créé',
      )
      if (mode === 'create') reset()
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  const defaultTrigger =
    mode === 'edit' ? (
      <Button variant="ghost" size="sm">
        Modifier
      </Button>
    ) : (
      <Button variant="default" size="sm">
        <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
        Nouveau protocole
      </Button>
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={(trigger ?? defaultTrigger) as never} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className={titleClass}>
            {mode === 'edit' ? 'Modifier protocole' : 'Nouveau protocole'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('id')} />

          <div>
            <Label htmlFor="proto-nom">Nom du protocole</Label>
            <Input
              id="proto-nom"
              {...register('nom')}
              placeholder="Ex. Vaccin Mycoplasma primo"
            />
            <FieldError message={errors.nom?.message} />
          </div>

          <div>
            <Label htmlFor="proto-desc">Description / instructions</Label>
            <Textarea
              id="proto-desc"
              rows={2}
              {...register('description')}
              placeholder="Notes vétérinaires, conditions d'usage…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="proto-cat">Catégorie cible</Label>
              <Select
                value={(categorie as string) || ''}
                onValueChange={(v) =>
                  setValue(
                    'categorie_cible',
                    ((v as string | null) ?? '') as CategorieProtocole | '',
                  )
                }
              >
                <SelectTrigger id="proto-cat" className="w-full">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES_PROTOCOLE.map((c) => (
                    <SelectItem key={c} value={c}>
                      {LABEL_CATEGORIE[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="proto-age">Âge (jours)</Label>
              <Input
                id="proto-age"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                {...register('age_jours')}
                placeholder="Ex. 14"
              />
              <FieldError
                message={errors.age_jours?.message as string | undefined}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="proto-produit">Produit</Label>
            <Input
              id="proto-produit"
              {...register('produit')}
              placeholder="Ex. Mycoplasma hyopneumoniae inactivé"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="proto-voie">Voie d&apos;administration</Label>
              <Select
                value={(voie as string) || ''}
                onValueChange={(v) =>
                  setValue(
                    'voie',
                    ((v as string | null) ?? '') as VoieAdmin | '',
                  )
                }
              >
                <SelectTrigger id="proto-voie" className="w-full">
                  <SelectValue placeholder="Voie" />
                </SelectTrigger>
                <SelectContent>
                  {VOIES_ADMIN.map((v) => (
                    <SelectItem key={v} value={v}>
                      {LABEL_VOIE[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="proto-dose">Dose (ml)</Label>
              <Input
                id="proto-dose"
                type="number"
                step="0.1"
                inputMode="decimal"
                {...register('dose_ml')}
                placeholder="Ex. 2.0"
              />
              <FieldError
                message={errors.dose_ml?.message as string | undefined}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="proto-rappels">
              Rappels (jours, séparés par des virgules)
            </Label>
            <Input
              id="proto-rappels"
              {...register('rappels_jours')}
              placeholder="Ex. 28, 56"
            />
            <p className="text-xs text-[var(--sf-muted,#5C5346)] mt-1">
              Indiquez les âges (en jours) où un rappel est attendu après le
              protocole.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!obligatoire}
                onChange={(e) =>
                  setValue('obligatoire', e.target.checked, {
                    shouldDirty: true,
                  })
                }
                className="h-4 w-4 accent-[var(--sf-primary)]"
              />
              <span>Obligatoire</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={actif !== false}
                onChange={(e) =>
                  setValue('actif', e.target.checked, { shouldDirty: true })
                }
                className="h-4 w-4 accent-[var(--sf-primary)]"
              />
              <span>Actif</span>
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Enregistrement…'
                : mode === 'edit'
                  ? 'Mettre à jour'
                  : 'Créer le protocole'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
