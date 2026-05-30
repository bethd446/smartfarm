'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AlertTriangle, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { declarerMortalite } from './_server-actions'
import {
  mortaliteSchema,
  MOTIFS_MORTALITE,
  MOTIF_LABELS,
  type DeclarerMortaliteInput,
} from './_schemas'

export type AnimalOption = {
  id: string
  tag: string
  nom: string | null
  categorie: string | null
}

export type BandeOption = {
  id: string
  code: string | null
  nom: string
}

const SELECT_CLASS =
  'w-full h-12 min-h-12 px-0 py-2 text-base bg-transparent border-0 border-b-2 ' +
  'border-[var(--sf-ink,#1a1a1a)] focus:border-b-[var(--sf-primary,#2D4A1F)] ' +
  'focus:outline-none focus-visible:outline-none rounded-none ' +
  'text-[var(--sf-ink,#1a1a1a)]'

const ERR_CLASS = 'text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1'

export function DialogMortalite({
  trigger,
  animaux,
  bandes,
  bandesAvailable,
  defaultOpen = false,
}: {
  trigger?: React.ReactNode
  animaux: AnimalOption[]
  bandes: BandeOption[]
  /** Si false → cible "bande" cachée (table absente / vide) */
  bandesAvailable: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingData, setPendingData] = useState<DeclarerMortaliteInput | null>(
    null
  )
  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeclarerMortaliteInput>({
    resolver: zodResolver(mortaliteSchema) as never,
    defaultValues: {
      cible: 'animal',
      animal_id: '',
      bande_id: '',
      nb_animaux: 1,
      motif: 'indetermine',
      motif_libre: '',
      date_mortalite: today,
      observations: '',
    },
    mode: 'onChange',
  })

  const cible = watch('cible')
  const motif = watch('motif')
  const animalId = watch('animal_id')
  const bandeId = watch('bande_id')
  const nbAnimaux = watch('nb_animaux')

  // Step 1 : valide form puis ouvre confirmation
  function onValidate(data: DeclarerMortaliteInput) {
    setPendingData(data)
    setConfirmOpen(true)
  }

  // Step 2 : exécute après confirmation
  async function onConfirm() {
    if (!pendingData) return
    const res = await declarerMortalite(pendingData)
    setConfirmOpen(false)
    if (res.ok) {
      toast.success('Mortalité enregistrée', {
        description:
          pendingData.cible === 'animal'
            ? "L'animal a été marqué comme mort automatiquement."
            : `${pendingData.nb_animaux} animal(aux) déclaré(s) en masse.`,
      })
      reset({
        cible: 'animal',
        animal_id: '',
        bande_id: '',
        nb_animaux: 1,
        motif: 'indetermine',
        motif_libre: '',
        date_mortalite: today,
        observations: '',
      })
      setPendingData(null)
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  // Récap pour modal de confirmation
  function getRecap(): {
    cibleLabel: string
    motifLabel: string
    dateFr: string
    nb: number
  } | null {
    if (!pendingData) return null
    const motifLabel = MOTIF_LABELS[pendingData.motif]
    const dateFr = new Date(pendingData.date_mortalite).toLocaleDateString(
      'fr-FR'
    )
    if (pendingData.cible === 'animal') {
      const a = animaux.find((x) => x.id === pendingData.animal_id)
      const aLabel = a ? (a.nom ? `${a.nom} (${a.tag})` : a.tag) : '—'
      return { cibleLabel: `Animal : ${aLabel}`, motifLabel, dateFr, nb: 1 }
    }
    const b = bandes.find((x) => x.id === pendingData.bande_id)
    const bLabel = b ? (b.code ? `${b.code} — ${b.nom}` : b.nom) : '—'
    return {
      cibleLabel: `Bande : ${bLabel}`,
      motifLabel,
      dateFr,
      nb: Number(pendingData.nb_animaux),
    }
  }

  const recap = getRecap()

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v && !confirmOpen) {
      reset()
      setPendingData(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            (trigger ?? (
              <Button
                size="lg"
                className="h-12 text-base"
                style={{
                  background: 'var(--sf-danger-ink, #7A2A1F)',
                  color: '#fff',
                }}
              >
                <Plus className="h-5 w-5 mr-2" />
                Déclarer mortalité
              </Button>
            )) as any
          }
        />
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide text-2xl flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-[var(--sf-danger-ink,#7A2A1F)]" />
              Déclarer une mortalité
            </DialogTitle>
            <p className="text-xs text-[var(--sf-muted)]">
              Action irréversible. L'animal sera marqué comme mort.
            </p>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onValidate)}
            className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
          >
            {/* Radio cible */}
            <div>
              <Label>Type de déclaration *</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setValue('cible', 'animal', { shouldValidate: true })
                    setValue('nb_animaux', 1, { shouldValidate: true })
                  }}
                  className="h-12 border-2 text-base font-bold transition-colors"
                  style={{
                    borderColor:
                      cible === 'animal'
                        ? 'var(--sf-primary, #2D4A1F)'
                        : 'var(--sf-line, #d4cfc1)',
                    background:
                      cible === 'animal'
                        ? 'var(--sf-primary, #2D4A1F)'
                        : 'transparent',
                    color:
                      cible === 'animal'
                        ? '#fff'
                        : 'var(--sf-ink, #1a1a1a)',
                  }}
                >
                  Animal individuel
                </button>
                <button
                  type="button"
                  disabled={!bandesAvailable}
                  onClick={() =>
                    setValue('cible', 'bande', { shouldValidate: true })
                  }
                  className="h-12 border-2 text-base font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor:
                      cible === 'bande'
                        ? 'var(--sf-primary, #2D4A1F)'
                        : 'var(--sf-line, #d4cfc1)',
                    background:
                      cible === 'bande'
                        ? 'var(--sf-primary, #2D4A1F)'
                        : 'transparent',
                    color:
                      cible === 'bande'
                        ? '#fff'
                        : 'var(--sf-ink, #1a1a1a)',
                  }}
                  title={
                    bandesAvailable
                      ? 'Mortalité masse sur une bande/lot'
                      : 'Conduite en bandes non configurée'
                  }
                >
                  Lot / bande
                </button>
              </div>
            </div>

            {/* Sélecteur animal */}
            {cible === 'animal' && (
              <div>
                <Label htmlFor="animal_id">Animal concerné *</Label>
                <select
                  id="animal_id"
                  {...register('animal_id')}
                  className={SELECT_CLASS}
                >
                  <option value="">— Choisir —</option>
                  {animaux.map((a) => {
                    const label = a.nom ? `${a.nom} (${a.tag})` : a.tag
                    const cat = a.categorie ? ` · ${a.categorie}` : ''
                    return (
                      <option key={a.id} value={a.id}>
                        {label}
                        {cat}
                      </option>
                    )
                  })}
                </select>
                {errors.animal_id && (
                  <p className={ERR_CLASS}>{errors.animal_id.message}</p>
                )}
                {animaux.length === 0 && (
                  <p className="text-xs text-[var(--sf-muted)] mt-1">
                    Aucun animal actif disponible.
                  </p>
                )}
              </div>
            )}

            {/* Sélecteur bande + nb */}
            {cible === 'bande' && (
              <>
                <div>
                  <Label htmlFor="bande_id">Bande concernée *</Label>
                  <select
                    id="bande_id"
                    {...register('bande_id')}
                    className={SELECT_CLASS}
                  >
                    <option value="">— Choisir —</option>
                    {bandes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code ? `${b.code} — ${b.nom}` : b.nom}
                      </option>
                    ))}
                  </select>
                  {errors.bande_id && (
                    <p className={ERR_CLASS}>{errors.bande_id.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="nb_animaux">Nombre d'animaux *</Label>
                  <Input
                    id="nb_animaux"
                    type="number"
                    min={1}
                    max={1000}
                    {...register('nb_animaux')}
                  />
                  {errors.nb_animaux && (
                    <p className={ERR_CLASS}>{errors.nb_animaux.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Motif (dropdown 12 enum) */}
            <div>
              <Label htmlFor="motif">Motif de mortalité *</Label>
              <select id="motif" {...register('motif')} className={SELECT_CLASS}>
                {MOTIFS_MORTALITE.map((m) => (
                  <option key={m} value={m}>
                    {MOTIF_LABELS[m]}
                  </option>
                ))}
              </select>
              {errors.motif && (
                <p className={ERR_CLASS}>{errors.motif.message}</p>
              )}
            </div>

            {/* motif_libre si motif=autre */}
            {motif === 'autre' && (
              <div>
                <Label htmlFor="motif_libre">Précision (max 200) *</Label>
                <Input
                  id="motif_libre"
                  type="text"
                  maxLength={200}
                  {...register('motif_libre')}
                  placeholder="Ex : électrocution, chute brutale…"
                />
                {errors.motif_libre && (
                  <p className={ERR_CLASS}>{errors.motif_libre.message}</p>
                )}
              </div>
            )}

            {/* Date */}
            <div>
              <Label htmlFor="date_mortalite">Date de la mortalité *</Label>
              <div className="flex gap-2">
                <Input
                  id="date_mortalite"
                  type="date"
                  max={today}
                  {...register('date_mortalite')}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setValue('date_mortalite', today, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  Aujourd&apos;hui
                </Button>
              </div>
              {errors.date_mortalite && (
                <p className={ERR_CLASS}>{errors.date_mortalite.message}</p>
              )}
            </div>

            {/* Observations */}
            <div>
              <Label htmlFor="observations">Observations</Label>
              <Textarea
                id="observations"
                rows={2}
                {...register('observations')}
                placeholder="Contexte, symptômes, lésions visibles…"
              />
              {errors.observations && (
                <p className={ERR_CLASS}>
                  {errors.observations.message as string}
                </p>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (cible === 'animal' && !animalId) ||
                  (cible === 'bande' && (!bandeId || !nbAnimaux))
                }
                style={{
                  background: 'var(--sf-danger-ink, #7A2A1F)',
                  color: '#fff',
                }}
              >
                Déclarer mortalité
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Step 2 : confirmation modal */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--sf-danger-ink,#7A2A1F)]" />
              Confirmer la mortalité
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Cette action est <strong>irréversible</strong>.
                  {pendingData?.cible === 'animal' &&
                    " L'animal sera marqué comme mort dans le cheptel."}
                </p>
                {recap && (
                  <div className="border border-[var(--sf-line)] p-3 bg-[var(--sf-surface-2,#F1ECE0)] space-y-1 text-[var(--sf-ink)]">
                    <div>
                      <span className="text-[var(--sf-muted)]">Cible : </span>
                      <strong>{recap.cibleLabel}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--sf-muted)]">Motif : </span>
                      <strong>{recap.motifLabel}</strong>
                      {pendingData?.motif === 'autre' &&
                        pendingData?.motif_libre && (
                          <span> — {pendingData.motif_libre}</span>
                        )}
                    </div>
                    <div>
                      <span className="text-[var(--sf-muted)]">Date : </span>
                      <strong>{recap.dateFr}</strong>
                    </div>
                    <div>
                      <span className="text-[var(--sf-muted)]">Nombre : </span>
                      <strong className="tabular-nums">{recap.nb}</strong>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              disabled={isSubmitting}
              style={{ background: 'var(--sf-danger-ink, #7A2A1F)' }}
            >
              {isSubmitting ? 'Enregistrement…' : 'Oui, déclarer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
