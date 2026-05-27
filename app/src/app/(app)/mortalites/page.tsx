import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageTitle } from '@/components/ui/page-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skull, Plus } from 'lucide-react'
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
  const topTotal = topMotifs.reduce((s, [, n]) => s + n, 0) || 1

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

  const triggerButton = (
    <Button
      size="lg"
      className="h-12 text-base"
      style={{
        background: 'var(--sf-danger-ink, #7A2A1F)',
        color: '#fff',
      }}
    >
      <Plus className="h-5 w-5 mr-2" />
      Déclarer mortalité
    </Button>
  )

  return (
    <div className="space-y-6">
      {/* === Header === */}
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
            {mortalites.length} mortalités sur cette page
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
            trigger={triggerButton}
          />
        </div>
      </div>

      {/* === KPI === */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.1em] text-[var(--sf-muted)]">
              Total YTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tabular-nums text-[var(--sf-ink)]">
              {kpiYtd}
            </div>
            <div className="text-xs text-[var(--sf-muted)] mt-1">
              animaux depuis le 1er janvier
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.1em] text-[var(--sf-muted)]">
              Mois courant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tabular-nums text-[var(--sf-ink)]">
              {kpiMonth}
            </div>
            <div className="text-xs text-[var(--sf-muted)] mt-1">
              animaux ce mois-ci
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-[0.1em] text-[var(--sf-muted)]">
              Top 3 motifs (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topMotifs.length === 0 ? (
              <div className="text-xs text-[var(--sf-muted)]">
                Aucune mortalité YTD
              </div>
            ) : (
              <div className="space-y-1.5">
                {topMotifs.map(([motif, n]) => {
                  const pct = Math.round((n / topTotal) * 100)
                  return (
                    <div key={motif}>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--sf-ink)] font-medium">
                          {MOTIF_LABELS[motif]}
                        </span>
                        <span className="tabular-nums text-[var(--sf-muted)]">
                          {n} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--sf-line,#d4cfc1)] rounded-full overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            background: 'var(--sf-danger-ink, #7A2A1F)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === Filtres (form GET) === */}
      <Card>
        <CardContent className="p-3">
          <form
            method="GET"
            action="/mortalites"
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <label
                htmlFor="motif"
                className="block text-xs uppercase tracking-[0.1em] text-[var(--sf-muted)] mb-1"
              >
                Motif
              </label>
              <select
                id="motif"
                name="motif"
                defaultValue={filterMotif ?? ''}
                className="h-10 px-2 border border-[var(--sf-line)] bg-transparent text-sm text-[var(--sf-ink)]"
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
                className="block text-xs uppercase tracking-[0.1em] text-[var(--sf-muted)] mb-1"
              >
                Mois (YYYY-MM)
              </label>
              <input
                id="mois"
                name="mois"
                type="month"
                defaultValue={filterMois ?? ''}
                className="h-10 px-2 border border-[var(--sf-line)] bg-transparent text-sm text-[var(--sf-ink)]"
              />
            </div>
            <Button type="submit" variant="outline" size="default">
              Filtrer
            </Button>
            {(filterMotif || filterMois) && (
              <a
                href="/mortalites"
                className="text-xs text-[var(--sf-muted)] underline self-center"
              >
                Réinitialiser
              </a>
            )}
          </form>
        </CardContent>
      </Card>

      {/* === Tableau / EmptyState === */}
      {mortalites.length === 0 ? (
        <EmptyState
          icon={Skull}
          title="Aucune mortalité enregistrée"
          description="Bonne nouvelle — le cheptel se porte bien. Toute déclaration apparaîtra ici."
          tone="good"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historique ({mortalites.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Cible</th>
                    <th className="text-left p-3 font-medium">Motif</th>
                    <th className="text-right p-3 font-medium">Nb</th>
                    <th className="text-left p-3 font-medium">Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {mortalites.map((m) => {
                    const dateFr = new Date(m.date_mortalite).toLocaleDateString(
                      'fr-FR'
                    )
                    let cibleLabel: string
                    if (m.animal) {
                      cibleLabel = m.animal.nom
                        ? `${m.animal.nom} (${m.animal.tag})`
                        : m.animal.tag
                    } else if (m.bande) {
                      cibleLabel = m.bande.code
                        ? `${m.bande.code} — ${m.bande.nom}`
                        : m.bande.nom
                    } else {
                      cibleLabel = '—'
                    }
                    const motifLabel = MOTIF_LABELS[m.motif]
                    return (
                      <tr
                        key={m.id}
                        className="border-b last:border-0 hover:bg-muted/20"
                      >
                        <td className="p-3 tabular-nums whitespace-nowrap">
                          {dateFr}
                        </td>
                        <td className="p-3">
                          <div>{cibleLabel}</div>
                          <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--sf-muted)]">
                            {m.animal ? 'Individuel' : 'Masse / bande'}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="danger">{motifLabel}</Badge>
                          {m.motif === 'autre' && m.motif_libre && (
                            <div className="text-xs text-[var(--sf-muted)] mt-1">
                              {m.motif_libre}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right tabular-nums font-medium">
                          {m.nb_animaux}
                        </td>
                        <td className="p-3 text-xs text-[var(--sf-muted)] max-w-[280px]">
                          {m.observations ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === Pagination simple === */}
      {mortalites.length === PAGE_SIZE && (
        <div className="flex justify-end gap-2">
          {page > 1 && (
            <a
              href={`/mortalites?page=${page - 1}${filterMotif ? `&motif=${filterMotif}` : ''}${filterMois ? `&mois=${filterMois}` : ''}`}
              className="text-sm underline text-[var(--sf-ink)]"
            >
              ← Précédent
            </a>
          )}
          <a
            href={`/mortalites?page=${page + 1}${filterMotif ? `&motif=${filterMotif}` : ''}${filterMois ? `&mois=${filterMois}` : ''}`}
            className="text-sm underline text-[var(--sf-ink)]"
          >
            Suivant →
          </a>
        </div>
      )}
    </div>
  )
}
