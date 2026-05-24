'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowRightLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
  LIBELLES_STADE,
  stadesAutorisesPour,
  TOUS_LES_STADES,
  type StadeAnimal,
} from '@/lib/stades-animaux'
import { changerStade } from './_actions'

const schema = z.object({
  nouveau_stade: z.enum(TOUS_LES_STADES as [StadeAnimal, ...StadeAnimal[]], {
    message: 'Stade requis',
  }),
  motif: z
    .string()
    .max(500, 'Motif trop long (500 caractères max)')
    .optional()
    .or(z.literal('')),
})

type FormData = z.input<typeof schema>

export function DialogChangerStade({
  animalId,
  categorie,
  stadeActuel,
}: {
  animalId: string
  categorie: string
  stadeActuel: string
}) {
  const [open, setOpen] = useState(false)
  const isVerrat = categorie === 'verrat'
  const stadesDispos = stadesAutorisesPour(categorie).filter(
    (s) => s !== stadeActuel,
  )

  const {
    handleSubmit,
    setValue,
    watch,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nouveau_stade: undefined,
      motif: '',
    },
  })

  const nouveau_stade = watch('nouveau_stade')

  async function onSubmit(data: FormData) {
    const res = await changerStade({
      animal_id: animalId,
      nouveau_stade: data.nouveau_stade,
      motif: data.motif || undefined,
    })
    if (res.ok) {
      const libAncien =
        LIBELLES_STADE[res.ancien_stade as StadeAnimal] ?? res.ancien_stade
      const libNouveau =
        LIBELLES_STADE[res.nouveau_stade as StadeAnimal] ?? res.nouveau_stade
      toast.success(`Stade mis à jour : ${libAncien} → ${libNouveau}`)
      reset({ nouveau_stade: undefined, motif: '' })
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  if (isVerrat) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title="Stade verrat non modifiable"
      >
        <ArrowRightLeft className="h-4 w-4 mr-2" />
        Changer stade
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Changer stade
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            className="uppercase tracking-wide text-2xl"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Changer le stade zootechnique
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Stade actuel</Label>
            <div className="rounded-md border border-[var(--sf-border,#e5e5e5)] bg-[var(--sf-muted-bg,#fafafa)] px-3 py-2 text-sm text-[var(--sf-ink)]">
              {LIBELLES_STADE[stadeActuel as StadeAnimal] ?? stadeActuel}
            </div>
          </div>

          <div>
            <Label>Nouveau stade *</Label>
            <Select
              value={nouveau_stade ?? ''}
              onValueChange={(v) =>
                setValue('nouveau_stade', v as StadeAnimal, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un stade" />
              </SelectTrigger>
              <SelectContent>
                {stadesDispos.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LIBELLES_STADE[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.nouveau_stade && (
              <p className="text-xs text-[var(--sf-danger,#b00020)] mt-1">
                {errors.nouveau_stade.message as string}
              </p>
            )}
            {categorie === 'cochette' &&
            (nouveau_stade === 'truie_vide' ||
              nouveau_stade === 'truie_gestante' ||
              nouveau_stade === 'truie_allaitante') ? (
              <p className="text-xs text-[var(--sf-muted)] mt-1">
                La catégorie passera de <strong>cochette</strong> à{' '}
                <strong>truie</strong>.
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="motif">Motif (optionnel)</Label>
            <Textarea
              id="motif"
              rows={3}
              placeholder="Ex : correction manuelle après diagnostic, réforme partielle…"
              {...register('motif')}
            />
            {errors.motif && (
              <p className="text-xs text-[var(--sf-danger,#b00020)] mt-1">
                {errors.motif.message as string}
              </p>
            )}
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
