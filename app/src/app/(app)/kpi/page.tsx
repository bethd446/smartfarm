/* Hallmark · macrostructure: 04 Stat-Led · screen: /kpi · tone: terrain-vivant · theme: Terre & Mil (DESIGN.md) · pre-emit: P5 H5 E4 S5 R4 V4 */
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getFermeId } from '@/lib/supabase/ferme-context'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import Link from 'next/link'
import { BoutonPdfMensuel } from './_bouton-pdf-mensuel'
import { FigureTick } from './_figure-tick'

export const metadata: Metadata = {
  title: 'Indicateurs zootechniques',
  description: 'Pilotage IFIP : productivité numérique, IC, GMQ, performance par bande et classement truies.',
}

// Helpers
function fmtNum(n: number | string | null | undefined, digits = 1): string {
  if (n === null || n === undefined || n === '') return '—'
  const v = typeof n === 'string' ? Number(n) : n
  if (!Number.isFinite(v)) return '—'
  return v.toFixed(digits)
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  return n === null || n === undefined ? '—' : `${fmtNum(n, digits)} %`
}

// Tone helpers pour les KPIs
function toneIc(v: number | null | undefined): 'good' | 'warn' | 'bad' | 'muted' {
  if (v === null || v === undefined) return 'muted'
  const n = Number(v)
  if (!Number.isFinite(n)) return 'muted'
  if (n >= 2.6 && n <= 2.8) return 'good'
  if (n > 2.8 && n <= 3.2) return 'warn'
  return 'bad'
}

function toneProductivite(v: number | null | undefined): 'good' | 'warn' | 'bad' | 'muted' {
  if (v === null || v === undefined) return 'muted'
  const n = Number(v)
  if (!Number.isFinite(n)) return 'muted'
  if (n >= 22) return 'good'
  if (n >= 18) return 'warn'
  return 'bad'
}

function getToneColor(tone: 'good' | 'warn' | 'bad' | 'muted'): string {
  switch (tone) {
    case 'good':
      return 'var(--sf-primary)'
    case 'warn':
      return 'var(--sf-accent-deep)'
    case 'bad':
      return 'var(--sf-danger-ink, #7A2A1F)'
    default:
      return 'var(--sf-muted)'
  }
}

function toneLabel(tone: 'good' | 'warn' | 'bad' | 'muted'): string {
  switch (tone) {
    case 'good':
      return 'Dans la cible'
    case 'warn':
      return 'Sous la cible'
    case 'bad':
      return 'Hors cible'
    default:
      return 'Non calculable'
  }
}

// Types
type VDashboardKpi = {
  ferme_id: string
  ferme_nom: string
  cheptel_total: number
  truies_actives: number
  verrats_actifs: number
  truies_pleines: number
  mb_attendues_7j: number
  portees_en_cours: number
  alertes_actives: number
}

type VKpiTechniquesFerme = {
  ferme_id: string
  nb_truies: number
  nb_verrats: number
  nb_gestantes: number
  nb_allaitantes: number
  portee_moyenne_12m: number | null
  nb_portees_actives: number
  nb_portees_12m: number
}

type VKpiIcFerme = {
  ferme_id: string
  ic: number | null
  conso_kg: number | string | null
  croit_kg: number | string | null
  periode_debut: string | null
  periode_fin: string | null
}

type MvKpiBande = {
  bande_id: string
  bande_nom: string
  statut: string
  effectif_actuel: number
  effectif: number
  gmq_moyen: number | null
  ic: number | null
  taux_mortalite: number | null
}

type VFertiliteTruie = {
  ferme_id: string
  truie_id: string
  tag: string
  nom: string | null
  nb_saillies: number
  nb_positifs: number
  nb_retours: number
  nb_mb: number
  moy_nes_vivants: number | null
  taux_reussite_pct: number | null
  suggestion_reforme: boolean
}

type VScoreTruie = {
  truie_id: string
  ferme_id: string
  tag: string
  nom: string | null
  nb_portees: number
  portee_moyenne: number | null
  classe: string
  score_global: number | null
}

// Étiquette de planche — eyebrow ordinal, dosé (langage registre carnet, stack vertical)
const plancheLabel: React.CSSProperties = {
  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--sf-muted)',
}

const displayFont = "var(--sf-font-display, 'Big Shoulders Display', sans-serif)"
const bodyFont = "var(--sf-font-body, 'Instrument Sans', sans-serif)"

export default async function KpiPageV2() {
  const sb = await createClient()
  const fermeId = await getFermeId()
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  // Fetch data from views
  const [
    { data: dashKpi },
    { data: kpiTechFerme },
    { data: kpiIc },
    { data: bandes },
    { data: topTruies },
    { data: truiesReforme },
  ] = await Promise.all([
    sb.from('v_dashboard_kpi').select('*').limit(1),
    sb.from('v_kpi_techniques_ferme').select('*').limit(1),
    sb.from('v_kpi_ic_ferme').select('*').limit(1),
    sb.from('mv_kpi_bande').select('*').order('bande_nom'),
    sb.from('v_score_truie').select('*').order('score_global', { ascending: false }).limit(5),
    sb
      .from('v_fertilite_truies')
      .select('*')
      .eq('suggestion_reforme', true)
      .order('taux_reussite_pct', { ascending: true })
      .limit(5),
  ])

  const dash = (dashKpi?.[0] ?? null) as VDashboardKpi | null
  const techFerme = (kpiTechFerme?.[0] ?? null) as VKpiTechniquesFerme | null
  const icFerme = (kpiIc?.[0] ?? null) as VKpiIcFerme | null
  const bandesList = (bandes ?? []) as MvKpiBande[]
  const top5 = (topTruies ?? []) as VScoreTruie[]
  const reforme5 = (truiesReforme ?? []) as VFertiliteTruie[]

  // Calcul productivité numérique : portee_moyenne_12m × nb_portees_actives / nb_truies
  const productiviteNumerique: number | null =
    techFerme &&
    techFerme.portee_moyenne_12m &&
    techFerme.nb_portees_actives > 0 &&
    techFerme.nb_truies > 0
      ? (techFerme.portee_moyenne_12m * techFerme.nb_portees_actives) / techFerme.nb_truies
      : null

  const toneProdu = toneProductivite(productiviteNumerique)
  const toneIcVal = toneIc(icFerme?.ic ?? null)

  // Registre de chiffres de support (voix "ligne de registre", pas card)
  const support = [
    {
      label: 'Truies actives',
      value: dash?.truies_actives != null ? String(dash.truies_actives) : '—',
      note: 'Cheptel reproducteur en service',
      color: 'var(--sf-ink)',
    },
    {
      label: 'IC ferme · 30 j',
      value: fmtNum(icFerme?.ic, 2),
      note: `${toneLabel(toneIcVal)} · cible 2,6–2,8`,
      color: getToneColor(toneIcVal),
    },
    {
      label: 'Alertes actives',
      value: String(dash?.alertes_actives ?? 0),
      note: dash?.alertes_actives ? 'À traiter en priorité' : 'Aucune alerte ouverte',
      color: dash?.alertes_actives ? 'var(--sf-danger-ink)' : 'var(--sf-muted)',
    },
  ]

  return (
    <div className="pb-8" style={{ fontFamily: bodyFont }}>
      {/* ===== EN-TÊTE DE PLANCHE — filet primary en tête (langage Stat-Led) ===== */}
      <header
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between pt-1 pb-5"
        style={{ borderTop: '3px solid var(--sf-primary)' }}
      >
        <div>
          <div className="mb-2" style={plancheLabel}>
            Pilotage IFIP · {today.toUpperCase()} · {dash?.ferme_nom?.toUpperCase() ?? 'FERME'}
          </div>
          <h1
            className="text-3xl sm:text-4xl font-black uppercase tracking-[0.01em] text-[var(--sf-ink)]"
            style={{ fontFamily: displayFont, lineHeight: 1.05 }}
          >
            Indicateurs zootechniques
          </h1>
          <p className="mt-2 max-w-[58ch] text-sm text-[var(--sf-muted)]">
            Performance reproductive et croissance, qualifiée par les référentiels IFIP.
          </p>
        </div>

        <div className="lg:max-w-md w-full lg:text-right">
          <div className="mb-2" style={plancheLabel}>
            Registre mensuel
          </div>
          <BoutonPdfMensuel fermeId={fermeId} />
        </div>
      </header>

      {/* ===== BANDEAU-FIGURE : la productivité numérique structure la page ===== */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr]">
        {/* Figure dominante */}
        <div
          className="py-8 lg:py-10 lg:pr-10"
          style={{ borderBottom: '1px solid var(--sf-line)' }}
        >
          <div style={plancheLabel}>Productivité numérique</div>
          <div className="mt-3 flex items-baseline gap-2">
            <FigureTick
              value={productiviteNumerique}
              digits={1}
              className="font-black tabular-nums leading-none"
              style={{
                fontFamily: displayFont,
                color: getToneColor(toneProdu),
                fontSize: 'clamp(4.5rem, 14vw, 7rem)',
              }}
            />
            <span className="text-base text-[var(--sf-muted)]">porcelets / truie / an</span>
          </div>

          {/* Qualificateur sous la figure — la voix Stat-Led */}
          <p className="mt-3 max-w-[52ch] text-sm text-[var(--sf-ink-secondary)]">
            {toneLabel(toneProdu)} face au référentiel IFIP{' '}
            <span className="font-semibold tabular-nums">≥ 22</span>. Calcul : portée moyenne 12 mois
            × portées actives ÷ nombre de truies.
          </p>

          {techFerme && (
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {[
                ['Truies', String(techFerme.nb_truies)],
                ['Portée moyenne', fmtNum(techFerme.portee_moyenne_12m, 1)],
                ['Portées actives', String(techFerme.nb_portees_actives)],
              ].map(([label, val]) => (
                <div key={label} className="flex flex-col">
                  <dt style={plancheLabel}>{label}</dt>
                  <dd
                    className="mt-1 text-lg font-bold tabular-nums text-[var(--sf-ink)]"
                    style={{ fontFamily: displayFont }}
                  >
                    {val}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Registre des chiffres de support — lignes hairline, pas de cards */}
        <div className="lg:pl-10 lg:border-l lg:border-[var(--sf-line)]">
          {support.map((s, i) => (
            <div
              key={s.label}
              className="flex items-baseline justify-between gap-4 py-4"
              style={{
                borderBottom: '1px solid var(--sf-line)',
                borderTop: i === 0 ? '1px solid var(--sf-line)' : undefined,
              }}
            >
              <div>
                <div style={plancheLabel}>{s.label}</div>
                <div className="mt-0.5 text-xs text-[var(--sf-muted)]">{s.note}</div>
              </div>
              <div
                className="text-3xl font-black tabular-nums leading-none"
                style={{ fontFamily: displayFont, color: s.color }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PLANCHE — PERFORMANCE PAR BANDE ===== */}
      <section className="pt-9">
        <div className="flex items-end justify-between gap-4 pb-3">
          <div>
            <div style={plancheLabel}>Croissance · {bandesList.length} bandes</div>
            <h2
              className="mt-1 text-xl uppercase tracking-[0.01em] text-[var(--sf-ink)]"
              style={{ fontFamily: displayFont }}
            >
              Performance par bande
            </h2>
          </div>
          <Link
            href="/performances/croissance"
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap py-2 text-sm font-semibold text-[var(--sf-primary)] transition-colors duration-150 hover:text-[var(--sf-primary-deep)] [min-height:var(--sf-touch-min,44px)]"
            style={{ fontFamily: displayFont, letterSpacing: '0.04em' }}
          >
            Détail croissance →
          </Link>
        </div>

        {bandesList.length === 0 ? (
          <p
            className="py-8 text-sm text-[var(--sf-muted)]"
            style={{ borderTop: '1px solid var(--sf-line)' }}
          >
            Aucune bande enregistrée. Créez une bande depuis Cheptel → Bandes pour suivre GMQ, IC et
            mortalité par lot.
          </p>
        ) : (
          <ResponsiveTable
            data={bandesList}
            getRowKey={(b) => b.bande_id}
            columns={[
              {
                key: 'bande_nom',
                label: 'Bande',
                primary: true,
                className: 'font-bold text-[var(--sf-ink)]',
              },
              {
                key: 'effectif_actuel',
                label: 'Effectif',
                className: 'font-mono tabular-nums',
              },
              {
                key: 'gmq_moyen',
                label: 'GMQ (g/j)',
                render: (v) => (v !== null ? Math.round(Number(v)).toLocaleString('fr-FR') : '—'),
                className: 'font-mono tabular-nums font-semibold',
              },
              {
                key: 'ic',
                label: 'IC',
                render: (v) => fmtNum(v, 2),
                className: 'font-mono tabular-nums',
              },
              {
                key: 'taux_mortalite',
                label: 'Mortalité (%)',
                render: (v) => fmtPct(v, 1),
                className: 'font-mono tabular-nums',
              },
              {
                key: 'statut',
                label: 'Statut',
                render: (v) => <Badge variant="outline">{v ?? 'N/A'}</Badge>,
              },
            ]}
          />
        )}
      </section>

      {/* ===== DEUX PLANCHES TRUIES — registres en lignes hairline ===== */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-9 pt-9 md:grid-cols-2">
        {/* Top 5 truies — score IFIP */}
        <section>
          <div className="pb-3" style={{ borderBottom: '1px solid var(--sf-line)' }}>
            <div style={plancheLabel}>Reproduction · score IFIP</div>
            <h2
              className="mt-1 text-xl uppercase tracking-[0.01em] text-[var(--sf-ink)]"
              style={{ fontFamily: displayFont }}
            >
              Top 5 truies
            </h2>
          </div>

          {top5.length === 0 ? (
            <p className="py-6 text-sm text-[var(--sf-muted)]">
              Aucune truie avec portée complète. Le classement s’active dès la première mise bas suivie
              d’un sevrage.
            </p>
          ) : (
            <ol>
              {top5.map((t, idx) => (
                <li
                  key={t.truie_id}
                  className="flex items-center justify-between gap-4 py-4"
                  style={{ borderBottom: '1px solid var(--sf-line)' }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="w-7 text-2xl font-black tabular-nums leading-none"
                      style={{
                        fontFamily: displayFont,
                        color: idx === 0 ? 'var(--sf-primary)' : 'var(--sf-subtle)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-mono text-sm font-bold text-[var(--sf-ink)] tabular-nums">
                        {t.tag}
                        {t.nom ? (
                          <span className="ml-2 font-normal text-[var(--sf-muted)]">{t.nom}</span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--sf-muted)] tabular-nums">
                        {t.nb_portees} portées · moyenne {fmtNum(t.portee_moyenne, 1)}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={t.classe === 'A' ? 'default' : t.classe === 'B' ? 'secondary' : 'outline'}
                  >
                    Classe {t.classe}
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* À surveiller — réforme suggérée */}
        <section>
          <div className="pb-3" style={{ borderBottom: '1px solid var(--sf-danger-border)' }}>
            <div style={{ ...plancheLabel, color: 'var(--sf-danger-ink)' }}>
              Reproduction · réforme suggérée
            </div>
            <h2
              className="mt-1 text-xl uppercase tracking-[0.01em] text-[var(--sf-danger-ink)]"
              style={{ fontFamily: displayFont }}
            >
              À surveiller
            </h2>
          </div>

          {reforme5.length === 0 ? (
            <p className="py-6 text-sm text-[var(--sf-muted)]">
              Aucune truie signalée. Critères : taux de réussite &lt; 70 %, ≥ 2 retours, ≥ 8 mises bas
              ou portée moyenne &lt; 8.
            </p>
          ) : (
            <ul>
              {reforme5.map((t) => (
                <li
                  key={t.truie_id}
                  className="flex items-start justify-between gap-4 py-4"
                  style={{ borderBottom: '1px solid var(--sf-line)' }}
                >
                  <div>
                    <div className="font-mono text-sm font-bold text-[var(--sf-ink)] tabular-nums">
                      {t.tag}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--sf-muted)] tabular-nums">
                      {t.nb_saillies} saillies · {t.nb_positifs} OK · {t.nb_retours} retours
                    </div>
                    <div className="text-xs text-[var(--sf-muted)] tabular-nums">
                      Réussite {fmtPct(t.taux_reussite_pct, 0)} · {t.nb_mb} mises bas · moyenne{' '}
                      {fmtNum(t.moy_nes_vivants, 1)} nés vivants
                    </div>
                  </div>
                  <Badge variant="danger">Sortir</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
