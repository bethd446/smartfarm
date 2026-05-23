import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Award,
  Zap,
  Target,
  Activity,
  Wallet,
  Skull,
  Gauge,
  Clock,
  Coins,
  Scale,
  Beef,
} from 'lucide-react'
import { RefreshKpiButton } from './refresh-button'
import { ExportPdfButton } from './export-pdf-button'
import { TERRAIN } from '@/lib/terrain-labels'
import { EmptyState } from '@/components/ui/empty-state'
import {
  KpiTechCard,
  toneIssf,
  toneProductivite,
  toneTmm,
  toneNesVivants,
} from '@/components/kpi/kpi-tech-card'
import { KpiTechRanking } from './_kpi-tech-ranking'

export const metadata: Metadata = {
  title: 'Performances — Smart Farm',
}

type TruieKpi = {
  truie_id: string
  tag: string
  nb_saillies: number
  nb_portees: number
  total_nes_vivants: number
  total_sevres: number
  prolificite_moyenne: number | string
  rang_portee_actuel: number | null
  psta: number | null
  nji: number | null
  reforme_recommandee: boolean
}

type BandeKpi = {
  bande_id: string
  bande_nom: string
  statut: string
  effectif_actuel: number
  effectif: number
  conso_kg_total: number
  cout_alim_total: number
  mortalites: number
  poids_moyen_kg: number | null
  nb_pesees: number | null
  gmq_g_par_jour: number | null
  ic: number | null
  cout_alim_par_kg: number | null
}

type FermeKpi = {
  ferme_id: string
  ferme_nom: string
  nb_truies_actives: number
  nb_verrats_actifs: number
  nb_engraissement: number
  nb_bandes_actives: number
  total_sevres_30j: number
  mortalite_taux_30j: number | null
  psta_moyen_ferme: number | null
  ic_moyen_ferme: number | null
  cout_alim_30j: number | null
  valeur_stock_total: number | null
}

// V2-E : KPI techniques métier
type KpiTechFerme = {
  ferme_id: string
  truies_actives: number
  truies_avec_mb: number
  nes_totaux_par_portee_moyen: number | null
  nes_vivants_par_portee_moyen: number | null
  sevres_par_portee_moyen: number | null
  issf_moyen: number | null
  tmm_moyen_pct: number | null
  productivite_moyenne: number | null
  pertes_lactation_moyenne_pct: number | null
}

type KpiTechTruie = {
  truie_id: string
  tag: string
  nom: string | null
  ferme_id: string
  statut: string
  nb_mises_bas: number
  nb_sevrages: number
  nb_cycles_issf: number
  nes_totaux_moyen: number | null
  nes_vivants_moyen: number | null
  sevres_moyen: number | null
  issf_jours: number | null
  tmm_pct: number | null
  productivite_numerique: number | null
  pertes_lactation_pct: number | null
}

// V2-D4 : KPI Productivité IFIP (MCA + IC + GMQ par stade)
type KpiMcaFerme = {
  ferme_id: string
  periode_debut: string | null
  periode_fin: string | null
  conso_total_kg: number | string | null
  cout_alim_total_xof: number | string | null
  croit_total_kg: number | string | null
  mca_xof_par_kg: number | string | null
  prix_aliment_moyen_xof_kg: number | string | null
}

type KpiIcFerme = {
  ferme_id: string
  ic: number | string | null
  conso_kg: number | string | null
  croit_kg: number | string | null
  periode_debut: string | null
  periode_fin: string | null
}

type KpiGmqStade = {
  ferme_id: string
  bande_id: string
  stade: string
  gmq_g_par_jour: number | string | null
  nb_pesees: number | null
  age_min_j: number | null
  age_max_j: number | null
}

// Cibles IFIP (brief D4-C)
// MCA : <800 XOF/kg croît = vert, 800-1200 = gold, >1200 = rouge
function toneMca(v: number | null | undefined): 'good' | 'warn' | 'bad' | 'muted' {
  if (v === null || v === undefined) return 'muted'
  const n = Number(v)
  if (!Number.isFinite(n)) return 'muted'
  if (n < 800) return 'good'
  if (n <= 1200) return 'warn'
  return 'bad'
}
// IC ferme : 2.6-2.8 = vert, 2.8-3.2 = gold, >3.2 ou <2.6 = rouge
function toneIcFerme(v: number | null | undefined): 'good' | 'warn' | 'bad' | 'muted' {
  if (v === null || v === undefined) return 'muted'
  const n = Number(v)
  if (!Number.isFinite(n)) return 'muted'
  if (n >= 2.6 && n <= 2.8) return 'good'
  if (n > 2.8 && n <= 3.2) return 'warn'
  return 'bad'
}
// GMQ par stade (g/j) — cibles IFIP différenciées
function toneGmqStade(stade: string, v: number | null | undefined): 'good' | 'warn' | 'bad' | 'muted' {
  if (v === null || v === undefined) return 'muted'
  const n = Number(v)
  if (!Number.isFinite(n)) return 'muted'
  const s = stade.toLowerCase()
  if (s.startsWith('porcelet')) {
    if (n >= 200) return 'good'
    if (n >= 150) return 'warn'
    return 'bad'
  }
  if (s.startsWith('sevrage')) {
    if (n >= 400) return 'good'
    if (n >= 300) return 'warn'
    return 'bad'
  }
  if (s.startsWith('engraissement')) {
    if (n >= 750) return 'good'
    if (n >= 600) return 'warn'
    return 'bad'
  }
  return 'muted'
}

// Cibles affichées en pied de tableau
const CIBLE_GMQ: Record<string, string> = {
  porcelet: 'cible ≥ 200 g/j',
  sevrage: 'cible ≥ 400 g/j',
  engraissement: 'cible ≥ 750 g/j',
}
function libelleStade(s: string): string {
  const k = s.toLowerCase()
  if (k.startsWith('porcelet')) return 'Porcelet (naissance → sevrage)'
  if (k.startsWith('sevrage')) return 'Sevrage (post-sevrage)'
  if (k.startsWith('engraissement')) return 'Engraissement (croissance-finition)'
  return s
}
function cibleStade(s: string): string {
  const k = s.toLowerCase()
  if (k.startsWith('porcelet')) return CIBLE_GMQ.porcelet
  if (k.startsWith('sevrage')) return CIBLE_GMQ.sevrage
  if (k.startsWith('engraissement')) return CIBLE_GMQ.engraissement
  return '—'
}

function fmtNum(n: number | string | null | undefined, digits = 2): string {
  if (n === null || n === undefined || n === '') return '—'
  const v = typeof n === 'string' ? Number(n) : n
  if (!Number.isFinite(v)) return '—'
  return v.toFixed(digits)
}

function fmtFcfa(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (!Number.isFinite(n)) return '—'
  return `${Math.round(n).toLocaleString('fr-FR')} F`
}

// Eyebrow inline réutilisé : étiquette uppercase Big Shoulders 11 px
const eyebrowStyle: React.CSSProperties = {
  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

// Sous-titre terrain : italic 13 px muted (eyebrow "soft")
const terrainSubStyle: React.CSSProperties = {
  fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)",
  fontSize: '13px',
  fontStyle: 'italic',
  color: 'var(--sf-muted)',
}

export default async function KpiPage() {
  const sb = await createClient()
  const [
    { data: truies },
    { data: bandes },
    { data: fermes },
    { data: kpiTechFerme },
    { data: kpiTechTruies },
    { data: kpiMca },
    { data: kpiIc },
    { data: kpiGmq },
  ] = await Promise.all([
    sb.from('mv_kpi_truie').select('*').order('tag'),
    sb.from('mv_kpi_bande').select('*').order('bande_nom'),
    sb.from('mv_kpi_ferme').select('*').order('ferme_nom'),
    sb.from('v_kpi_techniques_ferme').select('*').limit(1),
    sb.from('v_kpi_techniques_truie').select('*'),
    sb.from('v_kpi_mca_ferme').select('*').limit(1),
    sb.from('v_kpi_ic_ferme').select('*').limit(1),
    sb.from('v_kpi_gmq_par_stade').select('*'),
  ])

  const tList = (truies ?? []) as TruieKpi[]
  const bList = (bandes ?? []) as BandeKpi[]
  const fList = (fermes ?? []) as FermeKpi[]
  const kpiFerme = ((kpiTechFerme ?? [])[0] ?? null) as KpiTechFerme | null
  const techTruies = (kpiTechTruies ?? []) as KpiTechTruie[]
  const mcaRow = ((kpiMca ?? [])[0] ?? null) as KpiMcaFerme | null
  const icRow = ((kpiIc ?? [])[0] ?? null) as KpiIcFerme | null
  const gmqList = (kpiGmq ?? []) as KpiGmqStade[]

  // Agrégation GMQ par stade (moyenne pondérée par nb_pesees si plusieurs bandes)
  const gmqStades = ['porcelet', 'sevrage', 'engraissement'].map(stade => {
    const rows = gmqList.filter(g => (g.stade ?? '').toLowerCase().startsWith(stade))
    if (rows.length === 0) {
      return { stade, gmq: null as number | null, nb_pesees: 0, nb_bandes: 0 }
    }
    let totalPesees = 0
    let somme = 0
    for (const r of rows) {
      const v = r.gmq_g_par_jour === null || r.gmq_g_par_jour === undefined ? NaN : Number(r.gmq_g_par_jour)
      const p = Number(r.nb_pesees ?? 0)
      if (Number.isFinite(v) && p > 0) {
        somme += v * p
        totalPesees += p
      }
    }
    return {
      stade,
      gmq: totalPesees > 0 ? somme / totalPesees : null,
      nb_pesees: totalPesees,
      nb_bandes: rows.length,
    }
  })

  // Agrégats globaux (across fermes) — coerce en Number et filtre NaN/null
  // pour éviter le bug "NaN" si Postgres renvoie un numeric en string.
  const psta_global = (() => {
    const vals = fList
      .map((f) => Number(f.psta_moyen_ferme))
      .filter((v) => Number.isFinite(v))
    if (!vals.length) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  })()
  const ic_global = (() => {
    const vals = fList
      .map((f) => Number(f.ic_moyen_ferme))
      .filter((v) => Number.isFinite(v))
    if (!vals.length) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  })()
  const mort_global = (() => {
    const vals = fList
      .map((f) => Number(f.mortalite_taux_30j))
      .filter((v) => Number.isFinite(v))
    if (!vals.length) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  })()
  const cout_global = fList.reduce((a, f) => {
    const v = Number(f.cout_alim_30j)
    return a + (Number.isFinite(v) ? v : 0)
  }, 0)

  // Anciens agrégats (cartes legacy conservées en bas)
  const totalProlificite = tList.reduce((a, t) => a + Number(t.prolificite_moyenne ?? 0), 0)
  const avgProlif = tList.length ? (totalProlificite / tList.length).toFixed(2) : '—'
  const totalSevres = tList.reduce((a, t) => a + Number(t.total_sevres ?? 0), 0)
  const totalNV = tList.reduce((a, t) => a + Number(t.total_nes_vivants ?? 0), 0)
  const tauxSurvie = totalNV > 0 ? ((totalSevres / totalNV) * 100).toFixed(1) : '—'

  return (
    <div className="space-y-6">
      {/* === Header de page === */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-black uppercase flex items-center gap-3 tracking-[0.02em] text-[var(--sf-ink)]"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            <TrendingUp className="h-8 w-8 text-[var(--sf-primary)]" />
            Performances
          </h1>
          <p
            className="text-sm text-[var(--sf-muted)] mt-1"
            style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
          >
            Performances de l'élevage
          </p>
        </div>
        <ExportPdfButton />
        <RefreshKpiButton />
      </div>

      {/* === V2-E : KPI techniques métier — cards + classement === */}
      <Card>
        <CardContent>
          <h2 className="eyebrow text-[var(--sf-muted)] mb-3 font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)]" style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}>
            KPI techniques métier
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiTechCard
              icon={Clock}
              label="ISSF moyen"
              sub="sevrage → saillie fécondante"
              value={kpiFerme?.issf_moyen}
              unit="j"
              target="cible 5-7 j"
              tone={toneIssf(kpiFerme?.issf_moyen)}
              digits={1}
            />
            <KpiTechCard
              icon={Zap}
              label="Productivité num."
              sub="porc. sevrés / truie / an"
              value={kpiFerme?.productivite_moyenne}
              unit=""
              target="cible ≥ 22"
              tone={toneProductivite(kpiFerme?.productivite_moyenne)}
              digits={1}
            />
            <KpiTechCard
              icon={Skull}
              label="TMM"
              sub="mortalité maternité"
              value={kpiFerme?.tmm_moyen_pct}
              unit="%"
              target="cible ≤ 8 %"
              tone={toneTmm(kpiFerme?.tmm_moyen_pct)}
              digits={1}
            />
            <KpiTechCard
              icon={Target}
              label="Nés vivants / portée"
              sub="moyenne ferme"
              value={kpiFerme?.nes_vivants_par_portee_moyen}
              unit=""
              target="cible ≥ 12"
              tone={toneNesVivants(kpiFerme?.nes_vivants_par_portee_moyen)}
              digits={1}
            />
          </div>

          {/* Classement truies — pattern carnet */}
          <div className="mt-6">
            <h3 className="eyebrow text-[var(--sf-muted)] mb-2" style={eyebrowStyle}>
              Classement par truie (ISSF · Productivité · TMM)
            </h3>
            {techTruies.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Aucune truie enregistrée"
                description="Dès que vous enregistrerez des mises-bas et sevrages, ce classement s'activera."
              />
            ) : (
              <KpiTechRanking rows={techTruies} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* === V2-D4 : Productivité IFIP (MCA + IC + GMQ par stade) === */}
      <Card>
        <CardContent>
          <h2
            className="eyebrow text-[var(--sf-muted)] mb-1 font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)]"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            Productivité IFIP
          </h2>
          <p className="mb-4" style={terrainSubStyle}>
            Marge sur coût aliment, indice de consommation ferme et gain moyen quotidien par stade — référentiel IFIP.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MCA — Marge sur coût aliment */}
            <KpiTechCard
              icon={Coins}
              label="MCA — coût aliment / kg croît"
              sub="francs CFA dépensés par kilo de croît"
              value={mcaRow?.mca_xof_par_kg ?? null}
              unit=" XOF/kg"
              target="cible IFIP < 800 · alerte > 1200"
              tone={toneMca(mcaRow?.mca_xof_par_kg === null || mcaRow?.mca_xof_par_kg === undefined ? null : Number(mcaRow?.mca_xof_par_kg))}
              digits={0}
            />
            {/* IC ferme */}
            <KpiTechCard
              icon={Scale}
              label="IC ferme — indice de consommation"
              sub="kg d'aliment ingérés par kg de croît"
              value={icRow?.ic ?? null}
              unit=""
              target="cible IFIP 2,6–2,8 · alerte > 3,2"
              tone={toneIcFerme(icRow?.ic === null || icRow?.ic === undefined ? null : Number(icRow?.ic))}
              digits={2}
            />
          </div>

          {/* Tableau GMQ par stade */}
          <div className="mt-6">
            <h3 className="eyebrow text-[var(--sf-muted)] mb-2" style={eyebrowStyle}>
              GMQ par stade — gain moyen quotidien (g/jour)
            </h3>
            {gmqList.length === 0 ? (
              <EmptyState
                icon={Beef}
                title="Données insuffisantes — seed à venir"
                description="Aucune pesée enregistrée sur la période. Le GMQ par stade s'activera dès la saisie de deux pesées espacées sur une même bande."
              />
            ) : (
              <div
                className="overflow-x-auto"
                style={{
                  borderTop: 'var(--sf-rule-top, 4px solid var(--sf-primary, #2D4A1F))',
                  borderBottom: 'var(--sf-rule-bottom, 1px solid var(--sf-border, rgba(0,0,0,0.18)))',
                  borderLeft: 'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
                  borderRight: 'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
                  background: 'var(--sf-surface-1, #FFFFFF)',
                }}
              >
                <table className="w-full text-sm">
                  <thead
                    className="border-b border-[var(--sf-line)] text-left text-[var(--sf-muted)]"
                    style={eyebrowStyle}
                  >
                    <tr>
                      <th className="py-3 px-4 font-semibold">Stade</th>
                      <th className="py-3 px-4 font-semibold">GMQ (g/j)</th>
                      <th className="py-3 px-4 font-semibold">Cible IFIP</th>
                      <th className="py-3 px-4 font-semibold">Bandes suivies</th>
                      <th className="py-3 px-4 font-semibold">Pesées</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gmqStades.map(g => {
                      const tone = toneGmqStade(g.stade, g.gmq)
                      const color =
                        tone === 'good'
                          ? 'var(--sf-primary)'
                          : tone === 'warn'
                          ? 'var(--sf-accent-deep, #B45309)'
                          : tone === 'bad'
                          ? 'var(--sf-danger-ink, #7A2A1F)'
                          : 'var(--sf-muted)'
                      return (
                        <tr
                          key={g.stade}
                          className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40"
                          title={`Cible IFIP ${g.stade} — ${cibleStade(g.stade)}`}
                        >
                          <td className="py-3 px-4 font-semibold text-[var(--sf-ink)]">
                            {libelleStade(g.stade)}
                          </td>
                          <td
                            className="py-3 px-4 font-mono tabular-nums font-bold"
                            style={{ color }}
                          >
                            {g.gmq !== null ? Math.round(g.gmq).toLocaleString('fr-FR') : '—'}
                          </td>
                          <td className="py-3 px-4 text-[var(--sf-muted)]">{cibleStade(g.stade)}</td>
                          <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">
                            {g.nb_bandes}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">
                            {g.nb_pesees}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!mcaRow && !icRow && gmqList.length === 0 && (
            <p className="mt-4 text-xs italic text-[var(--sf-muted)]">
              Période d'observation : 30 derniers jours. Les indicateurs IFIP exigent des pesées et consommations
              effectivement enregistrées sur la bande — sans saisie terrain, ces valeurs restent en attente.
            </p>
          )}
        </CardContent>
      </Card>

      {/* === Performance ferme — 30 derniers jours === */}
      <Card>
        <CardContent>
          <h2
            className="eyebrow text-[var(--sf-muted)] mb-3 font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)]"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            Performance ferme — 30 derniers jours
          </h2>

          {/* 4 cards KPI : aplats sf-surface-2 / sf-warm (plus de gradient) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* PSTA */}
            <div
              className="p-5 border border-[var(--sf-line)]"
              style={{ background: 'var(--sf-surface-2)' }}
            >
              <Target className="h-5 w-5 text-[var(--sf-primary)] mb-2" />
              <div className="text-2xl font-bold tabular-nums text-[var(--sf-ink)]">
                {Number.isFinite(psta_global) ? (psta_global as number).toFixed(2) : '—'}
              </div>
              <div className="mt-1" style={eyebrowStyle}>{TERRAIN.psta.court}</div>
              <div className="mt-1" style={terrainSubStyle}>
                {TERRAIN.psta.terrain} · cible &gt; 25
              </div>
            </div>

            {/* IC */}
            <div
              className="p-5 border border-[var(--sf-line)]"
              style={{ background: 'var(--sf-warm)' }}
            >
              <Gauge className="h-5 w-5 text-[var(--sf-accent-deep)] mb-2" />
              <div className="text-2xl font-bold tabular-nums text-[var(--sf-ink)]">
                {Number.isFinite(ic_global) ? (ic_global as number).toFixed(2) : '—'}
              </div>
              <div className="mt-1" style={eyebrowStyle}>IC · aliment par kilo</div>
              <div className="mt-1" style={terrainSubStyle}>
                {TERRAIN.ic.terrain}
              </div>
            </div>

            {/* Pertes */}
            <div
              className="p-5 border border-[var(--sf-line)]"
              style={{ background: 'var(--sf-surface-2)' }}
            >
              <Skull className="h-5 w-5 text-[var(--sf-danger-ink,#7A2A1F)] mb-2" />
              <div className="text-2xl font-bold tabular-nums text-[var(--sf-ink)]">
                {Number.isFinite(mort_global) ? `${(mort_global as number).toFixed(2)}%` : '—'}
              </div>
              <div className="mt-1" style={eyebrowStyle}>Pertes 30 j</div>
              <div className="mt-1" style={terrainSubStyle}>
                pertes sur trente jours
              </div>
            </div>

            {/* Coût aliment */}
            <div
              className="p-5 border border-[var(--sf-line)]"
              style={{ background: 'var(--sf-warm)' }}
            >
              <Wallet className="h-5 w-5 text-[var(--sf-accent-deep)] mb-2" />
              <div className="text-2xl font-bold tabular-nums text-[var(--sf-ink)]">
                {fmtFcfa(cout_global)}
              </div>
              <div className="mt-1" style={eyebrowStyle}>Coût aliment 30 j</div>
              <div className="mt-1" style={terrainSubStyle}>
                francs CFA sur trente jours
              </div>
            </div>
          </div>

          {/* Tableau pattern carnet (par ferme) */}
          {fList.length > 1 && (
            <div className="mt-6">
              <h3
                className="eyebrow text-[var(--sf-muted)] mb-2"
                style={eyebrowStyle}
              >
                Détail par ferme
              </h3>
              <div
                className="overflow-x-auto"
                style={{
                  borderTop: 'var(--sf-rule-top, 4px solid var(--sf-primary, #2D4A1F))',
                  borderBottom: 'var(--sf-rule-bottom, 1px solid var(--sf-border, rgba(0,0,0,0.18)))',
                  borderLeft: 'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
                  borderRight: 'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
                  background: 'var(--sf-surface-1, #FFFFFF)',
                }}
              >
                <table className="w-full text-sm">
                  <thead
                    className="border-b border-[var(--sf-line)] text-left text-[var(--sf-muted)]"
                    style={eyebrowStyle}
                  >
                    <tr>
                      <th className="py-3 px-4 font-semibold">Ferme</th>
                      <th className="py-3 px-4 font-semibold">Truies</th>
                      <th className="py-3 px-4 font-semibold">Verrats</th>
                      <th className="py-3 px-4 font-semibold">Bandes</th>
                      <th className="py-3 px-4 font-semibold">PSTA</th>
                      <th className="py-3 px-4 font-semibold">IC</th>
                      <th className="py-3 px-4 font-semibold">Pertes 30 j</th>
                      <th className="py-3 px-4 font-semibold">Coût aliment 30 j</th>
                      <th className="py-3 px-4 font-semibold">Valeur stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fList.map(f => (
                      <tr
                        key={f.ferme_id}
                        className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40"
                      >
                        <td className="py-3 px-4 font-semibold text-[var(--sf-ink)]">
                          {f.ferme_nom}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{f.nb_truies_actives}</td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{f.nb_verrats_actifs}</td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{f.nb_bandes_actives}</td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{fmtNum(f.psta_moyen_ferme)}</td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{fmtNum(f.ic_moyen_ferme)}</td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">
                          {f.mortalite_taux_30j !== null ? `${fmtNum(f.mortalite_taux_30j)}%` : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{fmtFcfa(f.cout_alim_30j)}</td>
                        <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{fmtFcfa(f.valeur_stock_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === Cartes legacy : prolificité, survie, nés vivants, sevrés === */}
      <section aria-labelledby="kpi-synthese-titre">
        <h2
          id="kpi-synthese-titre"
          className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)] mt-6 mb-3"
        >
          Synthèse prolificité &amp; survie
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="p-5 border border-[var(--sf-line)]"
          style={{ background: 'var(--sf-surface-2)' }}
        >
          <Target className="h-5 w-5 text-[var(--sf-primary)] mb-2" />
          <div className="text-2xl font-bold tabular-nums text-[var(--sf-ink)]">{avgProlif}</div>
          <div className="mt-1" style={eyebrowStyle}>Prolificité moy.</div>
          <div className="mt-1" style={terrainSubStyle}>
            {TERRAIN.prolificite.terrain}
          </div>
        </div>
        <div
          className="p-5 border border-[var(--sf-line)]"
          style={{ background: 'var(--sf-warm)' }}
        >
          <Award className="h-5 w-5 text-[var(--sf-accent-deep)] mb-2" />
          <div className="text-2xl font-bold tabular-nums text-[var(--sf-ink)]">{tauxSurvie}%</div>
          <div className="mt-1" style={eyebrowStyle}>Taux de survie</div>
          <div className="mt-1" style={terrainSubStyle}>
            survie au sevrage
          </div>
        </div>
        <div
          className="p-5 border border-[var(--sf-line)]"
          style={{ background: 'var(--sf-surface-2)' }}
        >
          <Zap className="h-5 w-5 text-[var(--sf-primary)] mb-2" />
          <div className="text-2xl font-bold tabular-nums text-[var(--sf-ink)]">{totalNV}</div>
          <div className="mt-1" style={eyebrowStyle}>Total nés vivants</div>
        </div>
        <div
          className="p-5 border border-[var(--sf-line)]"
          style={{ background: 'var(--sf-warm)' }}
        >
          <TrendingUp className="h-5 w-5 text-[var(--sf-accent-deep)] mb-2" />
          <div className="text-2xl font-bold tabular-nums text-[var(--sf-ink)]">{totalSevres}</div>
          <div className="mt-1" style={eyebrowStyle}>Total sevrés</div>
        </div>
        </div>
      </section>

      {/* === Performance par truie : pattern carnet === */}
      <div>
        <h2
          className="eyebrow text-[var(--sf-muted)] mb-2 font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)]"
          style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
        >
          Performance par truie
        </h2>
        <div
          className="overflow-x-auto"
          style={{
            borderTop: 'var(--sf-rule-top, 4px solid var(--sf-primary, #2D4A1F))',
            borderBottom: 'var(--sf-rule-bottom, 1px solid var(--sf-border, rgba(0,0,0,0.18)))',
            borderLeft: 'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
            borderRight: 'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
            background: 'var(--sf-surface-1, #FFFFFF)',
          }}
        >
          <table className="w-full text-sm">
            <thead
              className="border-b border-[var(--sf-line)] text-left text-[var(--sf-muted)]"
              style={eyebrowStyle}
            >
              <tr>
                <th className="py-3 px-4 font-semibold">Truie</th>
                <th className="py-3 px-4 font-semibold">Saillies</th>
                <th className="py-3 px-4 font-semibold">Portées</th>
                <th className="py-3 px-4 font-semibold">Nés vivants</th>
                <th className="py-3 px-4 font-semibold">Sevrés</th>
                <th className="py-3 px-4 font-semibold">Prolificité</th>
                <th className="py-3 px-4 font-semibold">PSTA</th>
                <th className="py-3 px-4 font-semibold">NJI (j)</th>
                <th className="py-3 px-4 font-semibold">Rang</th>
                <th className="py-3 px-4 font-semibold">À sortir</th>
              </tr>
            </thead>
            <tbody>
              {tList.map(t => (
                <tr
                  key={t.truie_id}
                  className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40"
                >
                  <td className="py-3 px-4 font-mono font-bold tabular-nums text-[var(--sf-ink)]">{t.tag}</td>
                  <td className="py-3 px-4 tabular-nums text-[var(--sf-ink)]">{t.nb_saillies}</td>
                  <td className="py-3 px-4 tabular-nums text-[var(--sf-ink)]">{t.nb_portees}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{t.total_nes_vivants}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{t.total_sevres}</td>
                  <td className="py-3 px-4 font-mono font-bold tabular-nums text-[var(--sf-primary)]">
                    {fmtNum(t.prolificite_moyenne)}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{fmtNum(t.psta)}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{t.nji ?? '—'}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{t.rang_portee_actuel ?? '—'}</td>
                  <td className="py-3 px-4">
                    {t.reforme_recommandee ? (
                      <Badge variant="danger">Sortir</Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {tList.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-[var(--sf-muted)]">
                    Aucune donnée truie disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === Performance par bande : pattern carnet === */}
      <div>
        <h2
          className="eyebrow text-[var(--sf-muted)] mb-2 flex items-center gap-2 font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)]"
          style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
        >
          <Activity className="h-4 w-4" aria-hidden="true" />
          Performance par bande
        </h2>
        <div
          className="overflow-x-auto"
          style={{
            borderTop: 'var(--sf-rule-top, 4px solid var(--sf-primary, #2D4A1F))',
            borderBottom: 'var(--sf-rule-bottom, 1px solid var(--sf-border, rgba(0,0,0,0.18)))',
            borderLeft: 'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
            borderRight: 'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
            background: 'var(--sf-surface-1, #FFFFFF)',
          }}
        >
          <table className="w-full text-sm">
            <thead
              className="border-b border-[var(--sf-line)] text-left text-[var(--sf-muted)]"
              style={eyebrowStyle}
            >
              <tr>
                <th className="py-3 px-4 font-semibold">Bande</th>
                <th className="py-3 px-4 font-semibold">Statut</th>
                <th className="py-3 px-4 font-semibold">Effectif</th>
                <th className="py-3 px-4 font-semibold">Poids moy. (kg)</th>
                <th className="py-3 px-4 font-semibold">Gain par jour (g/j)</th>
                <th className="py-3 px-4 font-semibold">Aliment par kilo</th>
                <th className="py-3 px-4 font-semibold">Coût/kg (F)</th>
                <th className="py-3 px-4 font-semibold">Pertes</th>
                <th className="py-3 px-4 font-semibold">Conso (kg)</th>
                <th className="py-3 px-4 font-semibold">Coût alim total</th>
              </tr>
            </thead>
            <tbody>
              {bList.map(b => (
                <tr
                  key={b.bande_id}
                  className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40"
                >
                  <td className="py-3 px-4 font-semibold text-[var(--sf-ink)]">{b.bande_nom}</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline">{b.statut}</Badge>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{b.effectif_actuel}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{fmtNum(b.poids_moyen_kg, 1)}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{fmtNum(b.gmq_g_par_jour, 0)}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{fmtNum(b.ic)}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{fmtNum(b.cout_alim_par_kg)}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{b.mortalites}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{fmtNum(b.conso_kg_total, 1)}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">{fmtFcfa(b.cout_alim_total)}</td>
                </tr>
              ))}
              {bList.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-[var(--sf-muted)]">
                    Aucune bande enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
