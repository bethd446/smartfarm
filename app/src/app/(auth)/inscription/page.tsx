'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { inscriptionAction, type AuthResult } from '../_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'

/**
 * Page Inscription — email + mot de passe + nom complet.
 * Après succès : message de succès + affichage gros du numéro client SF-XXXXXX
 * généré (cf. trigger SQL). C'est l'identifiant que l'éleveur retiendra à la
 * place d'un email, plus facile pour public peu alphabétisé.
 *
 * A11 (Phase A 2026-05-27) — Validation inline temps réel :
 *   - email : regex onChange (debounce 300ms) + onBlur immédiat
 *   - password : longueur ≥8 onChange + indicateur force (Faible/Moyen/Fort)
 *   - bouton submit désactivé tant que tous les champs valides
 */

// Regex email basique (couvre 99% des cas, pas RFC 5322 complet).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type PwdStrength = 'faible' | 'moyen' | 'fort' | null

function evaluatePwd(pwd: string): PwdStrength {
  if (pwd.length < 8) return null
  let score = 0
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score >= 3) return 'fort'
  if (score >= 1) return 'moyen'
  return 'faible'
}

export default function InscriptionPage() {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(
    inscriptionAction,
    null,
  )

  // --- État validation locale ---
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [emailDebounced, setEmailDebounced] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [password, setPassword] = useState('')

  // Debounce 300ms email pour éviter le clignotement erreur pendant la frappe.
  useEffect(() => {
    const t = setTimeout(() => setEmailDebounced(email), 300)
    return () => clearTimeout(t)
  }, [email])

  const emailValid = useMemo(() => EMAIL_RE.test(email), [email])
  const emailValidDebounced = useMemo(
    () => EMAIL_RE.test(emailDebounced),
    [emailDebounced],
  )
  // Affichage erreur : onBlur immédiat OU debouncé pendant la saisie
  const showEmailError =
    email.length > 0 && !emailValid && (emailTouched || emailDebounced === email)
  const showEmailOk = email.length > 0 && emailValid && emailValidDebounced

  const pwdLenOk = password.length >= 8
  const pwdStrength = useMemo(() => evaluatePwd(password), [password])

  const nomOk = nom.trim().length >= 2
  const allValid = nomOk && emailValid && pwdLenOk

  // Succès : on affiche le numéro client en grand.
  if (state && state.ok) {
    return (
      <section className="bg-[var(--sf-surface-1)] border border-[var(--sf-line)] rounded-lg p-6 sm:p-8 text-center">
        <h1 className="font-[family-name:var(--sf-font-display)] uppercase tracking-tight text-2xl text-[var(--sf-ink-deep,#14532D)]">
          Bienvenue !
        </h1>
        {state.numero_client && (
          <>
            <p className="mt-4 text-sm text-[var(--sf-muted)]">Ton numéro client</p>
            <div
              className="mt-2 font-[family-name:var(--sf-font-display)] tracking-[0.1em] text-[var(--sf-ink-deep,#14532D)]"
              style={{ fontSize: '40px' }}
            >
              {state.numero_client}
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.12em] text-[var(--sf-muted)]">
              Note-le quelque part — il permet de te connecter sans email
            </p>
          </>
        )}
        <p className="mt-6 text-sm text-[var(--sf-ink)]">{state.message}</p>
        <Link href="/connexion" className="block mt-8">
          <Button size="lg" className="w-full">
            Aller à la connexion
          </Button>
        </Link>
      </section>
    )
  }

  return (
    <section className="bg-[var(--sf-surface-1)] border border-[var(--sf-line)] rounded-lg p-6 sm:p-8">
      <h1 className="font-[family-name:var(--sf-font-display)] uppercase tracking-tight text-2xl text-[var(--sf-ink)]">
        Créer un compte
      </h1>
      <p className="mt-1 text-sm text-[var(--sf-muted)]">
        Tu recevras un numéro client unique (format SF-XXXXXX) pour te connecter.
      </p>

      <form action={action} className="mt-6 space-y-4" noValidate>
        {/* Nom complet */}
        <div className="space-y-1.5">
          <Label htmlFor="nom_complet">Nom complet</Label>
          <Input
            id="nom_complet"
            name="nom_complet"
            type="text"
            autoComplete="name"
            placeholder="Kouassi Konan"
            required
            autoFocus
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse email</Label>
          <div className="relative">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ferme@exemple.ci"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              aria-invalid={showEmailError ? true : undefined}
              aria-describedby={showEmailError ? 'email-error' : undefined}
              className={showEmailOk ? 'pr-8' : undefined}
            />
            {showEmailOk && (
              <Check
                size={18}
                aria-hidden="true"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--sf-success,#2D4A1F)]"
              />
            )}
          </div>
          {showEmailError && (
            <p
              id="email-error"
              className="text-xs text-[var(--sf-danger-ink,#7A2A1F)]"
            >
              Email invalide (format attendu : nom@domaine.xx)
            </p>
          )}
        </div>

        {/* Mot de passe */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={password.length > 0 && !pwdLenOk ? true : undefined}
            aria-describedby="password-hint"
          />
          {/* Hint dynamique : longueur + force */}
          <div
            id="password-hint"
            className="flex items-center justify-between gap-2 text-xs"
          >
            {password.length === 0 ? (
              <span className="text-[var(--sf-muted)]">8 caractères minimum.</span>
            ) : !pwdLenOk ? (
              <span className="text-[var(--sf-danger-ink,#7A2A1F)]">
                Encore {8 - password.length} caractère
                {8 - password.length > 1 ? 's' : ''} ({password.length}/8)
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 text-[var(--sf-success,#2D4A1F)]">
                  <Check size={14} aria-hidden="true" />
                  Longueur OK
                </span>
                {pwdStrength && (
                  <span
                    className={
                      pwdStrength === 'fort'
                        ? 'text-[var(--sf-success,#2D4A1F)]'
                        : pwdStrength === 'moyen'
                          ? 'text-[var(--sf-ink)]'
                          : 'text-[var(--sf-muted)]'
                    }
                  >
                    Force&nbsp;:{' '}
                    {pwdStrength === 'fort'
                      ? 'Fort'
                      : pwdStrength === 'moyen'
                        ? 'Moyen'
                        : 'Faible'}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {state && 'error' in state && state.error && (
          <div
            role="alert"
            className="text-sm text-[var(--sf-terre,#9A3412)] bg-[var(--sf-surface-2,#FEF3C7)] border border-[var(--sf-terre,#9A3412)]/30 rounded-md px-3 py-2"
          >
            {state.error}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || !allValid}
        >
          {pending ? 'Création…' : 'Créer mon compte'}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-[var(--sf-line)] text-center text-sm text-[var(--sf-muted)]">
        Déjà un compte ?{' '}
        <Link
          href="/connexion"
          className="font-semibold text-[var(--sf-ink-deep,#14532D)] underline underline-offset-2 hover:text-[var(--sf-primary)]"
        >
          Se connecter
        </Link>
      </div>
    </section>
  )
}
