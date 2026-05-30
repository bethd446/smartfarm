import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Scale } from 'lucide-react'
import { CourbePoidsClient } from './_courbe-poids'

/**
 * Phase 4.D — Historique des pesées d'un animal (Server Component)
 * 
 * Affiche :
 *  - Courbe d'évolution du poids (sevrage → finition)
 *  - Table chronologique avec GMQ entre chaque pesée
 *  - Comparaison au référentiel Lavalier-Toulze (plages GMQ par stade)
 * 
 * Logique :
 *  - Fetch pesées de l'animal + date_naissance + portée (poids moyen sevrage)
 *  - Inject point synthétique au sevrage si pas de pesée individuelle
 *  - Calcul GMQ entre chaque paire consécutive
 *  - Coloration selon référentiel (démarrage 450-600, croissance 700-900, finition 800-1000 g/j)
 */

type PeseeRow = {
  id: string
  date_pesee: string
  poids_kg: number
  contexte: string | null
  observations: string | null
}

type HistoriquePoidsProps = {
  animalId: string
  animalTag: string
}

// Référentiel Lavalier-Toulze CI (plages GMQ par stade)
const REFERENTIEL_GMQ = {
  sevrage: { min: 100, max: 300 }, // Plage faible post-sevrage
  demarrage: { min: 450, max: 600 },
  croissance: { min: 700, max: 900 },
  finition: { min: 800, max: 1000 },
} as const

type StadeLT = keyof typeof REFERENTIEL_GMQ

function mapContexteToStade(contexte: string | null): StadeLT {
  const c = (contexte ?? '').toLowerCase()
  if (c.includes('sevrage')) return 'sevrage'
  if (c.includes('transition') || c.includes('controle')) return 'demarrage'
  if (c.includes('croissance')) return 'croissance'
  if (c.includes('finition') || c.includes('abattage')) return 'finition'
  return 'demarrage' // fallback
}

function getGmqTone(gmq: number | null, stade: StadeLT): 'good' | 'warn' | 'bad' {
  if (gmq === null) return 'warn'
  const { min, max } = REFERENTIEL_GMQ[stade]
  if (gmq >= min && gmq <= max) return 'good'
  if (gmq >= min * 0.8 && gmq <= max * 1.2) return 'warn'
  return 'bad'
}

function getToneColor(tone: 'good' | 'warn' | 'bad'): string {
  switch (tone) {
    case 'good':
      return 'var(--sf-success-ink, #1F3414)'
    case 'warn':
      return 'var(--sf-warning-ink, #5C4416)'
    case 'bad':
      return 'var(--sf-danger-ink, #7A2A1F)'
  }
}

function getToneBgColor(tone: 'good' | 'warn' | 'bad'): string {
  switch (tone) {
    case 'good':
      return 'var(--sf-success-bg, #E8F5E9)'
    case 'warn':
      return 'var(--sf-warning-bg, #FFF8E1)'
    case 'bad':
      return 'var(--sf-danger-bg, #FFEBEE)'
  }
}

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
  fontSize: '11px',
  color: 'var(--sf-muted)',
  fontWeight: 'bold',
}

export async function HistoriquePoids({ animalId, animalTag }: HistoriquePoidsProps) {
  const sb = await createClient()

  // Fetch animal + portée + pesées
  const [{ data: animal }, { data: pesees }] = await Promise.all([
    sb
      .from('animaux')
      .select('date_naissance, portee_id, portees!fk_animaux_portee(poids_moyen_sevrage_kg, date_sevrage_reelle)')
      .eq('id', animalId)
      .maybeSingle(),
    sb
      .from('pesees')
      .select('id, date_pesee, poids_kg, contexte, observations')
      .eq('animal_id', animalId)
      .order('date_pesee', { ascending: true }),
  ])

  if (!animal) {
    return null
  }

  const dateNaissance = animal.date_naissance ? new Date(animal.date_naissance) : null
  const portee = animal.portees as any
  const poidsMoyenSevrage = portee?.poids_moyen_sevrage_kg ?? null
  const dateSevrage = portee?.date_sevrage_reelle ?? null

  let allPesees: Array<{
    id: string
    date_pesee: string
    poids_kg: number
    contexte: string | null
    observations: string | null
    isSynthetic?: boolean
  }> = pesees ?? []

  // Inject point synthétique au sevrage si portée existe + aucune pesée 'sevrage' individuelle
  if (poidsMoyenSevrage && dateSevrage) {
    const hasSevrageIndividuel = allPesees.some(
      (p) => p.contexte && p.contexte.toLowerCase().includes('sevrage')
    )
    if (!hasSevrageIndividuel) {
      allPesees = [
        {
          id: '__synthetic_sevrage',
          date_pesee: dateSevrage,
          poids_kg: poidsMoyenSevrage,
          contexte: 'sevrage',
          observations: 'Poids moyen portée (non pesé individuellement)',
          isSynthetic: true,
        },
        ...allPesees,
      ]
      // Re-sort après injection
      allPesees.sort(
        (a, b) => new Date(a.date_pesee).getTime() - new Date(b.date_pesee).getTime()
      )
    }
  }

  // Calcul GMQ entre chaque paire consécutive + GMQ total
  type PeseeAvecGmq = {
    id: string
    date_pesee: string
    poids_kg: number
    contexte: string | null
    observations: string | null
    isSynthetic?: boolean
    deltaKg: number | null
    deltaJours: number | null
    gmqGJ: number | null
    stade: StadeLT
    tone: 'good' | 'warn' | 'bad'
  }

  const peseesAvecGmq: PeseeAvecGmq[] = allPesees.map((p, idx) => {
    let deltaKg: number | null = null
    let deltaJours: number | null = null
    let gmqGJ: number | null = null

    if (idx > 0) {
      const prev = allPesees[idx - 1]
      deltaKg = p.poids_kg - prev.poids_kg
      const d1 = new Date(prev.date_pesee)
      const d2 = new Date(p.date_pesee)
      deltaJours = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
      if (deltaJours > 0) {
        gmqGJ = (deltaKg / deltaJours) * 1000 // g/j
      }
    }

    const stade = mapContexteToStade(p.contexte)
    const tone = getGmqTone(gmqGJ, stade)

    return {
      ...p,
      deltaKg,
      deltaJours,
      gmqGJ,
      stade,
      tone,
    }
  })

  // GMQ total : première à dernière pesée
  let gmqTotal: number | null = null
  if (peseesAvecGmq.length >= 2) {
    const first = peseesAvecGmq[0]
    const last = peseesAvecGmq[peseesAvecGmq.length - 1]
    const deltaKg = last.poids_kg - first.poids_kg
    const d1 = new Date(first.date_pesee)
    const d2 = new Date(last.date_pesee)
    const deltaJours = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
    if (deltaJours > 0) {
      gmqTotal = (deltaKg / deltaJours) * 1000
    }
  }

  const chartData = peseesAvecGmq.map((p) => ({
    date_pesee: p.date_pesee,
    poids_kg: p.poids_kg,
    contexte: p.contexte ?? 'contrôle',
  }))

  return (
    <div className="space-y-6">
      {/* === CARD GRAPHIQUE === */}
      <Card className="border-[var(--sf-line)]">
        <CardHeader>
          <div style={eyebrowStyle}>Historique pesées — {animalTag.toUpperCase()}</div>
          <div className="flex items-center justify-between gap-2 flex-wrap mt-2">
            <h2
              className="text-2xl font-bold text-[var(--sf-ink)]"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              Évolution du poids
            </h2>
            {peseesAvecGmq.length > 0 && gmqTotal !== null ? (
              <div className="flex items-center gap-2">
                <div style={eyebrowStyle} className="text-right">
                  GMQ TOTAL
                </div>
                <div
                  className="text-3xl font-bold tabular-nums"
                  style={{
                    fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                    color:
                      gmqTotal >= 600
                        ? 'var(--sf-success-ink, #1F3414)'
                        : gmqTotal >= 450
                          ? 'var(--sf-warning-ink, #5C4416)'
                          : 'var(--sf-danger-ink, #7A2A1F)',
                  }}
                >
                  {Math.round(gmqTotal)}
                  <span className="text-base ml-1 text-[var(--sf-muted)]">g/j</span>
                </div>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {peseesAvecGmq.length === 0 ? (
            <EmptyState
              icon={Scale}
              title="Aucune pesée enregistrée"
              description={`Cet animal n'a pas encore été pesé. Clique sur le bouton ci-dessous pour ajouter une pesée.`}
              cta={{
                label: 'Ajouter une pesée',
                href: `/pesees?action=new&animal_id=${animalId}`,
              }}
            />
          ) : (
            <CourbePoidsClient data={chartData} />
          )}
        </CardContent>
      </Card>

      {/* === TABLE CHRONOLOGIQUE === */}
      {peseesAvecGmq.length > 0 ? (
        <Card className="border-[var(--sf-line)]">
          <CardHeader>
            <div style={eyebrowStyle}>DÉTAIL DES PESÉES</div>
          </CardHeader>
          <CardContent>
            {/* Desktop : table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="num">Poids (kg)</th>
                    <th className="num">Δ kg</th>
                    <th className="num">Δ jours</th>
                    <th className="num">GMQ (g/j)</th>
                    <th>Contexte</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {peseesAvecGmq.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-[var(--sf-surface-1)]"
                      style={{
                        backgroundColor: p.isSynthetic
                          ? 'var(--sf-surface-1)'
                          : undefined,
                      }}
                    >
                      <td className="font-mono tabular-nums text-[var(--sf-ink)]">
                        {new Date(p.date_pesee).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="num font-mono tabular-nums font-bold text-[var(--sf-primary)]">
                        {p.poids_kg.toFixed(1)}
                      </td>
                      <td className="num font-mono tabular-nums text-[var(--sf-muted)]">
                        {p.deltaKg !== null
                          ? (p.deltaKg > 0 ? '+' : '') + p.deltaKg.toFixed(1)
                          : '—'}
                      </td>
                      <td className="num font-mono tabular-nums text-[var(--sf-muted)]">
                        {p.deltaJours !== null ? p.deltaJours : '—'}
                      </td>
                      <td
                        className="num font-mono tabular-nums font-bold px-2"
                        style={{
                          color: p.gmqGJ !== null ? getToneColor(p.tone) : 'var(--sf-muted)',
                          backgroundColor:
                            p.gmqGJ !== null ? getToneBgColor(p.tone) : undefined,
                        }}
                      >
                        {p.gmqGJ !== null ? Math.round(p.gmqGJ) : '—'}
                      </td>
                      <td>
                        <Badge variant="outline" className="capitalize">
                          {(p.contexte ?? 'contrôle').replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="text-xs text-[var(--sf-muted)] max-w-xs truncate">
                        {p.observations || (p.isSynthetic ? '(synthétique)' : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile : cards */}
            <div className="md:hidden space-y-3">
              {peseesAvecGmq.map((p) => (
                <div
                  key={p.id}
                  className="border border-[var(--sf-line)] rounded-md p-3 space-y-2"
                  style={{
                    backgroundColor: p.isSynthetic
                      ? 'var(--sf-surface-1)'
                      : p.gmqGJ !== null
                        ? getToneBgColor(p.tone)
                        : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono tabular-nums text-sm text-[var(--sf-ink)]">
                      {new Date(p.date_pesee).toLocaleDateString('fr-FR')}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {(p.contexte ?? 'contrôle').replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div style={eyebrowStyle}>POIDS</div>
                      <div className="font-mono tabular-nums font-bold text-[var(--sf-primary)]">
                        {p.poids_kg.toFixed(1)} kg
                      </div>
                    </div>
                    {p.deltaKg !== null && (
                      <div>
                        <div style={eyebrowStyle}>Δ KG / Δ JOURS</div>
                        <div className="font-mono tabular-nums text-[var(--sf-muted)]">
                          {(p.deltaKg > 0 ? '+' : '') + p.deltaKg.toFixed(1)} / {p.deltaJours}j
                        </div>
                      </div>
                    )}
                    {p.gmqGJ !== null && (
                      <div className="col-span-2">
                        <div style={eyebrowStyle}>GMQ</div>
                        <div
                          className="font-mono tabular-nums font-bold text-lg"
                          style={{ color: getToneColor(p.tone) }}
                        >
                          {Math.round(p.gmqGJ)} g/j
                        </div>
                      </div>
                    )}
                  </div>
                  {p.observations && (
                    <p className="text-xs text-[var(--sf-muted)] italic mt-2">
                      {p.observations}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Légende référentiel */}
            <div className="mt-6 p-4 bg-[var(--sf-surface-1)] rounded border border-[var(--sf-line)]">
              <div style={eyebrowStyle} className="mb-2">
                RÉFÉRENTIEL LAVALIER-TOULZE (CLIMAT CI)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                <div>
                  <strong className="text-[var(--sf-ink)]">Sevrage :</strong>{' '}
                  <span className="text-[var(--sf-muted)]">100-300 g/j</span>
                </div>
                <div>
                  <strong className="text-[var(--sf-ink)]">Démarrage :</strong>{' '}
                  <span className="text-[var(--sf-muted)]">450-600 g/j</span>
                </div>
                <div>
                  <strong className="text-[var(--sf-ink)]">Croissance :</strong>{' '}
                  <span className="text-[var(--sf-muted)]">700-900 g/j</span>
                </div>
                <div>
                  <strong className="text-[var(--sf-ink)]">Finition :</strong>{' '}
                  <span className="text-[var(--sf-muted)]">800-1000 g/j</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
