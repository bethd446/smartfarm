import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Smart Farm — Landing publique (Design System v1.0)
 * -------------------------------------------------------------------------
 * Réécrite d'après /tmp/sf-design/release/smartfarm-design-v1/screens/01-landing.html.
 * Structure : header nav · hero split 2 cols · section "Trois piliers" · footer.
 * Tokens --sf-* via design-v1.css déjà importé par globals.css.
 * Server Component. Image hero hotlinkée Unsplash (placeholder maternité porcine).
 */

/** Drapeau Côte d'Ivoire — 3 bandes verticales orange/blanc/vert, 18×12. */
function FlagCI() {
  return (
    <span className="flag-ci">
      <span className="flag-ci__strip" aria-hidden="true">
        <span style={{ background: '#F77F00' }} />
        <span style={{ background: '#ffffff' }} />
        <span style={{ background: '#009E60' }} />
      </span>
      Côte d&apos;Ivoire
    </span>
  )
}

export default function HomePage() {
  return (
    <>
      {/* Styles page-scoped — repris du <style> inline du screen 01-landing.html
          (les classes .nav-top / .hero / .props / .flag-ci / .footer ne sont
          pas dans design-v1.css, elles sont propres à cette page). */}
      <style>{`
        body { background: var(--sf-surface-0); font-family: var(--sf-font-body); color: var(--sf-ink); }

        .nav-top { display: flex; align-items: center; justify-content: space-between; padding: 18px 40px; border-bottom: 1px solid var(--sf-line); }
        .nav-top__brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; }
        .nav-top__brand img { width: 40px; height: 40px; }
        .nav-top__brand-name { font-family: var(--sf-font-display); font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .nav-top__menu { display: flex; align-items: center; gap: 6px; }
        .nav-top__menu a { padding: 10px 14px; color: var(--sf-ink); text-decoration: none; font-size: 14px; }
        .nav-top__menu a:hover { color: var(--sf-primary); }

        .hero { padding: 72px 40px 56px; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.1fr 1fr; gap: 48px; align-items: center; }
        .hero__title { font-family: var(--sf-font-display); font-size: 64px; line-height: 1; font-weight: 900; text-transform: uppercase; letter-spacing: -0.01em; margin: 10px 0 18px; color: var(--sf-ink); }
        .hero__title b { color: var(--sf-primary); font-weight: 900; }
        .hero__lead { font-size: 17px; line-height: 1.55; color: var(--sf-ink-secondary); max-width: 52ch; margin: 0 0 26px; }
        .hero__cta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .hero__trust { display: flex; flex-wrap: wrap; gap: 22px; margin-top: 32px; align-items: center; font-size: 13px; color: var(--sf-muted); }
        .hero__media { position: relative; aspect-ratio: 4/5; overflow: hidden; border-top: 4px solid var(--sf-primary); box-shadow: var(--sf-elev-1); background: var(--sf-surface-2); }
        .hero__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hero__caption { position: absolute; left: 18px; bottom: 18px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.6); }
        .hero__caption .eyebrow { color: rgba(255,255,255,0.85); }
        .hero__caption-name { font-family: var(--sf-font-display); font-size: 22px; font-weight: 700; text-transform: uppercase; margin-top: 4px; }

        .props { background: var(--sf-surface-1); border-top: 1px solid var(--sf-line); border-bottom: 1px solid var(--sf-line); padding: 56px 40px; }
        .props__inner { max-width: 1200px; margin: 0 auto; }
        .props__title { font-family: var(--sf-font-display); font-size: 36px; font-weight: 700; text-transform: uppercase; max-width: 24ch; margin: 8px 0 32px; line-height: 1.05; color: var(--sf-ink); }
        .props__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .prop__head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--sf-primary); }
        .prop__glyph { font-size: 22px; line-height: 1; font-family: var(--sf-font-display); font-weight: 700; }
        .prop__title { font-family: var(--sf-font-display); font-size: 20px; font-weight: 700; text-transform: uppercase; margin: 4px 0 8px; color: var(--sf-ink); }
        .prop__body { margin: 0; font-size: 14px; line-height: 1.5; color: var(--sf-ink-secondary); }

        .flag-ci { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
        .flag-ci__strip { display: inline-flex; width: 18px; height: 12px; overflow: hidden; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08); }
        .flag-ci__strip > span { width: 33.3333%; height: 100%; display: block; }

        .footer { padding: 32px 40px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--sf-line); font-size: 13px; color: var(--sf-muted); flex-wrap: wrap; gap: 12px; }
        .footer__brand { display: flex; gap: 12px; align-items: center; }
        .footer__links { display: flex; gap: 20px; align-items: center; }
        .footer__links a { color: var(--sf-muted); text-decoration: none; }
        .footer__links a:hover { color: var(--sf-ink); }

        @media (max-width: 768px) {
          .nav-top { padding: 14px 16px; flex-wrap: wrap; gap: 8px; }
          .nav-top__menu a:not([data-cta]) { display: none; }
          .hero { padding: 32px 16px; grid-template-columns: 1fr; gap: 24px; }
          .hero__title { font-size: 40px; }
          .props { padding: 32px 16px; }
          .props__grid { grid-template-columns: 1fr; }
          .props__title { font-size: 26px; }
          .footer { padding: 24px 16px; }
        }
      `}</style>

      <main>
        {/* ─────────── HEADER NAV ─────────── */}
        <header className="nav-top">
          <Link href="/" className="nav-top__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo-glyph-only.svg" alt="Smart Farm" width={40} height={40} />
            <span className="nav-top__brand-name">Smart Farm</span>
          </Link>
          <nav className="nav-top__menu">
            <Link href="/connexion" data-cta>
              <Button variant="outline" size="sm">Se connecter</Button>
            </Link>
            <Link href="/inscription" data-cta>
              <Button variant="default" size="sm">Créer un compte</Button>
            </Link>
          </nav>
        </header>

        {/* ─────────── HERO SPLIT ─────────── */}
        <section className="hero">
          <div className="hero__copy">
            <p className="eyebrow">Élevage porcin tropical · Côte d&apos;Ivoire</p>
            <h1 className="hero__title">
              La gestion d&apos;élevage,
              <br />
              <b>sans approximation.</b>
            </h1>
            <p className="hero__lead">
              Plateforme professionnelle pour <strong>éleveurs et techniciens</strong> ivoiriens.
              Traçabilité technique, indicateurs IFIP, conformité sanitaire — sur smartphone,
              4G ou plein soleil.
            </p>
            <div className="hero__cta">
              <Link href="/inscription">
                <Button variant="default" size="lg">Créer un compte →</Button>
              </Link>
              <Link href="/connexion">
                <Button variant="outline" size="lg">J&apos;ai déjà un compte</Button>
              </Link>
              <Link href="/connexion?demo=true">
                <Button variant="ghost" size="lg">👁 Tester la démo</Button>
              </Link>
            </div>
            <div className="hero__trust">
              <FlagCI />
              <span>● Standards IFIP &amp; NRC</span>
              <span>● Indicateurs IFIP</span>
              <span>● Multi-fermes</span>
            </div>
          </div>

          <div className="hero__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&q=80"
              alt="Truie en maternité avec sa portée — Smart Farm CI-01"
            />
            <div className="hero__caption">
              <div className="eyebrow">Maternité · Smart Farm CI-01</div>
              <div className="hero__caption-name">Truie B.22 · 11 porcelets</div>
            </div>
          </div>
        </section>

        {/* ─────────── TROIS PILIERS ─────────── */}
        <section className="props" id="features">
          <div className="props__inner">
            <p className="eyebrow">Ce que la plateforme fait pour vous</p>
            <h2 className="props__title">
              Un carnet d&apos;élevage qui tient la cadence du terrain.
            </h2>
            <div className="props__grid">
              <article className="card prop">
                <div className="card__content">
                  <div className="prop__head">
                    <span className="prop__glyph">~</span>
                    <span className="eyebrow" style={{ color: 'var(--sf-primary)' }}>Suivi technique</span>
                  </div>
                  <h3 className="prop__title">Indicateurs IFIP en temps réel</h3>
                  <p className="prop__body">
                    ISSF, GMQ, IC, TMM, productivité numérique — calculés par bande, comparés à votre référentiel.
                  </p>
                </div>
              </article>

              <article className="card prop">
                <div className="card__content">
                  <div className="prop__head">
                    <span className="prop__glyph">+</span>
                    <span className="eyebrow" style={{ color: 'var(--sf-primary)' }}>Conformité</span>
                  </div>
                  <h3 className="prop__title">Traçabilité ISO sanitaire</h3>
                  <p className="prop__body">
                    Lots, mouvements, traitements véto, biosécurité. Export PDF pour les contrôles MIRAH.
                  </p>
                </div>
              </article>

              <article className="card prop">
                <div className="card__content">
                  <div className="prop__head">
                    <span className="prop__glyph">▣</span>
                    <span className="eyebrow" style={{ color: 'var(--sf-primary)' }}>Multi-fermes</span>
                  </div>
                  <h3 className="prop__title">Une marque, plusieurs sites</h3>
                  <p className="prop__body">
                    Smart Farm CI-01, CI-02, CI-03… Vue consolidée et permissions par ferme.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ─────────── FOOTER ─────────── */}
        <footer className="footer">
          <div className="footer__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo-glyph-only.svg" alt="" width={24} height={24} />
            <span>© 2026 Smart Farm · smartfarm.group</span>
          </div>
          <div className="footer__links">
            <FlagCI />
            <a href="/mentions-legales">Mentions légales</a>
            <a href="/politique-confidentialite">Confidentialité</a>
            <a href="/cgu">CGU</a>
          </div>
        </footer>
      </main>
    </>
  )
}
