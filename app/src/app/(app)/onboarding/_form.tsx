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
      className="rounded-[var(--rl)] border border-[var(--line)] bg-[var(--card)] shadow-[var(--sh-sm)] overflow-hidden"
    >
      {/* Stepper */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[var(--paper)]">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <span
              className={[
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2',
                step === n
                  ? 'bg-[var(--sage)] text-white border-[var(--sage)]'
                  : step > n
                  ? 'bg-[var(--sage-bg)] text-[var(--sage-d)] border-[var(--sage)]/40'
                  : 'bg-transparent text-[var(--mut)] border-[var(--line2)]',
              ].join(' ')}
            >
              {step > n ? '✓' : n}
            </span>
            <span
              className={[
                'text-[10px] hidden sm:inline',
                step === n ? 'text-[var(--ink)] font-semibold' : 'text-[var(--mut)]',
              ].join(' ')}
            >
              {n === 1 ? 'Identité' : n === 2 ? 'Races' : 'Effectifs'}
            </span>
            {n < 3 && <span className="flex-1 h-px bg-[var(--line2)] mx-2" aria-hidden />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="p-6 space-y-6 min-h-[320px]">
        {step === 1 && (
          <fieldset className="space-y-5">
            <legend className="sr-only">Étape 1 : identité de la ferme</legend>
            <div>
              <h2 className="font-[family-name:var(--disp)] text-lg font-bold text-[var(--ink)] mb-1">
                Identifions votre exploitation
              </h2>
              <p className="text-xs text-[var(--mut)]">
                Le nom de la ferme est obligatoire. Le reste est optionnel.
              </p>
            </div>

            <div className="field !mb-0">
              <label htmlFor="nom" className="field__label">
                Nom de la ferme <span className="text-[var(--bad)]">*</span>
              </label>
              <input
                id="nom"
                type="text"
                required
                minLength={2}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex. Ferme Sahel Yamoussoukro"
                className="input"
                autoFocus
              />
            </div>

            <div className="field !mb-0">
              <label htmlFor="localisation" className="field__label">
                Localisation
              </label>
              <input
                id="localisation"
                type="text"
                value={localisation}
                onChange={(e) => setLocalisation(e.target.value)}
                placeholder="Ex. Yamoussoukro, Côte d'Ivoire"
                className="input"
              />
            </div>

            <div className="field !mb-0">
              <label htmlFor="telephone" className="field__label">
                Téléphone contact
              </label>
              <input
                id="telephone"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="input"
              />
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-5">
            <legend className="sr-only">Étape 2 : races dominantes</legend>
            <div>
              <h2 className="font-[family-name:var(--disp)] text-lg font-bold text-[var(--ink)] mb-1">
                Quelles races élevez-vous ?
              </h2>
              <p className="text-xs text-[var(--mut)]">
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
                      'flex items-center gap-3 px-4 py-3 rounded-[var(--r)] border-2 cursor-pointer transition-colors',
                      checked
                        ? 'border-[var(--sage)] bg-[var(--sage-bg)]'
                        : 'border-[var(--line2)] bg-[var(--paper)] hover:border-[var(--sage)]/40',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRace(race)}
                      className="h-4 w-4 accent-[var(--sage)]"
                    />
                    <span className="text-sm font-medium text-[var(--ink)]">{race}</span>
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
              <h2 className="font-[family-name:var(--disp)] text-lg font-bold text-[var(--ink)] mb-1">
                Vos effectifs actuels (informatif)
              </h2>
              <p className="text-xs text-[var(--mut)]">
                Ces nombres sont juste indicatifs. Vous créerez chaque animal
                individuellement dans <span className="font-semibold text-[var(--ink)]">Cheptel</span> après l&apos;onboarding.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'truies',    label: 'Truies',    value: truies,    set: setTruies },
                { id: 'verrats',   label: 'Verrats',   value: verrats,   set: setVerrats },
                { id: 'porcelets', label: 'Porcelets', value: porcelets, set: setPorcelets },
              ].map(({ id, label, value, set }) => (
                <div key={id} className="field !mb-0">
                  <label htmlFor={id} className="field__label">
                    {label}
                  </label>
                  <input
                    id={id}
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={value}
                    onChange={(e) => set(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="input"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-[var(--r)] border border-[var(--line)] bg-[var(--paper)] p-4 text-xs text-[var(--ink-soft)]">
              <strong className="text-[var(--ink)]">À la création de la ferme :</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>5 bâtiments standards seront créés (verraterie, gestation, maternité, post-sevrage, engraissement)</li>
                <li>Le catalogue des matières premières et protocoles sanitaires sera initialisé</li>
                <li>Vous deviendrez <strong className="text-[var(--ink)]">administrateur</strong> de votre ferme</li>
              </ul>
            </div>
          </fieldset>
        )}
      </div>

      {/* Erreur globale */}
      {error && (
        <div role="alert" className="mx-6 mb-4 rounded-[var(--r)] border border-[var(--bad)]/40 bg-[var(--bad-bg)] px-4 py-3 text-sm text-[var(--bad-d)]">
          {error}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--paper)] px-6 py-4">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 1 || isPending}
          className="btn btn--outline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Précédent
        </button>

        <span className="text-xs text-[var(--mut)] hidden sm:inline">
          Étape {step} / 3
        </span>

        {step < 3 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={isPending}
            className="btn btn--primary disabled:opacity-40"
          >
            Suivant →
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending || !nomValide}
            className="btn btn--primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Création…' : 'Créer ma ferme'}
          </button>
        )}
      </div>
    </form>
  )
}
