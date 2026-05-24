'use client'

import { useState, useEffect } from 'react'
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
  creerConsommation,
  modifierConsommation,
  type ConsoInput,
} from './_actions'

/* -------------------------------------------------------------------------- */
/*  Schema client (miroir strict du schéma server)                            */
/*  FIX BUG-SC12 : formule_id (FK formules) + qte_kg ; cout retiré (dérivé).  */
/* -------------------------------------------------------------------------- */
const schemaConsommation = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  bande_id: z.string().uuid({ message: 'Bande requise' }),
  formule_id: z.string().uuid({ message: 'Formule d’aliment requise' }),
  date: z.string().min(1, 'Date requise'),
  qte_kg: z.coerce
    .number({ message: 'Quantité requise' })
    .positive('La quantité doit être > 0'),
  observations: z.string().optional().or(z.literal('')),
})

type FormValues = z.input<typeof schemaConsommation>

export type ConsoRow = {
  id: string
  bande_id: string | null
  formule_id: string | null
  date: string
  qte_kg: number
  observations: string | null
}

type Mode = 'create' | 'edit'
type BandeOption = { id: string; nom: string; code: string }
type FormuleOption = { id: string; nom: string }

type Props = {
  trigger: React.ReactNode
  mode?: Mode
  initial?: ConsoRow | null
  bandes: BandeOption[]
  formules: FormuleOption[]
}

const titleClass =
  'font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xl'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1">{message}</p>
  )
}

export function DialogConsommation({
  trigger,
  mode = 'create',
  initial = null,
  bandes,
  formules,
}: Props) {
  const [open, setOpen] = useState(false)

  const defaultValues: FormValues = {
    id: initial?.id ?? '',
    bande_id: initial?.bande_id ?? '',
    formule_id: initial?.formule_id ?? '',
    date: initial?.date ?? new Date().toISOString().slice(0, 10),
    qte_kg: initial?.qte_kg ?? ('' as unknown as number),
    observations: initial?.observations ?? '',
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schemaConsommation) as never,
    defaultValues,
  })

  useEffect(() => {
    if (open) reset(defaultValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  const bande_id = watch('bande_id')
  const formule_id = watch('formule_id')

  async function onSubmit(data: FormValues) {
    const payload = data as unknown as ConsoInput
    const res =
      mode === 'edit'
        ? await modifierConsommation(payload)
        : await creerConsommation(payload)
    if (res.ok) {
      toast.success(
        mode === 'edit' ? 'Consommation mise à jour' : 'Consommation enregistrée',
      )
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
            {mode === 'edit'
              ? 'Modifier la consommation'
              : 'Saisir une consommation'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register('id')} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="conso-date">Date</Label>
              <Input id="conso-date" type="date" {...register('date')} />
              <FieldError message={errors.date?.message as string} />
            </div>
            <div>
              <Label htmlFor="conso-qte">Quantité (kg)</Label>
              <Input
                id="conso-qte"
                type="number"
                step="0.1"
                inputMode="decimal"
                {...register('qte_kg')}
                placeholder="Ex. 120"
              />
              <FieldError message={errors.qte_kg?.message as string} />
            </div>
          </div>

          <div>
            <Label htmlFor="conso-bande">Bande</Label>
            <Select
              value={bande_id || ''}
              onValueChange={(v) =>
                setValue('bande_id', (v as string) || '', { shouldDirty: true })
              }
            >
              <SelectTrigger id="conso-bande" className="w-full">
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
            <Label htmlFor="conso-formule">Formule d’aliment</Label>
            <Select
              value={formule_id || ''}
              onValueChange={(v) =>
                setValue('formule_id', (v as string) || '', {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="conso-formule" className="w-full">
                <SelectValue placeholder="Choisir une formule" />
              </SelectTrigger>
              <SelectContent>
                {formules.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.formule_id?.message as string} />
            <p className="text-xs text-[var(--sf-muted,#5C5346)] mt-1">
              Le coût est calculé automatiquement à partir du prix kg de la
              formule.
            </p>
          </div>

          <div>
            <Label htmlFor="conso-obs">Observations</Label>
            <Textarea
              id="conso-obs"
              rows={2}
              {...register('observations')}
              placeholder="Notes terrain (qualité, refus, etc.)"
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
                  : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
