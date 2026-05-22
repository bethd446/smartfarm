'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { connexionAction, magicLinkAction, type AuthResult } from '../_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Page Connexion — deux modes :
 *   1) Identifiant (email OU numéro client SF-XXXXXX) + mot de passe
 *   2) Magic link (lien email passwordless)
 * Toggle simple par lien texte. Mobile-first. Vocab FR pro.
 */
export default function ConnexionPage() {
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [pwdState, pwdAction, pwdPending] = useActionState<AuthResult | null, FormData>(
    connexionAction,
    null,
  )
  const [magicState, magicAction, magicPending] = useActionState<AuthResult | null, FormData>(
    magicLinkAction,
    null,
  )

  return (
    <section className="bg-[var(--sf-surface-1)] border border-[var(--sf-line)] rounded-lg p-6 sm:p-8">
      <h1 className="font-[family-name:var(--sf-font-display)] uppercase tracking-tight text-2xl text-[var(--sf-ink)]">
        Se connecter
      </h1>
      <p className="mt-1 text-sm text-[var(--sf-muted)]">
        {mode === 'password'
          ? 'Avec ton email ou ton numéro client SF-XXXXXX.'
          : 'Reçois un lien magique par email — aucun mot de passe à retenir.'}
      </p>

      {mode === 'password' ? (
        <form action={pwdAction} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="identifiant">Email ou numéro client</Label>
            <Input
              id="identifiant"
              name="identifiant"
              type="text"
              autoComplete="username"
              placeholder="ferme@exemple.ci ou SF-123456"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {pwdState && 'error' in pwdState && pwdState.error && (
            <div role="alert" className="text-sm text-[var(--sf-terre,#9A3412)] bg-[var(--sf-surface-2,#FEF3C7)] border border-[var(--sf-terre,#9A3412)]/30 rounded-md px-3 py-2">
              {pwdState.error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pwdPending}>
            {pwdPending ? 'Connexion…' : 'Se connecter'}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setMode('magic')}
              className="text-[var(--sf-ink-deep,#14532D)] underline underline-offset-2 hover:text-[var(--sf-primary)]"
            >
              Recevoir un lien magique
            </button>
            <Link
              href="/mot-de-passe-oublie"
              className="text-[var(--sf-muted)] hover:text-[var(--sf-ink)]"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </form>
      ) : (
        <form action={magicAction} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ferme@exemple.ci"
              required
              autoFocus
            />
          </div>

          {magicState && 'error' in magicState && magicState.error && (
            <div role="alert" className="text-sm text-[var(--sf-terre,#9A3412)] bg-[var(--sf-surface-2,#FEF3C7)] border border-[var(--sf-terre,#9A3412)]/30 rounded-md px-3 py-2">
              {magicState.error}
            </div>
          )}
          {magicState && magicState.ok && (
            <div role="status" className="text-sm text-[var(--sf-ink-deep,#14532D)] bg-[var(--sf-surface-2,#FEF3C7)] border border-[var(--sf-ink-deep,#14532D)]/20 rounded-md px-3 py-2">
              {magicState.message}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={magicPending}>
            {magicPending ? 'Envoi…' : 'Envoyer le lien'}
          </Button>

          <button
            type="button"
            onClick={() => setMode('password')}
            className="block text-sm text-[var(--sf-ink-deep,#14532D)] underline underline-offset-2 hover:text-[var(--sf-primary)]"
          >
            ← Revenir au mot de passe
          </button>
        </form>
      )}

      <div className="mt-8 pt-6 border-t border-[var(--sf-line)] text-center text-sm text-[var(--sf-muted)]">
        Pas encore de compte ?{' '}
        <Link
          href="/inscription"
          className="font-semibold text-[var(--sf-ink-deep,#14532D)] underline underline-offset-2 hover:text-[var(--sf-primary)]"
        >
          Créer un compte
        </Link>
      </div>
    </section>
  )
}
