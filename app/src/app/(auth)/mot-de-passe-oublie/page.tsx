'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { magicLinkAction, type AuthResult } from '../_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Page Mot de passe oublié — reset via Magic Link Supabase.
 * On envoie simplement un OTP/magic link email. L'utilisateur clique,
 * arrive sur /auth/callback, est connecté, et peut changer son mot de
 * passe dans /parametres (non géré ici, hors scope R8).
 */
export default function MotDePasseOubliePage() {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(
    magicLinkAction,
    null,
  )

  return (
    <section className="bg-[var(--sf-surface-1)] border border-[var(--sf-line)] rounded-lg p-6 sm:p-8">
      <h1 className="font-[family-name:var(--sf-font-display)] uppercase tracking-tight text-2xl text-[var(--sf-ink)]">
        Mot de passe oublié
      </h1>
      <p className="mt-1 text-sm text-[var(--sf-muted)]">
        Saisis ton email — nous t&apos;envoyons un lien pour te reconnecter.
        Tu pourras changer ton mot de passe ensuite depuis Paramètres.
      </p>

      <form action={action} className="mt-6 space-y-4">
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

        {state && 'error' in state && state.error && (
          <div role="alert" className="text-sm text-[var(--sf-terre,#9A3412)] bg-[var(--sf-surface-2,#FEF3C7)] border border-[var(--sf-terre,#9A3412)]/30 rounded-md px-3 py-2">
            {state.error}
          </div>
        )}
        {state && state.ok && (
          <div role="status" className="text-sm text-[var(--sf-ink-deep,#14532D)] bg-[var(--sf-surface-2,#FEF3C7)] border border-[var(--sf-ink-deep,#14532D)]/20 rounded-md px-3 py-2">
            {state.message}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Envoi…' : 'Envoyer le lien'}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-[var(--sf-line)] text-center text-sm">
        <Link
          href="/connexion"
          className="text-[var(--sf-ink-deep,#14532D)] underline underline-offset-2 hover:text-[var(--sf-primary)]"
        >
          ← Retour à la connexion
        </Link>
      </div>
    </section>
  )
}
