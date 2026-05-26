import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { ArrowLeft, PiggyBank, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { EconomiqueCharts } from './_charts'

export const metadata: Metadata = {
  title: 'Indicateurs économiques',
  description: 'Coût aliment par kg vif produit, marge brute, répartition des coûts en XOF.',
}

// Types
type CoutParBande = {
  bande_nom: string
  cout_total_xof: number
}

type RepartitionCout = {
  categorie: string
  montant_xof: number
  pct: number
}

type DonneesMensuelle = {
  mois: string
  kg_vif_produit: number
  cout_aliment_xof: number
  ca_xof: number
  marge_xof: number
  marge_pct: number
}

// Helpers
function fmtXOF(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('fr-CI', { 
    style: 'currency', 
    currency: 'XOF', 
    maximumFractionDigits: 0 
  }).format(n)
}

function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toFixed(digits)
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  return n === null || n === undefined ? '—' : `${fmtNum(n, digits)} %`
}

function getCoutKgTone(cout: number | null): 'good' | 'warn' | 'bad' | 'muted' {
  if (cout === null || cout === undefined) return 'muted'
  if (cout < 250) return 'good'
  if (cout <= 350) return 'warn'
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

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--sf-muted)',
}

export default async function EconomiquePage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>
}) {
  const params = await searchParams
  const periode = params.periode ?? '90j'

  const sb = await createClient()

  // Calculer date limite selon période
  const now = new Date()
  let dateDebut: Date
  switch (periode) {
    case '30j':
      dateDebut = new Date(now.getTime() - 30 * 86400000)
      break
    case '90j':
      dateDebut = new Date(now.getTime() - 90 * 86400000)
      break
    case '12m':
      dateDebut = new Date(now.getTime() - 365 * 86400000)
      break
    default:
      dateDebut = new Date(now.getTime() - 90 * 86400000)
  }

  const dateDebutStr = dateDebut.toISOString().split('T')[0]

  // ===== 1. FETCH CONSOMMATIONS ALIMENT + FORMULATIONS =====
  const { data: consommationsData } = await sb
    .from('consommations_aliment')
    .select(
      `
      qte_kg,
      date,
      bande_id,
      formule_id,
      formulations!inner(cout_kg_xof),
      bandes!inner(nom)
    `
    )
    .gte('date', dateDebutStr)
    .order('date')

  const consommations = consommationsData ?? []

  // Fallback coût si formulation sans prix
  const COUT_FALLBACK_XOF_KG = 280

  // Calculer coût total aliment période
  const coutTotalAliment = consommations.reduce((sum, c: any) => {
    const coutKg = c.formulations?.cout_kg_xof ?? COUT_FALLBACK_XOF_KG
    return sum + c.qte_kg * coutKg
  }, 0)

  // ===== 2. FETCH KG VIF PRODUIT (via pesées + mv_kpi_bande) =====
  // Kg vif produit = somme des poids des animaux vendus/départs sur la période
  // OU estimation via effectif × poids moyen des pesées récentes
  
  // Approche 1: départs avec poids
  const { data: departsData } = await sb
    .from('departs')
    .select('poids_kg, prix_xof, date')
    .gte('date', dateDebutStr)

  const departs = departsData ?? []

  const kgVifProduit = departs.reduce((sum, d) => sum + (d.poids_kg ?? 0), 0)
  const caTotal = departs.reduce((sum, d) => sum + (d.prix_xof ?? 0), 0)

  // Approche 2 (si pas de départs): estimer via pesées récentes
  const { data: peseesData } = await sb
    .from('pesees')
    .select('poids_kg, date_pesee')
    .gte('date_pesee', dateDebutStr)

  const pesees = peseesData ?? []
  const kgVifPeseesTotal = pesees.reduce((sum, p) => sum + (p.poids_kg ?? 0), 0)

  // Prendre le max (soit départs, soit estimation pesées si départs vides)
  const kgVifFinal = kgVifProduit > 0 ? kgVifProduit : kgVifPeseesTotal

  // ===== 3. CALCUL COÛT ALIMENT PAR KG VIF =====
  const coutAlimentParKgVif = kgVifFinal > 0 ? coutTotalAliment / kgVifFinal : null
  const coutTone = getCoutKgTone(coutAlimentParKgVif)

  // ===== 4. ESTIMATION MARGE BRUTE =====
  // Marge brute = CA - coût aliment - coût sanitaire (15% aliment si pas de data)
  const coutSanitaireEstime = coutTotalAliment * 0.15
  const margeEstimee = caTotal - coutTotalAliment - coutSanitaireEstime

  // ===== 5. COÛT PAR BANDE (pour bar chart) =====
  const coutParBande: CoutParBande[] = []
  const bandesMap = new Map<string, { nom: string; cout: number }>()

  consommations.forEach((c: any) => {
    const bandeNom = c.bandes?.nom ?? 'Inconnue'
    const coutKg = c.formulations?.cout_kg_xof ?? COUT_FALLBACK_XOF_KG
    const cout = c.qte_kg * coutKg

    if (bandesMap.has(bandeNom)) {
      bandesMap.get(bandeNom)!.cout += cout
    } else {
      bandesMap.set(bandeNom, { nom: bandeNom, cout })
    }
  })

  bandesMap.forEach((v, k) => {
    coutParBande.push({ bande_nom: k, cout_total_xof: v.cout })
  })

  // Trier par coût décroissant
  coutParBande.sort((a, b) => b.cout_total_xof - a.cout_total_xof)

  // ===== 6. RÉPARTITION COÛTS (pie chart) =====
  // Si pas de tracking précis, estimation secteur CI : Aliment 60%, Sanitaire 15%, Main-d'oeuvre 15%, Autres 10%
  const coutTotal = coutTotalAliment / 0.6 // Si aliment = 60%, alors total = aliment / 0.6

  const repartitionCouts: RepartitionCout[] = [
    { categorie: "Aliment", montant_xof: coutTotalAliment, pct: 60 },
    { categorie: "Sanitaire", montant_xof: coutTotal * 0.15, pct: 15 },
    { categorie: "Main-d'oeuvre", montant_xof: coutTotal * 0.15, pct: 15 },
    { categorie: "Autres", montant_xof: coutTotal * 0.1, pct: 10 },
  ]

  // ===== 7. TABLEAU MENSUEL 12 MOIS =====
  // Agrégation des données par mois sur 12 derniers mois
  const mois12 = []
  for (let i = 11; i >= 0; i--) {
    const dateRef = new Date(now)
    dateRef.setMonth(dateRef.getMonth() - i)
    const moisStr = dateRef.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })
    const moisDebut = new Date(dateRef.getFullYear(), dateRef.getMonth(), 1).toISOString().split('T')[0]
    const moisFin = new Date(dateRef.getFullYear(), dateRef.getMonth() + 1, 0).toISOString().split('T')[0]

    // Filtrer consommations du mois
    const consoMois = consommations.filter(
      (c: any) => c.date >= moisDebut && c.date <= moisFin
    )
    const coutMois = consoMois.reduce((sum, c: any) => {
      const coutKg = c.formulations?.cout_kg_xof ?? COUT_FALLBACK_XOF_KG
      return sum + c.qte_kg * coutKg
    }, 0)

    // Filtrer départs du mois
    const departsMois = departs.filter((d) => d.date >= moisDebut && d.date <= moisFin)
    const kgVifMois = departsMois.reduce((sum, d) => sum + (d.poids_kg ?? 0), 0)
    const caMois = departsMois.reduce((sum, d) => sum + (d.prix_xof ?? 0), 0)

    const margeMois = caMois - coutMois - coutMois * 0.15
    const margePctMois = caMois > 0 ? (margeMois / caMois) * 100 : null

    mois12.push({
      mois: moisStr,
      kg_vif_produit: kgVifMois,
      cout_aliment_xof: coutMois,
      ca_xof: caMois,
      marge_xof: margeMois,
      marge_pct: margePctMois,
    })
  }

  // Empty state
  const isEmpty = consommations.length === 0

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
          PERFORMANCES · ÉCONOMIE · FRANC CFA XOF
        </div>
        <h1
          className="text-4xl font-black uppercase flex items-center gap-3 tracking-[0.02em] text-[var(--sf-ink)]"
          style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
        >
          <PiggyBank className="h-8 w-8 text-[var(--sf-primary)]" />
          Indicateurs économiques
        </h1>
        <p
          className="text-sm text-[var(--sf-muted)] mt-1"
          style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
        >
          Coût aliment par kg vif produit, marge brute, répartition des coûts de production (XOF)
        </p>
      </div>

      {/* ===== SÉLECTEUR PÉRIODE ===== */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--sf-muted)]">Période :</span>
        <Select defaultValue={periode}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30j">30 derniers jours</SelectItem>
            <SelectItem value="90j">90 derniers jours</SelectItem>
            <SelectItem value="12m">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isEmpty ? (
        <Card className="border-[var(--sf-line)]">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-[var(--sf-muted)] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[var(--sf-ink)] mb-2">
              Aucune consommation d'aliment enregistrée
            </h2>
            <p className="text-sm text-[var(--sf-muted)]">
              Commencez par enregistrer les consommations d'aliment pour voir vos indicateurs
              économiques.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ===== KPI CARDS ===== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Coût aliment par kg vif */}
            <Card className="border-[var(--sf-line)]">
              <CardContent className="p-4">
                <div style={eyebrowStyle} className="mb-2">
                  COÛT ALIMENT PAR KG VIF PRODUIT
                </div>
                <div
                  className="text-4xl font-black tabular-nums"
                  style={{
                    fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                    color: getToneColor(coutTone),
                  }}
                >
                  {coutAlimentParKgVif !== null ? Math.round(coutAlimentParKgVif) : '—'}
                  {coutAlimentParKgVif !== null && (
                    <span className="text-lg ml-1">XOF/kg</span>
                  )}
                </div>
                <div className="text-xs text-[var(--sf-muted)] mt-1">
                  {coutTone === 'good' && '✓ Excellent (< 250 XOF/kg)'}
                  {coutTone === 'warn' && '⚠ Acceptable (250-350 XOF/kg)'}
                  {coutTone === 'bad' && '✗ Élevé (> 350 XOF/kg)'}
                  {coutTone === 'muted' && 'Données insuffisantes'}
                </div>
              </CardContent>
            </Card>

            {/* Coût total aliment */}
            <Card className="border-[var(--sf-line)]">
              <CardContent className="p-4">
                <div style={eyebrowStyle} className="mb-2">
                  COÛT TOTAL ALIMENT PÉRIODE
                </div>
                <div
                  className="text-3xl font-black tabular-nums text-[var(--sf-ink)]"
                  style={{
                    fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  }}
                >
                  {fmtXOF(coutTotalAliment)}
                </div>
                <div className="text-xs text-[var(--sf-muted)] mt-1">
                  {consommations.length} consommations enregistrées
                </div>
              </CardContent>
            </Card>

            {/* Marge brute estimée */}
            <Card className="border-[var(--sf-line)]">
              <CardContent className="p-4">
                <div style={eyebrowStyle} className="mb-2">
                  MARGE BRUTE ESTIMÉE
                </div>
                <div
                  className="text-3xl font-black tabular-nums"
                  style={{
                    fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                    color: margeEstimee > 0 ? 'var(--sf-primary)' : 'var(--sf-danger-ink)',
                  }}
                >
                  {fmtXOF(margeEstimee)}
                </div>
                <div className="text-xs text-[var(--sf-muted)] mt-1">
                  CA {fmtXOF(caTotal)} - coûts {fmtXOF(coutTotalAliment + coutSanitaireEstime)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ===== CHARTS ===== */}
          <EconomiqueCharts coutParBande={coutParBande} repartitionCouts={repartitionCouts} />

          {/* ===== TABLEAU MENSUEL ===== */}
          <Card className="border-[var(--sf-line)]">
            <CardContent className="p-6">
              <h2
                className="text-xl uppercase tracking-wide text-[var(--sf-ink)] mb-4"
                style={{
                  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                }}
              >
                Évolution mensuelle sur 12 mois
              </h2>

              <ResponsiveTable
                data={mois12}
                getRowKey={(r) => r.mois}
                columns={[
                  {
                    key: 'mois',
                    label: 'Mois',
                    primary: true,
                    className: 'font-bold text-[var(--sf-ink)] capitalize',
                  },
                  {
                    key: 'kg_vif_produit',
                    label: 'Kg vif produit',
                    render: (v) => (v > 0 ? v.toFixed(0) : '—'),
                    className: 'font-mono tabular-nums',
                  },
                  {
                    key: 'cout_aliment_xof',
                    label: 'Coût aliment (XOF)',
                    render: (v) => fmtXOF(v),
                    className: 'font-mono tabular-nums',
                  },
                  {
                    key: 'ca_xof',
                    label: 'CA (XOF)',
                    render: (v) => fmtXOF(v),
                    className: 'font-mono tabular-nums',
                  },
                  {
                    key: 'marge_xof',
                    label: 'Marge (XOF)',
                    render: (v) => (
                      <span style={{ color: v > 0 ? 'var(--sf-primary)' : 'var(--sf-danger-ink)' }}>
                        {fmtXOF(v)}
                      </span>
                    ),
                    className: 'font-mono tabular-nums font-semibold',
                  },
                  {
                    key: 'marge_pct',
                    label: 'Marge (%)',
                    render: (v) => fmtPct(v),
                    className: 'font-mono tabular-nums',
                  },
                ]}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
