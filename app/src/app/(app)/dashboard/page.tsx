/* Hallmark · macrostructure: 05-workbench · screen: /dashboard · tone: terrain-vivant · theme: Terre & Mil (DESIGN.md) · pre-emit: P5 H5 E4 S5 R4 V5 */
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import Link from 'next/link'
import {
  AlertCircle,
  Clock,
  Calendar,
  Baby,
  CheckCircle2,
  Zap,
  Skull,
  Target,
  Hourglass,
  ListChecks,
  ArrowUpRight,
  PackageOpen,
} from 'lucide-react'
import { toneTauxPortee } from '@/lib/colors'
import { AnimalLabel } from '@/components/ui/animal-label'
import { TYPE_LABELS, cleanDescription } from '@/lib/terrain-labels'
import { AlertesWidget } from './_components/alertes-widget'
import { isAlerte } from '@/lib/stock-helpers'
import { TipDuJour } from './_components/tip-du-jour'
import {
  KpiTechCard,
  toneIssf,
  toneProductivite,
  toneTmm,
  toneNesVivants,
} from '@/components/kpi/kpi-tech-card'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tableau de bord',
}

/** Map priorité (numérique 1/2/3 OU sémantique critique/elevee/normale) → Badge. */
function prioMeta(p: number | string | null | undefined): {
  variant: 'danger' | 'warning' | 'info' | 'secondary'
  Icon: typeof AlertCircle
  label: string
} {
  if (p === 1) return { variant: 'danger', Icon: AlertCircle, label: 'URGENT' }
  if (p === 2) return { variant: 'warning', Icon: Clock, label: 'IMPORTANT' }
  if (p === 3) return { variant: 'info', Icon: Calendar, label: 'NORMAL' }
  if (typeof p === 'string') {
    const s = p.toLowerCase().replace(/^p[_-]?/, '')
    if (s === 'critique' || s === 'urgent')
      return { variant: 'danger', Icon: AlertCircle, label: 'CRITIQUE' }
    if (s === 'elevee' || s === 'eleve' || s === 'important' || s === 'haute' || s === 'high')
      return { variant: 'warning', Icon: Clock, label: 'ÉLEVÉE' }
    if (s === 'moyenne' || s === 'normale' || s === 'normal' || s === 'medium')
      return { variant: 'info', Icon: Calendar, label: 'MOYENNE' }
    if (s === 'info' || s === 'basse' || s === 'low' || s === 'faible')
      return { variant: 'secondary', Icon: Calendar, label: 'INFO' }
  }
  return { variant: 'secondary', Icon: Calendar, label: 'INFO' }
}

/** Map ton portée → variante Badge. */
function variantPortee(ratio: number): 'success' | 'warning' | 'danger' {
  const t = toneTauxPortee(ratio)
  if (t === 'nominal') return 'success'
  if (t === 'attendu') return 'warning'
  return 'danger'
}

/** Date courte FR : "21 mai" */
function dateFrShort(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase()
}

export default async function DashboardPage() {
  const sb = await createClient()

  // Récupère le nom de la ferme du user pour l'eyebrow du header (au lieu du hardcode "YAMOUSSOUKRO")
  let fermeNom: string | null = null
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      const { data: uf } = await sb
        .from('utilisateur_fermes')
        .select('fermes(nom)')
        .eq('utilisateur_id', (await sb.from('utilisateurs').select('id').eq('auth_id', user.id).maybeSingle()).data?.id ?? '')
        .limit(1)
        .maybeSingle()
      fermeNom = (uf?.fermes as { nom?: string } | null)?.nom ?? null
    }
  } catch { /* fallback null */ }

  const [
    { count: nbAnimaux },
    { count: nbTruies },
    { count: nbVerrats },
    { count: nbBandesActives },
    { data: stockAlertes },
    { data: dernieresMb },
    { data: prochainsEvts },
    { data: kpiTechFerme },
  ] = await Promise.all([
    sb.from('animaux').select('*', { count: 'exact', head: true }).in('statut', ['actif', 'malade']).is('deleted_at', null),
    sb.from('animaux').select('*', { count: 'exact', head: true }).eq('categorie', 'truie').in('statut', ['actif', 'malade']).is('deleted_at', null),
    sb.from('animaux').select('*', { count: 'exact', head: true }).eq('categorie', 'verrat').in('statut', ['actif', 'malade']).is('deleted_at', null),
    // « Portées en cours » = mises_bas avec porcelets encore non sevrés.
    // La table `bandes` étant vide (concept non utilisé pour l'instant),
    // on remonte le nombre de portées récentes des 8 dernières semaines
    // (durée max d'allaitement+sevrage). Plus parlant qu'un compteur figé à 0.
    sb.from('mises_bas')
      .select('*', { count: 'exact', head: true })
      .gte('date_mb', new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
    sb.from('matieres_premieres').select('*').order('stock_actuel', { ascending: true }).limit(5),
    sb.from('mises_bas').select('*, animaux:truie_id(tag,nom)').order('date_mise_bas', { ascending: false }).limit(5),
    sb.from('v_calendrier_repro').select('*').limit(5),
    sb.from('v_kpi_techniques_ferme').select('*').limit(1),
  ])

  const kpiTech = (kpiTechFerme ?? [])[0] as
    | {
        issf_moyen: number | null
        productivite_moyenne: number | null
        tmm_moyen_pct: number | null
        nes_vivants_par_portee_moyen: number | null
      }
    | undefined

  const today = dateFrShort(new Date())

  // Compteur stocks en alerte (stock < seuil_alerte) — helper centralisé
  const nbStocksAlerte = (stockAlertes ?? []).filter(isAlerte).length
  const evts = prochainsEvts ?? []
  const evtsRetard = evts.filter((e: any) => (e.jours_restants ?? 0) < 0).length

  // === Voix du registre carnet/atelier ===
  // Étiquette de colonne d'établi : Big Shoulders 11px uppercase, tracking serré
  const panelLabel =
    'font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.16em] text-[var(--sf-muted)] font-bold'
  // Lien d'ouverture d'établi — texte autonome, touch 44px, hover underline
  const openCls =
    'group/open inline-flex items-center gap-1 min-h-[44px] py-2 text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--sf-primary)] hover:underline'

  // Relevé d'atelier (status-bar du poste) — pas de hero-chiffre, lecture en bande
  const releve: Array<{ k: string; v: number; href: string }> = [
    { k: 'Cheptel actif', v: nbAnimaux ?? 0, href: '/cheptel' },
    { k: 'Truies', v: nbTruies ?? 0, href: '/cheptel?categorie=truie' },
    { k: 'Verrats', v: nbVerrats ?? 0, href: '/cheptel?categorie=verrat' },
    { k: 'Portées · 8 sem.', v: nbBandesActives ?? 0, href: '/mises-bas' },
  ]

  return (
    <div className="space-y-6 lg:space-y-7">
      {/* ====================================================================
          EN-TÊTE DE POSTE — workbench « lite »
          Titre fonctionnel discret + relevé d'atelier en bande (status-bar).
          Remplace le hero-chiffre géant : les effectifs deviennent un relevé
          dense, pas une vedette. C'est ce qui distingue /dashboard de /kpi.
      ==================================================================== */}
      <header className="border-b-2 border-[var(--sf-primary)] pb-4">
        <p className={panelLabel}>
          Poste de travail · {today}{fermeNom ? ' · ' + fermeNom.toUpperCase() : ''}
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h1 className="font-[family-name:var(--sf-font-display)] text-3xl sm:text-4xl font-black uppercase tracking-[0.02em] text-[var(--sf-ink)] leading-[1.02] [overflow-wrap:anywhere] min-w-0">
            Tableau de bord
          </h1>
          {/* Relevé d'atelier — effectifs en notation tabulaire, filets entre cellules.
              Grille 2×2 sur mobile (320px safe), bande de 4 sur sm+. */}
          <dl className="grid w-full grid-cols-2 gap-px border border-[var(--sf-line)] bg-[var(--sf-line)] sm:flex sm:w-auto sm:gap-0">
            {releve.map((r) => (
              <Link
                key={r.k}
                href={r.href}
                className="flex min-w-[84px] flex-col gap-0.5 bg-[var(--sf-surface-0)] px-3.5 py-2 transition-colors hover:bg-[var(--sf-surface-1)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--sf-focus)] sm:border-l sm:border-[var(--sf-line)] sm:first:border-l-0"
              >
                <dt className="font-[family-name:var(--sf-font-display)] uppercase text-[9px] tracking-[0.14em] text-[var(--sf-subtle)] font-bold leading-none whitespace-nowrap">
                  {r.k}
                </dt>
                <dd className="font-[family-name:var(--sf-font-display)] text-[26px] font-black leading-none tabular-nums text-[var(--sf-primary)]">
                  {r.v}
                </dd>
              </Link>
            ))}
          </dl>
        </div>
      </header>

      {/* ====================================================================
          ZONE 1 — À TRAITER AUJOURD'HUI (la file de travail du poste)
          Deux établis côte à côte : Alertes actives + Échéances en retard.
          Orientés action, denses, filet de section comme séparateur.
      ==================================================================== */}
      <section aria-labelledby="zone-traiter">
        <div className="mb-3 flex items-center gap-3">
          <ListChecks className="size-4 text-[var(--sf-primary)]" aria-hidden />
          <h2
            id="zone-traiter"
            className="font-[family-name:var(--sf-font-display)] uppercase text-[13px] tracking-[0.14em] text-[var(--sf-ink)] font-bold"
          >
            À traiter aujourd&apos;hui
          </h2>
          <span className="h-px flex-1 bg-[var(--sf-line)]" aria-hidden />
          {evtsRetard > 0 && (
            <Badge variant="danger">
              <AlertCircle className="size-3" aria-hidden />
              <span className="tabular-nums">{evtsRetard} en retard</span>
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 border border-[var(--sf-line)] divide-y lg:divide-y-0 lg:divide-x divide-[var(--sf-line)] bg-[var(--sf-surface-0)]">
          {/* Établi A — Alertes actives (panneau dense, sans card-héro) */}
          <AlertesWidget />

          {/* Établi B — Échéances en retard / à venir */}
          <div className="flex min-w-0 flex-col p-4">
            <div className="flex items-center justify-between gap-3 pb-2">
              <h3 className={panelLabel}>Échéances repro &amp; soins</h3>
              <Link href="/calendrier" className={openCls}>
                Calendrier
                <ArrowUpRight className="size-3.5 transition-transform group-hover/open:-translate-y-px" aria-hidden />
              </Link>
            </div>
            {evts.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-6">
                <EmptyState
                  icon={CheckCircle2}
                  tone="good"
                  title="Aucune échéance en attente"
                  description="Rien de planifié dans les 30 prochains jours."
                />
              </div>
            ) : (
              <ul className="-mx-2 divide-y divide-[var(--sf-line)]">
                {evts.map((e: any) => {
                  const d = new Date(e.date_prevue)
                  const jr = e.jours_restants
                  const enRetard = jr < 0
                  const urgent = jr >= 0 && jr < 3
                  const meta = prioMeta(e.priorite)
                  const PrioIcon = meta.Icon
                  return (
                    <li key={e.id}>
                      <div className="flex items-center gap-3 rounded-[var(--sf-radius-sm)] px-2 py-2.5 min-h-[48px] transition-colors hover:bg-[var(--sf-surface-1)]">
                        {/* Colonne échéance — ancre tabulaire à gauche */}
                        <div className="w-[60px] shrink-0 text-right">
                          <div className="font-[family-name:var(--sf-font-display)] text-sm font-bold uppercase tabular-nums text-[var(--sf-ink)] leading-none">
                            {d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </div>
                          <div
                            className={`mt-0.5 text-[10px] uppercase tracking-[0.08em] tabular-nums ${
                              enRetard
                                ? 'text-[var(--sf-danger-ink)] font-bold'
                                : urgent
                                ? 'text-[var(--sf-accent-deep)] font-bold'
                                : 'text-[var(--sf-muted)]'
                            }`}
                          >
                            {jr === 0 ? "auj." : jr > 0 ? `J−${jr}` : `+${-jr}j`}
                          </div>
                        </div>
                        <span
                          className="h-8 w-px shrink-0 bg-[var(--sf-line)]"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={meta.variant} className="shrink-0">
                              <PrioIcon className="size-3" aria-hidden />
                              <span>{meta.label}</span>
                            </Badge>
                            <span className="truncate text-sm font-medium text-[var(--sf-ink)]">
                              {TYPE_LABELS[e.type_evenement] ?? e.type_evenement}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-[var(--sf-muted)]">
                            {e.animal_tag && (
                              <span className="font-mono text-[var(--sf-ink-secondary)]">
                                {e.animal_nom ?? e.animal_tag} ({e.animal_tag})
                              </span>
                            )}
                            {e.bande_nom && <> · Bande {e.bande_nom}</>}
                            {cleanDescription(e.notes) && <> · {cleanDescription(e.notes)}</>}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ====================================================================
          ZONE 2 — RELEVÉ TECHNIQUE (les instruments du poste)
          KPI métier en bande de relevés, pas grille de cards égales.
          A9 : repli des KPI muted en 1 bandeau compact.
      ==================================================================== */}
      {(() => {
        const kpiDefs = [
          {
            key: 'issf' as const,
            icon: Clock,
            label: 'ISSF',
            sub: 'jours sevrage → saillie fécondante',
            value: kpiTech?.issf_moyen,
            unit: 'j',
            target: 'cible 5-7 j',
            tone: toneIssf(kpiTech?.issf_moyen),
          },
          {
            key: 'productivite' as const,
            icon: Zap,
            label: 'Productivité numérique',
            sub: 'porcelets sevrés / truie / an',
            value: kpiTech?.productivite_moyenne,
            unit: '',
            target: 'cible ≥ 22',
            tone: toneProductivite(kpiTech?.productivite_moyenne),
          },
          {
            key: 'tmm' as const,
            icon: Skull,
            label: 'TMM',
            sub: 'taux mortalité maternité',
            value: kpiTech?.tmm_moyen_pct,
            unit: '%',
            target: 'cible ≤ 8 %',
            tone: toneTmm(kpiTech?.tmm_moyen_pct),
          },
          {
            key: 'nes_vivants' as const,
            icon: Target,
            label: 'Nés vivants / portée',
            sub: 'moyenne ferme',
            value: kpiTech?.nes_vivants_par_portee_moyen,
            unit: '',
            target: 'cible ≥ 12',
            tone: toneNesVivants(kpiTech?.nes_vivants_par_portee_moyen),
          },
        ]

        const active = kpiDefs.filter((k) => k.tone !== 'muted')
        const missing = kpiDefs.filter((k) => k.tone === 'muted')
        const nbMissing = missing.length
        const missingLabels = missing.map((k) => k.label).join(', ')

        const banner =
          nbMissing > 0 ? (
            <div className="flex items-start gap-3 border border-[var(--sf-line)] bg-[var(--sf-surface-1)] p-4">
              <Hourglass
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-[var(--sf-accent-deep)]"
              />
              <div className="min-w-0 flex-1">
                <div className="font-[family-name:var(--sf-font-display)] text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--sf-ink)]">
                  {nbMissing} KPI technique{nbMissing > 1 ? 's' : ''} en attente
                </div>
                <div className="mt-1 text-xs leading-snug text-[var(--sf-muted)]">
                  Saisis quelques portées de plus pour activer&nbsp;
                  <span className="font-medium text-[var(--sf-ink)]">{missingLabels}</span>.
                  Minimum 1 cycle complet (sevrage → saillie fécondante) requis.
                </div>
              </div>
              <Link href="/kpi" className={`${openCls} shrink-0 whitespace-nowrap`}>
                KPI activables
                <ArrowUpRight className="size-3.5 transition-transform group-hover/open:-translate-y-px" aria-hidden />
              </Link>
            </div>
          ) : null

        const gridCols =
          active.length === 1
            ? 'grid-cols-1'
            : active.length === 2
            ? 'grid-cols-2'
            : active.length === 3
            ? 'grid-cols-2 md:grid-cols-3'
            : 'grid-cols-2 md:grid-cols-4'

        return (
          <section aria-labelledby="zone-releve">
            <div className="mb-3 flex items-center gap-3">
              <Target className="size-4 text-[var(--sf-primary)]" aria-hidden />
              <h2
                id="zone-releve"
                className="font-[family-name:var(--sf-font-display)] uppercase text-[13px] tracking-[0.14em] text-[var(--sf-ink)] font-bold"
              >
                Relevé technique
              </h2>
              <span className="h-px flex-1 bg-[var(--sf-line)]" aria-hidden />
              <Link href="/kpi" className={openCls}>
                Détail KPI
                <ArrowUpRight className="size-3.5 transition-transform group-hover/open:-translate-y-px" aria-hidden />
              </Link>
            </div>
            <div className="space-y-3">
              {banner}
              {active.length > 0 && (
                <div className={`grid ${gridCols} gap-3`}>
                  {active.map((k) => (
                    <KpiTechCard
                      key={k.key}
                      icon={k.icon}
                      label={k.label}
                      sub={k.sub}
                      value={k.value}
                      unit={k.unit}
                      target={k.target}
                      tone={k.tone}
                      digits={1}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )
      })()}

      {/* ====================================================================
          ZONE 3 — ACTIVITÉ RÉCENTE (les bordereaux du poste)
          Naissances + Stock en deux établis. Tip du jour en note de pied.
      ==================================================================== */}
      <section aria-labelledby="zone-activite">
        <div className="mb-3 flex items-center gap-3">
          <Calendar className="size-4 text-[var(--sf-primary)]" aria-hidden />
          <h2
            id="zone-activite"
            className="font-[family-name:var(--sf-font-display)] uppercase text-[13px] tracking-[0.14em] text-[var(--sf-ink)] font-bold"
          >
            Activité récente
          </h2>
          <span className="h-px flex-1 bg-[var(--sf-line)]" aria-hidden />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 border border-[var(--sf-line)] divide-y lg:divide-y-0 lg:divide-x divide-[var(--sf-line)] bg-[var(--sf-surface-0)]">
          {/* Établi — Dernières naissances */}
          <div className="flex min-w-0 flex-col p-4">
            <div className="flex items-center justify-between gap-3 pb-2">
              <h3 className={panelLabel}>Dernières naissances</h3>
              <Link href="/mises-bas" className={openCls}>
                Mises bas
                <ArrowUpRight className="size-3.5 transition-transform group-hover/open:-translate-y-px" aria-hidden />
              </Link>
            </div>
            {(dernieresMb ?? []).length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-6">
                <EmptyState
                  icon={Baby}
                  title="Aucune naissance récente"
                  description="Les mises bas des 30 derniers jours apparaîtront ici."
                  cta={{ label: 'Enregistrer une mise bas', href: '/mises-bas?action=new' }}
                />
              </div>
            ) : (
              <ul className="-mx-2 divide-y divide-[var(--sf-line)]">
                {(dernieresMb ?? []).map((mb: any) => {
                  const totaux = mb.nes_totaux ?? 0
                  const vivants = mb.nes_vivants ?? 0
                  const ratio = totaux > 0 ? vivants / totaux : 0
                  return (
                    <li key={mb.id}>
                      <div className="flex items-center justify-between gap-3 rounded-[var(--sf-radius-sm)] px-2 py-2.5 min-h-[48px] transition-colors hover:bg-[var(--sf-surface-1)]">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-[var(--sf-ink)]">
                            {mb.animaux ? <AnimalLabel animal={mb.animaux} format="full" /> : '—'}
                          </div>
                          <div className="text-xs tabular-nums text-[var(--sf-muted)]">
                            {new Date(mb.date_mise_bas).toLocaleDateString('fr-FR')} · {totaux} totaux · {mb.nes_morts ?? 0} morts
                          </div>
                        </div>
                        <Badge variant={variantPortee(ratio)}>
                          <span className="tabular-nums">{vivants} vivants</span>
                        </Badge>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Établi — Stock qui baisse */}
          <div className="flex min-w-0 flex-col p-4">
            <div className="flex items-center justify-between gap-3 pb-2">
              <h3 className={panelLabel}>Stock qui baisse</h3>
              <div className="flex items-center gap-3">
                {nbStocksAlerte > 0 && (
                  <Badge variant="danger">
                    <AlertCircle className="size-3" aria-hidden />
                    <span className="tabular-nums">{nbStocksAlerte} en alerte</span>
                  </Badge>
                )}
                <Link href="/stock" className={openCls}>
                  Stock
                  <ArrowUpRight className="size-3.5 transition-transform group-hover/open:-translate-y-px" aria-hidden />
                </Link>
              </div>
            </div>
            {(stockAlertes ?? []).length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-6">
                <EmptyState
                  icon={PackageOpen}
                  tone="good"
                  title="Stocks au-dessus du seuil"
                  description="Aucune matière première en alerte stock."
                />
              </div>
            ) : (
              <ul className="-mx-2 divide-y divide-[var(--sf-line)]">
                {(stockAlertes ?? []).map((s: any) => {
                  const seuil = s.seuil_alerte ?? 0
                  const stock = s.stock_actuel ?? 0
                  let variant: 'danger' | 'warning' | 'secondary' = 'secondary'
                  const sousSeuil = seuil > 0 && stock < seuil
                  if (sousSeuil) variant = 'danger'
                  else if (seuil && stock < seuil * 1.5) variant = 'warning'
                  return (
                    <li key={s.id}>
                      <div
                        className={`flex items-center justify-between gap-3 rounded-[var(--sf-radius-sm)] px-2 py-2.5 min-h-[48px] transition-colors hover:bg-[var(--sf-surface-1)] ${
                          sousSeuil ? 'bg-[var(--sf-danger-bg)]/40' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-[var(--sf-ink)]">
                            {s.nom}
                          </div>
                          <div className="text-xs uppercase tracking-[0.08em] text-[var(--sf-muted)]">
                            {s.type}
                            {seuil > 0 && (
                              <span className="ml-2 tabular-nums">· seuil {seuil} {s.unite}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant={variant}>
                          <span className="tabular-nums">{stock} {s.unite}</span>
                        </Badge>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Note de pied du poste — conseil du jour, registre note d'atelier */}
        <div className="mt-3">
          <TipDuJour />
        </div>
      </section>
    </div>
  )
}
