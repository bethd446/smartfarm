'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { inscriptionAction, type AuthResult } from '../_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Page Inscription — email + mot de passe + nom complet.
 * Après succès : message de succès + affichage gros du numéro client SF-XXXXXX
 * généré (cf. trigger SQL). C'est l'identifiant que l'éleveur retiendra à la
 * place d'un email, plus facile pour public peu alphabétisé.
 */
export default function InscriptionPage() {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(
    inscriptionAction,
    null,
  )

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

      <form action={action} className="mt-6 space-y-4">
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
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Adresse email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="ferme@exemple.ci"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-[var(--sf-muted)]">8 caractères minimum.</p>
        </div>

        {state && 'error' in state && state.error && (
          <div role="alert" className="text-sm text-[var(--sf-terre,#9A3412)] bg-[var(--sf-surface-2,#FEF3C7)] border border-[var(--sf-terre,#9A3412)]/30 rounded-md px-3 py-2">
            {state.error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
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
