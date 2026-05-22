'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboardingAction } from './_actions'

const RACES = [
  'Large White',
  'Landrace',
  'Duroc',
  'Piétrain',
  'Croisé F1',
  'Métis local',
] as const

type Step = 1 | 2 | 3

/**
 * F1 Sprint 1 — Wizard d'onboarding 3 étapes (Client Component).
 *
 * Choix UX : true wizard step-by-step (1 section visible à la fois) plutôt
 * qu'un long formulaire — moins effrayant sur mobile (cible terrain CI).
 * Les champs hidden permettent à FormData de récupérer toutes les valeurs
 * au submit final, peu importe le step affiché.
 *
 * Submit final : appelle la Server Action `completeOnboardingAction` qui
 * délègue à la RPC SQL `bootstrap_ferme` (atomique).
 */
export function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // State centralisé (plus simple que refs pour wizard step-based)
  const [nom, setNom] = useState('')
  const [localisation, setLocalisation] = useState('')
  const [telephone, setTelephone] = useState('')
  const [races, setRaces] = useState<Set<string>>(new Set())
  const [truies, setTruies] = useState(0)
  const [verrats, setVerrats] = useState(0)
  const [porcelets, setPorcelets] = useState(0)

  const nomValide = nom.trim().length >= 2
  const peutValiderStep1 = nomValide

  function toggleRace(race: string) {
    setRaces((prev) => {
      const next = new Set(prev)
      if (next.has(race)) next.delete(race)
      else next.add(race)
      return next
    })
  }

  function nextStep() {
    setError(null)
    if (step === 1 && !peutValiderStep1) {
      setError('Le nom de la ferme doit contenir au moins 2 caractères.')
      return
    }
    if (step < 3) setStep((s) => (s + 1) as Step)
  }

  function prevStep() {
    setError(null)
    if (step > 1) setStep((s) => (s - 1) as Step)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!nomValide) {
      setError('Le nom de la ferme doit contenir au moins 2 caractères.')
      setStep(1)
      return
    }

    const fd = new FormData()
    fd.set('nom', nom.trim())
    fd.set('localisation', localisation.trim())
    fd.set('telephone', telephone.trim())
    races.forEach((r) => fd.append('races', r))
    fd.set('truies', String(truies))
    fd.set('verrats', String(verrats))
    fd.set('porcelets', String(porcelets))

    startTransition(async () => {
      const res = await completeOnboardingAction(fd)
      if (res.ok) {
        router.replace('/dashboard')
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[var(--sf-border)] bg-[var(--sf-surface-1)] shadow-sm overflow-hidden"
    >
      {/* Stepper */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--sf-border)] bg-[var(--sf-surface-0)]">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <span
              className={[
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2',
                step === n
                  ? 'bg-[var(--sf-primary)] text-white border-[var(--sf-primary)]'
                  : step > n
                  ? 'bg-[var(--sf-primary)]/20 text-[var(--sf-primary)] border-[var(--sf-primary)]/40'
                  : 'bg-transparent text-[var(--sf-muted)] border-[var(--sf-border)]',
              ].join(' ')}
            >
              {step > n ? '✓' : n}
            </span>
            <span
              className={[
                'text-[10px] uppercase tracking-[0.1em] hidden sm:inline',
                step === n ? 'text-[var(--sf-ink)] font-semibold' : 'text-[var(--sf-muted)]',
              ].join(' ')}
            >
              {n === 1 ? 'Identité' : n === 2 ? 'Races' : 'Effectifs'}
            </span>
            {n < 3 && <span className="flex-1 h-px bg-[var(--sf-border)] mx-2" aria-hidden />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="p-6 space-y-6 min-h-[320px]">
        {step === 1 && (
          <fieldset className="space-y-5">
            <legend className="sr-only">Étape 1 : identité de la ferme</legend>
            <div>
              <h2 className="text-lg font-semibold text-[var(--sf-ink)] mb-1">
                Identifions votre exploitation
              </h2>
              <p className="text-xs text-[var(--sf-muted)]">
                Le nom de la ferme est obligatoire. Le reste est optionnel.
              </p>
            </div>

            <div>
              <label htmlFor="nom" className="block text-xs font-semibold uppercase tracking-wide text-[var(--sf-ink)] mb-1.5">
                Nom de la ferme <span className="text-red-600">*</span>
              </label>
              <input
                id="nom"
                type="text"
                required
                minLength={2}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex. Ferme Sahel Yamoussoukro"
                className="w-full h-12 px-4 rounded-md border border-[var(--sf-border)] bg-[var(--sf-surface-0)] text-[var(--sf-ink)] placeholder:text-[var(--sf-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="localisation" className="block text-xs font-semibold uppercase tracking-wide text-[var(--sf-ink)] mb-1.5">
                Localisation
              </label>
              <input
                id="localisation"
                type="text"
                value={localisation}
                onChange={(e) => setLocalisation(e.target.value)}
                placeholder="Ex. Yamoussoukro, Côte d'Ivoire"
                className="w-full h-12 px-4 rounded-md border border-[var(--sf-border)] bg-[var(--sf-surface-0)] text-[var(--sf-ink)] placeholder:text-[var(--sf-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]"
              />
            </div>

            <div>
              <label htmlFor="telephone" className="block text-xs font-semibold uppercase tracking-wide text-[var(--sf-ink)] mb-1.5">
                Téléphone contact
              </label>
              <input
                id="telephone"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="w-full h-12 px-4 rounded-md border border-[var(--sf-border)] bg-[var(--sf-surface-0)] text-[var(--sf-ink)] placeholder:text-[var(--sf-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]"
              />
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-5">
            <legend className="sr-only">Étape 2 : races dominantes</legend>
            <div>
              <h2 className="text-lg font-semibold text-[var(--sf-ink)] mb-1">
                Quelles races élevez-vous ?
              </h2>
              <p className="text-xs text-[var(--sf-muted)]">
                Sélection multiple. Optionnel — vous pourrez ajuster plus tard.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {RACES.map((race) => {
                const checked = races.has(race)
                return (
                  <label
                    key={race}
                    className={[
                      'flex items-center gap-3 px-4 py-3 rounded-md border-2 cursor-pointer transition-colors',
                      checked
                        ? 'border-[var(--sf-primary)] bg-[var(--sf-primary)]/10'
                        : 'border-[var(--sf-border)] bg-[var(--sf-surface-0)] hover:border-[var(--sf-primary)]/40',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRace(race)}
                      className="h-4 w-4 accent-[var(--sf-primary)]"
                    />
                    <span className="text-sm font-medium text-[var(--sf-ink)]">{race}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="space-y-5">
            <legend className="sr-only">Étape 3 : effectifs initiaux</legend>
            <div>
              <h2 className="text-lg font-semibold text-[var(--sf-ink)] mb-1">
                Vos effectifs actuels (informatif)
              </h2>
              <p className="text-xs text-[var(--sf-muted)]">
                Ces nombres sont juste indicatifs. Vous créerez chaque animal
                individuellement dans <span className="font-semibold">Cheptel</span> après l&apos;onboarding.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'truies',    label: 'Truies',    value: truies,    set: setTruies },
                { id: 'verrats',   label: 'Verrats',   value: verrats,   set: setVerrats },
                { id: 'porcelets', label: 'Porcelets', value: porcelets, set: setPorcelets },
              ].map(({ id, label, value, set }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-[var(--sf-ink)] mb-1.5">
                    {label}
                  </label>
                  <input
                    id={id}
                    type="number"
                    min={0}
                    step={1}
                    value={value}
                    onChange={(e) => set(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full h-12 px-4 rounded-md border border-[var(--sf-border)] bg-[var(--sf-surface-0)] text-[var(--sf-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-md border border-[var(--sf-border)] bg-[var(--sf-surface-0)] p-4 text-xs text-[var(--sf-muted)]">
              <strong className="text-[var(--sf-ink)]">À la création de la ferme :</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>5 bâtiments standards seront créés (verraterie, gestation, maternité, post-sevrage, engraissement)</li>
                <li>Le catalogue des matières premières et protocoles sanitaires sera initialisé</li>
                <li>Vous deviendrez <strong>administrateur</strong> de votre ferme</li>
              </ul>
            </div>
          </fieldset>
        )}
      </div>

      {/* Erreur globale */}
      {error && (
        <div role="alert" className="mx-6 mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--sf-border)] bg-[var(--sf-surface-0)] px-6 py-4">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 1 || isPending}
          className="h-12 px-5 rounded-md border border-[var(--sf-border)] bg-transparent text-sm font-semibold uppercase tracking-wide text-[var(--sf-ink)] hover:bg-[var(--sf-surface-1)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Précédent
        </button>

        <span className="text-xs text-[var(--sf-muted)] hidden sm:inline">
          Étape {step} / 3
        </span>

        {step < 3 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={isPending}
            className="h-12 px-6 rounded-md bg-[var(--sf-primary)] text-white text-sm font-semibold uppercase tracking-wide hover:bg-[var(--sf-primary)]/90 disabled:opacity-40"
          >
            Suivant →
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending || !nomValide}
            className="h-12 px-6 rounded-md bg-[var(--sf-primary)] text-white text-sm font-semibold uppercase tracking-wide hover:bg-[var(--sf-primary)]/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Création…' : 'Créer ma ferme'}
          </button>
        )}
      </div>
    </form>
  )
}
