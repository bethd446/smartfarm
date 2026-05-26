import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Bug,
  Plus,
  ChevronLeft,
  Info,
  Sparkles,
  CloudRain,
  ShieldCheck,
} from 'lucide-react'

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

function statutLot(l: LotRow): {
  label: string
  bg: string
  fg: string
} {
  if (l.analyse_aflatoxine_b1_ppb === null) {
    const age = ageJours(l.date_reception)
    if (age > 7) {
      return {
        label: 'Non analysé (>7 j)',
        bg: 'var(--sf-warning-bg, #F5E0B8)',
        fg: 'var(--sf-warning-ink, #5A3E0E)',
      }
    }
    return {
      label: 'Non analysé',
      bg: 'transparent',
      fg: 'var(--sf-muted, #5C5346)',
    }
  }
  if (!l.conforme) {
    return {
      label: 'Non conforme',
      bg: 'var(--sf-danger-bg, #F1D4CE)',
      fg: 'var(--sf-danger-ink, #7A2A1F)',
    }
  }
  return {
    label: 'Conforme',
    bg: 'var(--sf-success-bg, #D6E3CC)',
    fg: 'var(--sf-success-ink, #1F3B12)',
  }
}

function bordureRisque(niveau: RecoAntiMyco['niveau_risque']): string {
  switch (niveau) {
    case 'eleve':
      return 'rgb(220,38,38)'
    case 'modere':
      return 'rgb(217,119,6)'
    case 'non_analyse':
      return 'rgb(100,116,139)'
    default:
      return 'rgb(34,197,94)'
  }
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
    lots = ((r1.data as unknown) as LotRow[])
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
      loadErr =
        'Impossible de charger les lots — réessayez plus tard.'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/sanitaire"
            className="text-xs uppercase tracking-[0.08em] text-[var(--sf-muted,#5C5346)] hover:text-[var(--sf-primary)] inline-flex items-center gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
            Retour aux soins
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--sf-ink,#1a1a1a)] mt-1">
            <Bug className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Mycotoxines
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Suivi des analyses sur lots maïs / arachide / tourteau soja
            — alerte R18 si un lot reçu depuis &gt;7 j n&apos;est pas analysé.
          </p>
        </div>
        <DialogEnregistrerLot
          trigger={
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Enregistrer un lot
            </Button>
          }
          matieres={matieres}
        />
      </div>

      {/* ENCART PÉDAGOGIQUE -------------------------------------------------- */}
      <Card
        style={{
          background: 'var(--sf-warning-bg, #F5E0B8)',
          color: 'var(--sf-warning-ink, #5A3E0E)',
        }}
      >
        <CardContent className="p-5 flex gap-3">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <div className="font-medium">
              Mycotoxines : aflatoxines, zéaralénone, DON
            </div>
            <div>
              Seuils porcs (UE) : aflatoxine B1 ≤ <strong>20 ppb</strong>,
              zéaralénone ≤ <strong>250 ppb</strong>, DON ≤{' '}
              <strong>900 ppb</strong>.
            </div>
            <div>
              Saison des pluies en Côte d&apos;Ivoire = risque élevé sur maïs
              et tourteau d&apos;arachide. Toujours analyser avant
              incorporation à la formule.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          style={{
            background: 'var(--sf-bg, #F5F1E8)',
            color: 'var(--sf-ink, #1a1a1a)',
          }}
        >
          <CardContent className="p-5">
            <div className="text-3xl font-bold tabular-nums">{total}</div>
            <div className="eyebrow text-[11px] mt-1 text-[var(--sf-muted,#5C5346)]">
              Lots enregistrés
            </div>
          </CardContent>
        </Card>
        <Card
          style={{
            background:
              nonAnalyses > 0
                ? 'var(--sf-warning-bg, #F5E0B8)'
                : 'var(--sf-bg, #F5F1E8)',
            color:
              nonAnalyses > 0
                ? 'var(--sf-warning-ink, #5A3E0E)'
                : 'var(--sf-ink, #1a1a1a)',
          }}
        >
          <CardContent className="p-5">
            <div className="text-3xl font-bold tabular-nums">
              {nonAnalyses}
            </div>
            <div className="eyebrow text-[11px] mt-1">Non analysés</div>
          </CardContent>
        </Card>
        <Card
          style={{
            background:
              nonConformes > 0
                ? 'var(--sf-danger-bg, #F1D4CE)'
                : 'var(--sf-success-bg, #D6E3CC)',
            color:
              nonConformes > 0
                ? 'var(--sf-danger-ink, #7A2A1F)'
                : 'var(--sf-success-ink, #1F3B12)',
          }}
        >
          <CardContent className="p-5">
            <div className="text-3xl font-bold tabular-nums">
              {nonConformes}
            </div>
            <div className="eyebrow text-[11px] mt-1">
              Non conformes (UE porcs)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CATALOGUE PRODUITS ANTI-MYCOTOXINES --------------------------------- */}
      <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            Produits anti-mycotoxines recommandés
          </CardTitle>
          <CardDescription>
            Liants + enzymatiques + antioxydants à incorporer dans la ration
            en saison à risque ou sur lots suspects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {produits.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Catalogue vide"
              description="Aucun produit anti-mycotoxines référencé."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left p-2">Produit</th>
                    <th className="text-left p-2">Fabricant</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Spectre</th>
                    <th className="text-right p-2 whitespace-nowrap">
                      Dose (kg/t)
                    </th>
                    <th className="text-right p-2 whitespace-nowrap">
                      Coût (FCFA/kg)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {produits.map((p) => (
                    <tr key={p.id} className="border-b last:border-b-0">
                      <td className="p-2 font-semibold">
                        {p.nom}
                        {p.description ? (
                          <div className="text-xs font-normal text-muted-foreground mt-0.5">
                            {p.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-2 whitespace-nowrap">{p.fabricant}</td>
                      <td className="p-2">
                        <Badge variant="secondary">{p.type}</Badge>
                      </td>
                      <td className="p-2 text-xs">
                        {(p.spectre ?? []).join(', ')}
                      </td>
                      <td className="p-2 text-right font-mono tabular-nums">
                        {p.dose_kg_par_tonne_aliment !== null
                          ? fmtNum(Number(p.dose_kg_par_tonne_aliment), 1)
                          : '—'}
                      </td>
                      <td className="p-2 text-right font-mono tabular-nums">
                        {p.cout_fcfa_par_kg !== null
                          ? Number(p.cout_fcfa_par_kg).toLocaleString('fr-FR')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RAPPELS SAISONNIERS CI ---------------------------------------------- */}
      <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/20 dark:border-orange-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="h-5 w-5 text-orange-600" />
            Rappels saisonniers (Côte d&apos;Ivoire)
          </CardTitle>
          <CardDescription>
            Bonnes pratiques de prévention selon la saison et le stockage.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            🌧️ <strong>Saison des pluies (avril-octobre)</strong> : risque
            élevé aflatoxines maïs / arachide. Analyser systématiquement
            chaque lot. Stocker au sec, ventilé.
          </p>
          <p>
            📦 <strong>Stockage</strong> : silos &lt; 14% d&apos;humidité,
            ventilation, rotation FIFO. Bâche au sol obligatoire.
          </p>
          <p>
            🍃 <strong>Incorporation systématique</strong> : ajouter
            Mycoprotect / Mycofix / Toxy-Nil à 1,5–2 kg/tonne d&apos;aliment
            pendant toute la saison à risque, sans attendre une analyse
            positive.
          </p>
          <p>
            💧 <strong>Eau</strong> : T° abreuvoir &lt; 28 °C limite la
            multiplication des moisissures dans les cuves.
          </p>
          <p>
            🐷 <strong>Animaux sensibles</strong> : truies gestantes
            (avortements ZEA), porcelets sevrage (immunodépression Afla).
          </p>
        </CardContent>
      </Card>

      {/* RECOMMANDATIONS PAR LOT --------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Lots à risque — recommandations</CardTitle>
          <CardDescription>
            Synthèse automatique sur les lots maïs / arachide / soja
            d&apos;après les analyses mycotoxines saisies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recosARisque.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Aucun lot à risque"
              description="Tous les lots analysés sont en dessous des seuils d'action."
            />
          ) : (
            <ul className="space-y-2">
              {recosARisque.map((r) => (
                <li
                  key={r.lot_id}
                  className="border-l-4 p-3 rounded-r-md bg-muted/20"
                  style={{ borderColor: bordureRisque(r.niveau_risque) }}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-semibold">
                        {r.matiere_nom} — lot {r.reference_lot}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Reçu {formatDate(r.date_reception)} · Afla{' '}
                        {r.analyse_aflatoxine_b1_ppb ?? '?'} · ZEA{' '}
                        {r.analyse_zearalenone_ppb ?? '?'} · DON{' '}
                        {r.analyse_don_ppb ?? '?'}
                      </div>
                    </div>
                    <Badge
                      variant={
                        r.niveau_risque === 'eleve'
                          ? 'danger'
                          : r.niveau_risque === 'modere'
                          ? 'warning'
                          : r.niveau_risque === 'non_analyse'
                          ? 'secondary'
                          : 'success'
                      }
                    >
                      {r.niveau_risque === 'eleve'
                        ? '🔴 Risque élevé'
                        : r.niveau_risque === 'modere'
                        ? '🟠 Modéré'
                        : r.niveau_risque === 'non_analyse'
                        ? '⚪ Non analysé'
                        : '🟢 Faible'}
                    </Badge>
                  </div>
                  {r.niveau_risque === 'eleve' && (
                    <p className="text-sm mt-2 text-[var(--sf-danger-ink,#7A2A1F)]">
                      ⚠️ <strong>Action immédiate</strong> : incorporer
                      Mycoprotect / Mycofix à 2,5 kg/t, ou refuser le lot
                      pour truies gestantes / porcelets sevrage.
                    </p>
                  )}
                  {r.niveau_risque === 'modere' && (
                    <p className="text-sm mt-2 text-[var(--sf-warning-ink,#5A3E0E)]">
                      💡 <strong>Recommandation</strong> : Toxy-Nil ou
                      Detoxa Plus à 1,5 kg/t.
                    </p>
                  )}
                  {r.niveau_risque === 'non_analyse' && (
                    <p className="text-sm mt-2 text-[var(--sf-muted,#5C5346)]">
                      📋 Faire analyser ce lot avant toute incorporation.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* TABLE LOTS ---------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Lots maïs / arachide / tourteau soja
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadErr ? (
            <p className="p-6 text-sm text-[var(--sf-danger-ink,#7A2A1F)]">
              {loadErr}
            </p>
          ) : lots.length === 0 ? (
            <div className="p-2">
              <EmptyState
                icon={Bug}
                title="Aucun lot enregistré"
                description="Tracez chaque lot de matière première sensible (maïs, arachide, soja) pour activer la détection des risques mycotoxines."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Réception</TableHead>
                  <TableHead className="text-right">Quantité (kg)</TableHead>
                  <TableHead>Origine</TableHead>
                  <TableHead className="text-right">
                    Afla B1
                    <br />
                    (≤20)
                  </TableHead>
                  <TableHead className="text-right">
                    ZEA
                    <br />
                    (≤250)
                  </TableHead>
                  <TableHead className="text-right">
                    DON
                    <br />
                    (≤900)
                  </TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((l) => {
                  const st = statutLot(l)
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        {l.reference_lot}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.matiere_premiere?.nom ?? '—'}
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {formatDate(l.date_reception)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(Number(l.quantite_kg), 0)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.origine ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.analyse_aflatoxine_b1_ppb !== null ? (
                          <span
                            className={
                              Number(l.analyse_aflatoxine_b1_ppb) > 20
                                ? 'text-[var(--sf-danger-ink,#7A2A1F)] font-medium'
                                : ''
                            }
                          >
                            {fmtNum(Number(l.analyse_aflatoxine_b1_ppb), 1)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.analyse_zearalenone_ppb !== null ? (
                          <span
                            className={
                              Number(l.analyse_zearalenone_ppb) > 250
                                ? 'text-[var(--sf-danger-ink,#7A2A1F)] font-medium'
                                : ''
                            }
                          >
                            {fmtNum(Number(l.analyse_zearalenone_ppb), 1)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.analyse_don_ppb !== null ? (
                          <span
                            className={
                              Number(l.analyse_don_ppb) > 900
                                ? 'text-[var(--sf-danger-ink,#7A2A1F)] font-medium'
                                : ''
                            }
                          >
                            {fmtNum(Number(l.analyse_don_ppb), 1)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{
                            background: st.bg,
                            color: st.fg,
                          }}
                          variant={
                            st.label === 'Non analysé' ? 'outline' : 'default'
                          }
                        >
                          {st.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
