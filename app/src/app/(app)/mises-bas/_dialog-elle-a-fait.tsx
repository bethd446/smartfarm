'use client'

import { useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
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
import { creerMiseBas } from './_server-actions'
import { miseBasSchema } from './_schemas'

type FormData = z.input<typeof miseBasSchema>

export type SaillieMBOption = {
  id: string
  truie_tag: string
  truie_nom: string | null
  date_saillie: string
}

const SELECT_CLASS =
  'w-full h-12 min-h-12 px-0 py-2 text-base bg-transparent border-0 border-b-2 ' +
  'border-[var(--sf-ink,#1a1a1a)] focus:border-b-[var(--sf-primary,#2D4A1F)] ' +
  'focus:outline-none focus-visible:outline-none rounded-none ' +
  'text-[var(--sf-ink,#1a1a1a)]'

const ERR_CLASS = 'text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1'

const STEPS = [
  'Truie & horaire',
  'Naissances',
  'État portée',
  'Truie post-MB',
  'Récapitulatif',
] as const

// Validation d'étape : on autorise "Suivant" si les champs requis de l'étape sont OK
function canProceed(step: number, values: FormData): boolean {
  if (step === 0) {
    return Boolean(values.saillie_id) && Boolean(values.date_mise_bas)
  }
  if (step === 1) {
    const tot = Number(values.nes_totaux || 0)
    return tot >= 0
  }
  return true
}

export function DialogElleAFait({
  trigger,
  saillies,
}: {
  trigger: React.ReactNode
  saillies: SaillieMBOption[]
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const today = new Date().toISOString().slice(0, 10)

  const methods = useForm<FormData>({
    resolver: zodResolver(miseBasSchema),
    defaultValues: {
      saillie_id: '',
      date_mise_bas: today,
      nes_totaux: 0,
      nes_vivants: 0,
      nes_morts: 0,
      momifies: 0,
      ecrases: 0,
      poids_portee_kg: '',
      duree_minutes: '',
      assistance: false,
      bcs_truie: '',
      observations: '',
    },
    mode: 'onChange',
  })

  const {
    handleSubmit,
    watch,
    formState: { isSubmitting },
    reset,
  } = methods

  const values = watch()

  async function onSubmit(data: FormData) {
    const res = await creerMiseBas(data)
    if (res.ok) {
      toast.success('Naissance enregistrée', {
        description: 'Pense au check J+1 dans /mises-bas/check-j1',
      })
      reset()
      setStep(0)
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setStep(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger as any} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle
            className="uppercase tracking-wide text-2xl"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Mise-bas — étape {step + 1}/{STEPS.length} : {STEPS[step]}
          </DialogTitle>
          {/* Progress bar */}
          <div className="flex gap-1 mt-2" aria-label="Progression du wizard">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded transition-colors"
                style={{
                  background:
                    i <= step
                      ? 'var(--sf-primary, #2D4A1F)'
                      : 'var(--sf-line, #d4cfc1)',
                }}
              />
            ))}
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
        >
          {step === 0 && <StepTruie methods={methods} saillies={saillies} />}
          {step === 1 && <StepNaissances methods={methods} />}
          {step === 2 && <StepEtatPortee methods={methods} />}
          {step === 3 && <StepTruiePostMb methods={methods} />}
          {step === 4 && <StepRecap values={values} saillies={saillies} />}

          <DialogFooter className="flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
              >
                Précédent
              </Button>
            )}
            {step < STEPS.length - 1 && (
              <Button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed(step, values)}
              >
                Suivant
              </Button>
            )}
            {step === STEPS.length - 1 && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement…' : 'Confirmer la mise-bas'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Étape 0 : Truie + date ─────────────────────────────────────────────
function StepTruie({
  methods,
  saillies,
}: {
  methods: UseFormReturn<FormData>
  saillies: SaillieMBOption[]
}) {
  const {
    register,
    formState: { errors },
  } = methods
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="saillie_id">La truie *</Label>
        <select
          id="saillie_id"
          {...register('saillie_id')}
          className={SELECT_CLASS}
        >
          <option value="">— Choisir —</option>
          {saillies.map((s) => {
            const date = new Date(s.date_saillie).toLocaleDateString('fr-FR')
            const label = s.truie_nom
              ? `${s.truie_nom} (${s.truie_tag})`
              : s.truie_tag
            return (
              <option key={s.id} value={s.id}>
                {label} — montée {date}
              </option>
            )
          })}
        </select>
        {errors.saillie_id && (
          <p className={ERR_CLASS}>{errors.saillie_id.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="date_mise_bas">Date *</Label>
        <Input id="date_mise_bas" type="date" {...register('date_mise_bas')} />
        {errors.date_mise_bas && (
          <p className={ERR_CLASS}>{errors.date_mise_bas.message}</p>
        )}
      </div>

      <p className="text-xs text-[var(--sf-muted)]">
        Sélectionne la montée correspondante puis valide la date du jour de la
        mise-bas.
      </p>
    </div>
  )
}

// ─── Étape 1 : Naissances ──────────────────────────────────────────────
function StepNaissances({ methods }: { methods: UseFormReturn<FormData> }) {
  const {
    register,
    watch,
    formState: { errors },
  } = methods
  const nVivants = Number(watch('nes_vivants') || 0)
  const nMorts = Number(watch('nes_morts') || 0)
  const nMom = Number(watch('momifies') || 0)
  const nTot = Number(watch('nes_totaux') || 0)
  const somme = nVivants + nMorts + nMom
  const sommeOk = somme === nTot

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="nes_totaux">Total nés *</Label>
          <Input
            id="nes_totaux"
            type="number"
            min={0}
            {...register('nes_totaux')}
          />
          {errors.nes_totaux && (
            <p className={ERR_CLASS}>{errors.nes_totaux.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="nes_vivants">Vivants *</Label>
          <Input
            id="nes_vivants"
            type="number"
            min={0}
            {...register('nes_vivants')}
          />
          {errors.nes_vivants && (
            <p className={ERR_CLASS}>{errors.nes_vivants.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="nes_morts">Morts-nés</Label>
          <Input
            id="nes_morts"
            type="number"
            min={0}
            {...register('nes_morts')}
          />
        </div>
        <div>
          <Label htmlFor="momifies">Momifiés</Label>
          <Input
            id="momifies"
            type="number"
            min={0}
            {...register('momifies')}
          />
        </div>
      </div>

      <p className="text-xs text-[var(--sf-muted)] -mt-2">
        Décomposition utile pour le diagnostic pré/post-natal.
      </p>

      <div
        className="text-xs px-3 py-2 border border-[var(--sf-line)]"
        style={{
          background: sommeOk
            ? 'var(--sf-success-bg, #DCE9CB)'
            : 'var(--sf-warning-bg, #F5E6C5)',
          color: sommeOk
            ? 'var(--sf-success-ink,#1F3414)'
            : 'var(--sf-warning-ink,#5C4416)',
        }}
      >
        Vérification : {nVivants} + {nMorts} + {nMom} = <b>{somme}</b>{' '}
        {sommeOk ? '✓' : `(total saisi : ${nTot})`}
      </div>
    </div>
  )
}

// ─── Étape 2 : État portée (poids + écrasés) ───────────────────────────
function StepEtatPortee({ methods }: { methods: UseFormReturn<FormData> }) {
  const { register } = methods
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="poids_portee_kg">Poids portée (kg)</Label>
          <Input
            id="poids_portee_kg"
            type="number"
            step="0.01"
            min="0"
            {...register('poids_portee_kg')}
          />
        </div>
        <div>
          <Label htmlFor="ecrases">Écrasés (post-naissance)</Label>
          <Input
            id="ecrases"
            type="number"
            min={0}
            {...register('ecrases')}
          />
        </div>
      </div>
      <p className="text-xs text-[var(--sf-muted)]">
        Le poids portée est recommandé pour suivre l'indice GMQ allaitement.
      </p>
    </div>
  )
}

// ─── Étape 3 : Truie post-MB (assistance, durée, BCS) ──────────────────
function StepTruiePostMb({ methods }: { methods: UseFormReturn<FormData> }) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = methods
  const bcsValue = watch('bcs_truie')
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="duree_minutes">Durée (min)</Label>
          <Input
            id="duree_minutes"
            type="number"
            min={0}
            {...register('duree_minutes')}
          />
        </div>
        <div className="flex items-end gap-2">
          <input
            id="assistance"
            type="checkbox"
            {...register('assistance')}
            className="h-5 w-5 mb-2"
          />
          <Label htmlFor="assistance" className="cursor-pointer mb-2">
            Assistance nécessaire
          </Label>
        </div>
      </div>

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
    </div>
  )
}

// ─── Étape 4 : Récap ─────────────────────────────────────────────────
function StepRecap({
  values,
  saillies,
}: {
  values: FormData
  saillies: SaillieMBOption[]
}) {
  const s = saillies.find((sa) => sa.id === values.saillie_id)
  const truie = s
    ? s.truie_nom
      ? `${s.truie_nom} (${s.truie_tag})`
      : s.truie_tag
    : '—'
  const nVivants = Number(values.nes_vivants || 0)
  const nMorts = Number(values.nes_morts || 0)
  const nMom = Number(values.momifies || 0)
  const somme = nVivants + nMorts + nMom
  const totOk = somme === Number(values.nes_totaux || 0)
  return (
    <div className="space-y-3">
      <RecapRow label="Truie" value={truie} />
      <RecapRow
        label="Date mise-bas"
        value={new Date(values.date_mise_bas).toLocaleDateString('fr-FR')}
      />
      <RecapRow
        label="Nés"
        value={`${values.nes_totaux} total · ${nVivants} vivants · ${nMorts} morts-nés · ${nMom} momifiés`}
        warn={!totOk}
      />
      <RecapRow
        label="Écrasés"
        value={String(values.ecrases ?? 0)}
      />
      <RecapRow
        label="Poids portée"
        value={values.poids_portee_kg ? `${values.poids_portee_kg} kg` : '—'}
      />
      <RecapRow
        label="Durée"
        value={values.duree_minutes ? `${values.duree_minutes} min` : '—'}
      />
      <RecapRow
        label="Assistance"
        value={values.assistance ? 'Oui' : 'Non'}
      />
      <RecapRow
        label="BCS truie"
        value={values.bcs_truie === '' || values.bcs_truie === undefined ? '—' : String(values.bcs_truie)}
      />
      {values.observations && (
        <RecapRow label="Observations" value={String(values.observations)} />
      )}
      <div
        className="text-xs px-3 py-2 border border-[var(--sf-line)] mt-3"
        style={{
          background: 'var(--sf-info-bg, #E5EAF0)',
          color: 'var(--sf-info-ink, #1F2A3A)',
        }}
      >
        Après confirmation, pense au check J+1 (mortalité néonatale, écrasés,
        lactation) depuis <b>/mises-bas/check-j1</b>.
      </div>
    </div>
  )
}

function RecapRow({
  label,
  value,
  warn,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div
      className="flex justify-between gap-3 border-b border-[var(--sf-line)] pb-2 text-sm"
      style={warn ? { color: 'var(--sf-warning-ink, #5C4416)' } : undefined}
    >
      <span className="text-[var(--sf-muted)]">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
