import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PageTitle } from '@/components/ui/page-title'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ExportButton } from '@/components/export-button'
import { RelativeTime } from '@/components/ui/relative-time'
import { Baby, Heart, Milk, Activity } from 'lucide-react'
import { toneTauxPortee } from '@/lib/colors'
import { AnimalLabel } from '@/components/ui/animal-label'
import { TERRAIN } from '@/lib/terrain-labels'
import { DialogMiseBas } from './_dialog-mise-bas'
import { DialogSevrage } from './_dialog-sevrage'
import { DialogAdoption } from './_dialog-adoption'
import { MisesBasFab } from './_fab'

// Fenetre allaitement standard porc CI : 28j (max realiste 35j si retard sevrage)
const FENETRE_ADOPTION_JOURS = 35

export const metadata: Metadata = {
  title: 'Mises bas & Sevrages',
}

/** Mapping ton sémantique → variante Badge atome carnet. */
const TONE_TO_VARIANT = {
  nominal: 'success',
  attendu: 'warning',
  urgence: 'danger',
  neutre: 'secondary',
} as const

export default async function MisesBasPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) {
  const sb = await createClient()
  const sp = (await searchParams) ?? {}
  const autoOpenNew = sp.action === 'new'

  // 1) Mises-bas — requête CŒUR sans dépendance à `sevrages` (table parfois bloquée
  //    par RLS/GRANT côté authenticated). Si la jointure plantait, on perdait
  //    TOUT le compteur "X portées" + l'historique. On scinde donc.
  const { data: mbBase, error: mbErr } = await sb
    .from('mises_bas')
    .select(`*, truie:truie_id(tag,nom)`)
    .order('date_mise_bas', { ascending: false })

  let mb: any[] = (mbBase ?? []) as any[]

  // 2) Sevrages : best-effort. Si la table est inaccessible, on continue
  //    sans sevrage plutôt que de casser toute la page.
  if (mb.length > 0) {
    const mbIds = mb.map((m) => m.id)
    const { data: sevData } = await sb
      .from('sevrages')
      .select('mb_id, date_sevrage, nb_sevres, poids_total_kg')
      .in('mb_id', mbIds)
    if (sevData && sevData.length > 0) {
      const sevByMb = new Map<string, any[]>()
      for (const s of sevData as any[]) {
        const arr = sevByMb.get(s.mb_id) ?? []
        arr.push(s)
        sevByMb.set(s.mb_id, arr)
      }
      mb = mb.map((m) => ({ ...m, sevrages: sevByMb.get(m.id) ?? [] }))
    } else {
      mb = mb.map((m) => ({ ...m, sevrages: [] }))
    }
  }

  if (mbErr) {
    // Erreur sur la requête principale : on log côté serveur, on n'expose RIEN à l'utilisateur.
    console.error('[mises-bas] erreur chargement mises_bas:', mbErr.message)
  }

  // 3) Saillies avec diagnostic POSITIF + sans mise-bas, pour le formulaire "Nouvelle mise bas"
  //    Même logique : on scinde pour ne pas dépendre de `diagnostics_gestation` (RLS instable).
  const { data: salliesBase } = await sb
    .from('saillies')
    .select(`id, date_saillie, truie:truie_id(tag,nom)`)
    .order('date_saillie', { ascending: false })

  let saillies: any[] = (salliesBase ?? []) as any[]

  if (saillies.length > 0) {
    const saillieIds = saillies.map((s) => s.id)
    const [{ data: diagData }, { data: mbForSaillie }] = await Promise.all([
      sb
        .from('diagnostics_gestation')
        .select('saillie_id, resultat')
        .in('saillie_id', saillieIds),
      sb.from('mises_bas').select('id, saillie_id').in('saillie_id', saillieIds),
    ])
    const diagBySaillie = new Map<string, any[]>()
    for (const d of (diagData ?? []) as any[]) {
      const arr = diagBySaillie.get(d.saillie_id) ?? []
      arr.push(d)
      diagBySaillie.set(d.saillie_id, arr)
    }
    const mbBySaillie = new Map<string, any[]>()
    for (const m of (mbForSaillie ?? []) as any[]) {
      const arr = mbBySaillie.get(m.saillie_id) ?? []
      arr.push(m)
      mbBySaillie.set(m.saillie_id, arr)
    }
    saillies = saillies.map((s) => ({
      ...s,
      diagnostics_gestation: diagBySaillie.get(s.id) ?? [],
      mises_bas: mbBySaillie.get(s.id) ?? [],
    }))
  }

  const saillesPourMb = ((saillies ?? []) as any[])
    .filter(
      (s) =>
        s.diagnostics_gestation?.some((d: any) => d.resultat === 'positif') &&
        (!s.mises_bas || s.mises_bas.length === 0)
    )
    .map((s) => ({
      id: s.id as string,
      truie_tag: (s.truie?.tag ?? '') as string,
      truie_nom: (s.truie?.nom ?? null) as string | null,
      date_saillie: s.date_saillie as string,
    }))

  // Mises-bas sans sevrage, pour le formulaire "Sevrage"
  const misesBasSansSevrage = ((mb ?? []) as any[])
    .filter((m) => !m.sevrages || m.sevrages.length === 0)
    .map((m) => ({
      id: m.id as string,
      truie_tag: (m.truie?.tag ?? '') as string,
      truie_nom: (m.truie?.nom ?? null) as string | null,
      date_mise_bas: m.date_mise_bas as string,
      nes_vivants: Number(m.nes_vivants ?? 0),
    }))

  // Bâtiments disponibles pour sevrage (type = démarrage ou fallback permissif)
  const { data: batiments } = await sb
    .from('batiments')
    .select('id, nom, type, capacite_max, occupation_actuelle')
    .in('type', ['demarrage', 'croissance', 'porcin'])
    .is('deleted_at', null)
    .order('nom')

  const batimentsDisponibles = (batiments ?? []).map((b) => ({
    id: b.id as string,
    nom: b.nom as string,
    type: b.type as string,
    capacite_max: Number(b.capacite_max ?? 0),
    occupation_actuelle: Number(b.occupation_actuelle ?? 0),
  }))

  // === C9 — Adoptions : portees en allaitement actuel (<=35j post-MB,
  //    non sevrees) et historique 30j ===
  const today = new Date()
  const limAllaitementMs =
    today.getTime() - FENETRE_ADOPTION_JOURS * 24 * 60 * 60 * 1000

  const misesBasAllaitantes = ((mb ?? []) as any[])
    .filter((m) => {
      // Pas encore sevree
      if (m.sevrages && m.sevrages.length > 0) return false
      // Dans la fenetre allaitement
      const dMb = new Date(m.date_mb).getTime()
      if (Number.isNaN(dMb)) return false
      return dMb >= limAllaitementMs && (Number(m.nes_vivants) || 0) >= 0
    })
    .map((m) => ({
      id: m.id as string,
      truie_tag: (m.truie?.tag ?? '') as string,
      truie_nom: (m.truie?.nom ?? null) as string | null,
      date_mb: m.date_mb as string,
      nes_vivants: Number(m.nes_vivants ?? 0),
    }))

  // Adoptions recentes (30j) — best-effort, table peut etre absente avant migration
  const lim30j = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  let adoptionsRecentes: any[] = []
  try {
    const { data: adoptions } = await sb
      .from('adoptions')
      .select(
        `id, date_adoption, nb_porcelets, motif_adoption, motif_libre, observations,
         source:mb_source_id(id, truie:truie_id(tag, nom)),
         destination:mb_destination_id(id, truie:truie_id(tag, nom))`
      )
      .gte('date_adoption', lim30j)
      .order('date_adoption', { ascending: false })
      .limit(50)
    adoptionsRecentes = (adoptions ?? []) as any[]
  } catch {
    // Table absente (migration pas encore appliquee) — section masquee
    adoptionsRecentes = []
  }

  const MOTIF_LABELS: Record<string, string> = {
    surcharge_donneuse: 'Surcharge donneuse',
    perte_receveuse: 'Perte receveuse',
    egalisation_taille: 'Égalisation',
    sante_porcelet: 'Santé porcelet',
    autre: 'Autre',
  }

  // === KPI bandeau (Pattern A) — agrégats temps réel ============
  const totalPortees = mb.length
  const totalNesVivants = mb.reduce((acc, m) => acc + Number(m.nes_vivants ?? 0), 0)
  const totalNesTotaux = mb.reduce((acc, m) => acc + Number(m.nes_totaux ?? 0), 0)
  const ratioVivantsGlobal = totalNesTotaux > 0 ? totalNesVivants / totalNesTotaux : 0
  const allaitantesCount = misesBasAllaitantes.length
  const sevrees30j = mb.filter((m) => {
    const sev = m.sevrages?.[0]
    if (!sev) return false
    const ds = new Date(sev.date_sevrage).getTime()
    if (Number.isNaN(ds)) return false
    return ds >= today.getTime() - 30 * 24 * 60 * 60 * 1000
  }).length

  const kpiCells = [
    {
      icon: Baby,
      tone: 'var(--sf-ink, #1a1a1a)',
      period: 'Total',
      label: 'Portées',
      value: String(totalPortees),
      sub: 'Mises bas enregistrées',
    },
    {
      icon: Heart,
      tone: 'var(--sf-success-ink, #1F3B12)',
      period: 'cumul',
      label: 'Nés vivants',
      value: String(totalNesVivants),
      sub: `${Math.round(ratioVivantsGlobal * 100)}% sur ${totalNesTotaux} nés`,
    },
    {
      icon: Milk,
      tone: 'var(--sf-warning-ink, #5A3E0E)',
      period: '≤35 j',
      label: 'Allaitement',
      value: String(allaitantesCount),
      sub: 'Portées sous la mère',
    },
    {
      icon: Activity,
      tone: 'var(--sf-ink, #1a1a1a)',
      period: '30 j',
      label: 'Sevrages',
      value: String(sevrees30j),
      sub: 'Portées sevrées récemment',
    },
  ]

  return (
    <div className="space-y-6">
      {/* === Header de page : PageTitle unifié (Pattern E) === */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageTitle
            eyebrow="ÉLEVAGE"
            icon={<Baby className="h-9 w-9 text-[var(--sf-primary)]" />}
            className="mb-1"
          >
            {TERRAIN.mise_bas.titre} &amp; {TERRAIN.sevrage.titre}
          </PageTitle>
          <p
            className="text-sm font-semibold tabular-nums text-[var(--sf-muted)]"
            style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
          >
            {totalPortees} portées enregistrées
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton table="mises_bas" />
          <DialogAdoption mises_bas_allaitantes={misesBasAllaitantes} />
          <DialogSevrage
            mises_bas_sans_sevrage={misesBasSansSevrage}
            batiments_disponibles={batimentsDisponibles}
          />
          <DialogMiseBas
            saillies={saillesPourMb}
            defaultOpen={autoOpenNew}
          />
        </div>
      </div>

      {/* === KPI bandeau dense (Pattern A) === */}
      <section
        aria-label="Indicateurs mises bas & sevrages"
        className="border-t-2 border-b border-[var(--sf-line)]"
        style={{ borderTopColor: 'var(--sf-primary)' }}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {kpiCells.map((c, i) => {
            const Icon = c.icon
            return (
              <div
                key={c.label}
                className={[
                  'min-h-[44px] px-3 py-3 sm:px-4',
                  'border-[var(--sf-line)]',
                  i % 2 === 1 ? 'border-l' : '',
                  'lg:border-l',
                  i % 4 === 0 ? 'lg:border-l-0' : '',
                  i >= 2 ? 'border-t lg:border-t-0' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: c.tone }} />
                  <span
                    className="text-[10px] uppercase tracking-[0.16em] shrink-0"
                    style={{
                      color: 'var(--sf-subtle, #8A7F6D)',
                      fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                    }}
                  >
                    {c.period}
                  </span>
                </div>
                <div
                  className="mt-1.5 text-2xl font-bold tabular-nums leading-tight"
                  style={{ color: c.tone }}
                >
                  {c.value}
                </div>
                <div
                  className="mt-1 text-[11px] uppercase tracking-[0.12em] leading-tight"
                  style={{
                    color: 'var(--sf-muted, #5C5346)',
                    fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  }}
                >
                  {c.label}
                </div>
                <div
                  className="mt-0.5 text-[11px] tabular-nums leading-tight line-clamp-1"
                  style={{ color: 'var(--sf-subtle, #8A7F6D)' }}
                >
                  {c.sub}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* === Historique des mises-bas : table dense (Pattern C) === */}
      {(mb ?? []).length === 0 ? (
        <EmptyState
          icon={Baby}
          title="Aucune mise-bas enregistrée"
          description="Les mises-bas apparaîtront ici après saisie. Cliquez sur 'Nouvelle mise bas' pour démarrer."
        />
      ) : (
        <section aria-labelledby="historique-mb-titre">
          <div className="flex items-baseline justify-between mb-3">
            <h2
              id="historique-mb-titre"
              className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)]"
            >
              Historique des portées
            </h2>
            <span
              className="text-[11px] uppercase tracking-[0.14em] tabular-nums text-[var(--sf-muted)]"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              {mb!.length} portées
            </span>
          </div>
          <div
            className="overflow-x-auto -mx-4 sm:mx-0 border-t-2"
            style={{ borderTopColor: 'var(--sf-primary,#2D4A1F)' }}
          >
            <table className="w-full min-w-[960px] text-sm">
              <thead
                className="border-b border-[var(--sf-line)] text-left text-[var(--sf-muted)]"
                style={{
                  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                <tr>
                  <th className="py-3 px-4 font-semibold">Truie</th>
                  <th className="py-3 px-4 font-semibold">Mise bas</th>
                  <th className="py-3 px-4 font-semibold text-right">Nés</th>
                  <th className="py-3 px-4 font-semibold text-right">Vivants</th>
                  <th className="py-3 px-4 font-semibold text-right">Mort-nés</th>
                  <th className="py-3 px-4 font-semibold text-right">Momifiés</th>
                  <th className="py-3 px-4 font-semibold text-right">Écrasés</th>
                  <th className="py-3 px-4 font-semibold text-right">Poids</th>
                  <th className="py-3 px-4 font-semibold text-right">BCS</th>
                  <th className="py-3 px-4 font-semibold">Taux</th>
                  <th className="py-3 px-4 font-semibold">Sevrage</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(mb ?? []).map((m: any) => {
                  const sev = m.sevrages?.[0]
                  const ratio = m.nes_totaux > 0 ? m.nes_vivants / m.nes_totaux : 0
                  const tone = toneTauxPortee(ratio)
                  const tauxVariant = TONE_TO_VARIANT[tone]
                  const allaitante = misesBasAllaitantes.find((a) => a.id === m.id)
                  const peutAdopter = !!allaitante && misesBasAllaitantes.length >= 2
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-[var(--sf-line)] last:border-0 hover:bg-[var(--sf-surface-2)]/40"
                    >
                      <td className="py-3 px-4">
                        {m.truie ? (
                          <AnimalLabel animal={m.truie} format="inline" />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-[var(--sf-ink)]">
                        <RelativeTime date={m.date_mise_bas} addSuffix />
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[var(--sf-ink)]">
                        {m.nes_totaux}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums text-[var(--sf-ink)]">
                        {m.nes_vivants}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[var(--sf-danger-ink,#7A2A1F)]">
                        {m.nes_morts ?? 0}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[var(--sf-warning-ink,#5C4416)]">
                        {m.momifies ?? 0}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[var(--sf-danger-ink,#7A2A1F)]">
                        {m.ecrases ?? 0}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[var(--sf-ink)]">
                        {m.poids_portee_kg != null ? `${m.poids_portee_kg} kg` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[var(--sf-ink)]">
                        {m.bcs_truie != null ? Number(m.bcs_truie).toFixed(1) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={tauxVariant}>{Math.round(ratio * 100)}%</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {sev ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="success">{sev.nb_sevres} sevrés</Badge>
                            <span className="text-[10px] tabular-nums text-[var(--sf-subtle)]">
                              <RelativeTime date={sev.date_sevrage} addSuffix />
                            </span>
                          </div>
                        ) : (
                          <Badge variant="secondary">En cours</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {peutAdopter ? (
                          <DialogAdoption
                            mises_bas_allaitantes={misesBasAllaitantes}
                            source_id_prefill={m.id}
                          />
                        ) : (
                          <span className="text-[var(--sf-subtle)] text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* === C9 — ADOPTIONS RÉCENTES (30j) — table dense (Pattern C) === */}
      {adoptionsRecentes.length > 0 && (
        <section aria-labelledby="adoptions-recentes-titre">
          <div className="flex items-baseline justify-between mb-3">
            <h2
              id="adoptions-recentes-titre"
              className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)]"
            >
              Adoptions récentes
            </h2>
            <span
              className="text-[11px] uppercase tracking-[0.14em] tabular-nums text-[var(--sf-muted)]"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              30 j · {adoptionsRecentes.length}
            </span>
          </div>
          <div
            className="overflow-x-auto -mx-4 sm:mx-0 border-t-2"
            style={{ borderTopColor: 'var(--sf-primary,#2D4A1F)' }}
          >
            <table className="w-full min-w-[720px] text-sm">
              <thead
                className="border-b border-[var(--sf-line)] text-left text-[var(--sf-muted)]"
                style={{
                  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Source</th>
                  <th className="py-3 px-4 font-semibold">Destination</th>
                  <th className="py-3 px-4 font-semibold text-right">Porcelets</th>
                  <th className="py-3 px-4 font-semibold">Motif</th>
                </tr>
              </thead>
              <tbody>
                {adoptionsRecentes.map((a: any) => (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--sf-line)] last:border-0 hover:bg-[var(--sf-surface-2)]/40"
                  >
                    <td className="py-3 px-4 tabular-nums text-[var(--sf-ink)]">
                      <RelativeTime date={a.date_adoption} addSuffix />
                    </td>
                    <td className="py-3 px-4">
                      {a.source?.truie ? (
                        <AnimalLabel animal={a.source.truie} format="inline" />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {a.destination?.truie ? (
                        <AnimalLabel
                          animal={a.destination.truie}
                          format="inline"
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold tabular-nums text-[var(--sf-ink)]">
                      {a.nb_porcelets}
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--sf-ink)]">
                      {MOTIF_LABELS[a.motif_adoption] ?? a.motif_adoption}
                      {a.motif_adoption === 'autre' && a.motif_libre ? (
                        <span className="text-[var(--sf-muted)]">
                          {' '}
                          — {a.motif_libre}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* === FAB mobile === */}
      <MisesBasFab saillies={saillesPourMb} />
    </div>
  )
}
