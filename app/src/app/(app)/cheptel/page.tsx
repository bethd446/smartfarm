import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageTitle } from '@/components/ui/page-title'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { FormattedDateTime } from '@/components/ui/formatted-date'
import { PiggyBank, Baby, Mars, Layers, Activity, Skull } from 'lucide-react'
import { CheptelActions } from './_actions'
import { CheptelRowActions } from './_row-actions'
import { CheptelFab } from './_fab'
import { toneTruie } from '@/lib/colors'
import { BannerTransfertCroissance } from './_banner-transfert-croissance'
import { PorceletsTableBulk } from './_porcelets-table-bulk'

export const metadata: Metadata = {
  title: 'Cheptel',
}

/** Mapping ton sémantique → variante Badge atome carnet. */
const TONE_TO_VARIANT = {
  nominal: 'success',
  attendu: 'warning',
  urgence: 'danger',
  neutre: 'secondary',
} as const

type TabKey = 'truies' | 'cochettes' | 'verrats' | 'porcelets' | 'portees'

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'truies', label: 'Truies', icon: PiggyBank },
  { key: 'cochettes', label: 'Cochettes', icon: PiggyBank },
  { key: 'verrats', label: 'Verrats', icon: Mars },
  { key: 'porcelets', label: 'Porcelets', icon: Baby },
  { key: 'portees', label: 'Portées', icon: Layers },
]

const CAT_TRUIES = ['truie'] as const
const CAT_COCHETTES = ['cochette'] as const
const CAT_VERRATS = ['verrat'] as const
const CAT_PORCELETS = [
  'porcelet_lait',
  'porcelet_sevre',
  'porcelet_croissance',
  'porc_engraissement',
] as const

function isTab(v: string | undefined): v is TabKey {
  return (
    v === 'truies' ||
    v === 'cochettes' ||
    v === 'verrats' ||
    v === 'porcelets' ||
    v === 'portees'
  )
}

export default async function CheptelPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; filter?: string; action?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const action = sp.action ?? ''
  const tab: TabKey = action === 'bcs' ? 'truies' : isTab(sp.tab) ? sp.tab : 'truies'
  const q = (sp.q ?? '').trim()
  const filter = sp.filter ?? ''

  const sb = await createClient()

  // === Compteurs en parallèle (head:true → uniquement count, payload minimal) ===
  const countsSettled = await Promise.allSettled([
    sb.from('animaux').select('*', { count: 'exact', head: true }).in('statut', ['actif', 'malade']).is('deleted_at', null).in('categorie', CAT_TRUIES as unknown as string[]).eq('sexe', 'F'),
    sb.from('animaux').select('*', { count: 'exact', head: true }).in('statut', ['actif', 'malade']).is('deleted_at', null).in('categorie', CAT_COCHETTES as unknown as string[]).eq('sexe', 'F'),
    sb.from('animaux').select('*', { count: 'exact', head: true }).in('statut', ['actif', 'malade']).is('deleted_at', null).in('categorie', CAT_VERRATS as unknown as string[]),
    sb.from('animaux').select('*', { count: 'exact', head: true }).in('statut', ['actif', 'malade']).is('deleted_at', null).in('categorie', CAT_PORCELETS as unknown as string[]),
    sb.from('portees').select('*', { count: 'exact', head: true }),
  ])
  const counts: Record<TabKey, number | null> = {
    truies: countsSettled[0].status === 'fulfilled' ? (countsSettled[0].value.count ?? 0) : null,
    cochettes: countsSettled[1].status === 'fulfilled' ? (countsSettled[1].value.count ?? 0) : null,
    verrats: countsSettled[2].status === 'fulfilled' ? (countsSettled[2].value.count ?? 0) : null,
    porcelets: countsSettled[3].status === 'fulfilled' ? (countsSettled[3].value.count ?? 0) : null,
    portees: countsSettled[4].status === 'fulfilled' ? (countsSettled[4].value.count ?? 0) : null,
  }

  // === Données pour onglet actif ===
  const racesP = sb.from('races').select('id, nom').order('nom')

  let animaux: any[] = []
  let portees: any[] = []
  let batiments: { id: string; nom: string; type: string }[] = []
  // Map id → { stade_repro, jours_stade } (rempli pour onglet truies uniquement,
  // vide si la vue v_animaux_stade_repro n'existe pas encore — fallback graceful).
  const stadeReproById = new Map<string, { stade_repro: string; jours_stade: number | null }>()

  if (tab === 'portees') {
    let pq = sb
      .from('portees')
      .select('*, truie:truie_id(tag, nom), mb:mb_id(date_mb, nes_vivants, morts_nes, momifies)')
      .order('created_at', { ascending: false })
    const { data } = await pq
    portees = data ?? []
    if (q) {
      const qLow = q.toLowerCase()
      portees = portees.filter((p: any) => {
        const t = String(p.truie?.tag ?? '').toLowerCase()
        const n = String(p.truie?.nom ?? '').toLowerCase()
        const c = String(p.code ?? p.numero ?? '').toLowerCase()
        return t.includes(qLow) || n.includes(qLow) || c.includes(qLow)
      })
    }
  } else {
    let aq = sb.from('animaux').select('*, races(nom)').in('statut', ['actif', 'malade']).is('deleted_at', null).order('tag')
    if (tab === 'truies') {
      aq = aq.in('categorie', CAT_TRUIES as unknown as string[]).eq('sexe', 'F')
    } else if (tab === 'cochettes') {
      aq = aq.in('categorie', CAT_COCHETTES as unknown as string[]).eq('sexe', 'F')
    } else if (tab === 'verrats') {
      aq = aq.in('categorie', CAT_VERRATS as unknown as string[])
    } else if (tab === 'porcelets') {
      aq = aq.in('categorie', CAT_PORCELETS as unknown as string[])
    }
    
    // Phase 4.A : filtrer porcelets ≥24 kg si filter=pret_croissance
    if (filter === 'pret_croissance') {
      aq = aq.in('stade', ['demarrage_1', 'demarrage_2']).gte('poids_actuel_kg', 24)
    }
    
    if (q) {
      aq = aq.ilike('tag', `%${q}%`)
    }
    const { data } = await aq
    animaux = data ?? []

    // === Onglet porcelets : charger bâtiments pour bulk Transférer ===
    if (tab === 'porcelets') {
      const { data: bats } = await sb
        .from('batiments')
        .select('id, nom, type')
        .is('deleted_at', null)
        .order('nom')
      batiments = (bats ?? []) as { id: string; nom: string; type: string }[]
    }

    // === Onglet truies/cochettes : enrichir avec stade reproducteur (vue v_animaux_stade_repro) ===
    // Fallback graceful : si la vue n'existe pas (404) ou query échoue, on garde
    // le badge statut classique (cf colonne STATUT REPRO render).
    if ((tab === 'truies' || tab === 'cochettes') && animaux.length > 0) {
      const ids = animaux.map((a) => a.id)
      const { data: stadeRows, error: stadeErr } = await sb
        .from('v_animaux_stade_repro')
        .select('id, stade_repro, jours_stade')
        .in('id', ids)
      if (!stadeErr && stadeRows) {
        for (const row of stadeRows as Array<{ id: string; stade_repro: string; jours_stade: number | null }>) {
          stadeReproById.set(row.id, {
            stade_repro: row.stade_repro,
            jours_stade: row.jours_stade,
          })
        }
      }
    }
  }

  const { data: races } = await racesP

  return (
    <div className="space-y-6">
      {/* === Banner action=bcs : guide vers picker truie === */}
      {action === 'bcs' && (
        <div
          role="status"
          className="rounded-lg border px-5 py-4 flex items-start gap-4 flex-wrap"
          style={{
            background: 'var(--sf-info-bg, #D6E2EE)',
            borderColor: 'var(--sf-info-border, #8FA9C8)',
            color: 'var(--sf-info-ink, #1F3A55)',
          }}
        >
          <Activity className="h-5 w-5 flex-shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1">Saisir BCS truie</h3>
            <p className="text-sm opacity-90">
              Sélectionne une truie dans la liste ci-dessous, puis utilise « Voir la fiche » pour saisir le BCS du jour.
            </p>
          </div>
        </div>
      )}
      {/* === Banner action=mortalite : guide vers picker animal === */}
      {action === 'mortalite' && (
        <div
          role="status"
          className="rounded-lg border px-5 py-4 flex items-start gap-4 flex-wrap"
          style={{
            background: 'var(--sf-warning-bg, #FEF3C7)',
            borderColor: 'var(--sf-warning-border, #D97706)',
            color: 'var(--sf-warning-ink, #7C2D12)',
          }}
        >
          <Skull className="h-5 w-5 flex-shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1">Déclarer une mortalité</h3>
            <p className="text-sm opacity-90">
              Trouve l'animal mort dans la liste ci-dessous, ouvre sa fiche puis utilise le menu d'actions « Marquer mort ».
            </p>
          </div>
        </div>
      )}

      {/* === Banner Phase 4.A : porcelets prêts pour Croissance === */}
      {filter === 'pret_croissance' && animaux.length > 0 && (
        <BannerTransfertCroissance count={animaux.length} />
      )}

      {/* === Header de page === */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <PageTitle
            eyebrow="ÉLEVAGE"
            icon={<PiggyBank className="h-9 w-9 text-[var(--sf-primary)]" />}
            className="mb-1"
          >
            Cheptel
          </PageTitle>
          <p
            className="text-sm text-[var(--sf-muted)]"
            style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
          >
            {counts.truies ?? 0} truies · {counts.cochettes ?? 0} cochettes ·{' '}
            {counts.verrats ?? 0} verrats · {counts.porcelets ?? 0} porcelets ·{' '}
            {counts.portees ?? 0} portées
          </p>
        </div>
        <CheptelActions races={races ?? []} />
      </div>

      {/* === Onglets (Link-based, server-friendly) === */}
      <nav
        aria-label="Catégories du cheptel"
        className="flex gap-1 border-b border-[var(--sf-line)] overflow-x-auto"
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = key === tab
          const c = counts[key]
          return (
            <Link
              key={key}
              href={`/cheptel?tab=${key}`}
              aria-current={active ? 'page' : undefined}
              className={[
                'inline-flex items-center gap-2 px-4 py-2.5 min-h-11 text-sm font-semibold whitespace-nowrap',
                'border-b-2 -mb-px transition-colors',
                active
                  ? 'border-[var(--sf-primary)] text-[var(--sf-primary)]'
                  : 'border-transparent text-[var(--sf-muted)] hover:text-[var(--sf-ink)] hover:bg-[var(--sf-surface-2)]/40',
              ].join(' ')}
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              <Icon className="h-4 w-4" />
              <span className="uppercase tracking-wide">{label}</span>
              <span className="tabular-nums text-[var(--sf-subtle)] font-normal">{c ?? '—'}</span>
            </Link>
          )
        })}
      </nav>

      {/* === Barre recherche (form GET → searchParams) === */}
      <form
        method="get"
        action="/cheptel"
        className="flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="tab" value={tab} />
        <label className="flex-1 min-w-[200px]">
          <span
            className="block text-[11px] uppercase tracking-[0.1em] text-[var(--sf-muted)] mb-1"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            Rechercher
          </span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={
              tab === 'portees' ? 'Code portée, tag ou nom truie…' : 'Tag (ex : B.22)…'
            }
            className="h-11 w-full rounded-md border border-[var(--sf-line)] bg-[var(--sf-surface)] px-3 text-sm text-[var(--sf-ink)] placeholder:text-[var(--sf-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]/30"
          />
        </label>
        <button
          type="submit"
          className="h-11 rounded-md border border-[var(--sf-line)] bg-[var(--sf-surface-2)]/40 px-4 text-sm font-semibold text-[var(--sf-ink)] hover:bg-[var(--sf-surface-2)]"
        >
          Rechercher
        </button>
        {q ? (
          <Link
            href={`/cheptel?tab=${tab}`}
            className="h-11 inline-flex items-center px-3 text-sm text-[var(--sf-muted)] hover:text-[var(--sf-ink)]"
          >
            Effacer
          </Link>
        ) : null}
      </form>

      {/* === Contenu onglet === */}
      {tab === 'portees' ? (
        <PorteesTable rows={portees} />
      ) : tab === 'porcelets' ? (
        <PorceletsTableBulk rows={animaux as never} batiments={batiments} />
      ) : (
        <AnimauxTable rows={animaux} tab={tab} stadeReproById={stadeReproById} />
      )}

      {/* === FAB mobile === */}
      <CheptelFab races={races ?? []} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────────────────────

/** Mapping stade reproducteur (v_animaux_stade_repro) → variante Badge + label. */
const STADE_REPRO_MAP: Record<
  string,
  { variant: 'success' | 'warning' | 'outline' | 'secondary'; label: string; withJours: boolean }
> = {
  gestante: { variant: 'success', label: 'GESTANTE', withJours: true },
  allaitante: { variant: 'warning', label: 'ALLAITANTE', withJours: true },
  vide: { variant: 'outline', label: 'VIDE', withJours: false },
  'pré-saillie': { variant: 'secondary', label: 'PRÉ-SAILLIE', withJours: false },
}

function AnimauxTable({
  rows,
  tab,
  stadeReproById,
}: {
  rows: any[]
  tab: TabKey
  stadeReproById: Map<string, { stade_repro: string; jours_stade: number | null }>
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={PiggyBank}
        title={
          tab === 'truies'
            ? 'Aucune truie'
            : tab === 'cochettes'
            ? 'Aucune cochette'
            : tab === 'verrats'
            ? 'Aucun verrat'
            : 'Aucun porcelet'
        }
        description="Aucun animal ne correspond aux filtres en cours."
      />
    )
  }

  return (
    <section
      aria-labelledby="cheptel-liste-titre"
      className="md:border-t-2"
      style={{ borderTopColor: 'var(--sf-primary)' }}
    >
      <ResponsiveTable
        data={rows}
        columns={[
          {
            key: 'tag',
            label: 'TAG',
            primary: true,
            className: 'font-mono font-bold text-[var(--sf-ink)] tabular-nums',
          },
          {
            key: 'nom',
            label: 'NOM',
            className: 'text-[var(--sf-ink)]',
          },
          {
            key: 'sexe',
            label: 'SEXE',
            render: (v: string) => (
              <Badge variant={v === 'M' ? 'outline' : 'secondary'}>
                {v === 'M' ? '♂ Mâle' : '♀ Femelle'}
              </Badge>
            ),
          },
          {
            key: 'categorie',
            label: 'CATÉGORIE',
            render: (v: string) => (
              <Badge variant="outline" className="capitalize">
                {v}
              </Badge>
            ),
          },
          {
            key: 'races',
            label: 'RACE',
            render: (races: any) => (
              <span className="text-[var(--sf-ink-soft)]">{races?.nom ?? '—'}</span>
            ),
          },
          {
            key: 'date_naissance',
            label: 'NAISSANCE',
            className: 'text-[var(--sf-muted)] tabular-nums',
            render: (v: string | null) =>
              v ? <FormattedDateTime date={v} format="date" /> : '—',
          },
          {
            key: 'statut',
            label: tab === 'truies' || tab === 'cochettes' ? 'STADE REPRO' : 'STATUT',
            render: (v: string, item: any) => {
              // Onglet truies/cochettes → afficher stade reproducteur (vue v_animaux_stade_repro)
              if (tab === 'truies' || tab === 'cochettes') {
                const stade = stadeReproById.get(item.id)
                if (stade) {
                  const cfg = STADE_REPRO_MAP[stade.stade_repro]
                  if (cfg) {
                    const txt = cfg.withJours && stade.jours_stade != null
                      ? `${cfg.label} J${stade.jours_stade}`
                      : cfg.label
                    return <Badge variant={cfg.variant}>{txt}</Badge>
                  }
                }
                // Fallback : vue absente ou stade inconnu → badge statut classique
              }
              const tone = toneTruie(item.rang_porte, item.statut)
              const aSortir = tone === 'attendu' && item.statut === 'actif'
              const statutVariant = aSortir ? 'warning' : TONE_TO_VARIANT[tone]
              return (
                <Badge variant={statutVariant}>
                  {v}
                  {aSortir ? ' · à sortir' : ''}
                </Badge>
              )
            },
          },
          {
            key: 'actions',
            label: 'ACTIONS',
            render: (_: any, item: any) => (
              <CheptelRowActions
                animalId={item.id}
                animalTag={item.tag}
                stade={item.stade}
                poidsActuel={item.poids_actuel_kg}
              />
            ),
          },
        ]}
        getRowKey={(item) => item.id}
        emptyMessage={
          tab === 'truies'
            ? 'Aucune truie'
            : tab === 'cochettes'
            ? 'Aucune cochette'
            : tab === 'verrats'
            ? 'Aucun verrat'
            : 'Aucun porcelet'
        }
      />
    </section>
  )
}

function PorteesTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Aucune portée enregistrée"
        description="Les portées seront listées ici dès la première mise-bas saisie."
      />
    )
  }

  return (
    <section aria-labelledby="cheptel-portees-titre">
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm border-b border-[var(--sf-line)] border-t-2"
          style={{ borderTopColor: 'var(--sf-primary)' }}
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
              <th className="py-3 pr-4 font-semibold">Code</th>
              <th className="py-3 pr-4 font-semibold">Truie</th>
              <th className="py-3 pr-4 font-semibold">Date MB</th>
              <th className="py-3 pr-4 font-semibold">Nés vivants</th>
              <th className="py-3 pr-4 font-semibold">Morts-nés</th>
              <th className="py-3 pr-4 font-semibold">Effectif actuel</th>
              <th className="py-3 pr-4 font-semibold">Phase</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p: any) => {
              const truieTag = p.truie?.tag ?? '—'
              const truieNom = p.truie?.nom ?? null
              const dateMb = p.mb?.date_mb ?? p.date_mise_bas ?? null
              const nv = p.mb?.nes_vivants ?? p.nes_vivants ?? null
              const mn = p.mb?.morts_nes ?? null
              return (
                <tr
                  key={p.id}
                  className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40"
                >
                  <td className="py-3 pr-4 font-mono font-bold text-[var(--sf-ink)]">
                    {p.code ?? p.numero ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-[var(--sf-ink)]">
                    <span className="font-mono font-bold">{truieTag}</span>
                    {truieNom ? <span className="text-[var(--sf-muted)] ml-2">{truieNom}</span> : null}
                  </td>
                  <td className="py-3 pr-4 text-[var(--sf-muted)] tabular-nums">
                    {dateMb ? <FormattedDateTime date={dateMb} format="date" /> : '—'}
                  </td>
                  <td className="py-3 pr-4 tabular-nums">{nv ?? '—'}</td>
                  <td className="py-3 pr-4 tabular-nums">{mn ?? '—'}</td>
                  <td className="py-3 pr-4 tabular-nums">{p.effectif_actuel ?? '—'}</td>
                  <td className="py-3 pr-4">
                    {p.phase ? (
                      <Badge variant="outline" className="capitalize">
                        {p.phase}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
