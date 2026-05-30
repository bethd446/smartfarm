/* Hallmark · macrostructure: Registre dense (dossier sanitaire) · screen: /sanitaire/mycotoxines · tone: terrain-vivant · theme: Terre & Mil (DESIGN.md) · pre-emit: P4 H4 E4 S5 R4 V4 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Bug, Plus, ChevronLeft } from 'lucide-react'

import { DialogEnregistrerLot } from './_dialog-lot'

export const metadata: Metadata = {
  title: 'Mycotoxines',
}

type LotRow = {
  id: string
  reference_lot: string
  date_reception: string
  quantite_kg: number
  origine: string | null
  analyse_aflatoxine_b1_ppb: number | null
  analyse_zearalenone_ppb: number | null
  analyse_don_ppb: number | null
  date_analyse: string | null
  conforme: boolean
  observations: string | null
  matiere_premiere: { nom: string } | null
}

type ProduitAntiMyco = {
  id: string
  nom: string
  fabricant: string
  type: string
  spectre: string[] | null
  dose_kg_par_tonne_aliment: number | null
  cout_fcfa_par_kg: number | null
  description: string | null
}

type RecoAntiMyco = {
  lot_id: string
  ferme_id: string | null
  reference_lot: string
  matiere_nom: string
  date_reception: string
  analyse_aflatoxine_b1_ppb: number | null
  analyse_zearalenone_ppb: number | null
  analyse_don_ppb: number | null
  analyse_ochratoxine_a_ppb: number | null
  analyse_fumonisine_ppb: number | null
  conforme: boolean | null
  niveau_risque: 'eleve' | 'modere' | 'faible' | 'non_analyse'
}

function formatDate(s: string | null) {
  if (!s) return '—'
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return s
  }
}

function fmtNum(n: number | null, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function ageJours(date: string): number {
  const d = new Date(date + 'T00:00:00')
  const ms = Date.now() - d.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

/**
 * Statut d'un lot. Sévérité encodée par DOT/forme (cf. registre /alertes),
 * jamais par fond coloré : `tone` pilote la pastille, le libellé reste neutre.
 */
function statutLot(l: LotRow): {
  label: string
  tone: 'conforme' | 'non_conforme' | 'non_analyse_retard' | 'non_analyse'
} {
  if (l.analyse_aflatoxine_b1_ppb === null) {
    return ageJours(l.date_reception) > 7
      ? { label: 'Non analysé (>7 j)', tone: 'non_analyse_retard' }
      : { label: 'Non analysé', tone: 'non_analyse' }
  }
  if (!l.conforme) return { label: 'Non conforme', tone: 'non_conforme' }
  return { label: 'Conforme', tone: 'conforme' }
}

/** Mappe le `tone` d'un statut de lot vers le `tone` de pastille `Dot`. */
function toneStatutLot(
  tone: 'conforme' | 'non_conforme' | 'non_analyse_retard' | 'non_analyse',
): 'faible' | 'eleve' | 'modere' | 'non_analyse' {
  return (
    {
      conforme: 'faible',
      non_conforme: 'eleve',
      non_analyse_retard: 'modere',
      non_analyse: 'non_analyse',
    } as const
  )[tone]
}

/** Pastille de sévérité — forme + couleur token, jamais fond coloré décoratif. */
function Dot({
  tone,
}: {
  tone: 'eleve' | 'modere' | 'non_analyse' | 'faible'
}) {
  if (tone === 'eleve') {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: 'var(--sf-danger)' }}
      />
    )
  }
  if (tone === 'modere') {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ boxShadow: 'inset 0 0 0 3px var(--sf-warning)' }}
      />
    )
  }
  if (tone === 'non_analyse') {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ boxShadow: 'inset 0 0 0 1.5px var(--sf-subtle)' }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ boxShadow: 'inset 0 0 0 1.5px var(--sf-success)' }}
    />
  )
}

/** Étiquette de section UPPERCASE Big Shoulders — pendant « bordereau ». */
function SectionLabel({
  children,
  count,
}: {
  children: React.ReactNode
  count?: number
}) {
  return (
    <div
      className="flex items-baseline gap-2 border-t-2 pt-2"
      style={{ borderTopColor: 'var(--sf-primary)' }}
    >
      <h2
        className="text-[15px] uppercase tracking-[0.08em] font-bold leading-none text-[var(--sf-ink)]"
        style={{
          fontFamily:
            "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
        }}
      >
        {children}
      </h2>
      {count !== undefined && (
        <span className="tabular-nums text-xs font-semibold text-[var(--sf-subtle)]">
          {count}
        </span>
      )}
    </div>
  )
}

const TH_BASE =
  'h-9 px-2 align-middle text-left text-[var(--sf-muted)] font-semibold'
const TH_STYLE: React.CSSProperties = {
  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

export default async function MycotoxinesPage() {
  const sb = await createClient()

  // Lots — la table `lots_matieres_premieres` peut être bloquée RLS/GRANT et/ou
  //        avoir un schéma alternatif (`lot`, `qte_kg` au lieu de
  //        `reference_lot`, `quantite_kg`). On retombe sur le second schéma
  //        avant d'afficher un message générique.
  let lots: LotRow[] = []
  let loadErr: string | null = null

  const r1 = await sb
    .from('lots_matieres_premieres')
    .select(
      'id, reference_lot, date_reception, quantite_kg, origine, analyse_aflatoxine_b1_ppb, analyse_zearalenone_ppb, analyse_don_ppb, date_analyse, conforme, observations, matiere_premiere:matieres_premieres(nom)',
    )
    .is('deleted_at', null)
    .order('date_reception', { ascending: false })

  if (!r1.error && r1.data) {
    lots = (r1.data as unknown) as LotRow[]
  } else {
    // Tentative 2 : schéma réel minimal (lot, qte_kg, mycotoxine_test, ...)
    const r2 = await sb
      .from('lots_matieres_premieres')
      .select(
        'id, lot, date_reception, qte_kg, mycotoxine_test, observations, matiere_premiere:matieres_premieres(nom)',
      )
      .order('date_reception', { ascending: false })

    if (!r2.error && r2.data) {
      lots = (r2.data as Array<Record<string, unknown>>).map((l) => ({
        id: String(l.id ?? ''),
        reference_lot: String((l.lot as string) ?? ''),
        date_reception: String(l.date_reception ?? ''),
        quantite_kg: Number((l.qte_kg as number) ?? 0),
        origine: null,
        analyse_aflatoxine_b1_ppb: null,
        analyse_zearalenone_ppb: null,
        analyse_don_ppb: null,
        date_analyse: null,
        // mycotoxine_test = boolean test fait ou pas — on considère "conforme" par défaut
        conforme: l.mycotoxine_test !== false,
        observations: (l.observations as string | null) ?? null,
        matiere_premiere: (l.matiere_premiere as { nom: string } | null) ?? null,
      })) as LotRow[]
    } else {
      console.error(
        '[mycotoxines] lots_matieres_premieres inaccessible:',
        r1.error?.message ?? r2.error?.message,
      )
      loadErr = 'Impossible de charger les lots — réessayez plus tard.'
    }
  }

  // Matières premières sensibles pour le dialog
  const { data: mpData } = await sb
    .from('matieres_premieres')
    .select('id, nom')
    .is('deleted_at', null)
    .or(
      'nom.ilike.%maïs%,nom.ilike.%mais%,nom.ilike.%arachide%,nom.ilike.%soja%,nom.ilike.%tourteau%',
    )
    .order('nom', { ascending: true })

  const matieres = (mpData ?? []) as { id: string; nom: string }[]

  // Catalogue produits anti-mycotoxines
  const { data: produitsData } = await sb
    .from('produits_anti_mycotoxines')
    .select('*')
    .eq('actif', true)
    .order('nom', { ascending: true })

  const produits = (produitsData ?? []) as ProduitAntiMyco[]

  // Recommandations par lot
  const { data: recosData } = await sb
    .from('v_recommandations_anti_mycotoxines')
    .select('*')
    .order('date_reception', { ascending: false })

  const recosBrutes = (recosData ?? []) as RecoAntiMyco[]
  // Priorité : eleve > modere > non_analyse > faible
  const priorite = { eleve: 0, modere: 1, non_analyse: 2, faible: 3 } as const
  const recos = [...recosBrutes].sort(
    (a, b) => priorite[a.niveau_risque] - priorite[b.niveau_risque],
  )
  const recosARisque = recos.filter(
    (r) => r.niveau_risque === 'eleve' || r.niveau_risque === 'modere',
  )

  // KPI
  const total = lots.length
  const nonAnalyses = lots.filter(
    (l) => l.analyse_aflatoxine_b1_ppb === null,
  ).length
  const nonConformes = lots.filter(
    (l) => l.analyse_aflatoxine_b1_ppb !== null && !l.conforme,
  ).length

  return (
    <div className="space-y-8">
      {/* EN-TÊTE — index d'un dossier sanitaire, pas de hero -------------------- */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <Link
            href="/sanitaire"
            className="inline-flex items-center gap-1 min-h-11 py-1 text-xs uppercase tracking-[0.1em] text-[var(--sf-muted)] hover:text-[var(--sf-primary)] transition-colors"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Sanitaire
          </Link>
          <h1
            className="flex items-center gap-2.5 text-4xl font-black uppercase tracking-[0.02em] text-[var(--sf-ink)]"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            <Bug aria-hidden="true" className="h-8 w-8 text-[var(--sf-primary)]" />
            Mycotoxines
          </h1>
          <p className="max-w-prose text-sm text-[var(--sf-muted)]">
            Registre des lots maïs, arachide et tourteau de soja. Alerte R18 dès
            qu&apos;un lot reçu depuis plus de 7 jours reste non analysé.
          </p>
        </div>
        <DialogEnregistrerLot matieres={matieres} />
      </div>

      {/* BILAN — bande dense, sévérité par dot (forme), pas de fond coloré ----- */}
      <section className="space-y-2">
        <SectionLabel>Bilan des lots</SectionLabel>
        <div className="grid grid-cols-3 divide-x divide-[var(--sf-line)] border-b border-[var(--sf-line)]">
          <div className="flex items-center gap-2.5 py-3 pr-3">
            <Bug aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--sf-primary)]" />
            <div className="min-w-0">
              <div
                className="text-3xl font-bold leading-none tabular-nums text-[var(--sf-ink)]"
                style={{
                  fontFamily:
                    "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                }}
              >
                {total}
              </div>
              <div className="eyebrow text-[10px] mt-1.5 text-[var(--sf-muted)]">
                Lots enregistrés
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 py-3 px-3">
            <Dot tone={nonAnalyses > 0 ? 'modere' : 'faible'} />
            <div className="min-w-0">
              <div
                className="text-3xl font-bold leading-none tabular-nums text-[var(--sf-ink)]"
                style={{
                  fontFamily:
                    "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                }}
              >
                {nonAnalyses}
              </div>
              <div className="eyebrow text-[10px] mt-1.5 text-[var(--sf-muted)]">
                Non analysés
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 py-3 pl-3">
            <Dot tone={nonConformes > 0 ? 'eleve' : 'faible'} />
            <div className="min-w-0">
              <div
                className="text-3xl font-bold leading-none tabular-nums text-[var(--sf-ink)]"
                style={{
                  fontFamily:
                    "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                }}
              >
                {nonConformes}
              </div>
              <div className="eyebrow text-[10px] mt-1.5 text-[var(--sf-muted)]">
                Non conformes
                <span className="hidden sm:inline"> (UE porcs)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEUILS RÉGLEMENTAIRES — table de référence dense (ex-encart Info) ----- */}
      <section className="space-y-2">
        <SectionLabel>Seuils réglementaires (UE, porcs)</SectionLabel>
        <dl className="divide-y divide-[var(--sf-line)] border-b border-[var(--sf-line)]">
          {[
            {
              myco: 'Aflatoxine B1',
              seuil: '20 ppb',
              note: 'Immunodépression — porcelets au sevrage',
            },
            {
              myco: 'Zéaralénone (ZEA)',
              seuil: '250 ppb',
              note: 'Troubles reproducteurs — truies gestantes',
            },
            {
              myco: 'DON (vomitoxine)',
              seuil: '900 ppb',
              note: 'Refus alimentaire, baisse de croissance',
            },
          ].map((row) => (
            <div
              key={row.myco}
              className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 py-2.5 sm:grid-cols-[14rem_6rem_1fr] sm:items-baseline"
            >
              <dt className="text-sm font-semibold text-[var(--sf-ink)]">
                {row.myco}
              </dt>
              <dd className="text-right text-sm font-semibold tabular-nums text-[var(--sf-ink)] sm:text-left">
                ≤ {row.seuil}
              </dd>
              <dd className="col-span-2 text-xs leading-snug text-[var(--sf-muted)] sm:col-span-1 sm:text-right">
                {row.note}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs leading-snug text-[var(--sf-muted)]">
          Saison des pluies en Côte d&apos;Ivoire : risque élevé sur maïs et
          tourteau d&apos;arachide. Analyser chaque lot avant incorporation à la
          formule.
        </p>
      </section>

      {/* LOTS À RISQUE — recommandations, registre dense, dot de sévérité ------ */}
      <section className="space-y-2">
        <SectionLabel count={recosARisque.length || undefined}>
          Lots à risque — recommandations
        </SectionLabel>
        {recosARisque.length === 0 ? (
          <p className="py-4 text-sm text-[var(--sf-muted)]">
            Aucun lot au-dessus des seuils d&apos;action. Tous les lots analysés
            sont conformes.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--sf-line)] border-b border-[var(--sf-line)]">
            {recosARisque.map((r) => (
              <li key={r.lot_id} className="py-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-1.5">
                    <Dot tone={r.niveau_risque} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span
                        className="text-[15px] font-semibold leading-tight text-[var(--sf-ink)]"
                        style={{
                          fontFamily:
                            "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                        }}
                      >
                        {r.matiere_nom} · lot {r.reference_lot}
                      </span>
                      <Badge
                        variant={
                          r.niveau_risque === 'eleve' ? 'danger' : 'warning'
                        }
                        className="shrink-0"
                      >
                        {r.niveau_risque === 'eleve'
                          ? 'Risque élevé'
                          : 'Modéré'}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs tabular-nums text-[var(--sf-muted)]">
                      Reçu {formatDate(r.date_reception)} · Afla{' '}
                      {r.analyse_aflatoxine_b1_ppb ?? '?'} · ZEA{' '}
                      {r.analyse_zearalenone_ppb ?? '?'} · DON{' '}
                      {r.analyse_don_ppb ?? '?'}
                    </div>
                    {r.niveau_risque === 'eleve' && (
                      <p className="mt-1.5 text-sm leading-snug text-[var(--sf-danger-ink)]">
                        <strong>Action immédiate</strong> : incorporer
                        Mycoprotect ou Mycofix à 2,5 kg/t, ou refuser le lot pour
                        truies gestantes et porcelets au sevrage.
                      </p>
                    )}
                    {r.niveau_risque === 'modere' && (
                      <p className="mt-1.5 text-sm leading-snug text-[var(--sf-warning-ink)]">
                        <strong>Recommandation</strong> : Toxy-Nil ou Detoxa Plus
                        à 1,5 kg/t.
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* REGISTRE DES LOTS — table dense hairline (ex-Card + Table shadcn) ------ */}
      <section className="space-y-2">
        <SectionLabel count={loadErr ? undefined : total}>
          Registre des lots
        </SectionLabel>
        {loadErr ? (
          <p className="py-4 text-sm text-[var(--sf-danger-ink)]">{loadErr}</p>
        ) : lots.length === 0 ? (
          <EmptyState
            icon={Bug}
            title="Aucun lot enregistré"
            description="Tracez chaque lot de matière première sensible (maïs, arachide, soja) pour activer la détection des risques mycotoxines."
          />
        ) : (
          <>
            {/* Desktop ≥768px : table dense */}
            <div className="hidden md:block overflow-x-auto border-b border-[var(--sf-line)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--sf-line)]">
                    <th className={TH_BASE} style={TH_STYLE}>
                      Référence
                    </th>
                    <th className={TH_BASE} style={TH_STYLE}>
                      Matière
                    </th>
                    <th className={TH_BASE} style={TH_STYLE}>
                      Réception
                    </th>
                    <th
                      className={`${TH_BASE} text-right`}
                      style={TH_STYLE}
                    >
                      Quantité kg
                    </th>
                    <th className={TH_BASE} style={TH_STYLE}>
                      Origine
                    </th>
                    <th
                      className={`${TH_BASE} text-right`}
                      style={TH_STYLE}
                    >
                      Afla ≤20
                    </th>
                    <th
                      className={`${TH_BASE} text-right`}
                      style={TH_STYLE}
                    >
                      ZEA ≤250
                    </th>
                    <th
                      className={`${TH_BASE} text-right`}
                      style={TH_STYLE}
                    >
                      DON ≤900
                    </th>
                    <th className={TH_BASE} style={TH_STYLE}>
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((l) => {
                    const st = statutLot(l)
                    return (
                      <tr
                        key={l.id}
                        className="border-b border-[var(--sf-line)] last:border-0 transition-colors hover:bg-[var(--sf-surface-1)]"
                      >
                        <td
                          className="p-2 font-semibold text-[var(--sf-ink)]"
                          style={{
                            fontFamily:
                              "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                          }}
                        >
                          {l.reference_lot}
                        </td>
                        <td className="p-2 text-[var(--sf-ink)]">
                          {l.matiere_premiere?.nom ?? '—'}
                        </td>
                        <td className="p-2 tabular-nums whitespace-nowrap text-[var(--sf-muted)]">
                          {formatDate(l.date_reception)}
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          {fmtNum(Number(l.quantite_kg), 0)}
                        </td>
                        <td className="p-2 text-[var(--sf-muted)]">
                          {l.origine ?? '—'}
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          {l.analyse_aflatoxine_b1_ppb !== null ? (
                            <span
                              className={
                                Number(l.analyse_aflatoxine_b1_ppb) > 20
                                  ? 'font-semibold text-[var(--sf-danger-ink)]'
                                  : ''
                              }
                            >
                              {fmtNum(Number(l.analyse_aflatoxine_b1_ppb), 1)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          {l.analyse_zearalenone_ppb !== null ? (
                            <span
                              className={
                                Number(l.analyse_zearalenone_ppb) > 250
                                  ? 'font-semibold text-[var(--sf-danger-ink)]'
                                  : ''
                              }
                            >
                              {fmtNum(Number(l.analyse_zearalenone_ppb), 1)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          {l.analyse_don_ppb !== null ? (
                            <span
                              className={
                                Number(l.analyse_don_ppb) > 900
                                  ? 'font-semibold text-[var(--sf-danger-ink)]'
                                  : ''
                              }
                            >
                              {fmtNum(Number(l.analyse_don_ppb), 1)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-2">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-[var(--sf-ink)]">
                            <Dot tone={toneStatutLot(st.tone)} />
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile <768px : cards verticales LABEL: VALUE */}
            <div className="md:hidden space-y-2.5">
              {lots.map((l) => {
                const st = statutLot(l)
                return (
                  <div
                    key={l.id}
                    className="border-b border-[var(--sf-line)] pb-2.5 last:border-0"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="text-base font-bold text-[var(--sf-ink)]"
                        style={{
                          fontFamily:
                            "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {l.reference_lot}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-[var(--sf-ink)]">
                        <Dot tone={toneStatutLot(st.tone)} />
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-[var(--sf-muted)]">
                      {l.matiere_premiere?.nom ?? '—'} ·{' '}
                      <span className="tabular-nums">
                        {fmtNum(Number(l.quantite_kg), 0)} kg
                      </span>{' '}
                      · reçu{' '}
                      <span className="tabular-nums">
                        {formatDate(l.date_reception)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs tabular-nums text-[var(--sf-muted)]">
                      Afla{' '}
                      <span
                        className={
                          l.analyse_aflatoxine_b1_ppb !== null &&
                          Number(l.analyse_aflatoxine_b1_ppb) > 20
                            ? 'font-semibold text-[var(--sf-danger-ink)]'
                            : 'text-[var(--sf-ink)]'
                        }
                      >
                        {fmtNum(l.analyse_aflatoxine_b1_ppb, 1)}
                      </span>{' '}
                      · ZEA{' '}
                      <span
                        className={
                          l.analyse_zearalenone_ppb !== null &&
                          Number(l.analyse_zearalenone_ppb) > 250
                            ? 'font-semibold text-[var(--sf-danger-ink)]'
                            : 'text-[var(--sf-ink)]'
                        }
                      >
                        {fmtNum(l.analyse_zearalenone_ppb, 1)}
                      </span>{' '}
                      · DON{' '}
                      <span
                        className={
                          l.analyse_don_ppb !== null &&
                          Number(l.analyse_don_ppb) > 900
                            ? 'font-semibold text-[var(--sf-danger-ink)]'
                            : 'text-[var(--sf-ink)]'
                        }
                      >
                        {fmtNum(l.analyse_don_ppb, 1)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* PRODUITS ANTI-MYCOTOXINES — catalogue dense (ex-Card + Sparkles) ------ */}
      <section className="space-y-2">
        <SectionLabel count={produits.length || undefined}>
          Produits anti-mycotoxines
        </SectionLabel>
        <p className="text-xs leading-snug text-[var(--sf-muted)]">
          Liants, enzymatiques et antioxydants à incorporer dans la ration en
          saison à risque ou sur lots suspects.
        </p>
        {produits.length === 0 ? (
          <p className="py-4 text-sm text-[var(--sf-muted)]">
            Aucun produit anti-mycotoxines référencé.
          </p>
        ) : (
          <>
            {/* Desktop ≥768px */}
            <div className="hidden md:block overflow-x-auto border-b border-[var(--sf-line)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--sf-line)]">
                    <th className={TH_BASE} style={TH_STYLE}>
                      Produit
                    </th>
                    <th className={TH_BASE} style={TH_STYLE}>
                      Fabricant
                    </th>
                    <th className={TH_BASE} style={TH_STYLE}>
                      Type
                    </th>
                    <th className={TH_BASE} style={TH_STYLE}>
                      Spectre
                    </th>
                    <th
                      className={`${TH_BASE} text-right whitespace-nowrap`}
                      style={TH_STYLE}
                    >
                      Dose kg/t
                    </th>
                    <th
                      className={`${TH_BASE} text-right whitespace-nowrap`}
                      style={TH_STYLE}
                    >
                      Coût FCFA/kg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {produits.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--sf-line)] last:border-0"
                    >
                      <td className="p-2 align-top">
                        <span
                          className="font-semibold text-[var(--sf-ink)]"
                          style={{
                            fontFamily:
                              "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                          }}
                        >
                          {p.nom}
                        </span>
                        {p.description ? (
                          <div className="mt-0.5 text-xs text-[var(--sf-muted)]">
                            {p.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-2 align-top whitespace-nowrap text-[var(--sf-ink)]">
                        {p.fabricant}
                      </td>
                      <td className="p-2 align-top">
                        <Badge variant="secondary">{p.type}</Badge>
                      </td>
                      <td className="p-2 align-top text-xs text-[var(--sf-muted)]">
                        {(p.spectre ?? []).join(', ') || '—'}
                      </td>
                      <td className="p-2 align-top text-right tabular-nums text-[var(--sf-ink)]">
                        {p.dose_kg_par_tonne_aliment !== null
                          ? fmtNum(Number(p.dose_kg_par_tonne_aliment), 1)
                          : '—'}
                      </td>
                      <td className="p-2 align-top text-right tabular-nums text-[var(--sf-ink)]">
                        {p.cout_fcfa_par_kg !== null
                          ? Number(p.cout_fcfa_par_kg).toLocaleString('fr-FR')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile <768px */}
            <div className="md:hidden space-y-2.5">
              {produits.map((p) => (
                <div
                  key={p.id}
                  className="border-b border-[var(--sf-line)] pb-2.5 last:border-0"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="text-base font-bold text-[var(--sf-ink)]"
                      style={{
                        fontFamily:
                          "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {p.nom}
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      {p.type}
                    </Badge>
                  </div>
                  {p.description ? (
                    <p className="mt-0.5 text-xs text-[var(--sf-muted)]">
                      {p.description}
                    </p>
                  ) : null}
                  <div className="mt-1 text-sm text-[var(--sf-muted)]">
                    {p.fabricant}
                    {(p.spectre ?? []).length
                      ? ` · ${(p.spectre ?? []).join(', ')}`
                      : ''}
                  </div>
                  <div className="mt-1 text-xs tabular-nums text-[var(--sf-muted)]">
                    Dose{' '}
                    <span className="text-[var(--sf-ink)]">
                      {p.dose_kg_par_tonne_aliment !== null
                        ? `${fmtNum(Number(p.dose_kg_par_tonne_aliment), 1)} kg/t`
                        : '—'}
                    </span>{' '}
                    · Coût{' '}
                    <span className="text-[var(--sf-ink)]">
                      {p.cout_fcfa_par_kg !== null
                        ? `${Number(p.cout_fcfa_par_kg).toLocaleString('fr-FR')} FCFA/kg`
                        : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* RAPPELS SAISONNIERS CI — registre de bonnes pratiques (ex-Card emoji) -- */}
      <section className="space-y-2">
        <SectionLabel>Prévention saisonnière (Côte d&apos;Ivoire)</SectionLabel>
        <dl className="divide-y divide-[var(--sf-line)] border-b border-[var(--sf-line)]">
          {[
            {
              t: 'Saison des pluies (avril – octobre)',
              d: 'Risque élevé aflatoxines maïs et arachide. Analyser systématiquement chaque lot. Stocker au sec et ventilé.',
            },
            {
              t: 'Stockage',
              d: 'Silos sous 14 % d’humidité, ventilation, rotation FIFO. Bâche au sol obligatoire.',
            },
            {
              t: 'Incorporation systématique',
              d: 'Mycoprotect, Mycofix ou Toxy-Nil à 1,5 – 2 kg/tonne pendant toute la saison à risque, sans attendre une analyse positive.',
            },
            {
              t: 'Eau',
              d: 'Température d’abreuvoir sous 28 °C pour limiter la multiplication des moisissures dans les cuves.',
            },
            {
              t: 'Animaux sensibles',
              d: 'Truies gestantes (avortements ZEA), porcelets au sevrage (immunodépression aflatoxines).',
            },
          ].map((row) => (
            <div
              key={row.t}
              className="grid gap-x-4 gap-y-0.5 py-2.5 sm:grid-cols-[16rem_1fr] sm:items-baseline"
            >
              <dt
                className="text-sm font-semibold text-[var(--sf-ink)]"
                style={{
                  fontFamily:
                    "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                }}
              >
                {row.t}
              </dt>
              <dd className="text-sm leading-snug text-[var(--sf-muted)]">
                {row.d}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
