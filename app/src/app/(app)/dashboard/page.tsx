import { PageTitle } from '@/components/ui/page-title'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import Link from 'next/link'
import { PiggyBank, AlertCircle, Clock, Calendar, Baby, CheckCircle2, Zap, Skull, Target } from 'lucide-react'
import { toneTauxPortee } from '@/lib/colors'
import { TYPE_LABELS, cleanDescription } from '@/lib/terrain-labels'
import { AlertesWidget } from './_components/alertes-widget'
import { TipDuJour } from './_components/tip-du-jour'
import { QuickActionsFab } from '@/components/quick-actions-fab'
import {
  KpiTechCard,
  toneIssf,
  toneProductivite,
  toneTmm,
  toneNesVivants,
} from '@/components/kpi/kpi-tech-card'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tableau de bord — Smart Farm',
}

/** Map priorité (numérique 1/2/3 OU sémantique critique/elevee/normale) → Badge. */
function prioMeta(p: number | string | null | undefined): {
  variant: 'danger' | 'warning' | 'info' | 'secondary'
  Icon: typeof AlertCircle
  label: string
} {
  // Forme numérique historique
  if (p === 1) return { variant: 'danger', Icon: AlertCircle, label: 'URGENT' }
  if (p === 2) return { variant: 'warning', Icon: Clock, label: 'IMPORTANT' }
  if (p === 3) return { variant: 'info', Icon: Calendar, label: 'NORMAL' }
  // Forme sémantique renvoyée par v_calendrier_repro (critique, elevee, ...)
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
    sb.from('animaux').select('*', { count: 'exact', head: true }).eq('statut', 'actif'),
    sb.from('animaux').select('*', { count: 'exact', head: true }).eq('categorie', 'truie').eq('statut', 'actif'),
    sb.from('animaux').select('*', { count: 'exact', head: true }).eq('categorie', 'verrat').eq('statut', 'actif'),
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

  // Compteur stocks en alerte (stock < seuil_alerte)
  const nbStocksAlerte = (stockAlertes ?? []).filter((s: any) => {
    const seuil = s.seuil_alerte ?? 0
    const stock = s.stock_actuel ?? 0
    return seuil > 0 && stock < seuil
  }).length

  // Eyebrow réutilisable : Big Shoulders 11 px uppercase tracking 0.18em muted
  const eyebrowCls =
    "font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted)] font-bold"

  // Link "Voir tout" réutilisable — min-h 44 px mobile pour touch target
  const seeAllCls =
    "inline-flex items-center min-h-[44px] py-2 px-1 -mx-1 text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--sf-primary)] hover:underline"

  return (
    <div className="space-y-8">
      {/* === HEADER PageTitle === */}
      <PageTitle
        eyebrow={`PILOTAGE · ${today}${fermeNom ? ' · ' + fermeNom.toUpperCase() : ''}`}
        icon={<PiggyBank className="h-9 w-9 text-[var(--sf-primary)]" />}
      >
        Tableau de bord
      </PageTitle>

      {/* === KPI GRID ASYMÉTRIQUE — hero géant + stack 3 === */}
      <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* KPI HERO : Cheptel total — domine visuellement */}
        <Card
          className="relative overflow-hidden min-h-[280px]"
          style={{ background: 'var(--sf-warm)' }}
        >
          {/* Fond ambiance — icône cochon en filigrane */}
          <PiggyBank
            aria-hidden
            className="absolute pointer-events-none text-[var(--sf-primary)]"
            strokeWidth={1.25}
            style={{
              right: '-20px',
              bottom: '-20px',
              width: '200px',
              height: '200px',
              opacity: 0.08,
            }}
          />
          <CardContent className="relative z-10 flex flex-col h-full min-h-[280px]">
            {/* Eyebrow + label en haut */}
            <div>
              <div className={eyebrowCls}>Cheptel (les animaux) · {today}</div>
              <div className="font-[family-name:var(--sf-font-display)] uppercase text-xs tracking-[0.14em] text-[var(--sf-ink)] font-bold mt-2">
                Cheptel total
              </div>
              <div className="text-xs italic text-[var(--sf-muted)] mt-1">
                tous animaux actifs
              </div>
            </div>
            {/* Chiffre centré dans le bloc */}
            <div className="flex-1 flex items-center">
              <div
                className="text-[var(--sf-primary)] leading-[0.9] tabular-nums tracking-[-0.03em]"
                style={{
                  fontFamily: 'var(--sf-font-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(96px, 18vw, 160px)',
                }}
              >
                {nbAnimaux ?? 0}
              </div>
            </div>
            {/* Pied : bandes actives */}
            <div className="font-[family-name:var(--sf-font-display)] uppercase text-[10px] tracking-[0.14em] text-[var(--sf-subtle)]">
              {nbBandesActives ?? 0} portée{(nbBandesActives ?? 0) > 1 ? 's' : ''} (8 dernières sem.)
            </div>
          </CardContent>
        </Card>

        {/* Stack droite — 3 Cards dégressives, totalisent min-h-[280px] */}
        <div className="flex flex-col gap-4 min-h-[280px]">
          <Card className="flex-1">
            <CardContent className="flex flex-col justify-between h-full p-5">
              <div className={eyebrowCls}>Truies actives</div>
              <div
                className="font-[family-name:var(--sf-font-display)] font-black text-[var(--sf-primary)] leading-none tabular-nums self-end"
                style={{ fontSize: '48px' }}
              >
                {nbTruies ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="flex flex-col justify-between h-full p-5">
              <div className={eyebrowCls}>Verrats actifs</div>
              <div
                className="font-[family-name:var(--sf-font-display)] font-black text-[var(--sf-accent)] leading-none tabular-nums self-end"
                style={{ fontSize: '36px' }}
              >
                {nbVerrats ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="flex flex-col justify-between h-full p-5">
              <div className={eyebrowCls}>Portées récentes</div>
              <div
                className="font-[family-name:var(--sf-font-display)] font-black text-[var(--sf-ink)] leading-none tabular-nums self-end"
                style={{ fontSize: '28px' }}
              >
                {nbBandesActives ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* === KPI TECHNIQUES MÉTIER — 4 cards (V2-E) === */}
      <section>
        <div className={`${eyebrowCls} mb-3`}>KPI techniques · Performances métier</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* ISSF — Intervalle Sevrage-Saillie Fécondante */}
          <KpiTechCard
            icon={Clock}
            label="ISSF"
            sub="jours sevrage → saillie fécondante"
            value={kpiTech?.issf_moyen}
            unit="j"
            target="cible 5-7 j"
            tone={toneIssf(kpiTech?.issf_moyen)}
            digits={1}
          />
          {/* Productivité numérique = porcelets sevrés/truie/an */}
          <KpiTechCard
            icon={Zap}
            label="Productivité numérique"
            sub="porcelets sevrés / truie / an"
            value={kpiTech?.productivite_moyenne}
            unit=""
            target="cible ≥ 22"
            tone={toneProductivite(kpiTech?.productivite_moyenne)}
            digits={1}
          />
          {/* TMM */}
          <KpiTechCard
            icon={Skull}
            label="TMM"
            sub="taux mortalité maternité"
            value={kpiTech?.tmm_moyen_pct}
            unit="%"
            target="cible ≤ 8 %"
            tone={toneTmm(kpiTech?.tmm_moyen_pct)}
            digits={1}
          />
          {/* Nés vivants moyens/portée */}
          <KpiTechCard
            icon={Target}
            label="Nés vivants / portée"
            sub="moyenne ferme"
            value={kpiTech?.nes_vivants_par_portee_moyen}
            unit=""
            target="cible ≥ 12"
            tone={toneNesVivants(kpiTech?.nes_vivants_par_portee_moyen)}
            digits={1}
          />
        </div>
      </section>

      {/* === WIDGETS ALERTES (C3) + TIP DU JOUR (C2) === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertesWidget />
        <TipDuJour />
      </div>

      {/* === PROCHAINS ÉVÉNEMENTS — Card pleine largeur === */}
      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between">
            <h2 className={eyebrowCls}>Prochains événements</h2>
            <Link href="/calendrier" className={seeAllCls}>
              Voir tout →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {(prochainsEvts ?? []).length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              tone="good"
              title="Rien d'urgent aujourd'hui ✅"
              description="Aucun événement planifié dans les 30 prochains jours."
            />
          ) : (
            <ul className="divide-y divide-[var(--sf-line)] border-t border-[var(--sf-line)]">
              {(prochainsEvts ?? []).map((e: any) => {
                const d = new Date(e.date_prevue)
                const jr = e.jours_restants
                const urgent = jr < 3
                const meta = prioMeta(e.priorite)
                const PrioIcon = meta.Icon
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3 min-h-[48px]">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={meta.variant} className="inline-flex items-center gap-1.5">
                        <PrioIcon className="size-3" aria-hidden />
                        <span>{meta.label}</span>
                      </Badge>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--sf-ink)] truncate">
                          {TYPE_LABELS[e.type_evenement] ?? e.type_evenement}
                          {e.animal_tag && (
                            <span className="text-xs text-[var(--sf-subtle)] ml-2">
                              · {e.animal_nom ?? e.animal_tag} ({e.animal_tag})
                            </span>
                          )}
                        </div>
                      <div className="text-xs text-[var(--sf-muted)]">
                        {e.bande_nom && <>Bande : {e.bande_nom} · </>}
                        {e.statut === 'retard' && (
                          <span className="text-[var(--sf-danger-ink)] font-semibold">En retard · </span>
                        )}
                        {cleanDescription(e.notes)}
                      </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-[family-name:var(--sf-font-display)] text-sm font-bold text-[var(--sf-ink)] tabular-nums uppercase">
                        {d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </div>
                      <div
                        className={`text-[10px] uppercase tracking-[0.1em] tabular-nums ${
                          jr < 0
                            ? 'text-[var(--sf-danger-ink)] font-bold'
                            : urgent
                            ? 'text-[var(--sf-ink)] font-bold'
                            : 'text-[var(--sf-muted)]'
                        }`}
                      >
                        {jr === 0 ? "aujourd'hui" : jr > 0 ? `dans ${jr} j` : `${-jr} j de retard`}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* === GRID 2 COLONNES : Naissances + Stocks === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DERNIÈRES NAISSANCES */}
        <Card className="h-full min-h-[320px]">
          <CardHeader>
            <div className="flex items-baseline justify-between">
              <h2 className={eyebrowCls}>Dernières naissances</h2>
              <Link href="/mises-bas" className={seeAllCls}>
                Voir tout →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {(dernieresMb ?? []).length === 0 ? (
              <EmptyState
                icon={Baby}
                title="Aucune naissance récente"
                description="Les mises-bas des 30 derniers jours apparaîtront ici."
                cta={{ label: 'Enregistrer une naissance', href: '/mises-bas?action=new' }}
              />
            ) : (
              <ul className="divide-y divide-[var(--sf-line)] border-t border-[var(--sf-line)]">
                {(dernieresMb ?? []).map((mb: any) => {
                  const totaux = mb.nes_totaux ?? 0
                  const vivants = mb.nes_vivants ?? 0
                  const ratio = totaux > 0 ? vivants / totaux : 0
                  return (
                    <li key={mb.id} className="flex items-center justify-between gap-3 py-3 min-h-[48px]">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--sf-ink)] truncate">
                          {mb.animaux?.nom ?? mb.animaux?.tag ?? '—'}
                          <span className="text-xs text-[var(--sf-subtle)] ml-2">
                            ({mb.animaux?.tag})
                          </span>
                        </div>
                        <div className="text-xs text-[var(--sf-muted)] tabular-nums">
                          {new Date(mb.date_mise_bas).toLocaleDateString('fr-FR')} · {totaux} totaux · {mb.nes_morts ?? 0} morts
                        </div>
                      </div>
                      <Badge variant={variantPortee(ratio)}>
                        <span className="tabular-nums">{vivants} vivants</span>
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* STOCK QUI BAISSE */}
        <Card className="h-full min-h-[320px]">
          <CardHeader>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={eyebrowCls}>Stock qui baisse</h2>
              <div className="flex items-center gap-3">
                {nbStocksAlerte > 0 && (
                  <Badge variant="danger">
                    <AlertCircle className="size-3" aria-hidden />
                    {nbStocksAlerte} en alerte
                  </Badge>
                )}
                <Link href="/stock" className={seeAllCls}>
                  Voir tout →
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {(stockAlertes ?? []).length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                tone="good"
                title="Stocks au-dessus du seuil"
                description="Aucune matière première en alerte stock — tout est OK."
              />
            ) : (
              <ul className="divide-y divide-[var(--sf-line)] border-t border-[var(--sf-line)]">
                {(stockAlertes ?? []).map((s: any) => {
                  const seuil = s.seuil_alerte ?? 0
                  const stock = s.stock_actuel ?? 0
                  let variant: 'danger' | 'warning' | 'secondary' = 'secondary'
                  let rowBorder = ''
                  if (seuil && stock < seuil) {
                    variant = 'danger'
                    rowBorder = 'border-l-4 border-[var(--sf-danger)] pl-3'
                  } else if (seuil && stock < seuil * 1.5) {
                    variant = 'warning'
                  }
                  return (
                    <li
                      key={s.id}
                      className={`flex items-center justify-between gap-3 py-3 min-h-[48px] ${rowBorder}`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--sf-ink)] truncate">
                          {s.nom}
                        </div>
                        <div className="text-xs text-[var(--sf-muted)] uppercase tracking-[0.08em]">
                          {s.type}
                          {seuil > 0 && (
                            <span className="ml-2 tabular-nums">
                              · seuil {seuil} {s.unite}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={variant}>
                        <span className="tabular-nums">
                          {stock} {s.unite}
                        </span>
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === FAB Quick Actions (bottom-right) === */}
      <QuickActionsFab />
    </div>
  )
}
