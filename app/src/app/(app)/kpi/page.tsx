import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getFermeId } from '@/lib/supabase/ferme-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PiggyBank, TrendingUp, Users, Gauge, AlertTriangle, ArrowRight } from 'lucide-react'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import Link from 'next/link'
import { BoutonPdfMensuel } from './_bouton-pdf-mensuel'

export const metadata: Metadata = {
  title: 'Indicateurs zootechniques — Smart Farm',
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
      return 'var(--sf-accent-deep, #B45309)'
    case 'bad':
      return 'var(--sf-danger-ink, #7A2A1F)'
    default:
      return 'var(--sf-muted)'
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

// Eyebrow styles
const eyebrowStyle: React.CSSProperties = {
  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--sf-muted)',
}

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

  return (
    <div className="space-y-6 pb-8">
      {/* ===== HEADER : EYEBROW + H1 + BOUTON PDF ===== */}
      <div>
        <div className="mb-2" style={eyebrowStyle}>
          PILOTAGE · {today.toUpperCase()} · {dash?.ferme_nom?.toUpperCase() ?? 'FERME'}
        </div>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1
              className="text-4xl font-black uppercase flex items-center gap-3 tracking-[0.02em] text-[var(--sf-ink)]"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              <PiggyBank className="h-8 w-8 text-[var(--sf-primary)]" />
              Indicateurs zootechniques
            </h1>
            <p
              className="text-sm text-[var(--sf-muted)] mt-1"
              style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
            >
              Performance IFIP, productivité numérique et classement truies
            </p>
          </div>

          {/* Encart Exports PDF */}
          <Card className="border-[var(--sf-line)] bg-[var(--sf-surface-1)] lg:w-auto w-full">
            <CardContent className="p-4">
              <div className="mb-2" style={eyebrowStyle}>
                EXPORTS
              </div>
              <BoutonPdfMensuel fermeId={fermeId} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== GRID ASYMÉTRIQUE : KPI HÉRO + 3 STACK ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI HÉRO : Productivité numérique (2x en desktop, span 2 colonnes) */}
        <Card className="md:col-span-2 border-[var(--sf-line)] shadow-[var(--sf-stamp-ring)]">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div style={eyebrowStyle} className="mb-2">
                  KPI HÉRO — PRODUCTIVITÉ NUMÉRIQUE
                </div>
                <div
                  className="text-6xl font-black tabular-nums"
                  style={{
                    fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                    color: getToneColor(toneProdu),
                  }}
                >
                  {productiviteNumerique !== null ? fmtNum(productiviteNumerique, 1) : '—'}
                </div>
                <div className="mt-2 text-sm text-[var(--sf-muted)]">
                  Porcelets sevrés / truie / an
                </div>
                <div className="mt-1 text-xs italic text-[var(--sf-muted)]">
                  Cible IFIP ≥ 22 · Calcul : portée moyenne 12m × portées actives / nb truies
                </div>
                {techFerme && (
                  <div className="mt-3 flex gap-4 text-xs text-[var(--sf-muted)]">
                    <span>
                      <strong>{techFerme.nb_truies}</strong> truies
                    </span>
                    <span>
                      <strong>{fmtNum(techFerme.portee_moyenne_12m, 1)}</strong> portée moy.
                    </span>
                    <span>
                      <strong>{techFerme.nb_portees_actives}</strong> portées actives
                    </span>
                  </div>
                )}
              </div>
              <TrendingUp className="h-12 w-12 text-[var(--sf-primary)] opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* STACK 3 KPIs */}
        <div className="flex flex-col gap-4">
          {/* Truies actives */}
          <Card className="border-[var(--sf-line)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div style={eyebrowStyle}>TRUIES ACTIVES</div>
                  <div
                    className="text-3xl font-black tabular-nums text-[var(--sf-ink)] mt-1"
                    style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                  >
                    {dash?.truies_actives ?? '—'}
                  </div>
                </div>
                <Users className="h-8 w-8 text-[var(--sf-primary)]" />
              </div>
            </CardContent>
          </Card>

          {/* IC ferme */}
          <Card className="border-[var(--sf-line)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div style={eyebrowStyle}>IC FERME (30j)</div>
                  <div
                    className="text-3xl font-black tabular-nums mt-1"
                    style={{
                      fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                      color: getToneColor(toneIcVal),
                    }}
                  >
                    {fmtNum(icFerme?.ic, 2)}
                  </div>
                  <div className="text-xs text-[var(--sf-muted)] mt-1">cible 2,6–2,8</div>
                </div>
                <Gauge className="h-8 w-8 text-[var(--sf-accent-deep)]" />
              </div>
            </CardContent>
          </Card>

          {/* Alertes actives */}
          <Card className="border-[var(--sf-line)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div style={eyebrowStyle}>ALERTES ACTIVES</div>
                  <div
                    className="text-3xl font-black tabular-nums text-[var(--sf-danger-ink)] mt-1"
                    style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                  >
                    {dash?.alertes_actives ?? 0}
                  </div>
                </div>
                <AlertTriangle className="h-8 w-8 text-[var(--sf-danger-ink)]" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== SECTION PERFORMANCE PAR BANDE ===== */}
      <Card className="border-[var(--sf-line)]">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-xl uppercase tracking-wide text-[var(--sf-ink)]"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              Performance par bande
            </h2>
            <Link
              href="/performances/croissance"
              className="text-sm text-[var(--sf-primary)] hover:underline flex items-center gap-1"
            >
              Détail croissance <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {bandesList.length === 0 ? (
            <p className="text-center text-sm text-[var(--sf-muted)] py-6">
              Aucune bande enregistrée. Créez une bande depuis Cheptel → Bandes.
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
        </CardContent>
      </Card>

      {/* ===== TOP 5 TRUIES + À SURVEILLER ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 truies */}
        <Card className="border-[var(--sf-line)]">
          <CardContent className="p-6">
            <h2
              className="text-xl uppercase tracking-wide text-[var(--sf-ink)] mb-4"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              Top 5 truies · Score IFIP
            </h2>
            {top5.length === 0 ? (
              <p className="text-sm text-[var(--sf-muted)] py-4">
                Aucune truie avec portée complète. Le classement s'active dès la première mise bas + sevrage.
              </p>
            ) : (
              <div className="space-y-3">
                {top5.map((t, idx) => (
                  <div
                    key={t.truie_id}
                    className="flex items-center justify-between p-3 rounded border border-[var(--sf-line)] bg-[var(--sf-surface-1)] hover:bg-[var(--sf-surface-2)] transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
                        style={{
                          background:
                            idx === 0
                              ? 'var(--sf-primary)'
                              : idx === 1
                                ? 'var(--sf-accent-deep)'
                                : 'var(--sf-surface-2)',
                          color: idx < 2 ? 'white' : 'var(--sf-muted)',
                          fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-mono font-bold text-sm">{t.tag}</div>
                        <div className="text-xs text-[var(--sf-muted)]">
                          {t.nb_portees} portées · moy. {fmtNum(t.portee_moyenne, 1)}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={t.classe === 'A' ? 'default' : t.classe === 'B' ? 'secondary' : 'outline'}
                    >
                      Classe {t.classe}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* À surveiller (suggestion réforme) */}
        <Card className="border-[var(--sf-line)]">
          <CardContent className="p-6">
            <h2
              className="text-xl uppercase tracking-wide text-[var(--sf-danger-ink)] mb-4"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              À surveiller · Réforme suggérée
            </h2>
            {reforme5.length === 0 ? (
              <p className="text-sm text-[var(--sf-muted)] py-4">
                Aucune truie signalée. Critères : taux réussite &lt;70%, ≥2 retours, ≥8 MB ou portée moy. &lt;8.
              </p>
            ) : (
              <div className="space-y-3">
                {reforme5.map((t) => (
                  <div
                    key={t.truie_id}
                    className="flex items-center justify-between p-3 rounded border border-[var(--sf-danger-border)] bg-[var(--sf-danger-bg)] hover:bg-[var(--sf-surface-2)] transition"
                  >
                    <div>
                      <div className="font-mono font-bold text-sm">{t.tag}</div>
                      <div className="text-xs text-[var(--sf-muted)]">
                        {t.nb_saillies} saillies · {t.nb_positifs} OK · {t.nb_retours} retours
                      </div>
                      <div className="text-xs text-[var(--sf-muted)]">
                        Taux réussite : {fmtPct(t.taux_reussite_pct, 0)} · {t.nb_mb} MB · moy.{' '}
                        {fmtNum(t.moy_nes_vivants, 1)} nés viv.
                      </div>
                    </div>
                    <Badge variant="danger">Sortir</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
