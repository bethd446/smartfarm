import Link from 'next/link'

/**
 * Smart Farm — Landing publique (refonte éditoriale-typographique, mai 2026)
 * -------------------------------------------------------------------------
 * Registre marketing : "Smart Farm n'est pas un SaaS, c'est un journal d'élevage".
 * Typo : Instrument Serif (--sf-font-editorial) pour titrages H1/hero/citations,
 *        Big Shoulders (--sf-font-display) pour eyebrows mono-style,
 *        Instrument Sans (--sf-font-body) pour corps, JetBrains Mono (--sf-font-mono)
 *        pour notation systématique (volume, latitude, pagination).
 * Classes préfixées `lp-` pour ne pas collisionner avec design-v1.css.
 * Server Component. Image documentaire hotlinkée Unsplash (placeholder maternité).
 */

function FlagCI() {
  return (
    <span className="lp-flag" aria-hidden="true">
      <span style={{ background: '#F77F00' }} />
      <span style={{ background: '#FFFFFF' }} />
      <span style={{ background: '#009E60' }} />
    </span>
  )
}

export default function HomePage() {
  return (
    <>
      <style>{`
        .lp {
          --paper: var(--sf-surface-warm, #FFFBEB);
          --paper-2: #ECE2CC;
          --ink: var(--sf-ink, #1C1917);
          --ink-soft: #4A3F33;
          --ink-mute: var(--sf-muted, #5C5346);
          --sahel: var(--sf-primary, #2D4A1F);
          --ocre: var(--sf-secondary, #A16207);
          --hair: rgba(28,25,23,0.16);
          --serif: var(--sf-font-editorial, "Instrument Serif", Georgia, serif);
          --sans: var(--sf-font-body, "Instrument Sans", system-ui, sans-serif);
          --mono: var(--sf-font-mono, "JetBrains Mono", ui-monospace, monospace);
          --gutter: clamp(20px, 5vw, 64px);
          --col-gap: 24px;
          --hairline: 1px solid var(--hair);
          --hairline-strong: 1px solid var(--ink);
          background: var(--paper);
          color: var(--ink);
          font-family: var(--sans);
          position: relative;
          overflow-x: hidden;
        }
        .lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
        .lp::before {
          content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(circle at 20% 30%, rgba(28,25,23,0.012) 0, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(28,25,23,0.010) 0, transparent 60%);
        }
        .lp a { color: inherit; text-decoration: none; }
        .lp ::selection { background: var(--ink); color: var(--paper); }
        .lp main { position: relative; z-index: 1; }

        .lp-eyebrow { font-family: var(--mono); font-size: 10.5px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.18em; color: var(--ink-mute); }
        .lp-eyebrow-strong { font-family: var(--mono); font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.22em; color: var(--ink); }

        .lp-grid12 { display: grid; grid-template-columns: repeat(12, 1fr); gap: 0 var(--col-gap); padding: 0 var(--gutter); }

        /* MASTHEAD */
        .lp-masthead { border-bottom: var(--hairline-strong); padding: 18px var(--gutter); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 24px; }
        .lp-masthead__left, .lp-masthead__right { display: flex; align-items: center; gap: 18px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-mute); }
        .lp-masthead__right { justify-content: flex-end; }
        .lp-masthead__right a { color: var(--ink); padding: 6px 0; border-bottom: 1px solid transparent; transition: border-color .25s ease; }
        .lp-masthead__right a:hover { border-bottom-color: var(--ink); }
        .lp-masthead__brand { font-family: var(--serif); font-style: italic; font-size: 22px; letter-spacing: -0.01em; color: var(--ink); }
        .lp-flag { display: inline-flex; width: 18px; height: 12px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.18); }
        .lp-flag span { display: block; width: 33.333%; height: 100%; }

        /* COLOPHON */
        .lp-colophon { border-bottom: var(--hairline); padding: 10px var(--gutter); display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink-mute); }
        .lp-colophon span:nth-child(2) { text-align: center; }
        .lp-colophon span:last-child { text-align: right; }

        /* HERO */
        .lp-hero { padding-top: clamp(48px, 8vw, 120px); padding-bottom: clamp(64px, 10vw, 160px); }
        .lp-hero__eyebrow { grid-column: 1 / 13; display: flex; align-items: center; gap: 18px; margin-bottom: clamp(40px, 6vw, 80px); }
        .lp-hero__eyebrow .num { color: var(--ink); font-family: var(--mono); }
        .lp-hero__rule { flex: 1; height: 1px; border-top: var(--hairline); }
        .lp-hero__title { grid-column: 1 / 13; font-family: var(--serif); font-size: clamp(56px, 12vw, 180px); line-height: 0.92; letter-spacing: -0.025em; font-weight: 400; color: var(--ink); margin: 0; }
        .lp-hero__title em { font-style: italic; }
        .lp-hero__title .accent { font-style: italic; color: var(--sahel); }
        .lp-hero__meta { margin-top: clamp(48px, 7vw, 100px); grid-column: 1 / 13; display: grid; grid-template-columns: repeat(12, 1fr); gap: 0 var(--col-gap); align-items: start; }
        .lp-hero__lead { grid-column: 1 / 7; font-family: var(--serif); font-size: clamp(20px, 2.2vw, 28px); line-height: 1.32; font-style: italic; color: var(--ink); max-width: 38ch; }
        .lp-hero__byline { grid-column: 8 / 13; display: grid; grid-template-columns: 1fr 1fr; gap: 18px 24px; }
        .lp-byline-item .lp-eyebrow { display: block; margin-bottom: 6px; }
        .lp-byline-item .val { font-family: var(--serif); font-size: 18px; line-height: 1.3; color: var(--ink); }
        .lp-byline-item .val.mono { font-family: var(--mono); font-size: 13px; letter-spacing: 0.04em; }
        .lp-hero__cta { grid-column: 1 / 13; margin-top: clamp(40px, 6vw, 72px); display: flex; gap: clamp(24px, 4vw, 56px); flex-wrap: wrap; align-items: baseline; }
        .lp-cta { font-family: var(--serif); font-size: clamp(20px, 2vw, 24px); font-style: italic; color: var(--ink); border-bottom: 1px solid var(--ink); padding-bottom: 4px; transition: color .25s ease, border-color .25s ease; }
        .lp-cta::after { content: "  ↗"; font-style: normal; font-family: var(--mono); font-size: 0.8em; color: var(--ink-mute); transition: transform .25s ease, color .25s ease; display: inline-block; }
        .lp-cta:hover { color: var(--sahel); border-color: var(--sahel); }
        .lp-cta:hover::after { color: var(--sahel); transform: translate(2px, -2px); }
        .lp-cta--ghost { border-bottom: 1px dashed var(--hair); color: var(--ink-soft); font-size: clamp(15px, 1.4vw, 17px); }
        .lp-cta--ghost:hover { color: var(--ink); border-bottom-color: var(--ink); }

        /* SOMMAIRE */
        .lp-sommaire { border-top: var(--hairline-strong); border-bottom: var(--hairline-strong); padding-top: clamp(48px, 7vw, 96px); padding-bottom: clamp(48px, 7vw, 96px); }
        .lp-sommaire__header { grid-column: 1 / 13; display: grid; grid-template-columns: 1fr 4fr 1fr; align-items: baseline; gap: 24px; margin-bottom: clamp(36px, 5vw, 64px); }
        .lp-sommaire__header .lbl { font-family: var(--serif); font-style: italic; font-size: clamp(34px, 5vw, 58px); line-height: 1; color: var(--ink); }
        .lp-sommaire__header .meta { text-align: right; font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute); }
        .lp-toc { grid-column: 1 / 13; display: flex; flex-direction: column; }
        .lp-toc__row { display: grid; grid-template-columns: 56px 1.4fr 4fr 1fr; align-items: baseline; gap: 24px; padding: clamp(18px, 2.5vw, 28px) 0; border-top: var(--hairline); transition: background-color .3s ease, padding-left .3s ease; }
        .lp-toc__row:hover { background: var(--paper-2); padding-left: 12px; }
        .lp-toc__row:last-child { border-bottom: var(--hairline); }
        .lp-toc__num { font-family: var(--mono); font-size: 13px; color: var(--ink-mute); letter-spacing: 0.06em; }
        .lp-toc__title { font-family: var(--serif); font-size: clamp(22px, 2.4vw, 32px); line-height: 1.15; letter-spacing: -0.01em; color: var(--ink); }
        .lp-toc__title em { font-style: italic; color: var(--sahel); }
        .lp-toc__sub { font-family: var(--sans); font-size: 14px; line-height: 1.4; color: var(--ink-soft); max-width: 60ch; }
        .lp-toc__page { font-family: var(--mono); font-size: 13px; text-align: right; color: var(--ink); letter-spacing: 0.04em; }

        /* MANIFESTE */
        .lp-manifeste { padding-top: clamp(64px, 9vw, 128px); padding-bottom: clamp(64px, 9vw, 128px); }
        .lp-manifeste__header { grid-column: 1 / 13; margin-bottom: clamp(40px, 6vw, 80px); display: grid; grid-template-columns: 1fr 11fr; align-items: baseline; gap: 24px; }
        .lp-manifeste__header .label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-mute); border-top: var(--hairline-strong); padding-top: 8px; }
        .lp-manifeste__header h2 { font-family: var(--serif); font-size: clamp(38px, 5vw, 64px); line-height: 1.05; letter-spacing: -0.015em; font-weight: 400; color: var(--ink); border-top: var(--hairline-strong); padding-top: 8px; }
        .lp-manifeste__header h2 em { font-style: italic; color: var(--sahel); }
        .lp-articles { grid-column: 1 / 13; display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(28px, 4vw, 56px); align-items: start; }
        .lp-article { border-top: var(--hairline-strong); padding-top: 18px; }
        .lp-article__num { font-family: var(--serif); font-style: italic; font-size: clamp(64px, 7vw, 92px); line-height: 0.9; color: var(--ink); margin-bottom: 14px; }
        .lp-article__num .of { font-family: var(--mono); font-size: 12px; color: var(--ink-mute); vertical-align: top; margin-left: 6px; letter-spacing: 0.18em; }
        .lp-article__eyebrow { margin-bottom: 14px; color: var(--ocre); }
        .lp-article__title { font-family: var(--serif); font-size: clamp(22px, 2.2vw, 28px); line-height: 1.15; letter-spacing: -0.008em; color: var(--ink); margin-bottom: 14px; }
        .lp-article__title em { font-style: italic; }
        .lp-article__body { font-family: var(--sans); font-size: 15px; line-height: 1.55; color: var(--ink-soft); max-width: 38ch; }
        .lp-article__body strong { color: var(--ink); font-weight: 600; }
        .lp-article__pull { margin-top: 18px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; color: var(--ink-mute); text-transform: uppercase; }

        /* PLATE */
        .lp-plate { padding-top: clamp(48px, 7vw, 96px); padding-bottom: clamp(64px, 9vw, 120px); border-top: var(--hairline-strong); }
        .lp-plate__header { grid-column: 1 / 13; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: baseline; margin-bottom: clamp(28px, 4vw, 48px); }
        .lp-plate__header .lbl { font-family: var(--serif); font-style: italic; font-size: clamp(34px, 5vw, 58px); line-height: 1; color: var(--ink); }
        .lp-plate__header .meta { text-align: right; font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute); }
        .lp-plate__frame { grid-column: 2 / 12; aspect-ratio: 16 / 9; background: var(--paper-2); position: relative; overflow: hidden; border: var(--hairline-strong); }
        .lp-plate__frame img { width: 100%; height: 100%; object-fit: cover; filter: contrast(1.02) saturate(0.92); }
        .lp-plate__caption { grid-column: 2 / 12; margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: baseline; }
        .lp-plate__caption-text { font-family: var(--serif); font-style: italic; font-size: clamp(16px, 1.5vw, 19px); line-height: 1.4; color: var(--ink); max-width: 60ch; }
        .lp-plate__caption-meta { text-align: right; font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-mute); }

        /* DATA */
        .lp-data { padding-top: clamp(48px, 7vw, 96px); padding-bottom: clamp(48px, 7vw, 96px); border-top: var(--hairline-strong); border-bottom: var(--hairline-strong); background: var(--paper-2); }
        .lp-data__header { grid-column: 1 / 13; display: grid; grid-template-columns: 1fr 1fr; align-items: baseline; margin-bottom: clamp(32px, 4vw, 56px); gap: 24px; }
        .lp-data__header .lbl { font-family: var(--serif); font-style: italic; font-size: clamp(30px, 4vw, 48px); line-height: 1; color: var(--ink); }
        .lp-data__header .meta { text-align: right; font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute); }
        .lp-data__grid { grid-column: 1 / 13; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
        .lp-data__cell { border-right: var(--hairline); padding: 24px 24px 20px; display: flex; flex-direction: column; gap: 8px; }
        .lp-data__cell:last-child { border-right: none; }
        .lp-data__cell .k { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute); }
        .lp-data__cell .v { font-family: var(--serif); font-size: clamp(40px, 4.5vw, 64px); line-height: 1; color: var(--ink); font-feature-settings: "tnum", "lnum"; font-style: italic; }
        .lp-data__cell .v .u { font-family: var(--mono); font-size: 0.28em; color: var(--ink-mute); font-style: normal; margin-left: 6px; letter-spacing: 0.18em; vertical-align: super; }
        .lp-data__cell .sub { font-family: var(--sans); font-size: 13px; line-height: 1.35; color: var(--ink-soft); }

        /* END */
        .lp-end { padding-top: clamp(48px, 7vw, 80px); padding-bottom: clamp(32px, 5vw, 56px); }
        .lp-end__inner { grid-column: 1 / 13; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; }
        .lp-end__brand { font-family: var(--serif); font-style: italic; font-size: clamp(48px, 7vw, 90px); line-height: 0.95; letter-spacing: -0.02em; color: var(--ink); }
        .lp-end__brand .light { color: var(--ink-mute); }
        .lp-end__col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .lp-end__col .group h3 { font-family: var(--mono); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink); font-weight: 500; border-top: var(--hairline-strong); padding-top: 8px; margin-bottom: 12px; }
        .lp-end__col .group a { display: block; font-family: var(--sans); font-size: 14px; line-height: 1.6; color: var(--ink-soft); border-bottom: 1px solid transparent; width: fit-content; transition: color .25s, border-color .25s; }
        .lp-end__col .group a:hover { color: var(--ink); border-bottom-color: var(--ink); }
        .lp-end__line { grid-column: 1 / 13; border-top: var(--hairline); padding-top: 16px; margin-top: clamp(40px, 6vw, 64px); display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-mute); }
        .lp-end__line .ci { display: flex; align-items: center; gap: 10px; justify-content: center; }
        .lp-end__line .right { text-align: right; }

        /* HERO ENTRY ANIMATION — pure CSS, screenshot/SSR safe */
        @media (prefers-reduced-motion: no-preference) {
          @keyframes lpIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
          .lp-anim { animation: lpIn .9s cubic-bezier(.2,.7,.2,1) both; }
        }

        @media (max-width: 900px) {
          .lp-masthead { grid-template-columns: 1fr auto; }
          .lp-masthead__left { display: none; }
          .lp-colophon { grid-template-columns: 1fr 1fr; }
          .lp-colophon span:nth-child(3), .lp-colophon span:nth-child(4) { display: none; }
          .lp-hero__meta { grid-template-columns: 1fr; gap: 32px; }
          .lp-hero__lead, .lp-hero__byline { grid-column: 1 / 13; }
          .lp-hero__byline { grid-template-columns: 1fr 1fr; }
          .lp-sommaire__header { grid-template-columns: 1fr; }
          .lp-sommaire__header .meta { text-align: left; }
          .lp-toc__row { grid-template-columns: 36px 1fr; gap: 16px; }
          .lp-toc__sub, .lp-toc__page { display: none; }
          .lp-manifeste__header { grid-template-columns: 1fr; }
          .lp-articles { grid-template-columns: 1fr; gap: 56px; }
          .lp-plate__frame, .lp-plate__caption { grid-column: 1 / 13; }
          .lp-plate__caption { grid-template-columns: 1fr; }
          .lp-plate__caption-meta { text-align: left; }
          .lp-data__grid { grid-template-columns: repeat(2, 1fr); }
          .lp-data__cell { border-bottom: var(--hairline); }
          .lp-data__cell:nth-child(odd) { border-right: var(--hairline); }
          .lp-data__cell:nth-child(even) { border-right: none; }
          .lp-end__inner { grid-template-columns: 1fr; }
          .lp-end__col { grid-template-columns: 1fr; }
          .lp-end__line { grid-template-columns: 1fr; gap: 8px; }
          .lp-end__line .ci, .lp-end__line .right { justify-content: flex-start; text-align: left; }
        }
      `}</style>

      <div className="lp">
        <main>
          {/* MASTHEAD */}
          <header className="lp-masthead">
            <div className="lp-masthead__left">
              <span>Vol. I · N° I</span>
              <span>·</span>
              <span>Abidjan</span>
            </div>
            <Link href="/" className="lp-masthead__brand">Smart&nbsp;Farm</Link>
            <nav className="lp-masthead__right">
              <Link href="/connexion">Se connecter</Link>
              <Link href="/inscription">Créer un compte</Link>
              <Link href="/connexion?demo=true">Démo</Link>
            </nav>
          </header>

          {/* COLOPHON */}
          <div className="lp-colophon">
            <span>Élevage porcin tropical</span>
            <span>Côte d&apos;Ivoire</span>
            <span>Tirage numérique illimité</span>
            <span>Quatorze pages · Une planche</span>
          </div>

          {/* HERO */}
          <section className="lp-hero lp-grid12">
            <div className="lp-hero__eyebrow lp-eyebrow-strong">
              <span className="num">N° I</span>
              <span className="lp-hero__rule" />
              <span>Manifeste d&apos;ouverture</span>
            </div>

            <h1 className="lp-hero__title no-uppercase lp-anim" style={{ animationDelay: '80ms' }}>
              La gestion d&apos;élevage,<br />
              <em>sans</em> <span className="accent">approximation.</span>
            </h1>

            <div className="lp-hero__meta">
              <p className="lp-hero__lead lp-anim" style={{ animationDelay: '280ms' }}>
                Plateforme professionnelle pour éleveurs et techniciens ivoiriens.
                Traçabilité technique, indicateurs IFIP, conformité sanitaire, pensée pour
                le smartphone Android, la 4G variable et le plein soleil.
              </p>
              <div className="lp-hero__byline">
                <div className="lp-byline-item">
                  <span className="lp-eyebrow">Édition</span>
                  <span className="val">Smart Farm CI-01</span>
                </div>
                <div className="lp-byline-item">
                  <span className="lp-eyebrow">Latitude</span>
                  <span className="val mono">06°49′N · 05°16′W</span>
                </div>
                <div className="lp-byline-item">
                  <span className="lp-eyebrow">Référentiel</span>
                  <span className="val">IFIP &amp; NRC</span>
                </div>
                <div className="lp-byline-item">
                  <span className="lp-eyebrow">Tempérament</span>
                  <span className="val">Tropical · 24 à 32°C</span>
                </div>
              </div>
            </div>

            <div className="lp-hero__cta">
              <Link href="/inscription" className="lp-cta">Créer un compte</Link>
              <Link href="/connexion" className="lp-cta">J&apos;ai déjà un compte</Link>
              <Link href="/connexion?demo=true" className="lp-cta lp-cta--ghost">Visiter la démo, sans inscription</Link>
            </div>
          </section>

          {/* SOMMAIRE */}
          <section className="lp-sommaire lp-grid12">
            <div className="lp-sommaire__header">
              <span className="lp-eyebrow-strong">Au sommaire</span>
              <span className="lbl">Ce que la plateforme<br /><em>tient pour vrai.</em></span>
              <span className="meta">III articles · I planche · IV données</span>
            </div>

            <div className="lp-toc">
              <Link className="lp-toc__row" href="#manifeste">
                <span className="lp-toc__num">01 — I</span>
                <h3 className="lp-toc__title">Indicateurs IFIP, <em>en temps réel</em></h3>
                <p className="lp-toc__sub">ISSF, GMQ, IC, TMM, productivité numérique calculés par bande, comparés à votre référentiel ou aux standards IFIP/NRC.</p>
                <span className="lp-toc__page">p. 04</span>
              </Link>
              <Link className="lp-toc__row" href="#manifeste">
                <span className="lp-toc__num">02 — II</span>
                <h3 className="lp-toc__title">Traçabilité <em>ISO sanitaire</em></h3>
                <p className="lp-toc__sub">Lots, mouvements, traitements vétérinaires, biosécurité. Export PDF conforme aux contrôles MIRAH.</p>
                <span className="lp-toc__page">p. 07</span>
              </Link>
              <Link className="lp-toc__row" href="#manifeste">
                <span className="lp-toc__num">03 — III</span>
                <h3 className="lp-toc__title">Une marque, <em>plusieurs sites</em></h3>
                <p className="lp-toc__sub">Smart Farm CI-01, CI-02, CI-03… Vue consolidée multi-fermes, permissions et rôles par site.</p>
                <span className="lp-toc__page">p. 10</span>
              </Link>
            </div>
          </section>

          {/* MANIFESTE */}
          <section className="lp-manifeste lp-grid12" id="manifeste">
            <div className="lp-manifeste__header">
              <span className="label">§ Manifeste</span>
              <h2>Un carnet d&apos;élevage qui tient <em>la cadence</em> du terrain.</h2>
            </div>

            <div className="lp-articles">
              <article className="lp-article">
                <div className="lp-article__num">01<span className="of">/ III</span></div>
                <span className="lp-article__eyebrow lp-eyebrow">Suivi technique</span>
                <h3 className="lp-article__title">Indicateurs IFIP, <em>en temps réel.</em></h3>
                <p className="lp-article__body">
                  <strong>ISSF, GMQ, IC, TMM, productivité numérique</strong> calculés par bande, comparés à votre référentiel.
                  La plateforme transforme le journal de saillies en tableau de bord opérationnel,
                  sans manipulation tableur, sans saisie redondante.
                </p>
                <p className="lp-article__pull">→ Suivi par bande · Comparaison référentiel</p>
              </article>

              <article className="lp-article">
                <div className="lp-article__num">02<span className="of">/ III</span></div>
                <span className="lp-article__eyebrow lp-eyebrow">Conformité</span>
                <h3 className="lp-article__title">Traçabilité <em>ISO sanitaire.</em></h3>
                <p className="lp-article__body">
                  <strong>Lots, mouvements, traitements véto, biosécurité.</strong> Le carnet sanitaire MIRAH s&apos;exporte
                  en PDF ou CSV, conformément à l&apos;arrêté vétérinaire ivoirien.
                  Aucun classeur manuel ne tient face à un contrôle imprévu.
                </p>
                <p className="lp-article__pull">→ Export PDF MIRAH · CSV Excel FR</p>
              </article>

              <article className="lp-article">
                <div className="lp-article__num">03<span className="of">/ III</span></div>
                <span className="lp-article__eyebrow lp-eyebrow">Multi-fermes</span>
                <h3 className="lp-article__title">Une marque, <em>plusieurs sites.</em></h3>
                <p className="lp-article__body">
                  <strong>Smart Farm CI-01, CI-02, CI-03…</strong> Chaque ferme conserve son cheptel,
                  ses bandes, ses droits d&apos;accès. Le siège consolide les indicateurs sans franchir
                  la cloison des données, multi-tenant par construction.
                </p>
                <p className="lp-article__pull">→ Vue consolidée · RLS multi-tenant</p>
              </article>
            </div>
          </section>

          {/* PLATE */}
          <section className="lp-plate lp-grid12">
            <div className="lp-plate__header">
              <span className="lbl">Planche <em>I</em></span>
              <span className="meta">Documentation terrain · Smart Farm CI-01</span>
            </div>

            <figure className="lp-plate__frame">
              {/* Planche d'observation éditoriale — SVG local, zéro dépendance externe.
                  Composition abstraite (cycle + repères de mesure) dans le ton vellum/encre,
                  conforme à la doctrine « pas de stock photo happy farm » du DESIGN.md. */}
              <svg
                viewBox="0 0 1600 900"
                role="img"
                aria-label="Planche d'observation Smart Farm CI-01 — cycle reproductif et repères de mesure"
                style={{ width: '100%', height: '100%', display: 'block', background: 'var(--paper-2)' }}
              >
                <defs>
                  <pattern id="lp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0H0V40" fill="none" stroke="rgba(28,25,23,0.06)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="1600" height="900" fill="url(#lp-grid)" />
                {/* axe horizontal de mesure */}
                <line x1="120" y1="640" x2="1480" y2="640" stroke="rgba(28,25,23,0.5)" strokeWidth="1" />
                {Array.from({ length: 35 }).map((_, i) => {
                  const x = 120 + (i * (1360 / 34))
                  const tall = i % 7 === 0
                  return (
                    <line key={i} x1={x} y1="640" x2={x} y2={tall ? 624 : 632}
                      stroke="rgba(28,25,23,0.5)" strokeWidth={tall ? 1.2 : 0.7} />
                  )
                })}
                {/* cercle du cycle (168 j) — clin d'œil Periodic Vellum */}
                <circle cx="800" cy="370" r="190" fill="none" stroke="rgba(45,74,31,0.85)" strokeWidth="1.4" />
                <circle cx="800" cy="370" r="120" fill="none" stroke="rgba(28,25,23,0.25)" strokeWidth="0.8" />
                <circle cx="800" cy="370" r="3" fill="rgba(28,25,23,0.9)" />
                {Array.from({ length: 24 }).map((_, i) => {
                  const a = (Math.PI / 2) - (i * (2 * Math.PI / 24))
                  const r1 = 190, r2 = i % 6 === 0 ? 172 : 180
                  return (
                    <line key={i}
                      x1={800 + r1 * Math.cos(a)} y1={370 - r1 * Math.sin(a)}
                      x2={800 + r2 * Math.cos(a)} y2={370 - r2 * Math.sin(a)}
                      stroke="rgba(28,25,23,0.45)" strokeWidth={i % 6 === 0 ? 1.1 : 0.6} />
                  )
                })}
                {/* arc gestation (vert Sahel) sur le cercle */}
                <path d="M 800 180 A 190 190 0 0 1 752 549" fill="none" stroke="rgba(45,74,31,0.9)" strokeWidth="5" />
                {/* annotations mono */}
                <text x="800" y="120" textAnchor="middle" fill="rgba(28,25,23,0.55)"
                  fontFamily="var(--sf-font-mono, monospace)" fontSize="20" letterSpacing="4">CYCLUS · CLXVIII</text>
                <text x="120" y="690" fill="rgba(28,25,23,0.5)"
                  fontFamily="var(--sf-font-mono, monospace)" fontSize="17" letterSpacing="3">J0</text>
                <text x="1480" y="690" textAnchor="end" fill="rgba(28,25,23,0.5)"
                  fontFamily="var(--sf-font-mono, monospace)" fontSize="17" letterSpacing="3">J168</text>
                <text x="800" y="800" textAnchor="middle" fill="rgba(28,25,23,0.4)"
                  fontFamily="var(--sf-font-editorial, Georgia, serif)" fontSize="26" fontStyle="italic">
                  Cliché documentaire à paraître
                </text>
              </svg>
            </figure>

            <figcaption className="lp-plate__caption">
              <p className="lp-plate__caption-text">
                Truie B.22, multipare, jour 28 de lactation. Onze porcelets sevrés
                au-dessus de la moyenne IFIP CI. Ferme Smart Farm CI-01,
                district d&apos;Abidjan, saison sèche 2026.
              </p>
              <span className="lp-plate__caption-meta">Cliché documentaire · CI-01 · MMXXVI</span>
            </figcaption>
          </section>

          {/* DATA */}
          <section className="lp-data lp-grid12">
            <div className="lp-data__header">
              <span className="lbl">Tableau <em>des chiffres tenus.</em></span>
              <span className="meta">Cycle CLXVIII jours · Référentiel IFIP</span>
            </div>

            <div className="lp-data__grid">
              <div className="lp-data__cell">
                <span className="k">Cycle reproductif</span>
                <span className="v">168<span className="u">jours</span></span>
                <span className="sub">21 œstrus · 114 gestation · 28 lactation · 5 anœstrus.</span>
              </div>
              <div className="lp-data__cell">
                <span className="k">Gestation, mnémo</span>
                <span className="v">3·3·3</span>
                <span className="sub">Trois mois · trois semaines · trois jours.</span>
              </div>
              <div className="lp-data__cell">
                <span className="k">Portée moyenne CI</span>
                <span className="v">11,2<span className="u">nés vivants</span></span>
                <span className="sub">Mesuré sur le cheptel CI-01, 2025 à 2026.</span>
              </div>
              <div className="lp-data__cell">
                <span className="k">Cibles tactiles</span>
                <span className="v">44<span className="u">pixels</span></span>
                <span className="sub">Toutes les actions terrain · WCAG 2.5.5.</span>
              </div>
            </div>
          </section>

          {/* END */}
          <section className="lp-end lp-grid12">
            <div className="lp-end__inner">
              <div className="lp-end__brand">
                Smart Farm <em className="light">— une plateforme<br />portée par le terrain.</em>
              </div>
              <div className="lp-end__col">
                <div className="group">
                  <h3>Compte</h3>
                  <Link href="/inscription">Créer un compte</Link>
                  <Link href="/connexion">Se connecter</Link>
                  <Link href="/connexion?demo=true">Tester la démo</Link>
                </div>
                <div className="group">
                  <h3>Maison</h3>
                  <Link href="/mentions-legales">Mentions légales</Link>
                  <Link href="/politique-confidentialite">Confidentialité</Link>
                  <Link href="/cgu">Conditions générales</Link>
                </div>
              </div>
            </div>

            <div className="lp-end__line">
              <span>© MMXXVI · smartfarm.group</span>
              <span className="ci"><FlagCI /> Édité en Côte d&apos;Ivoire</span>
              <span className="right">Vol. I · Numéro I · Fin</span>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
