'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
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
  schemaMatiere,
  TYPES_STOCK,
  type MatiereInput,
} from './_schemas'
import { creerMatiere, modifierMatiere } from './_actions'
import {
  CATEGORIES_NUTRITIONNELLES,
  ORIGINES,
  LABEL_CATEGORIE,
  LABEL_ORIGINE,
  type CategorieNutritionnelle,
  type Origine,
} from '@/lib/nutrition-data'

export type MatiereRow = {
  id: string
  nom: string
  type: string
  unite: string | null
  categorie_nutritionnelle: CategorieNutritionnelle | null
  origine: Origine | null
  fournisseur: string | null
  mat_pct: number | null
  em_porc_kcal_kg: number | null
  lysine_pct: number | null
  methionine_pct: number | null
  calcium_pct: number | null
  phosphore_pct: number | null
  fibre_pct: number | null
  matiere_seche_pct: number | null
  prix_indicatif_xof_kg: number | null
  cout_moyen_unite: number | null
  stock_actuel: number | null
  seuil_alerte: number | null
  notes_terrain: string | null
  observations: string | null
}

type Mode = 'create' | 'edit'

type Props = {
  trigger?: React.ReactNode
  createLabel?: string
  mode?: Mode
  initial?: MatiereRow | null
}

const titleClass =
  'font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xl'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1">{message}</p>
  )
}

const LABEL_TYPE: Record<string, string> = {
  matiere_premiere: 'Matière première',
  aliment_fini: 'Aliment fini / concentré',
  autre: 'Autre',
}

export function DialogMatiere({
  trigger,
  createLabel = 'Nouvelle matière',
  mode = 'create',
  initial = null,
}: Props) {
  const [open, setOpen] = useState(false)

  const defaultValues: MatiereInput = {
    id: initial?.id ?? '',
    nom: initial?.nom ?? '',
    type: ((initial?.type as MatiereInput['type']) ?? 'matiere_premiere'),
    unite: initial?.unite ?? 'kg',
    categorie_nutritionnelle: (initial?.categorie_nutritionnelle ?? '') as
      | CategorieNutritionnelle
      | '',
    origine: (initial?.origine ?? '') as Origine | '',
    fournisseur: initial?.fournisseur ?? '',
    mat_pct: initial?.mat_pct ?? '',
    em_porc_kcal_kg: initial?.em_porc_kcal_kg ?? '',
    lysine_pct: initial?.lysine_pct ?? '',
    methionine_pct: initial?.methionine_pct ?? '',
    calcium_pct: initial?.calcium_pct ?? '',
    phosphore_pct: initial?.phosphore_pct ?? '',
    fibre_pct: initial?.fibre_pct ?? '',
    matiere_seche_pct: initial?.matiere_seche_pct ?? 88,
    prix_indicatif_xof_kg: initial?.prix_indicatif_xof_kg ?? '',
    cout_moyen_unite: initial?.cout_moyen_unite ?? '',
    stock_actuel: initial?.stock_actuel ?? 0,
    seuil_alerte: initial?.seuil_alerte ?? '',
    notes_terrain: initial?.notes_terrain ?? '',
    observations: initial?.observations ?? '',
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MatiereInput>({
    resolver: zodResolver(schemaMatiere) as never,
    defaultValues,
  })

  useEffect(() => {
    if (open) reset(defaultValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  const typeStock = watch('type')
  const categorie = watch('categorie_nutritionnelle')
  const origine = watch('origine')

  async function onSubmit(data: MatiereInput) {
    const res =
      mode === 'edit' ? await modifierMatiere(data) : await creerMatiere(data)
    if (res.ok) {
      toast.success(mode === 'edit' ? 'Matière mise à jour' : 'Matière créée')
      if (mode === 'create') reset()
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (trigger ?? (
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {createLabel}
            </Button>
          )) as never
        }
      />
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={titleClass}>
            {mode === 'edit' ? 'Modifier la matière' : 'Nouvelle matière première'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('id')} />

          {/* Identité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="mat-nom">Nom</Label>
              <Input
                id="mat-nom"
                {...register('nom')}
                placeholder="Ex. Maïs grain"
              />
              <FieldError message={errors.nom?.message} />
            </div>

            <div>
              <Label htmlFor="mat-type">Type de stock</Label>
              <Select
                value={(typeStock as string) || 'matiere_premiere'}
                onValueChange={(v) =>
                  setValue(
                    'type',
                    ((v as string) || 'matiere_premiere') as MatiereInput['type'],
                  )
                }
              >
                <SelectTrigger id="mat-type" className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_STOCK.filter((t) =>
                    ['matiere_premiere', 'aliment_fini', 'autre'].includes(t),
                  ).map((t) => (
                    <SelectItem key={t} value={t}>
                      {LABEL_TYPE[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mat-cat">Catégorie nutritionnelle</Label>
              <Select
                value={(categorie as string) || ''}
                onValueChange={(v) =>
                  setValue(
                    'categorie_nutritionnelle',
                    ((v as string | null) ?? '') as CategorieNutritionnelle | '',
                  )
                }
              >
                <SelectTrigger id="mat-cat" className="w-full">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES_NUTRITIONNELLES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {LABEL_CATEGORIE[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mat-origine">Origine</Label>
              <Select
                value={(origine as string) || ''}
                onValueChange={(v) =>
                  setValue(
                    'origine',
                    ((v as string | null) ?? '') as Origine | '',
                  )
                }
              >
                <SelectTrigger id="mat-origine" className="w-full">
                  <SelectValue placeholder="Origine" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGINES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {LABEL_ORIGINE[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mat-fournisseur">Fournisseur</Label>
              <Input
                id="mat-fournisseur"
                {...register('fournisseur')}
                placeholder="Ex. IVOGRAIN"
              />
            </div>
          </div>

          {/* Composition nutritionnelle */}
          <div className="rounded-md border border-[var(--sf-border,#E5DDD0)] p-3">
            <div className="eyebrow text-[11px] mb-2">
              Composition nutritionnelle (sur MS)
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="mat-mat">MAT % (protéine)</Label>
                <Input
                  id="mat-mat"
                  type="number"
                  step="0.1"
                  {...register('mat_pct')}
                  placeholder="Ex. 8.0"
                />
              </div>
              <div>
                <Label htmlFor="mat-em">EM kcal/kg</Label>
                <Input
                  id="mat-em"
                  type="number"
                  step="10"
                  {...register('em_porc_kcal_kg')}
                  placeholder="Ex. 3300"
                />
              </div>
              <div>
                <Label htmlFor="mat-ms">MS %</Label>
                <Input
                  id="mat-ms"
                  type="number"
                  step="0.1"
                  {...register('matiere_seche_pct')}
                  placeholder="88"
                />
              </div>
              <div>
                <Label htmlFor="mat-lys">Lysine SID %</Label>
                <Input
                  id="mat-lys"
                  type="number"
                  step="0.01"
                  {...register('lysine_pct')}
                />
              </div>
              <div>
                <Label htmlFor="mat-met">Méthionine SID %</Label>
                <Input
                  id="mat-met"
                  type="number"
                  step="0.01"
                  {...register('methionine_pct')}
                />
              </div>
              <div>
                <Label htmlFor="mat-fibre">Fibre %</Label>
                <Input
                  id="mat-fibre"
                  type="number"
                  step="0.1"
                  {...register('fibre_pct')}
                />
              </div>
              <div>
                <Label htmlFor="mat-ca">Calcium %</Label>
                <Input
                  id="mat-ca"
                  type="number"
                  step="0.01"
                  {...register('calcium_pct')}
                />
              </div>
              <div>
                <Label htmlFor="mat-p">Phosphore %</Label>
                <Input
                  id="mat-p"
                  type="number"
                  step="0.01"
                  {...register('phosphore_pct')}
                />
              </div>
            </div>
          </div>

          {/* Économique / stock */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="mat-prix">Prix indicatif (FCFA/kg)</Label>
              <Input
                id="mat-prix"
                type="number"
                step="10"
                {...register('prix_indicatif_xof_kg')}
                placeholder="Ex. 280"
              />
            </div>
            <div>
              <Label htmlFor="mat-stock">Stock actuel</Label>
              <Input
                id="mat-stock"
                type="number"
                step="1"
                {...register('stock_actuel')}
              />
            </div>
            <div>
              <Label htmlFor="mat-seuil">Seuil alerte</Label>
              <Input
                id="mat-seuil"
                type="number"
                step="1"
                {...register('seuil_alerte')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="mat-notes">Notes terrain</Label>
            <Textarea
              id="mat-notes"
              rows={2}
              {...register('notes_terrain')}
              placeholder="Conseils d'usage, fournisseur recommandé, risques…"
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Enregistrement…'
                : mode === 'edit'
                  ? 'Mettre à jour'
                  : 'Créer la matière'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
