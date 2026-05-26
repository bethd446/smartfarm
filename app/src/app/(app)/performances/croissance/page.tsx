import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { ArrowLeft, TrendingUp, Gauge, Target } from 'lucide-react'
import Link from 'next/link'
import { CroissanceChart } from './_chart'

export const metadata: Metadata = {
  title: 'Courbes de croissance',
  description: 'Analyse des courbes de croissance réelles vs référentiel Lavalier-Toulze, GMQ par stade.',
}

// Types
type CroissanceDataPoint = {
  age_jours: number
  poids_kg: number
  stade: string
  gmq_g_j: number | null
}

type KpiGmqStade = {
  stade: string
  gmq_moyen: number | null
  n_animaux: number
}

// Helpers
function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toFixed(digits)
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  return n === null || n === undefined ? '—' : `${fmtNum(n, digits)} %`
}

function getEcartTone(ecartPct: number | null): 'good' | 'warn' | 'bad' | 'muted' {
  if (ecartPct === null || ecartPct === undefined) return 'muted'
  if (ecartPct >= -5) return 'good'
  if (ecartPct >= -10) return 'warn'
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

// Mapping stades référentiel → catégories simplifiées
function mapStadeCategorie(stade: string): string {
  const s = stade.toLowerCase()
  if (s.includes('naissance') || s.includes('lactation') || s === 'sevrage') return 'allaitement'
  if (s.includes('demarrage')) return 'sevrage/démarrage'
  if (s.includes('croissance')) return 'croissance'
  if (s.includes('finition')) return 'finition'
  return 'autre'
}

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--sf-muted)',
}

export default async function CroissancePage() {
  const sb = await createClient()

  // Fetch référentiel Lavalier-Toulze CI (courbe complète J0→J180)
  const { data: refData } = await sb
    .from('v_courbe_croissance_referentielle')
    .select('age_jours, poids_kg, gmq_g_j, stade')
    .eq('pays', 'CI')
    .order('age_jours')

  const referentiel: CroissanceDataPoint[] = (refData ?? []).map((r) => ({
    age_jours: r.age_jours,
    poids_kg: Number(r.poids_kg),
    stade: r.stade,
    gmq_g_j: r.gmq_g_j,
  }))

  // Fetch bandes de la ferme (pour le sélecteur, même si vide)
  const { data: bandesData } = await sb.from('bandes').select('id, nom, code_bande').order('nom')

  const bandes = bandesData ?? []

  // Fetch pesées réelles ferme (agrégation par age_jours, moyenne des poids)
  // Pour cette v1, on prend TOUTES les pesées de la ferme (pas filtré par bande)
  // On calcule age_jours = date_pesee - date_naissance animal
  const { data: peseesRaw } = await sb
    .from('pesees')
    .select(
      `
      poids_kg,
      date_pesee,
      animal_id,
      animaux!inner(date_naissance)
    `
    )
    .not('animaux.date_naissance', 'is', null)
    .order('date_pesee')

  // Agrégation côté serveur : calculer age_jours, grouper par tranche de 7j
  const peseesAvecAge =
    peseesRaw?.map((p: any) => {
      const dateNaissance = new Date(p.animaux.date_naissance)
      const datePesee = new Date(p.date_pesee)
      const ageJours = Math.floor((datePesee.getTime() - dateNaissance.getTime()) / 86400000)
      return { ageJours, poidsKg: Number(p.poids_kg) }
    }) ?? []

  // Grouper par tranche de 7 jours, calculer moyenne
  const groupedByWeek: Record<number, { sum: number; count: number }> = {}
  peseesAvecAge.forEach(({ ageJours, poidsKg }) => {
    if (ageJours >= 0 && ageJours <= 180) {
      const week = Math.floor(ageJours / 7) * 7
      if (!groupedByWeek[week]) groupedByWeek[week] = { sum: 0, count: 0 }
      groupedByWeek[week].sum += poidsKg
      groupedByWeek[week].count += 1
    }
  })

  const reel: CroissanceDataPoint[] = Object.keys(groupedByWeek)
    .map((k) => {
      const week = Number(k)
      const { sum, count } = groupedByWeek[week]
      return {
        age_jours: week,
        poids_kg: sum / count,
        stade: '',
        gmq_g_j: null,
      }
    })
    .sort((a, b) => a.age_jours - b.age_jours)

  // Fetch KPI GMQ par stade
  const { data: kpiStadeData } = await sb.from('v_kpi_gmq_par_stade').select('stade, gmq_moyen, n_animaux')

  const kpiParStade: KpiGmqStade[] = kpiStadeData ?? []

  // Calculer GMQ moyen ferme (moyenne pondérée sur tous stades)
  const gmqMoyenFerme =
    kpiParStade.length > 0
      ? kpiParStade.reduce((sum, k) => sum + (k.gmq_moyen ?? 0) * k.n_animaux, 0) /
        kpiParStade.reduce((sum, k) => sum + k.n_animaux, 0)
      : null

  // GMQ référentiel moyen (sur J0→J180, moyenne des gmq_g_j)
  const gmqRefMoyen =
    referentiel.length > 0
      ? referentiel.reduce((sum, r) => sum + (r.gmq_g_j ?? 0), 0) / referentiel.length
      : null

  // Écart % = ((réel - ref) / ref) * 100
  const ecartPct =
    gmqMoyenFerme !== null && gmqRefMoyen !== null && gmqRefMoyen > 0
      ? ((gmqMoyenFerme - gmqRefMoyen) / gmqRefMoyen) * 100
      : null

  const ecartTone = getEcartTone(ecartPct)

  // Agrégation par catégorie de stade pour le tableau
  const categoriesStades = ['allaitement', 'sevrage/démarrage', 'croissance', 'finition']
  const tableauStades = categoriesStades.map((cat) => {
    // GMQ réel ferme pour cette catégorie
    const kpiCat = kpiParStade.filter((k) => mapStadeCategorie(k.stade) === cat)
    const gmqReelCat =
      kpiCat.length > 0
        ? kpiCat.reduce((sum, k) => sum + (k.gmq_moyen ?? 0) * k.n_animaux, 0) /
          kpiCat.reduce((sum, k) => sum + k.n_animaux, 0)
        : null

    // GMQ référentiel pour cette catégorie
    const refCat = referentiel.filter((r) => mapStadeCategorie(r.stade) === cat)
    const gmqRefCat =
      refCat.length > 0 ? refCat.reduce((sum, r) => sum + (r.gmq_g_j ?? 0), 0) / refCat.length : null

    const ecartCat =
      gmqReelCat !== null && gmqRefCat !== null && gmqRefCat > 0
        ? ((gmqReelCat - gmqRefCat) / gmqRefCat) * 100
        : null

    const toneCat = getEcartTone(ecartCat)

    return {
      stade: cat,
      gmqFerme: gmqReelCat,
      gmqRef: gmqRefCat,
      ecart: ecartCat,
      statut: toneCat,
    }
  })

  return (
    <div className="space-y-6 pb-8">
      {/* ===== HEADER ===== */}
      <div>
        <Link
          href="/kpi"
          className="inline-flex items-center gap-2 min-h-[44px] py-2 text-sm text-[var(--sf-muted)] hover:text-[var(--sf-primary)] mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux indicateurs
        </Link>

        <div className="mb-2" style={eyebrowStyle}>
          PERFORMANCES · CROISSANCE · LAVALIER-TOULZE CI
        </div>
        <h1
          className="text-4xl font-black uppercase flex items-center gap-3 tracking-[0.02em] text-[var(--sf-ink)]"
          style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
        >
          <TrendingUp className="h-8 w-8 text-[var(--sf-primary)]" />
          Courbes de croissance
        </h1>
        <p
          className="text-sm text-[var(--sf-muted)] mt-1"
          style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
        >
          Comparaison référentiel Lavalier-Toulze (climat CI) vs performance réelle ferme
        </p>
      </div>

      {/* ===== CHART + SÉLECTEURS ===== */}
      <Card className="border-[var(--sf-line)]">
        <CardContent className="p-6">
          <CroissanceChart
            referentiel={referentiel}
            reel={reel}
            bandes={bandes.map((b) => ({ id: b.id, nom: b.nom, code: b.code_bande }))}
          />
        </CardContent>
      </Card>

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GMQ moyen ferme */}
        <Card className="border-[var(--sf-line)]">
          <CardContent className="p-4">
            <div style={eyebrowStyle} className="mb-2">
              GMQ MOYEN FERME
            </div>
            <div
              className="text-4xl font-black tabular-nums text-[var(--sf-ink)]"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              {gmqMoyenFerme !== null ? Math.round(gmqMoyenFerme) : '—'}
              {gmqMoyenFerme !== null && <span className="text-lg ml-1">g/j</span>}
            </div>
            <div className="text-xs text-[var(--sf-muted)] mt-1">
              Calculé sur {kpiParStade.reduce((s, k) => s + k.n_animaux, 0)} animaux
            </div>
          </CardContent>
        </Card>

        {/* GMQ référentiel */}
        <Card className="border-[var(--sf-line)]">
          <CardContent className="p-4">
            <div style={eyebrowStyle} className="mb-2">
              GMQ RÉFÉRENTIEL LT-CI
            </div>
            <div
              className="text-4xl font-black tabular-nums text-[var(--sf-muted)]"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              {gmqRefMoyen !== null ? Math.round(gmqRefMoyen) : '—'}
              {gmqRefMoyen !== null && <span className="text-lg ml-1">g/j</span>}
            </div>
            <div className="text-xs text-[var(--sf-muted)] mt-1">Moyenne J0→J180</div>
          </CardContent>
        </Card>

        {/* Écart % */}
        <Card className="border-[var(--sf-line)]">
          <CardContent className="p-4">
            <div style={eyebrowStyle} className="mb-2">
              ÉCART VS RÉFÉRENTIEL
            </div>
            <div
              className="text-4xl font-black tabular-nums"
              style={{
                fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                color: getToneColor(ecartTone),
              }}
            >
              {ecartPct !== null ? (ecartPct > 0 ? '+' : '') + fmtNum(ecartPct, 1) : '—'}
              {ecartPct !== null && <span className="text-lg ml-1">%</span>}
            </div>
            <div className="text-xs text-[var(--sf-muted)] mt-1">
              {ecartTone === 'good' && '✓ Performance normale'}
              {ecartTone === 'warn' && '⚠ Léger retard'}
              {ecartTone === 'bad' && '✗ Retard significatif'}
              {ecartTone === 'muted' && 'Données insuffisantes'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== TABLEAU DÉTAIL PAR STADE ===== */}
      <Card className="border-[var(--sf-line)]">
        <CardContent className="p-6">
          <h2
            className="text-xl uppercase tracking-wide text-[var(--sf-ink)] mb-4"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            Performance par stade de croissance
          </h2>

          <ResponsiveTable
            data={tableauStades}
            getRowKey={(r) => r.stade}
            columns={[
              {
                key: 'stade',
                label: 'Stade',
                primary: true,
                className: 'font-bold text-[var(--sf-ink)] capitalize',
              },
              {
                key: 'gmqFerme',
                label: 'GMQ ferme (g/j)',
                render: (v) => (v !== null ? Math.round(v).toLocaleString('fr-FR') : '—'),
                className: 'font-mono tabular-nums font-semibold',
              },
              {
                key: 'gmqRef',
                label: 'GMQ référentiel (g/j)',
                render: (v) => (v !== null ? Math.round(v).toLocaleString('fr-FR') : '—'),
                className: 'font-mono tabular-nums text-[var(--sf-muted)]',
              },
              {
                key: 'ecart',
                label: 'Écart (%)',
                render: (v, item) => (
                  <span
                    className="font-mono tabular-nums font-semibold"
                    style={{ color: getToneColor(item.statut) }}
                  >
                    {v !== null ? (v > 0 ? '+' : '') + fmtNum(v, 1) : '—'}
                  </span>
                ),
                className: 'font-mono tabular-nums',
              },
              {
                key: 'statut',
                label: 'Statut',
                render: (v) => {
                  const label =
                    v === 'good' ? 'Normal' : v === 'warn' ? 'Attention' : v === 'bad' ? 'Critique' : 'N/A'
                  const variant = v === 'good' ? 'default' : v === 'warn' ? 'secondary' : v === 'bad' ? 'destructive' : 'outline'
                  return <Badge variant={variant as any}>{label}</Badge>
                },
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
