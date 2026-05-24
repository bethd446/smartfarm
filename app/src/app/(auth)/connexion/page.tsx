'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { connexionAction, magicLinkAction, connexionDemoAction, type AuthResult } from '../_actions'

/**
 * Smart Farm — Page connexion v1.0 (design system)
 * -------------------------------------------------------------------------
 * Form-side du split auth :
 *  - back link + drapeau CI
 *  - logo glyph 72px
 *  - eyebrow "Connexion"
 *  - H1 36px display
 *  - lead
 *  - form : input.input underline + btn.btn--primary stamp-ring
 *  - toggle "Recevoir un lien magique" (mode passwordless)
 *  - lien "Pas encore de compte ? Créer un compte"
 *  - footer ARTCI
 *
 * Logique server-action CONSERVÉE :
 *  - connexionAction (email/SF-XXXXXX + password) → redirect /dashboard
 *  - magicLinkAction (email passwordless OTP)
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
    <>
      <div className="auth-form__head">
        <Link href="/" className="auth-form__back">
          ← Retour
        </Link>
        <span className="flag-ci">
          <span className="flag-ci__strip" aria-hidden="true">
            <span style={{ background: '#F77F00', width: '33.3%' }} />
            <span style={{ background: '#fff', width: '33.3%' }} />
            <span style={{ background: '#009E60', width: '33.3%' }} />
          </span>
          Côte d&apos;Ivoire
        </span>
      </div>

      <div className="auth-form__body">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/logo-full-color.svg"
          alt="Smart Farm"
          className="auth-form__logo"
          width={72}
          height={72}
        />
        <p className="eyebrow" style={{ marginTop: 24 }}>
          Connexion
        </p>
        <h1 className="auth-form__h1">Connecte-toi à Smart&nbsp;Farm.</h1>
        <p className="auth-form__lead">
          {mode === 'password'
            ? 'Saisis ton email ou ton numéro client SF — ou demande un lien magique.'
            : 'Saisis ton email — on t\u2019envoie un lien magique pour entrer sans mot de passe.'}
        </p>

        {mode === 'password' ? (
          <form action={pwdAction}>
            <div className="field">
              <label className="field__label" htmlFor="identifiant">
                Email ou n° client SF
              </label>
              <input
                className="input"
                id="identifiant"
                name="identifiant"
                type="text"
                autoComplete="username"
                placeholder="ferme@exemple.ci ou SF-123456"
                required
                autoFocus
              />
              <div className="field__help">Ex : marius@ferme-ci01.com ou SF-000001</div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="password">
                Mot de passe
              </label>
              <input
                className="input"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            {pwdState && 'error' in pwdState && pwdState.error && (
              <div role="alert" className="auth-alert">
                <div className="auth-alert__title">Connexion refusée</div>
                <div>{pwdState.error}</div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--lg btn--full"
              disabled={pwdPending}
              style={{ marginTop: 8 }}
            >
              {pwdPending ? 'Connexion…' : 'Se connecter →'}
            </button>

            <div className="toggle-row">
              <button type="button" className="toggle-link" onClick={() => setMode('magic')}>
                Recevoir un lien magique
              </button>
              <span style={{ margin: '0 8px', color: 'var(--sf-subtle)' }}>·</span>
              <Link href="/mot-de-passe-oublie" className="toggle-link">
                Mot de passe oublié&nbsp;?
              </Link>
            </div>
          </form>
        ) : (
          <form action={magicAction}>
            <div className="field">
              <label className="field__label" htmlFor="email">
                Adresse email
              </label>
              <input
                className="input"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ferme@exemple.ci"
                required
                autoFocus
              />
              <div className="field__help">Le lien expire dans 15 minutes.</div>
            </div>

            {magicState && 'error' in magicState && magicState.error && (
              <div role="alert" className="auth-alert">
                <div className="auth-alert__title">Erreur</div>
                <div>{magicState.error}</div>
              </div>
            )}
            {magicState && magicState.ok && (
              <div role="status" className="auth-alert auth-alert--ok">
                <div className="auth-alert__title">✉ Lien envoyé</div>
                <div>{magicState.message}</div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--lg btn--full"
              disabled={magicPending}
              style={{ marginTop: 8 }}
            >
              {magicPending ? 'Envoi…' : 'Envoyer le lien magique →'}
            </button>

            <div className="toggle-row">
              <button type="button" className="toggle-link" onClick={() => setMode('password')}>
                ← Revenir au mot de passe
              </button>
            </div>
          </form>
        )}

        <div className="toggle-row" style={{ marginTop: 28 }}>
          Pas encore de compte&nbsp;?{' '}
          <Link href="/inscription" className="toggle-link">
            Créer un compte
          </Link>
        </div>

        <div className="auth-demo-row" style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--sf-border, rgba(0,0,0,0.08))' }}>
          <form action={connexionDemoAction}>
            <button
              type="submit"
              className="btn btn--ghost btn--lg btn--full"
              style={{ minHeight: 48 }}
            >
              👁  Tester en mode démo
            </button>
          </form>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--sf-subtle)', textAlign: 'center' }}>
            Aperçu lecture + écriture sur des données fictives. Aucune inscription nécessaire.
          </p>
        </div>
      </div>

      <div className="auth-form__foot">
        Smart Farm — plateforme déclarée à l&apos;ARTCI · Données hébergées en
        UE · v1.0.0
      </div>
    </>
  )
}
