import Link from 'next/link'
import Image from 'next/image'
import { Activity, ShieldCheck, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Smart Farm — Landing publique
 * -------------------------------------------------------------------------
 * Style : PRO AUSTÈRE VÉTÉRINAIRE.
 * Server Component. Tokens --sf-* uniquement. Aucun gradient, aucun blur.
 * Sections : Header · Hero · Chiffres · Fonctionnalités · Pour qui · CTA · Footer
 */
export default function HomePage() {
  return (
    <main
      className="min-h-screen bg-[var(--sf-surface-0)] text-[var(--sf-ink)]"
      style={{ fontFamily: 'var(--sf-font-body)' }}
    >
      {/* ─────────── 1. HEADER ─────────── */}
      <header className="border-b border-[var(--sf-line)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-smartfarm.svg"
              alt="Smart Farm"
              width={40}
              height={40}
              priority
              className="h-10 w-10"
            />
            <span
              className="hidden sm:inline uppercase tracking-tight text-[var(--sf-ink)] text-lg"
              style={{ fontFamily: 'var(--sf-font-display)', fontWeight: 700 }}
            >
              Smart Farm
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/connexion">
              <Button variant="outline" size="sm">Se connecter</Button>
            </Link>
            <Link href="/inscription">
              <Button variant="default" size="sm">Créer un compte</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ─────────── 2. HERO ─────────── */}
      <section className="border-b border-[var(--sf-line)]">
        <div className="mx-auto max-w-4xl px-5 py-20 md:py-28 text-center">
          <p
            className="eyebrow text-[var(--sf-ink-secondary)] mb-6"
            style={{ fontFamily: 'var(--sf-font-display)' }}
          >
            Plateforme professionnelle · Côte d&apos;Ivoire
          </p>
          <h1
            className="uppercase tracking-tight leading-[1.02] text-[var(--sf-ink)] text-4xl md:text-6xl"
            style={{ fontFamily: 'var(--sf-font-display)', fontWeight: 700 }}
          >
            La gestion d&apos;élevage porcin,
            <br className="hidden sm:inline" /> sans approximation.
          </h1>
          <p className="mt-6 text-base md:text-lg text-[var(--sf-ink-secondary)] max-w-2xl mx-auto leading-relaxed">
            Plateforme professionnelle pour éleveurs et techniciens en Côte d&apos;Ivoire.
            Traçabilité ISO, indicateurs IFIP, conformité sanitaire.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/inscription">
              <Button variant="default" size="lg">Créer un compte gratuit</Button>
            </Link>
            <Link href="/connexion">
              <Button variant="outline" size="lg">Se connecter</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────── 3. CHIFFRES CLÉS ─────────── */}
      <section className="border-b border-[var(--sf-line)]">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-y-10 md:gap-y-0 md:divide-x divide-[var(--sf-line)]">
            {[
              { n: '28', label: 'alertes IFIP automatiques' },
              { n: '44', label: 'indicateurs zootechniques suivis' },
              { n: '100%', label: 'conformité réglementaire CI' },
            ].map((s) => (
              <div key={s.label} className="text-center md:px-6">
                <dt
                  className="text-5xl md:text-6xl tabular-nums leading-none text-[var(--sf-ink)]"
                  style={{ fontFamily: 'var(--sf-font-display)', fontWeight: 700 }}
                >
                  {s.n}
                </dt>
                <dd className="mt-3 text-sm uppercase tracking-wider text-[var(--sf-ink-secondary)]">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─────────── 4. FONCTIONNALITÉS ─────────── */}
      <section className="border-b border-[var(--sf-line)]">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="mb-12 text-center">
            <p
              className="eyebrow text-[var(--sf-ink-secondary)]"
              style={{ fontFamily: 'var(--sf-font-display)' }}
            >
              Modules
            </p>
            <h2
              className="mt-3 text-2xl md:text-3xl uppercase tracking-tight text-[var(--sf-ink)]"
              style={{ fontFamily: 'var(--sf-font-display)', fontWeight: 700 }}
            >
              Trois piliers, un seul registre
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--sf-line)] border border-[var(--sf-line)]">
            {[
              {
                Icon: Activity,
                title: 'Reproduction',
                body: 'Cycles, saillies, mises bas, sevrages. Détection chaleurs assistée.',
              },
              {
                Icon: ShieldCheck,
                title: 'Sanitaire',
                body: 'Protocoles vaccinaux, suivi traitements, registre conforme à la réglementation ivoirienne.',
              },
              {
                Icon: BarChart3,
                title: 'Performances',
                body: 'Indicateurs IFIP en temps réel. Classement reproducteurs. Détection contre-performances.',
              },
            ].map(({ Icon, title, body }) => (
              <article
                key={title}
                className="bg-[var(--sf-surface-0)] p-8"
              >
                <Icon
                  className="h-6 w-6 text-[var(--sf-ink)]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3
                  className="mt-5 text-lg uppercase tracking-tight text-[var(--sf-ink)]"
                  style={{ fontFamily: 'var(--sf-font-display)', fontWeight: 700 }}
                >
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--sf-ink-secondary)]">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── 5. POUR QUI ─────────── */}
      <section className="border-b border-[var(--sf-line)]">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center">
          <p
            className="eyebrow text-[var(--sf-ink-secondary)] mb-6"
            style={{ fontFamily: 'var(--sf-font-display)' }}
          >
            Pour qui
          </p>
          <p
            className="text-xl md:text-2xl leading-relaxed text-[var(--sf-ink)]"
            style={{ fontFamily: 'var(--sf-font-display)', fontWeight: 400 }}
          >
            Conçu pour les exploitations porcines de 50 à 2&nbsp;000 truies.
            Utilisé par les éleveurs professionnels, vétérinaires conseil et
            techniciens d&apos;élevage en Côte d&apos;Ivoire.
          </p>
        </div>
      </section>

      {/* ─────────── 6. CTA FINAL ─────────── */}
      <section className="border-b border-[var(--sf-line)]">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h2
            className="text-3xl md:text-4xl uppercase tracking-tight text-[var(--sf-ink)]"
            style={{ fontFamily: 'var(--sf-font-display)', fontWeight: 700 }}
          >
            Démarrer aujourd&apos;hui.
          </h2>
          <p className="mt-4 text-base text-[var(--sf-ink-secondary)]">
            Aucune carte bancaire requise.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/inscription">
              <Button variant="default" size="lg">Créer mon compte</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────── 7. FOOTER ─────────── */}
      <footer className="bg-[var(--sf-surface-0)]">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            <div>
              <p
                className="eyebrow text-[var(--sf-ink-secondary)] mb-3"
                style={{ fontFamily: 'var(--sf-font-display)' }}
              >
                Smart Farm
              </p>
              <p className="text-[var(--sf-ink-secondary)] leading-relaxed">
                Plateforme de gestion d&apos;élevage porcin professionnel — Côte d&apos;Ivoire.
              </p>
            </div>
            <div>
              <p
                className="eyebrow text-[var(--sf-ink-secondary)] mb-3"
                style={{ fontFamily: 'var(--sf-font-display)' }}
              >
                Contact
              </p>
              <a
                href="mailto:contact@smartfarm.group"
                className="text-[var(--sf-ink)] underline-offset-4 hover:underline"
              >
                contact@smartfarm.group
              </a>
            </div>
            <div>
              <p
                className="eyebrow text-[var(--sf-ink-secondary)] mb-3"
                style={{ fontFamily: 'var(--sf-font-display)' }}
              >
                Légal
              </p>
              <p className="text-[var(--sf-ink-secondary)]">
                © 2026 Smart Farm. Tous droits réservés.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
