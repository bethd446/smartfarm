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
import { ArrowLeftRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { creerAdoption } from './_server-actions'
import {
  adoptionSchema,
  MOTIFS_ADOPTION,
  MOTIF_ADOPTION_LABELS,
} from './_schemas'

type FormData = z.input<typeof adoptionSchema>

export type MiseBasAllaitanteOption = {
  id: string
  truie_tag: string
  truie_nom: string | null
  date_mb: string
  nes_vivants: number
}

const SELECT_CLASS =
  'w-full h-12 min-h-12 px-0 py-2 text-base bg-transparent border-0 border-b-2 ' +
  'border-[var(--sf-ink,#1a1a1a)] focus:border-b-[var(--sf-primary,#2D4A1F)] ' +
  'focus:outline-none focus-visible:outline-none rounded-none ' +
  'text-[var(--sf-ink,#1a1a1a)]'

const ERR_CLASS = 'text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1'

// Capacité tétines fonctionnelles standard truie (varie selon race CI 12-14).
// On alerte au-dessus mais on ne BLOQUE PAS (cf brief : override possible).
const CAPACITE_TETINES_STD = 12

function diffDays(a: string, b: string): number | null {
  if (!a || !b) return null
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  if (Number.isNaN(da) || Number.isNaN(db)) return null
  return Math.round((db - da) / (1000 * 60 * 60 * 24))
}

function fmtMbLabel(m: MiseBasAllaitanteOption, today: string): string {
  const j = diffDays(m.date_mb, today)
  const jLabel = j !== null && j >= 0 ? ` · J${j}` : ''
  const nameLabel = m.truie_nom
    ? `${m.truie_nom} (${m.truie_tag})`
    : m.truie_tag
  return `${nameLabel} — ${m.nes_vivants} vivants${jLabel}`
}

export function DialogAdoption({
  trigger,
  mises_bas_allaitantes,
  source_id_prefill,
}: {
  // Optionnel : trigger par defaut derive ci-dessous (rendu DANS ce client
  // component) pour eviter le mismatch d'hydratation RSC -> Client + Radix asChild.
  trigger?: React.ReactNode
  mises_bas_allaitantes: MiseBasAllaitanteOption[]
  source_id_prefill?: string
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
    resolver: zodResolver(adoptionSchema),
    defaultValues: {
      mb_source_id: source_id_prefill ?? '',
      mb_destination_id: '',
      nb_porcelets: 1,
      motif_adoption: 'egalisation_taille',
      motif_libre: '',
      date_adoption: today,
      observations: '',
    },
  })

  const sourceId = watch('mb_source_id')
  const destId = watch('mb_destination_id')
  const nbPorcelets = Number(watch('nb_porcelets') ?? 0)
  const motif = watch('motif_adoption')

  const source = mises_bas_allaitantes.find((m) => m.id === sourceId)
  const dest = mises_bas_allaitantes.find((m) => m.id === destId)

  // Cap nb_porcelets sur le min(vivants source, 20) — UX guidance
  const maxNbPorcelets = source ? Math.min(source.nes_vivants, 20) : 20

  // Re-pre-remplir si prop change (ex: clic "adopter depuis cette portee")
  useEffect(() => {
    if (source_id_prefill) {
      setValue('mb_source_id', source_id_prefill, { shouldValidate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source_id_prefill])

  // Auto-cap nb_porcelets quand source change
  useEffect(() => {
    if (source && nbPorcelets > source.nes_vivants) {
      setValue('nb_porcelets', source.nes_vivants, { shouldValidate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId])

  const apresSource = source ? source.nes_vivants - nbPorcelets : null
  const apresDest = dest ? dest.nes_vivants + nbPorcelets : null
  const surcharge = apresDest !== null && apresDest > CAPACITE_TETINES_STD

  async function onSubmit(data: FormData) {
    const res = await creerAdoption(data)
    if (res.ok) {
      toast.success(`Adoption enregistrée — ${data.nb_porcelets} porcelets transférés`)
      reset({
        mb_source_id: '',
        mb_destination_id: '',
        nb_porcelets: 1,
        motif_adoption: 'egalisation_taille',
        motif_libre: '',
        date_adoption: today,
        observations: '',
      })
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  // Liste destinations = toutes les MB sauf la source choisie
  const destinationsOptions = mises_bas_allaitantes.filter(
    (m) => m.id !== sourceId
  )

  // Trigger par defaut derive du contexte (rendu DANS ce client component) :
  // bouton inline si source_id_prefill (depuis une portee), sinon en-tete
  // (disabled si < 2 portees allaitantes). Rendu visuel identique au W2.
  const defaultTrigger = source_id_prefill ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full h-10 text-xs uppercase tracking-wider"
    >
      <ArrowLeftRight className="h-4 w-4 mr-2" aria-hidden="true" />
      Adopter depuis cette portée
    </Button>
  ) : (
    <Button
      variant="outline"
      size="lg"
      className="h-12 text-base"
      disabled={mises_bas_allaitantes.length < 2}
      title={
        mises_bas_allaitantes.length < 2
          ? 'Il faut au moins 2 portées en allaitement (≤35j)'
          : undefined
      }
    >
      <ArrowLeftRight className="h-5 w-5 mr-2" aria-hidden="true" />
      Adoption
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={(trigger ?? defaultTrigger) as any} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            className="uppercase tracking-wide text-2xl"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Adoption
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
        >
          <div>
            <Label htmlFor="mb_source_id">Portée source (donneuse) *</Label>
            <select
              id="mb_source_id"
              {...register('mb_source_id')}
              className={SELECT_CLASS}
            >
              <option value="">— Choisir —</option>
              {mises_bas_allaitantes.map((m) => (
                <option key={m.id} value={m.id}>
                  {fmtMbLabel(m, today)}
                </option>
              ))}
            </select>
            {errors.mb_source_id && (
              <p className={ERR_CLASS}>{errors.mb_source_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="mb_destination_id">
              Portée destination (receveuse) *
            </Label>
            <select
              id="mb_destination_id"
              {...register('mb_destination_id')}
              className={SELECT_CLASS}
              disabled={!sourceId}
            >
              <option value="">— Choisir —</option>
              {destinationsOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {fmtMbLabel(m, today)}
                </option>
              ))}
            </select>
            {errors.mb_destination_id && (
              <p className={ERR_CLASS}>{errors.mb_destination_id.message}</p>
            )}
            {!sourceId && (
              <p className="text-xs text-[var(--sf-muted)] mt-1">
                Choisir la source d&apos;abord
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nb_porcelets">Nombre porcelets *</Label>
              <Input
                id="nb_porcelets"
                type="number"
                min={1}
                max={maxNbPorcelets}
                {...register('nb_porcelets')}
              />
              {errors.nb_porcelets && (
                <p className={ERR_CLASS}>{errors.nb_porcelets.message}</p>
              )}
              {source && (
                <p className="text-xs text-[var(--sf-muted)] mt-1">
                  Max {maxNbPorcelets} (source = {source.nes_vivants} vivants)
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="date_adoption">Date *</Label>
              <Input
                id="date_adoption"
                type="date"
                max={today}
                {...register('date_adoption')}
              />
              {errors.date_adoption && (
                <p className={ERR_CLASS}>{errors.date_adoption.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="motif_adoption">Motif *</Label>
            <select
              id="motif_adoption"
              {...register('motif_adoption')}
              className={SELECT_CLASS}
            >
              {MOTIFS_ADOPTION.map((m) => (
                <option key={m} value={m}>
                  {MOTIF_ADOPTION_LABELS[m]}
                </option>
              ))}
            </select>
            {errors.motif_adoption && (
              <p className={ERR_CLASS}>
                {errors.motif_adoption.message as string}
              </p>
            )}
          </div>

          {motif === 'autre' && (
            <div>
              <Label htmlFor="motif_libre">Motif libre *</Label>
              <Input
                id="motif_libre"
                type="text"
                maxLength={200}
                placeholder="Décrire le motif (≤200 car.)"
                {...register('motif_libre')}
              />
              {errors.motif_libre && (
                <p className={ERR_CLASS}>
                  {errors.motif_libre.message as string}
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              rows={2}
              {...register('observations')}
            />
          </div>

          {/* === Aperçu impact temps réel === */}
          {source && dest && nbPorcelets > 0 && (
            <div
              className="text-xs px-3 py-2 border border-[var(--sf-line)] space-y-1"
              style={{
                background: surcharge
                  ? 'var(--sf-warning-bg, #F5E6C5)'
                  : 'var(--sf-surface-2, #F1ECE0)',
                color: surcharge
                  ? 'var(--sf-warning-ink, #5C4416)'
                  : 'var(--sf-ink,#1a1a1a)',
              }}
            >
              <p className="font-bold uppercase tracking-wider mb-1">
                Après adoption
              </p>
              <p>
                Source ({source.truie_nom || source.truie_tag}) :{' '}
                <b className="tabular-nums">
                  {source.nes_vivants} → {apresSource}
                </b>{' '}
                vivants
              </p>
              <p>
                Destination ({dest.truie_nom || dest.truie_tag}) :{' '}
                <b className="tabular-nums">
                  {dest.nes_vivants} → {apresDest}
                </b>{' '}
                vivants
              </p>
              {surcharge && (
                <p className="mt-1 font-bold">
                  ⚠️ Destination dépasse capacité tétines standard (
                  {CAPACITE_TETINES_STD}). Vérifier capacité réelle truie avant
                  validation.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !sourceId ||
                !destId ||
                nbPorcelets < 1 ||
                (motif === 'autre' && !watch('motif_libre'))
              }
            >
              {isSubmitting
                ? 'Transfert…'
                : `Transférer ${nbPorcelets} porcelet${nbPorcelets > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
