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
import { creerAnimal } from './_server-actions'
import { CATEGORIE_LABEL, SEXE_LABEL } from '@/lib/terrain-labels'
import { Plus as PlusIcon } from 'lucide-react'

const schema = z.object({
  tag: z.string().min(1, 'Numéro requis').max(20),
  nom: z.string().optional().or(z.literal('')),
  sexe: z.enum(['M', 'F']),
  categorie: z.enum([
    'truie',
    'cochette',
    'verrat',
    'porcelet_lait',
    'porcelet_sevre',
    'porcelet_croissance',
    'porc_engraissement',
  ]),
  race_id: z.string().uuid().optional().or(z.literal('')),
  date_naissance: z.string().optional().or(z.literal('')),
  poids_naissance_kg: z.coerce.number().positive().optional().or(z.literal('')),
  observations: z.string().optional().or(z.literal('')),
})

type FormData = z.input<typeof schema>

// Ordre d'affichage pour les catégories (vocabulaire éleveur)
const CATEGORIES_ORDER: Array<FormData['categorie']> = [
  'truie',
  'cochette',
  'verrat',
  'porcelet_lait',
  'porcelet_sevre',
  'porcelet_croissance',
  'porc_engraissement',
]

export function DialogNouvelAnimal({
  trigger,
  races,
  open: openProp,
  onOpenChange,
}: {
  trigger?: React.JSX.Element
  races: { id: string; nom: string }[]
  open?: boolean
  onOpenChange?: (next: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next)
    else setInternalOpen(next)
  }
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tag: '',
      nom: '',
      sexe: undefined,
      categorie: undefined,
      race_id: '',
      date_naissance: '',
      poids_naissance_kg: '',
      observations: '',
    },
  })

  const sexe = watch('sexe')
  const categorie = watch('categorie')
  const race_id = watch('race_id')

  async function onSubmit(data: FormData) {
    const res = await creerAnimal(data)
    if (res.ok) {
      toast.success('Animal enregistré', {
        description: `N° ${data.tag}`,
      })
      reset()
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : null}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle
            className="uppercase tracking-wide text-2xl"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Nouvel animal
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tag">Numéro de l&apos;animal *</Label>
              <Input id="tag" {...register('tag')} placeholder="ex. FR1234" />
              {errors.tag && (
                <p className="text-xs text-[var(--sf-danger,#b00020)] mt-1">
                  {errors.tag.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="nom">Surnom</Label>
              <Input id="nom" {...register('nom')} placeholder="Rosie..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sexe *</Label>
              <Select
                value={sexe || ''}
                onValueChange={(v) =>
                  setValue('sexe', (v ?? 'M') as 'M' | 'F', {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir">
                    {(value) => (value ? SEXE_LABEL[value as string] ?? value : 'Choisir')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">♂ Mâle</SelectItem>
                  <SelectItem value="F">♀ Femelle</SelectItem>
                </SelectContent>
              </Select>
              {errors.sexe && (
                <p className="text-xs text-[var(--sf-danger,#b00020)] mt-1">
                  {errors.sexe.message}
                </p>
              )}
            </div>
            <div>
              <Label>Catégorie *</Label>
              <Select
                value={categorie || ''}
                onValueChange={(v) =>
                  setValue(
                    'categorie',
                    (v ?? 'truie') as FormData['categorie'],
                    { shouldValidate: true }
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir">
                    {(value) => (value ? CATEGORIE_LABEL[value as string] ?? value : 'Choisir')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORIE_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categorie && (
                <p className="text-xs text-[var(--sf-danger,#b00020)] mt-1">
                  {errors.categorie.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Race</Label>
            <Select
              value={race_id || ''}
              onValueChange={(v) =>
                setValue('race_id', v ?? '', { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Race (optionnel)">
                  {(value) => {
                    if (!value) return 'Race (optionnel)'
                    const r = races.find((r) => r.id === value)
                    return r ? r.nom : value
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {races.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date_naissance">Date de naissance</Label>
              <Input
                id="date_naissance"
                type="date"
                {...register('date_naissance')}
              />
            </div>
            <div>
              <Label htmlFor="poids_naissance_kg">Poids à la naissance (kg)</Label>
              <Input
                id="poids_naissance_kg"
                type="number"
                step="0.01"
                min="0"
                {...register('poids_naissance_kg')}
              />
              {errors.poids_naissance_kg && (
                <p className="text-xs text-[var(--sf-danger,#b00020)] mt-1">
                  {errors.poids_naissance_kg.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              rows={2}
              {...register('observations')}
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
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
