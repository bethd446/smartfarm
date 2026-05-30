import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PageTitle } from '@/components/ui/page-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { RelativeTime } from '@/components/ui/relative-time'
import { Skull, Calendar, TrendingDown, AlertTriangle } from 'lucide-react'
import { DialogMortalite } from './_dialog-mortalite'
import type { AnimalOption, BandeOption } from './_dialog-mortalite'
import {
  MOTIFS_MORTALITE,
  MOTIF_LABELS,
  type MotifMortalite,
} from './_schemas'

export const metadata: Metadata = {
  title: 'Mortalités',
}

type MortaliteRow = {
  id: string
  ferme_id: string
  animal_id: string | null
  bande_id: string | null
  nb_animaux: number
  motif: MotifMortalite
  motif_libre: string | null
  date_mortalite: string
  observations: string | null
  declarer_user_id: string | null
  created_at: string
  animal: { tag: string; nom: string | null } | null
  bande: { code: string | null; nom: string } | null
}

const PAGE_SIZE = 50

export default async function MortalitesPage({
  searchParams,
}: {
  searchParams: Promise<{
    motif?: string
    mois?: string // format YYYY-MM
    page?: string
    action?: string
  }>
}) {
  const sb = await createClient()
  const sp = (await searchParams) ?? {}
  const autoOpenNew = sp.action === 'new'

  const filterMotif =
    sp.motif && MOTIFS_MORTALITE.includes(sp.motif as MotifMortalite)
      ? (sp.motif as MotifMortalite)
      : null
  const filterMois = sp.mois && /^\d{4}-\d{2}$/.test(sp.mois) ? sp.mois : null
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // 1) Liste paginée mortalités + jointures (best-effort si bandes absent)
  let listQuery = sb
    .from('mortalites')
    .select(
      `id, ferme_id, animal_id, bande_id, nb_animaux, motif, motif_libre,
       date_mortalite, observations, declarer_user_id, created_at,
       animal:animal_id(tag,nom),
       bande:bande_id(code,nom)`
    )
    .order('date_mortalite', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filterMotif) listQuery = listQuery.eq('motif', filterMotif)
  if (filterMois) {
    const [y, m] = filterMois.split('-').map((s) => parseInt(s, 10))
    const dStart = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10)
    const dEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) // dernier jour
    listQuery = listQuery.gte('date_mortalite', dStart).lte('date_mortalite', dEnd)
  }

  const { data: mortalitesRaw, error: errList } = await listQuery
  if (errList) {
    console.error('[mortalites] erreur chargement:', errList.message)
  }
  const mortalites = ((mortalitesRaw ?? []) as unknown) as MortaliteRow[]

  // 2) KPI : Total YTD, mois courant, top 3 motifs (sur 365j glissants)
  const today = new Date()
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1))
    .toISOString()
    .slice(0, 10)
  const monthStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
  )
    .toISOString()
    .slice(0, 10)

  const [{ data: kpiYtdRaw }, { data: kpiMonthRaw }, { data: kpiTopRaw }] =
    await Promise.all([
      sb
        .from('mortalites')
        .select('nb_animaux')
        .gte('date_mortalite', yearStart),
      sb
        .from('mortalites')
        .select('nb_animaux')
        .gte('date_mortalite', monthStart),
      sb
        .from('mortalites')
        .select('motif, nb_animaux')
        .gte('date_mortalite', yearStart),
    ])

  const kpiYtd = (kpiYtdRaw ?? []).reduce(
    (s, r) => s + Number((r as { nb_animaux: number }).nb_animaux ?? 0),
    0
  )
  const kpiMonth = (kpiMonthRaw ?? []).reduce(
    (s, r) => s + Number((r as { nb_animaux: number }).nb_animaux ?? 0),
    0
  )
  const motifCounts = new Map<MotifMortalite, number>()
  for (const row of (kpiTopRaw ?? []) as {
    motif: MotifMortalite
    nb_animaux: number
  }[]) {
    motifCounts.set(
      row.motif,
      (motifCounts.get(row.motif) ?? 0) + Number(row.nb_animaux ?? 0)
    )
  }
  const topMotifs = Array.from(motifCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const topMotifLead = topMotifs[0] ?? null
  // Seuil "critique" mois — déclenche le ton danger sur la cellule mois courant.
  const monthCritical = kpiMonth >= 5

  // 3) Options dialog : animaux actifs ferme courante + bandes
  const { data: animauxRaw } = await sb
    .from('animaux')
    .select('id, tag, nom, categorie')
    .eq('statut', 'actif')
    .is('deleted_at', null)
    .order('tag', { ascending: true })
    .limit(500)

  const animauxOptions: AnimalOption[] = (animauxRaw ?? []).map((a) => ({
    id: a.id as string,
    tag: (a.tag ?? '') as string,
    nom: (a.nom ?? null) as string | null,
    categorie: (a.categorie ?? null) as string | null,
  }))

  // Bandes : graceful (table peut être absente / vide selon ferme)
  let bandesOptions: BandeOption[] = []
  let bandesAvailable = false
  try {
    const { data: bandesRaw, error: errBandes } = await sb
      .from('bandes')
      .select('id, code, nom')
      .is('deleted_at', null)
      .order('nom', { ascending: true })
      .limit(200)
    if (!errBandes && bandesRaw) {
      bandesOptions = bandesRaw.map((b) => ({
        id: b.id as string,
        code: (b.code ?? null) as string | null,
        nom: (b.nom ?? '') as string,
      }))
      bandesAvailable = bandesOptions.length > 0
    }
  } catch (e) {
    console.warn('[mortalites] bandes indisponible, mode animal-only:', e)
  }

  // Cellules bandeau KPI dense (Pattern A — alimentation/_components/nutrition-stats).
  const kpiCells = [
    {
      icon: TrendingDown,
      tone: 'var(--sf-ink, #1a1a1a)',
      period: 'YTD',
      label: 'Total animaux',
      value: kpiYtd,
      sub: 'depuis 1er janvier',
      critical: false,
    },
    {
      icon: monthCritical ? AlertTriangle : Calendar,
      tone: monthCritical ? 'var(--sf-danger-ink, #7A2A1F)' : 'var(--sf-ink, #1a1a1a)',
      period: monthCritical ? 'critique' : 'mois',
      label: 'Mois courant',
      value: kpiMonth,
      sub: 'animaux ce mois-ci',
      critical: monthCritical,
    },
    {
      icon: Skull,
      tone: 'var(--sf-danger-ink, #7A2A1F)',
      period: 'YTD',
      label: 'Motif #1',
      value: topMotifLead ? topMotifLead[1] : 0,
      sub: topMotifLead ? MOTIF_LABELS[topMotifLead[0]] : 'aucune mortalité',
      critical: false,
    },
  ]

  return (
    <div className="space-y-6">
      {/* === Header (Pattern E) === */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageTitle
            eyebrow="ÉLEVAGE"
            icon={<Skull className="h-9 w-9 text-[var(--sf-danger-ink,#7A2A1F)]" />}
            className="mb-1"
          >
            Mortalités
          </PageTitle>
          <p
            className="text-sm text-[var(--sf-muted)]"
            style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
          >
            <span className="tabular-nums font-semibold text-[var(--sf-ink)]">
              {mortalites.length}
            </span>{' '}
            mortalité{mortalites.length > 1 ? 's' : ''} sur cette page
            {filterMotif && ` · motif : ${MOTIF_LABELS[filterMotif]}`}
            {filterMois && ` · mois : ${filterMois}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DialogMortalite
            animaux={animauxOptions}
            bandes={bandesOptions}
            bandesAvailable={bandesAvailable}
            defaultOpen={autoOpenNew}
          />
        </div>
      </div>

      {/* === KPI bandeau dense (Pattern A) === */}
      <section
        aria-label="Indicateurs mortalités"
        className="border-t-2 border-b border-[var(--sf-line)]"
        style={{ borderTopColor: 'var(--sf-danger-ink, #7A2A1F)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {kpiCells.map((c, i) => {
            const Icon = c.icon
            return (
              <div
                key={c.label}
                className={[
                  'min-h-[44px] px-3 py-3 sm:px-4',
                  'border-[var(--sf-line)]',
                  i > 0 ? 'border-t sm:border-t-0 sm:border-l' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                {...(c.critical ? { role: 'alert', 'aria-live': 'polite' as const } : {})}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: c.tone }} />
                  <span
                    className="text-[10px] uppercase tracking-[0.16em] shrink-0"
                    style={{
                      color: c.critical ? c.tone : 'var(--sf-subtle, #8A7F6D)',
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

      {/* === Filtres (form GET) — bandeau hairline dense === */}
      <form
        method="GET"
        action="/mortalites"
        className="flex flex-wrap items-end gap-3 border-t border-b border-[var(--sf-line)] py-3 px-1"
      >
        <div>
          <label
            htmlFor="motif"
            className="block text-[10px] uppercase tracking-[0.16em] text-[var(--sf-muted)] mb-1"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            Motif
          </label>
          <select
            id="motif"
            name="motif"
            defaultValue={filterMotif ?? ''}
            className="h-11 min-w-[10rem] px-2 border border-[var(--sf-line)] bg-transparent text-sm text-[var(--sf-ink)]"
          >
            <option value="">Tous</option>
            {MOTIFS_MORTALITE.map((m) => (
              <option key={m} value={m}>
                {MOTIF_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="mois"
            className="block text-[10px] uppercase tracking-[0.16em] text-[var(--sf-muted)] mb-1"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            Mois (YYYY-MM)
          </label>
          <input
            id="mois"
            name="mois"
            type="month"
            defaultValue={filterMois ?? ''}
            className="h-11 px-2 border border-[var(--sf-line)] bg-transparent text-sm text-[var(--sf-ink)]"
          />
        </div>
        <Button type="submit" variant="outline" size="default" className="min-h-[44px]">
          Filtrer
        </Button>
        {(filterMotif || filterMois) && (
          <a
            href="/mortalites"
            className="text-xs text-[var(--sf-muted)] underline self-center min-h-[44px] flex items-center"
          >
            Réinitialiser
          </a>
        )}
      </form>

      {/* === Table dense hairline (Pattern C) ou EmptyState === */}
      {mortalites.length === 0 ? (
        <EmptyState
          icon={Skull}
          title="Aucune mortalité enregistrée"
          description="Bonne nouvelle — le cheptel se porte bien. Toute déclaration apparaîtra ici."
          tone="good"
        />
      ) : (
        <div>
          <h2
            id="historique-titre"
            className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)] mt-2 mb-3"
          >
            Historique{' '}
            <span className="text-[var(--sf-muted)] tabular-nums font-semibold">
              ({mortalites.length})
            </span>
          </h2>
          <div
            className="overflow-x-auto -mx-4 sm:mx-0 border-t-2"
            style={{ borderTopColor: 'var(--sf-danger-ink, #7A2A1F)' }}
          >
            <table
              className="w-full min-w-[800px] text-sm"
              aria-labelledby="historique-titre"
            >
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
                  <th className="py-3 px-4 font-semibold">Cible</th>
                  <th className="py-3 px-4 font-semibold">Motif</th>
                  <th className="py-3 px-4 font-semibold text-right">Nb</th>
                  <th className="py-3 px-4 font-semibold">Observations</th>
                </tr>
              </thead>
              <tbody>
                {mortalites.map((m) => {
                  const motifLabel = MOTIF_LABELS[m.motif]
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-[var(--sf-line)] last:border-0 hover:bg-[var(--sf-surface-2)]/40"
                    >
                      <td className="py-3 px-4 tabular-nums whitespace-nowrap text-[var(--sf-ink)]">
                        <RelativeTime date={m.date_mortalite} addSuffix />
                      </td>
                      <td className="py-3 px-4">
                        {m.animal ? (
                          <>
                            <span className="font-medium text-[var(--sf-ink)]">
                              {m.animal.nom ?? m.animal.tag}
                            </span>{' '}
                            {m.animal.nom && (
                              <span className="text-sm text-[var(--sf-subtle)] font-mono">
                                ({m.animal.tag})
                              </span>
                            )}
                          </>
                        ) : m.bande ? (
                          <>
                            <span className="font-medium text-[var(--sf-ink)]">
                              {m.bande.nom}
                            </span>{' '}
                            {m.bande.code && (
                              <span className="text-sm text-[var(--sf-subtle)] font-mono">
                                ({m.bande.code})
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[var(--sf-subtle)]">—</span>
                        )}
                        <div
                          className="text-[10px] uppercase tracking-[0.08em] text-[var(--sf-muted)] mt-0.5"
                          style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                        >
                          {m.animal ? 'Individuel' : 'Masse / bande'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="danger">{motifLabel}</Badge>
                        {m.motif === 'autre' && m.motif_libre && (
                          <div className="text-xs text-[var(--sf-muted)] mt-1">
                            {m.motif_libre}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-[var(--sf-ink)]">
                        {m.nb_animaux}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--sf-muted)] max-w-[280px]">
                        {m.observations ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === Pagination simple === */}
      {mortalites.length === PAGE_SIZE && (
        <div className="flex justify-end gap-4">
          {page > 1 && (
            <a
              href={`/mortalites?page=${page - 1}${filterMotif ? `&motif=${filterMotif}` : ''}${filterMois ? `&mois=${filterMois}` : ''}`}
              className="text-sm underline text-[var(--sf-ink)] min-h-[44px] flex items-center"
            >
              ← Précédent
            </a>
          )}
          <a
            href={`/mortalites?page=${page + 1}${filterMotif ? `&motif=${filterMotif}` : ''}${filterMois ? `&mois=${filterMois}` : ''}`}
            className="text-sm underline text-[var(--sf-ink)] min-h-[44px] flex items-center"
          >
            Suivant →
          </a>
        </div>
      )}
    </div>
  )
}
