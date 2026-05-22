'use client'

import { useEffect, useState } from 'react'
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
import { creerSevrage } from './_server-actions'
import { sevrageSchema } from './_schemas'

type FormData = z.input<typeof sevrageSchema>

export type MiseBasOption = {
  id: string
  truie_tag: string
  truie_nom: string | null
  date_mise_bas: string
  nes_vivants: number
}

const SELECT_CLASS =
  'w-full h-12 min-h-12 px-0 py-2 text-base bg-transparent border-0 border-b-2 ' +
  'border-[var(--sf-ink,#1a1a1a)] focus:border-b-[var(--sf-primary,#2D4A1F)] ' +
  'focus:outline-none focus-visible:outline-none rounded-none ' +
  'text-[var(--sf-ink,#1a1a1a)]'

const ERR_CLASS = 'text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1'

function diffDays(a: string, b: string): number | null {
  if (!a || !b) return null
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  if (Number.isNaN(da) || Number.isNaN(db)) return null
  return Math.round((db - da) / (1000 * 60 * 60 * 24))
}

export function DialogSevrage({
  trigger,
  mises_bas_sans_sevrage,
}: {
  trigger: React.ReactNode
  mises_bas_sans_sevrage: MiseBasOption[]
}) {
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(sevrageSchema),
    defaultValues: {
      mise_bas_id: '',
      date_sevrage: today,
      nb_sevres: 0,
      poids_total_kg: '',
      age_jours: '',
      bcs_truie: '',
      observations: '',
    },
  })

  const miseBasId = watch('mise_bas_id')
  const dateSevrage = watch('date_sevrage')
  const bcsValue = watch('bcs_truie')

  // Auto-pré-remplir nb_sevres = nes_vivants quand on choisit une mise-bas
  // et calculer age_jours preview
  const selected = mises_bas_sans_sevrage.find((m) => m.id === miseBasId)
  const agePreview = selected
    ? diffDays(selected.date_mise_bas, dateSevrage)
    : null

  useEffect(() => {
    if (selected) {
      setValue('nb_sevres', selected.nes_vivants, { shouldValidate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miseBasId])

  useEffect(() => {
    if (agePreview !== null && agePreview >= 0) {
      setValue('age_jours', agePreview, { shouldValidate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agePreview])

  async function onSubmit(data: FormData) {
    const res = await creerSevrage(data)
    if (res.ok) {
      toast.success('Sevrage enregistré')
      reset()
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as any} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            className="uppercase tracking-wide text-2xl"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Sevrage
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
        >
          <div>
            <Label htmlFor="mise_bas_id">La portée *</Label>
            <select
              id="mise_bas_id"
              {...register('mise_bas_id')}
              className={SELECT_CLASS}
            >
              <option value="">— Choisir —</option>
              {mises_bas_sans_sevrage.map((m) => {
                const date = new Date(m.date_mise_bas).toLocaleDateString(
                  'fr-FR'
                )
                const label = m.truie_nom
                  ? `${m.truie_nom} (${m.truie_tag})`
                  : m.truie_tag
                return (
                  <option key={m.id} value={m.id}>
                    {label} — {date} ({m.nes_vivants} vivants)
                  </option>
                )
              })}
            </select>
            {errors.mise_bas_id && (
              <p className={ERR_CLASS}>{errors.mise_bas_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="date_sevrage">Date *</Label>
            <Input
              id="date_sevrage"
              type="date"
              {...register('date_sevrage')}
            />
            {errors.date_sevrage && (
              <p className={ERR_CLASS}>{errors.date_sevrage.message}</p>
            )}
          </div>

          {agePreview !== null && agePreview >= 0 && (
            <div
              className="text-xs px-3 py-2 border border-[var(--sf-line)]"
              style={{
                background: 'var(--sf-surface-2, #F1ECE0)',
                color: 'var(--sf-ink,#1a1a1a)',
              }}
            >
              Âge au sevrage : <b>{agePreview} jours</b>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nb_sevres">Nombre sevrés *</Label>
              <Input
                id="nb_sevres"
                type="number"
                min={0}
                {...register('nb_sevres')}
              />
              {errors.nb_sevres && (
                <p className={ERR_CLASS}>{errors.nb_sevres.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="poids_total_kg">Poids total (kg)</Label>
              <Input
                id="poids_total_kg"
                type="number"
                step="0.01"
                min="0"
                {...register('poids_total_kg')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="age_jours">Âge en jours</Label>
            <Input
              id="age_jours"
              type="number"
              min={0}
              {...register('age_jours')}
            />
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
