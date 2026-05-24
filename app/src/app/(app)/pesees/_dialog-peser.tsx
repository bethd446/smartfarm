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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { creerPesee } from './_server-actions'

const schema = z
  .object({
    type: z.enum(['individuelle', 'bande_moyenne', 'bande_totale']),
    animal_id: z.string().uuid().optional().or(z.literal('')),
    bande_id: z.string().uuid().optional().or(z.literal('')),
    date_pesee: z.string().min(1, 'Date requise'),
    poids_kg: z.coerce
      .number()
      .positive('Poids doit être positif')
      .max(500, 'Poids irréaliste'),
    nb_animaux: z.coerce.number().int().positive().default(1),
    observations: z.string().optional().or(z.literal('')),
  })
  .refine((d) => d.animal_id || d.bande_id, {
    message: 'Choisir un animal OU une bande',
  })

type FormData = z.input<typeof schema>

const today = () => new Date().toISOString().slice(0, 10)

export function DialogPeser({
  trigger,
  animaux,
  bandes,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  trigger?: React.ReactNode
  animaux: { id: string; tag: string; nom: string | null }[]
  bandes: { id: string; nom: string; code: string | null }[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const [mode, setMode] = useState<'individuelle' | 'bande'>('individuelle')

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
      type: 'individuelle',
      animal_id: '',
      bande_id: '',
      date_pesee: today(),
      poids_kg: '' as unknown as number,
      nb_animaux: 1,
      observations: '',
    },
  })

  const type = watch('type')
  const animal_id = watch('animal_id')
  const bande_id = watch('bande_id')

  function switchMode(v: string) {
    const m = v as 'individuelle' | 'bande'
    setMode(m)
    if (m === 'individuelle') {
      setValue('type', 'individuelle')
      setValue('bande_id', '')
      setValue('nb_animaux', 1)
    } else {
      setValue('type', 'bande_moyenne')
      setValue('animal_id', '')
    }
  }

  async function onSubmit(data: FormData) {
    const res = await creerPesee(data)
    if (res.ok) {
      toast.success('Pesée enregistrée')
      reset({
        type: mode === 'individuelle' ? 'individuelle' : 'bande_moyenne',
        animal_id: '',
        bande_id: '',
        date_pesee: today(),
        poids_kg: '' as unknown as number,
        nb_animaux: 1,
        observations: '',
      })
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as any} />}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle
            className="uppercase tracking-wide text-2xl"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Peser maintenant
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
        >
          <Tabs value={mode} onValueChange={switchMode}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="individuelle">Individuelle</TabsTrigger>
              <TabsTrigger value="bande">Bande</TabsTrigger>
            </TabsList>

            <TabsContent value="individuelle" className="space-y-4 pt-4">
              <div>
                <Label>Animal *</Label>
                <Select
                  value={animal_id || ''}
                  onValueChange={(v) =>
                    setValue('animal_id', v ?? '', { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un animal" />
                  </SelectTrigger>
                  <SelectContent>
                    {animaux.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.tag}
                        {a.nom ? ` · ${a.nom}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="bande" className="space-y-4 pt-4">
              <div>
                <Label>Bande *</Label>
                <Select
                  value={bande_id || ''}
                  onValueChange={(v) =>
                    setValue('bande_id', v ?? '', { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une bande" />
                  </SelectTrigger>
                  <SelectContent>
                    {bandes.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nom}
                        {b.code ? ` · ${b.code}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type de pesée</Label>
                <Select
                  value={
                    type === 'individuelle' ? 'bande_moyenne' : type
                  }
                  onValueChange={(v) =>
                    setValue(
                      'type',
                      (v ?? 'bande_moyenne') as FormData['type'],
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bande_moyenne">
                      Moyenne de la bande
                    </SelectItem>
                    <SelectItem value="bande_totale">
                      Poids total de la bande
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nb_animaux">Nombre d'animaux</Label>
                <Input
                  id="nb_animaux"
                  type="number"
                  min="1"
                  step="1"
                  {...register('nb_animaux')}
                />
              </div>
            </TabsContent>
          </Tabs>

          {(errors.animal_id || errors.bande_id || errors.root) && (
            <p className="text-xs text-[var(--sf-danger,#b00020)]">
              Choisir un animal ou une bande
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date_pesee">Date *</Label>
              <div className="flex gap-2">
                <Input
                  id="date_pesee"
                  type="date"
                  {...register('date_pesee')}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValue('date_pesee', new Date().toISOString().slice(0, 10), { shouldValidate: true, shouldDirty: true })}
                >
                  Aujourd&apos;hui
                </Button>
              </div>
              {errors.date_pesee && (
                <p className="text-xs text-[var(--sf-danger,#b00020)] mt-1">
                  {errors.date_pesee.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="poids_kg">Poids (kg) *</Label>
              <Input
                id="poids_kg"
                type="number"
                step="0.1"
                min="0"
                {...register('poids_kg')}
              />
              {errors.poids_kg && (
                <p className="text-xs text-[var(--sf-danger,#b00020)] mt-1">
                  {errors.poids_kg.message}
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
