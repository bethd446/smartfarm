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

import { enregistrerLotMatierePremiere } from './_actions'

type MpOpt = { id: string; nom: string }

const schema = z.object({
  matiere_premiere_id: z.string().uuid('Matière première requise'),
  reference_lot: z.string().min(1, 'Référence requise'),
  date_reception: z.string().min(1, 'Date requise'),
  quantite_kg: z.coerce.number().nonnegative('Quantité ≥ 0'),
  origine: z.string().optional().or(z.literal('')),
  analyse_aflatoxine_b1_ppb: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .optional(),
  analyse_zearalenone_ppb: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .optional(),
  analyse_don_ppb: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .optional(),
  date_analyse: z.string().optional().or(z.literal('')),
  observations: z.string().optional().or(z.literal('')),
})
type FormValues = z.input<typeof schema>

const titleClass =
  'font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xl'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1">{message}</p>
  )
}

export function DialogEnregistrerLot({
  trigger,
  matieres,
}: {
  // Optionnel : si absent, un trigger par défaut est rendu DANS ce client
  // component (évite le mismatch d'hydratation du passage RSC→Client + Radix
  // asChild quand le <Button> est créé dans une page Server Component).
  trigger?: React.ReactNode
  matieres: MpOpt[]
}) {
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      matiere_premiere_id: '',
      reference_lot: '',
      date_reception: today,
      quantite_kg: '' as unknown as number,
      origine: '',
      analyse_aflatoxine_b1_ppb: '',
      analyse_zearalenone_ppb: '',
      analyse_don_ppb: '',
      date_analyse: '',
      observations: '',
    },
  })

  const mpId = watch('matiere_premiere_id')

  async function onSubmit(data: FormValues) {
    const res = await enregistrerLotMatierePremiere({
      matiere_premiere_id: data.matiere_premiere_id,
      reference_lot: data.reference_lot,
      date_reception: data.date_reception,
      quantite_kg: data.quantite_kg as number,
      origine: data.origine || undefined,
      analyse_aflatoxine_b1_ppb:
        data.analyse_aflatoxine_b1_ppb === ''
          ? undefined
          : (data.analyse_aflatoxine_b1_ppb as number),
      analyse_zearalenone_ppb:
        data.analyse_zearalenone_ppb === ''
          ? undefined
          : (data.analyse_zearalenone_ppb as number),
      analyse_don_ppb:
        data.analyse_don_ppb === ''
          ? undefined
          : (data.analyse_don_ppb as number),
      date_analyse: data.date_analyse || undefined,
      observations: data.observations || undefined,
    })
    if (res.ok) {
      toast.success('Lot enregistré')
      reset()
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
              Enregistrer un lot
            </Button>
          )) as never
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className={titleClass}>
            Enregistrer un lot matière première
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lot-mp">Matière première</Label>
              <Select
                value={mpId || ''}
                onValueChange={(v) =>
                  setValue('matiere_premiere_id', (v as string) ?? '', {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="lot-mp" className="w-full">
                  <SelectValue placeholder="Maïs / arachide / soja…" />
                </SelectTrigger>
                <SelectContent>
                  {matieres.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.matiere_premiere_id?.message} />
            </div>
            <div>
              <Label htmlFor="lot-ref">Référence lot</Label>
              <Input
                id="lot-ref"
                {...register('reference_lot')}
                placeholder="Ex. L-202605-001"
              />
              <FieldError message={errors.reference_lot?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lot-date">Date de réception</Label>
              <Input
                id="lot-date"
                type="date"
                {...register('date_reception')}
              />
              <FieldError message={errors.date_reception?.message} />
            </div>
            <div>
              <Label htmlFor="lot-qte">Quantité (kg)</Label>
              <Input
                id="lot-qte"
                type="number"
                step="0.1"
                min={0}
                inputMode="decimal"
                {...register('quantite_kg')}
                placeholder="Ex. 2000"
              />
              <FieldError message={errors.quantite_kg?.message as string} />
            </div>
          </div>

          <div>
            <Label htmlFor="lot-origine">Origine</Label>
            <Input
              id="lot-origine"
              {...register('origine')}
              placeholder="Ex. Marché Bouaké, Coopérative ABC"
            />
          </div>

          <div className="rounded-[6px] border border-[var(--sf-line,rgba(0,0,0,0.18))] p-3 space-y-3">
            <Label className="block text-[12px] font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em]">
              Analyses (ppb / µg·kg⁻¹) — seuils UE porcs
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="lot-afla" className="text-xs">
                  Aflatoxine B1 (≤ 20)
                </Label>
                <Input
                  id="lot-afla"
                  type="number"
                  step="0.01"
                  min={0}
                  inputMode="decimal"
                  {...register('analyse_aflatoxine_b1_ppb')}
                />
              </div>
              <div>
                <Label htmlFor="lot-zea" className="text-xs">
                  Zéaralénone (≤ 250)
                </Label>
                <Input
                  id="lot-zea"
                  type="number"
                  step="0.01"
                  min={0}
                  inputMode="decimal"
                  {...register('analyse_zearalenone_ppb')}
                />
              </div>
              <div>
                <Label htmlFor="lot-don" className="text-xs">
                  DON (≤ 900)
                </Label>
                <Input
                  id="lot-don"
                  type="number"
                  step="0.01"
                  min={0}
                  inputMode="decimal"
                  {...register('analyse_don_ppb')}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="lot-date-ana" className="text-xs">
                Date d&apos;analyse
              </Label>
              <Input
                id="lot-date-ana"
                type="date"
                {...register('date_analyse')}
              />
            </div>
            <p className="text-[11px] text-[var(--sf-muted,#5C5346)]">
              Laisser vide si analyse non réalisée. Une absence d&apos;analyse
              aflatoxine B1 sur un lot reçu depuis &gt;7 j déclenche
              l&apos;alerte R18.
            </p>
          </div>

          <div>
            <Label htmlFor="lot-obs">Observations</Label>
            <Textarea
              id="lot-obs"
              rows={2}
              {...register('observations')}
              placeholder="Notes, conditions de stockage…"
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
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer le lot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
