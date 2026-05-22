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
import { creerSaillie } from './_server-actions'
import { saillieSchema } from './_schemas'

type FormData = z.input<typeof saillieSchema>

export type AnimalOption = { id: string; tag: string; nom: string | null }
export type BandeOption = {
  id: string
  code?: string | null
  nom?: string | null
}

const SELECT_CLASS =
  'w-full h-12 min-h-12 px-0 py-2 text-base bg-transparent border-0 border-b-2 ' +
  'border-[var(--sf-ink,#1a1a1a)] focus:border-b-[var(--sf-primary,#2D4A1F)] ' +
  'focus:outline-none focus-visible:outline-none rounded-none ' +
  'text-[var(--sf-ink,#1a1a1a)]'

const ERR_CLASS = 'text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1'

export function DialogFaireMonter({
  trigger,
  truies,
  verrats,
  bandes,
  prefillTruieId,
  open: openProp,
  onOpenChange,
}: {
  trigger?: React.ReactNode
  truies: AnimalOption[]
  verrats: AnimalOption[]
  bandes: BandeOption[]
  /** Pré-sélectionne une truie dans le select (ex. depuis retour chaleur). */
  prefillTruieId?: string
  /** Mode contrôlé : permet d'ouvrir le dialog depuis l'extérieur. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(saillieSchema),
    defaultValues: {
      truie_id: prefillTruieId ?? '',
      verrat_id: '',
      bande_id: '',
      date_saillie: today,
      methode: 'naturelle',
      rang_porte: '',
      bcs_truie: '',
      observations: '',
    },
  })

  const bcsValue = watch('bcs_truie')

  async function onSubmit(data: FormData) {
    const res = await creerSaillie(data)
    if (res.ok) {
      toast.success('Montée enregistrée')
      reset()
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as any} />}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            className="uppercase tracking-wide text-2xl"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Nouvelle saillie
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
        >
          <div>
            <Label htmlFor="truie_id">La truie *</Label>
            <select
              id="truie_id"
              {...register('truie_id')}
              className={SELECT_CLASS}
            >
              <option value="">— Choisir —</option>
              {truies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom ? `${t.nom} (${t.tag})` : t.tag}
                </option>
              ))}
            </select>
            {errors.truie_id && (
              <p className={ERR_CLASS}>{errors.truie_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="verrat_id">Le mâle</Label>
            <select
              id="verrat_id"
              {...register('verrat_id')}
              className={SELECT_CLASS}
            >
              <option value="">— Aucun / IA —</option>
              {verrats.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nom ? `${v.nom} (${v.tag})` : v.tag}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="methode">Comment *</Label>
            <select
              id="methode"
              {...register('methode')}
              className={SELECT_CLASS}
            >
              <option value="naturelle">Naturelle</option>
              <option value="IA">Insémination artificielle</option>
              <option value="IA_double">IA double</option>
            </select>
          </div>

          <div>
            <Label htmlFor="date_saillie">Date de la montée *</Label>
            <Input id="date_saillie" type="date" {...register('date_saillie')} />
            {errors.date_saillie && (
              <p className={ERR_CLASS}>{errors.date_saillie.message}</p>
            )}
          </div>

          {bandes.length > 0 && (
            <div>
              <Label htmlFor="bande_id">Bande</Label>
              <select
                id="bande_id"
                {...register('bande_id')}
                className={SELECT_CLASS}
              >
                <option value="">— Aucune —</option>
                {bandes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nom ?? b.code ?? b.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="rang_porte">Rang de portée</Label>
            <Input
              id="rang_porte"
              type="number"
              min={1}
              max={20}
              {...register('rang_porte')}
            />
            {errors.rang_porte && (
              <p className={ERR_CLASS}>{errors.rang_porte.message}</p>
            )}
          </div>

          {/* === BCS truie (Body Condition Score 1..5) — optionnel === */}
          <div>
            <Label htmlFor="bcs_truie">BCS truie (1-5)</Label>
            <div
              role="radiogroup"
              aria-label="BCS truie"
              className="flex gap-2 mt-1"
            >
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = Number(bcsValue) === n
                const isIdeal = n === 3
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      setValue('bcs_truie', selected ? '' : n, {
                        shouldValidate: true,
                      })
                    }
                    className="flex-1 h-12 border-2 text-base font-bold tabular-nums transition-colors"
                    style={{
                      borderColor: selected
                        ? 'var(--sf-primary, #2D4A1F)'
                        : isIdeal
                          ? 'var(--sf-success-ink, #1F3414)'
                          : 'var(--sf-line, #d4cfc1)',
                      background: selected
                        ? 'var(--sf-primary, #2D4A1F)'
                        : isIdeal
                          ? 'var(--sf-success-bg, #DCE9CB)'
                          : 'transparent',
                      color: selected
                        ? '#fff'
                        : isIdeal
                          ? 'var(--sf-success-ink, #1F3414)'
                          : 'var(--sf-ink, #1a1a1a)',
                    }}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-[var(--sf-muted)] mt-1">
              1 = très maigre, 3 = optimal, 5 = grasse
            </p>
            {errors.bcs_truie && (
              <p className={ERR_CLASS}>{errors.bcs_truie.message as string}</p>
            )}
            {/* Champ caché pour que react-hook-form enregistre la valeur */}
            <input type="hidden" {...register('bcs_truie')} />
          </div>

          <div>
            <Label htmlFor="observations">Observations</Label>
            <Textarea id="observations" rows={2} {...register('observations')} />
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
