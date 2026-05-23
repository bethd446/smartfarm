import type { ReactNode } from 'react'

/**
 * Smart Farm — Layout (auth) v1.0
 * -------------------------------------------------------------------------
 * Split 2 colonnes :
 *  - .auth-hero (gauche) : photo ambiance maternité + overlay sahel + brand
 *  - .auth-form (droite) : enfant route (connexion / inscription / etc.)
 *
 * Le visuel (brand, h1, lead) du .auth-hero est rendu par ce layout pour
 * éviter la duplication entre /connexion, /inscription, /mot-de-passe-oublie.
 *
 * Responsive : sous 900px, stack vertical (hero 200px haut).
 *
 * Vibe : carnet d'éleveur tropical CI — pas SaaS US.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-hero" aria-hidden="true">
        <div className="auth-hero__content">
          <div className="auth-hero__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/logo-glyph-only.svg"
              alt=""
              width={36}
              height={36}
              style={{ borderRadius: 'var(--sf-radius-md)' }}
            />
            <span className="auth-hero__brand-name">Smart Farm</span>
          </div>
          <div>
            <div className="auth-hero__h1">
              La gestion d&apos;élevage,<br />sans approximation.
            </div>
            <div className="auth-hero__lead">
              Plateforme professionnelle pour éleveurs et techniciens en Côte
              d&apos;Ivoire — traçabilité ISO, indicateurs IFIP, conformité
              sanitaire.
            </div>
          </div>
        </div>
      </aside>
      <main className="auth-form">{children}</main>
    </div>
  )
}
