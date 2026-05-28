'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { creerDiagnostic } from './_server-actions'
import { diagnosticSchema } from './_schemas'
import {
  DialogFaireMonter,
  type AnimalOption,
  type BandeOption,
} from './_dialog-faire-monter'

type FormData = z.input<typeof diagnosticSchema>

export type SaillieOption = {
  id: string
  truie_id?: string
  truie_tag: string
  truie_nom: string | null
  verrat_tag?: string | null
  verrat_nom?: string | null
  date_saillie: string
}

const SELECT_CLASS =
  'w-full h-12 min-h-12 px-0 py-2 text-base bg-transparent border-0 border-b-2 ' +
  'border-[var(--sf-ink,#1a1a1a)] focus:border-b-[var(--sf-primary,#2D4A1F)] ' +
  'focus:outline-none focus-visible:outline-none rounded-none ' +
  'text-[var(--sf-ink,#1a1a1a)]'

const ERR_CLASS = 'text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1'

type ResultatValue = 'positif' | 'negatif' | 'retour_chaleur' | 'en_attente'

const RADIO_OPTIONS: {
  value: ResultatValue
  label: string
  hint: string
  tone: 'success' | 'danger' | 'warning' | 'info'
}[] = [
  {
    value: 'positif',
    label: 'GESTANTE',
    hint: 'positive',
    tone: 'success',
  },
  {
    value: 'retour_chaleur',
    label: 'RETOUR CHALEUR',
    hint: 'négative',
    tone: 'warning',
  },
  {
    value: 'negatif',
    label: 'VIDE',
    hint: 'négative sans chaleur',
    tone: 'danger',
  },
  {
    value: 'en_attente',
    label: 'EN ATTENTE',
    hint: 'à recontrôler',
    tone: 'info',
  },
]

export function DialogDiagnostic({
  trigger,
  saillies,
  truies = [],
  verrats = [],
  bandes = [],
  defaultSaillieId,
  defaultOpen = false,
}: {
  trigger: React.ReactNode
  saillies: SaillieOption[]
  /** Optionnel — nécessaire pour activer le bouton « Programmer nouvelle saillie ». */
  truies?: AnimalOption[]
  verrats?: AnimalOption[]
  bandes?: BandeOption[]
  /** Optionnel — préselectionne une saillie (depuis section « à diagnostiquer »). */
  defaultSaillieId?: string
  /** Optionnel — ouvre le dialog au montage (ex. via ?action=diag). */
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [openNewSaillie, setOpenNewSaillie] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(diagnosticSchema),
    defaultValues: {
      saillie_id: defaultSaillieId ?? '',
      date_diagnostic: today,
      resultat: undefined as unknown as 'positif',
      methode: '',
      observations: '',
    },
  })

  const resultat = watch('resultat')
  const selectedSaillieId = watch('saillie_id')
  const selectedSaillie = saillies.find((s) => s.id === selectedSaillieId)
  const prefillTruieId = selectedSaillie?.truie_id

  const showRetourChaleurHint =
    resultat === 'retour_chaleur' || resultat === 'negatif'
  const canProgramNewSaillie =
    showRetourChaleurHint && truies.length > 0 && !!prefillTruieId

  // ── Filtre amont par truie ─────────────────────────────────────────────
  // La liste des truies est déduite des `saillies` (pas de nouvelle prop).
  const [truieFilter, setTruieFilter] = useState<string>('') // tag truie filtrée
  const [truieSearch, setTruieSearch] = useState<string>('') // texte input

  const truiesUniques = useMemo(() => {
    const map = new Map<string, { id: string; tag: string; nom: string | null }>()
    for (const s of saillies) {
      const key = s.truie_id ?? s.truie_tag
      if (!map.has(key)) {
        map.set(key, {
          id: s.truie_id ?? '',
          tag: s.truie_tag,
          nom: s.truie_nom,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.tag.localeCompare(b.tag))
  }, [saillies])

  const saillesFiltrees = useMemo(() => {
    if (!truieFilter) return saillies
    return saillies.filter((s) => s.truie_tag === truieFilter)
  }, [saillies, truieFilter])

  // Auto-select si la truie filtrée n'a qu'une seule saillie en attente
  useEffect(() => {
    if (
      saillesFiltrees.length === 1 &&
      truieFilter &&
      selectedSaillieId !== saillesFiltrees[0].id
    ) {
      setValue('saillie_id', saillesFiltrees[0].id, {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
  }, [saillesFiltrees, truieFilter, selectedSaillieId, setValue])

  // Rétro-compat `defaultSaillieId` : pré-remplir le filtre truie au montage
  useEffect(() => {
    if (defaultSaillieId) {
      const s = saillies.find((s) => s.id === defaultSaillieId)
      if (s) {
        setTruieFilter(s.truie_tag)
        setTruieSearch(
          s.truie_nom ? `${s.truie_tag} — ${s.truie_nom}` : s.truie_tag
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSaillieId])

  async function onSubmit(data: FormData) {
    const res = await creerDiagnostic(data)
    if (res.ok) {
      toast.success('Diagnostic enregistré')
      reset()
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  function handleProgramNewSaillie() {
    // Ferme le dialog diagnostic, ouvre celui de saillie pré-rempli
    setOpen(false)
    // Petit délai pour laisser le premier dialog se fermer proprement
    setTimeout(() => setOpenNewSaillie(true), 100)
  }

  return (
    <>
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
              Diagnostic gestation
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
          >
            {/* Filtre amont : recherche truie pour pré-filtrer la liste de saillies */}
            <div>
              <Label htmlFor="truie-search">
                Truie (optionnel — filtre la liste ci-dessous)
              </Label>
              <div className="relative">
                <Input
                  id="truie-search"
                  type="search"
                  placeholder="Tag ou nom (ex: SF-T-042 ou Roxane)"
                  value={truieSearch}
                  onChange={(e) => {
                    setTruieSearch(e.target.value)
                    const q = e.target.value.trim().toLowerCase()
                    if (!q) {
                      setTruieFilter('')
                      return
                    }
                    // Match exact tag, ou tag commence par q, ou nom contient q
                    const match = truiesUniques.find(
                      (t) =>
                        t.tag.toLowerCase() === q ||
                        t.tag.toLowerCase().startsWith(q) ||
                        (t.nom?.toLowerCase().includes(q) ?? false),
                    )
                    if (match) setTruieFilter(match.tag)
                    else setTruieFilter('')
                  }}
                  list="truies-datalist"
                />
                <datalist id="truies-datalist">
                  {truiesUniques.map((t) => (
                    <option key={t.tag} value={t.tag}>
                      {t.nom ? `${t.tag} — ${t.nom}` : t.tag}
                    </option>
                  ))}
                </datalist>
              </div>
              {truieFilter && (
                <p className="mt-1 text-xs text-[var(--sf-muted)]">
                  {saillesFiltrees.length} saillie
                  {saillesFiltrees.length > 1 ? 's' : ''} pour {truieFilter} —{' '}
                  <button
                    type="button"
                    className="underline text-[var(--sf-primary)] hover:opacity-80"
                    onClick={() => {
                      setTruieFilter('')
                      setTruieSearch('')
                    }}
                  >
                    effacer le filtre
                  </button>
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="saillie_id">La montée *</Label>
              <select
                id="saillie_id"
                {...register('saillie_id')}
                className={SELECT_CLASS}
              >
                <option value="">— Choisir —</option>
                {saillesFiltrees.map((s) => {
                  const date = new Date(s.date_saillie).toLocaleDateString(
                    'fr-FR'
                  )
                  const truieLabel = s.truie_nom
                    ? `${s.truie_nom} (${s.truie_tag})`
                    : s.truie_tag
                  // Désambiguïse 2 saillies même truie/jour : "× Verrat"
                  const verratLabel =
                    s.verrat_tag
                      ? ` × ${s.verrat_nom ?? s.verrat_tag}`
                      : ''
                  return (
                    <option key={s.id} value={s.id}>
                      {truieLabel} — montée {date}{verratLabel}
                    </option>
                  )
                })}
              </select>
              {errors.saillie_id && (
                <p className={ERR_CLASS}>{errors.saillie_id.message}</p>
              )}
            </div>

            <div>
              <Label>Résultat *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {RADIO_OPTIONS.map((opt) => {
                  const active = resultat === opt.value
                  const bg = active
                    ? opt.tone === 'success'
                      ? 'var(--sf-success-bg, #DCE9CB)'
                      : opt.tone === 'danger'
                      ? 'var(--sf-danger-bg, #F1D4CE)'
                      : opt.tone === 'warning'
                      ? 'var(--sf-warning-bg, #F5E6C5)'
                      : 'var(--sf-info-bg, #D6E2EE)'
                    : 'transparent'
                  const ink = active
                    ? opt.tone === 'success'
                      ? 'var(--sf-success-ink,#1F3414)'
                      : opt.tone === 'danger'
                      ? 'var(--sf-danger-ink,#7A2A1F)'
                      : opt.tone === 'warning'
                      ? 'var(--sf-warning-ink,#5C4416)'
                      : 'var(--sf-info-ink,#1F3A55)'
                    : 'var(--sf-ink,#1a1a1a)'
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setValue('resultat', opt.value, {
                          shouldValidate: true,
                        })
                      }
                      className="p-3 text-center border border-[var(--sf-line)] transition-colors"
                      style={{ background: bg, color: ink }}
                    >
                      <div
                        className="text-sm font-bold uppercase tracking-[0.05em]"
                        style={{
                          fontFamily:
                            "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                        }}
                      >
                        {opt.label}
                      </div>
                      <div className="text-[10px] opacity-80 mt-1">
                        {opt.hint}
                      </div>
                    </button>
                  )
                })}
              </div>
              {errors.resultat && (
                <p className={ERR_CLASS}>Choisir un résultat</p>
              )}
            </div>

            {/* Encart info — retour chaleur / vide */}
            {showRetourChaleurHint && (
              <div
                role="note"
                className="border-l-4 p-3 text-sm"
                style={{
                  background: 'var(--sf-warning-bg, #F5E6C5)',
                  color: 'var(--sf-warning-ink, #5C4416)',
                  borderLeftColor: 'var(--sf-warning-ink, #5C4416)',
                }}
              >
                <div className="font-semibold mb-1">
                  💡 Truie revenue en chaleur
                </div>
                <p className="text-xs leading-relaxed">
                  Prévoir une nouvelle saillie sous{' '}
                  <strong>21 jours</strong> (cycle œstral). Si{' '}
                  <strong>3ᵉ retour consécutif</strong> → candidate réforme.
                </p>
                {canProgramNewSaillie && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 h-9 text-xs"
                    onClick={handleProgramNewSaillie}
                  >
                    Programmer nouvelle saillie maintenant
                  </Button>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="date_diagnostic">Date du diagnostic *</Label>
              <div className="flex gap-2">
                <Input
                  id="date_diagnostic"
                  type="date"
                  {...register('date_diagnostic')}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValue('date_diagnostic', new Date().toISOString().slice(0, 10), { shouldValidate: true, shouldDirty: true })}
                >
                  Aujourd&apos;hui
                </Button>
              </div>
              {errors.date_diagnostic && (
                <p className={ERR_CLASS}>{errors.date_diagnostic.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="methode">Méthode</Label>
              <Input
                id="methode"
                placeholder="échographie, observation…"
                {...register('methode')}
              />
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

      {/* Dialog secondaire « Programmer nouvelle saillie » — pré-rempli */}
      {truies.length > 0 && (
        <DialogFaireMonter
          truies={truies}
          verrats={verrats}
          bandes={bandes}
          prefillTruieId={prefillTruieId}
          open={openNewSaillie}
          onOpenChange={setOpenNewSaillie}
        />
      )}
    </>
  )
}
