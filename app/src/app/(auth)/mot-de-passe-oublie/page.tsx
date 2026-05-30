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
    <div className="auth-form__body">
      <p className="eyebrow">Réinitialisation</p>
      <h1 className="auth-form__h1">Mot de passe oublié&nbsp;?</h1>
      <p className="auth-form__lead">
        Saisis ton email — nous t&apos;envoyons un lien pour te reconnecter.
        Tu pourras changer ton mot de passe ensuite depuis Paramètres.
      </p>

      <form action={action} className="space-y-4">
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
          <div role="alert" className="auth-alert">
            <div className="auth-alert__title">Erreur</div>
            <div>{state.error}</div>
          </div>
        )}
        {state && state.ok && (
          <div role="status" className="auth-alert auth-alert--ok">
            <div className="auth-alert__title">✉ Lien envoyé</div>
            <div>{state.message}</div>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Envoi…' : 'Envoyer le lien'}
        </Button>
      </form>

      <div className="toggle-row" style={{ marginTop: 28 }}>
        <Link href="/connexion" className="toggle-link">
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
