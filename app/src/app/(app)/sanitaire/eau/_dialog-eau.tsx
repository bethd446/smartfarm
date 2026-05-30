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

import { enregistrerConsoEau } from './_actions'

type BandeOpt = { id: string; code: string | null }
type BatimentOpt = { id: string; nom: string }

const schema = z.object({
  date: z.string().min(1, 'Date requise'),
  litres: z.coerce.number().nonnegative('Litres ≥ 0'),
  nb_animaux: z
    .union([z.coerce.number().int().nonnegative(), z.literal('')])
    .optional(),
  bande_id: z.string().optional().or(z.literal('')),
  batiment_id: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  observations: z.string().optional().or(z.literal('')),
})
type FormValues = z.input<typeof schema>

const titleClass =
  'font-[family-name:var(--sf-font-display)] text-xl'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1">{message}</p>
  )
}

export function DialogSaisirReleveEau({
  trigger,
  bandes,
  batiments,
}: {
  trigger: React.ReactNode
  bandes: BandeOpt[]
  batiments: BatimentOpt[]
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
      date: today,
      litres: '' as unknown as number,
      nb_animaux: '',
      bande_id: '',
      batiment_id: '',
      source: 'compteur_global',
      observations: '',
    },
  })

  const bandeId = watch('bande_id')
  const batimentId = watch('batiment_id')
  const source = watch('source')

  async function onSubmit(data: FormValues) {
    const res = await enregistrerConsoEau({
      date: data.date,
      litres: data.litres as number,
      nb_animaux:
        data.nb_animaux === '' ? undefined : (data.nb_animaux as number),
      bande_id: data.bande_id || '',
      batiment_id: data.batiment_id || '',
      source: data.source || '',
      observations: data.observations || '',
    })
    if (res.ok) {
      toast.success('Relevé enregistré')
      reset()
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as never} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className={titleClass}>Saisir un relevé</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="eau-date">Date</Label>
              <Input id="eau-date" type="date" {...register('date')} />
              <FieldError message={errors.date?.message} />
            </div>
            <div>
              <Label htmlFor="eau-litres">Litres consommés</Label>
              <Input
                id="eau-litres"
                type="number"
                step="0.1"
                min={0}
                inputMode="decimal"
                {...register('litres')}
                placeholder="Ex. 1850"
              />
              <FieldError message={errors.litres?.message as string} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="eau-nb">Nombre d&apos;animaux</Label>
              <Input
                id="eau-nb"
                type="number"
                min={0}
                inputMode="numeric"
                {...register('nb_animaux')}
                placeholder="Pour calcul L/animal"
              />
            </div>
            <div>
              <Label htmlFor="eau-source">Source du relevé</Label>
              <Select
                value={source || ''}
                onValueChange={(v) =>
                  setValue('source', (v as string) ?? '')
                }
              >
                <SelectTrigger id="eau-source" className="w-full">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compteur_global">
                    Compteur global
                  </SelectItem>
                  <SelectItem value="compteur_bande">
                    Compteur bande
                  </SelectItem>
                  <SelectItem value="manuel">Manuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="eau-bande">Bande (optionnel)</Label>
              <Select
                value={bandeId || ''}
                onValueChange={(v) =>
                  setValue('bande_id', (v as string) ?? '')
                }
              >
                <SelectTrigger id="eau-bande" className="w-full">
                  <SelectValue placeholder="Toute la ferme" />
                </SelectTrigger>
                <SelectContent>
                  {bandes.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code ?? b.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="eau-bat">Bâtiment (optionnel)</Label>
              <Select
                value={batimentId || ''}
                onValueChange={(v) =>
                  setValue('batiment_id', (v as string) ?? '')
                }
              >
                <SelectTrigger id="eau-bat" className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {batiments.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="eau-obs">Observations</Label>
            <Textarea
              id="eau-obs"
              rows={2}
              {...register('observations')}
              placeholder="Anomalies, fuites…"
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
