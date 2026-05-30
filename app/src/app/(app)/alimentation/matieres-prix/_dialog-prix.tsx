'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

import { prixSchema, type PrixInput } from './_schemas'
import { ajouterPrixMatiere } from './_actions'

type Matiere = { id: string; nom: string }

type Props = {
  trigger?: React.ReactNode
  matieres: Matiere[]
}

const titleClass =
  'font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xl'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1">{message}</p>
  )
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function DialogPrix({ trigger, matieres }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const defaultValues: PrixInput = {
    matiere_id: '',
    date_releve: todayIso(),
    prix_xof_kg: '' as unknown as number,
    source: '',
    observations: '',
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PrixInput>({
    resolver: zodResolver(prixSchema) as never,
    defaultValues,
  })

  const matiereId = watch('matiere_id')

  async function onSubmit(data: PrixInput) {
    const res = await ajouterPrixMatiere(data)
    if (res.ok) {
      toast.success('Prix enregistré')
      reset(defaultValues)
      setOpen(false)
      router.refresh()
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) reset(defaultValues)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          (trigger ?? (
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nouveau prix
            </Button>
          )) as never
        }
      />
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={titleClass}>
            Nouveau prix matière
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="prix-matiere">Matière</Label>
            <Select
              value={(matiereId as string) || ''}
              onValueChange={(v) => setValue('matiere_id', (v as string) || '')}
            >
              <SelectTrigger id="prix-matiere" className="w-full">
                <SelectValue placeholder="Sélectionner une matière" />
              </SelectTrigger>
              <SelectContent>
                {matieres.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.matiere_id?.message} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="prix-date">Date du relevé</Label>
              <Input
                id="prix-date"
                type="date"
                max={todayIso()}
                {...register('date_releve')}
              />
              <FieldError message={errors.date_releve?.message} />
            </div>
            <div>
              <Label htmlFor="prix-val">Prix XOF/kg</Label>
              <Input
                id="prix-val"
                type="number"
                step="1"
                min="1"
                {...register('prix_xof_kg')}
                placeholder="Ex. 320"
              />
              <FieldError message={errors.prix_xof_kg?.message} />
            </div>
          </div>

          <div>
            <Label htmlFor="prix-source">Source (optionnel)</Label>
            <Input
              id="prix-source"
              {...register('source')}
              placeholder="Ex. IVOGRAIN, marché Bouaké, facture #1234"
            />
            <FieldError message={errors.source?.message} />
          </div>

          <div>
            <Label htmlFor="prix-obs">Observations (optionnel)</Label>
            <Textarea
              id="prix-obs"
              rows={3}
              {...register('observations')}
              placeholder="Saison sèche, rupture stock fournisseur principal…"
            />
            <FieldError message={errors.observations?.message} />
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
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer le prix'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
