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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { schemaPlan, type PlanInput } from './_schemas'
import { creerPlan, modifierPlan } from './_actions'

export type PlanRow = {
  id: string
  bande_id: string | null
  type_aliment_id: string | null
  date_debut: string
  date_fin: string | null
  ration_kg_jour: number | null
}

type Mode = 'create' | 'edit'

type BandeOption = { id: string; nom: string; code: string }
type TypeAlimentOption = { id: string; nom: string }

type Props = {
  trigger: React.ReactNode
  mode?: Mode
  initial?: PlanRow | null
  bandes: BandeOption[]
  typesAliment: TypeAlimentOption[]
}

const titleClass =
  'font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xl'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1">{message}</p>
  )
}

export function DialogPlan({
  trigger,
  mode = 'create',
  initial = null,
  bandes,
  typesAliment,
}: Props) {
  const [open, setOpen] = useState(false)

  const defaultValues: PlanInput = {
    id: initial?.id ?? '',
    bande_id: initial?.bande_id ?? '',
    type_aliment_id: initial?.type_aliment_id ?? '',
    date_debut: initial?.date_debut ?? new Date().toISOString().slice(0, 10),
    date_fin: initial?.date_fin ?? '',
    ration_kg_jour: initial?.ration_kg_jour ?? '',
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanInput>({
    resolver: zodResolver(schemaPlan) as never,
    defaultValues,
  })

  useEffect(() => {
    if (open) reset(defaultValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  const bande_id = watch('bande_id')
  const type_aliment_id = watch('type_aliment_id')

  async function onSubmit(data: PlanInput) {
    const res =
      mode === 'edit' ? await modifierPlan(data) : await creerPlan(data)
    if (res.ok) {
      toast.success(mode === 'edit' ? 'Plan mis à jour' : 'Plan créé')
      if (mode === 'create') reset()
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as never} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className={titleClass}>
            {mode === 'edit' ? 'Modifier le plan' : 'Nouveau plan d’alimentation'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('id')} />

          <div>
            <Label htmlFor="plan-bande">Bande</Label>
            <Select
              value={bande_id || ''}
              onValueChange={(v) =>
                setValue('bande_id', (v as string) || '', { shouldDirty: true })
              }
            >
              <SelectTrigger id="plan-bande" className="w-full">
                <SelectValue placeholder="Choisir une bande" />
              </SelectTrigger>
              <SelectContent>
                {bandes.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.code} — {b.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.bande_id?.message as string} />
          </div>

          <div>
            <Label htmlFor="plan-type">Type d’aliment</Label>
            <Select
              value={type_aliment_id || ''}
              onValueChange={(v) =>
                setValue('type_aliment_id', (v as string) || '', {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="plan-type" className="w-full">
                <SelectValue placeholder="Choisir un aliment" />
              </SelectTrigger>
              <SelectContent>
                {typesAliment.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.type_aliment_id?.message as string} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="plan-debut">Date de début</Label>
              <Input id="plan-debut" type="date" {...register('date_debut')} />
              <FieldError message={errors.date_debut?.message as string} />
            </div>
            <div>
              <Label htmlFor="plan-fin">Date de fin (optionnelle)</Label>
              <Input id="plan-fin" type="date" {...register('date_fin')} />
            </div>
          </div>

          <div>
            <Label htmlFor="plan-ration">Ration journalière (kg/jour)</Label>
            <Input
              id="plan-ration"
              type="number"
              step="0.01"
              inputMode="decimal"
              {...register('ration_kg_jour')}
              placeholder="Ex. 2.5"
            />
            <FieldError message={errors.ration_kg_jour?.message as string} />
            <p className="text-xs text-[var(--sf-muted,#5C5346)] mt-1">
              Quantité distribuée par animal et par jour (kg).
            </p>
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
                  : 'Créer le plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
