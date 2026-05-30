import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageTitle } from '@/components/ui/page-title'
import { EmptyState } from '@/components/ui/empty-state'
import { FormattedDateTime } from '@/components/ui/formatted-date'
import { ExportButton } from '@/components/export-button'
import { Heart, Plus, Stethoscope } from 'lucide-react'
import { diagnosticLabel } from '@/lib/terrain-labels'
import { DialogFaireMonter } from './_dialog-faire-monter'
import { DialogDiagnostic } from './_dialog-diagnostic'
import { ReproductionFab } from './_fab'

export const metadata: Metadata = {
  title: 'Reproduction',
}

export default async function ReproductionPage({
  searchParams,
}: {
  searchParams?: Promise<{ action?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const sb = await createClient()

  // 1) Saillies — requête principale SANS jointure `diagnostics_gestation` (RLS
  //    sur cette table cassait toute la page : compteur "0 montées" tandis que
  //    la vue `v_saillies_a_diagnostiquer` (accessible) listait 10 saillies).
  const { data: saillesBase, error: saillesErr } = await sb
    .from('saillies')
    .select(
      `*, truie:truie_id(tag,nom), verrat:verrat_id(tag,nom)`
    )
    .order('date_saillie', { ascending: false })

  let saillies: any[] = (saillesBase ?? []) as any[]

  // 2) Diagnostics gestation : best-effort. Si bloqué par RLS on continue avec []
  if (saillies.length > 0) {
    const saillieIds = saillies.map((s) => s.id)
    const { data: diagData } = await sb
      .from('diagnostics_gestation')
      .select('saillie_id, resultat, date_diag')
      .in('saillie_id', saillieIds)
    const diagBySaillie = new Map<string, any[]>()
    for (const d of (diagData ?? []) as any[]) {
      const arr = diagBySaillie.get(d.saillie_id) ?? []
      arr.push(d)
      diagBySaillie.set(d.saillie_id, arr)
    }
    saillies = saillies.map((s) => ({
      ...s,
      diagnostics_gestation: diagBySaillie.get(s.id) ?? [],
    }))
  }

  if (saillesErr) {
    console.error('[reproduction] erreur chargement saillies:', saillesErr.message)
  }

  // Truies actives F catégorie truie/cochette
  const { data: truies } = await sb
    .from('animaux')
    .select('id, tag, nom')
    .eq('sexe', 'F')
    .in('categorie', ['truie', 'cochette'])
    .eq('statut', 'actif')
    .is('deleted_at', null)
    .order('tag', { ascending: true })

  // Verrats actifs M catégorie verrat
  const { data: verrats } = await sb
    .from('animaux')
    .select('id, tag, nom')
    .eq('sexe', 'M')
    .eq('categorie', 'verrat')
    .eq('statut', 'actif')
    .is('deleted_at', null)
    .order('tag', { ascending: true })

  // Bandes (optionnel)
  const { data: bandes } = await sb
    .from('bandes')
    .select('id, code, nom')
    .order('code', { ascending: false })
    .limit(20)

  // Saillies à diagnostiquer (fenêtre 14-45j post-saillie sans diag ni MB)
  const { data: aDiagnostiquer } = await sb
    .from('v_saillies_a_diagnostiquer')
    .select('*')
    .order('jours_post_saillie', { ascending: false })

  type SaillieRow = {
    id: string
    truie_id: string
    date_saillie: string
    truie?: { tag: string; nom: string | null } | null
    verrat?: { tag: string; nom: string | null } | null
    diagnostics_gestation?: Array<{ resultat: string }>
  }
  const saillieRows = (saillies ?? []) as SaillieRow[]

  // Saillies SANS diagnostic positif (en attente de diagnostic) pour le formulaire diagnostic
  const saillesSansDiagPositif = saillieRows
    .filter(
      (s) =>
        !s.diagnostics_gestation?.some((d) => d.resultat === 'positif')
    )
    .map((s) => ({
      id: s.id,
      truie_id: s.truie_id,
      truie_tag: s.truie?.tag ?? '',
      truie_nom: s.truie?.nom ?? null,
      verrat_tag: s.verrat?.tag ?? null,
      verrat_nom: s.verrat?.nom ?? null,
      date_saillie: s.date_saillie,
    }))

  type SaillieADiag = {
    saillie_id: string
    truie_id: string
    truie_tag: string
    truie_nom: string | null
    date_saillie: string
    jours_post_saillie: number
    phase_diagnostic:
      | 'attente'
      | 'fenetre_diagnostic'
      | 'fenetre_echographie'
      | 'retard'
  }
  const aDiagRows = (aDiagnostiquer ?? []) as SaillieADiag[]

  function labelPhase(phase: SaillieADiag['phase_diagnostic']): string {
    switch (phase) {
      case 'fenetre_diagnostic':
        return 'Fenêtre 18-24 j'
      case 'fenetre_echographie':
        return 'Échographie 25-35 j'
      case 'retard':
        return 'EN RETARD'
      default:
        return 'À attendre'
    }
  }
  function variantPhase(
    phase: SaillieADiag['phase_diagnostic']
  ): 'warning' | 'danger' | 'outline' {
    if (phase === 'retard') return 'danger'
    if (phase === 'fenetre_diagnostic' || phase === 'fenetre_echographie')
      return 'warning'
    return 'outline'
  }
  // Sévérité par FORME (dot), pas par fond coloré — registre conseiller
  // (cf alertes/_components/alerte-card.tsx) :
  //   retard            → disque plein rouge   (urgence : confirmer/écho)
  //   fenêtre diag/écho  → anneau ambre         (action recommandée)
  //   attente           → anneau gris discret  (rien à faire encore)
  function dotPhase(phase: SaillieADiag['phase_diagnostic']): CSSProperties {
    if (phase === 'retard') return { background: 'var(--sf-danger,#DC2626)' }
    if (phase === 'fenetre_diagnostic' || phase === 'fenetre_echographie') {
      return {
        background: 'transparent',
        boxShadow: 'inset 0 0 0 2px var(--sf-warning,#A16207)',
      }
    }
    return {
      background: 'transparent',
      boxShadow: 'inset 0 0 0 2px var(--sf-line,rgba(0,0,0,0.25))',
    }
  }

  return (
    <div className="space-y-6">
      {/* === Header de page : PageTitle unifié === */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageTitle
            eyebrow="ÉLEVAGE"
            icon={<Heart className="h-9 w-9 text-[var(--sf-accent-warm)]" />}
            className="mb-1"
          >
            Reproduction
          </PageTitle>
          <p
            className="text-sm text-[var(--sf-muted)]"
            style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
          >
            <span className="font-semibold tabular-nums text-[var(--sf-ink)]">
              {saillies?.length ?? 0}
            </span>{' '}
            montées enregistrées
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton table="saillies" />
          <DialogDiagnostic
            saillies={saillesSansDiagPositif}
            truies={truies ?? []}
            verrats={verrats ?? []}
            bandes={bandes ?? []}
            defaultOpen={sp.action === 'diag'}
            trigger={
              <Button variant="outline" size="lg" className="h-12 text-base">
                <Stethoscope className="h-5 w-5 mr-2" />
                Diagnostic gestation
              </Button>
            }
          />
          <DialogFaireMonter
            truies={truies ?? []}
            verrats={verrats ?? []}
            bandes={bandes ?? []}
            defaultOpen={sp.action === 'new'}
            trigger={
              <Button size="lg" className="h-12 text-base">
                <Plus className="h-5 w-5 mr-2" />
                Nouvelle saillie
              </Button>
            }
          />
        </div>
      </div>

      {/* === Section : Saillies à diagnostiquer — registre dense hairline === */}
      {aDiagRows.length > 0 && (
        <section aria-labelledby="repro-diag-titre">
          <div className="flex items-baseline gap-2 mb-1">
            <h2
              id="repro-diag-titre"
              className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)]"
            >
              Saillies à diagnostiquer
            </h2>
            <span className="text-sm text-[var(--sf-muted)] tabular-nums">
              ({aDiagRows.length})
            </span>
          </div>
          <p className="text-xs text-[var(--sf-muted)] mb-3">
            Fenêtre 18-24 j post-saillie : détecter un retour en chaleur ou
            confirmer la gestation. Au-delà de 25 j, échographie recommandée.
          </p>

          <ul
            className="border-t-2"
            style={{ borderTopColor: 'var(--sf-warning,#A16207)' }}
          >
            {aDiagRows.map((s) => (
              <li
                key={s.saillie_id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--sf-line)] min-h-[44px] px-2 py-3"
              >
                {/* Dot sévérité par forme (plein / anneau ambre / contour) */}
                <span
                  className="shrink-0 h-2.5 w-2.5 rounded-full"
                  style={dotPhase(s.phase_diagnostic)}
                  aria-hidden="true"
                />

                {/* Truie : tag mono + nom Big Shoulders */}
                <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono font-semibold tabular-nums text-[var(--sf-ink)]">
                    {s.truie_tag}
                  </span>
                  {s.truie_nom && (
                    <span
                      className="truncate text-[15px] font-semibold leading-tight text-[var(--sf-ink)] tracking-[0.01em]"
                      style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
                    >
                      {s.truie_nom}
                    </span>
                  )}
                  <span className="text-xs text-[var(--sf-subtle)]">
                    Saillie <FormattedDateTime date={s.date_saillie} format="date" />
                    {' · '}
                    <span className="tabular-nums font-medium text-[var(--sf-muted)]">
                      J+{s.jours_post_saillie}
                    </span>
                  </span>
                </div>

                {/* Badge fenêtre — tonalité (warning/danger/outline) */}
                <Badge variant={variantPhase(s.phase_diagnostic)} className="shrink-0">
                  {labelPhase(s.phase_diagnostic)}
                </Badge>

                {/* CTA inline — ouvre le dialog diagnostic inchangé */}
                <DialogDiagnostic
                  saillies={saillesSansDiagPositif}
                  truies={truies ?? []}
                  verrats={verrats ?? []}
                  bandes={bandes ?? []}
                  defaultSaillieId={s.saillie_id}
                  trigger={
                    <Button size="sm" variant="outline" className="shrink-0 min-h-11">
                      <Stethoscope className="h-4 w-4 mr-1" aria-hidden="true" />
                      Diagnostiquer
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* === Historique des montées : registre dense, trait top primary + lignes hairline === */}
      <section aria-labelledby="repro-historique-titre">
        <h2
          id="repro-historique-titre"
          className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)] mt-6 mb-3"
        >
          Historique des montées
        </h2>
        <h3
          className="eyebrow text-[var(--sf-muted)] mb-2"
          style={{
            fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Journal chronologique des saillies
        </h3>
        {(saillies ?? []).length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Aucune saillie enregistrée"
            description="Dès qu'une truie est saillie par un verrat ou inséminée, enregistre la montée pour suivre la gestation et la performance de reproduction."
          />
        ) : (
        <div
          className="overflow-x-auto -mx-4 sm:mx-0 border-t-2"
          style={{ borderTopColor: 'var(--sf-primary,#2D4A1F)' }}
        >
          <table className="w-full min-w-[800px] text-sm">
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
                <th className="py-3 px-4 font-semibold">Truie</th>
                <th className="py-3 px-4 font-semibold">Verrat</th>
                <th className="py-3 px-4 font-semibold">Méthode</th>
                <th className="py-3 px-4 font-semibold">Rang portée</th>
                <th className="py-3 px-4 font-semibold">Diagnostic</th>
              </tr>
            </thead>
            <tbody>
              {(saillies ?? []).map((s: any) => {
                const diag = s.diagnostics_gestation?.[0]
                const diagVariant: 'success' | 'danger' | 'outline' = diag
                  ? diag.resultat === 'positif'
                    ? 'success'
                    : diag.resultat === 'négatif' || diag.resultat === 'negatif'
                    ? 'danger'
                    : 'outline'
                  : 'outline'
                return (
                  <tr
                    key={s.id}
                    className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40"
                  >
                    <td className="py-3 px-4 tabular-nums text-[var(--sf-ink)]">
                      <FormattedDateTime date={s.date_saillie} format="date" />
                    </td>
                    <td className="py-3 px-4 font-medium text-[var(--sf-ink)]">
                      {s.truie?.nom}{' '}
                      <span className="text-sm text-[var(--sf-subtle)] font-mono">
                        ({s.truie?.tag})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--sf-ink)]">
                      {s.verrat?.nom ?? '—'}{' '}
                      <span className="text-sm text-[var(--sf-subtle)] font-mono">
                        ({s.verrat?.tag ?? ''})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{s.methode}</Badge>
                    </td>
                    <td className="py-3 px-4 tabular-nums text-[var(--sf-ink)]">
                      {s.rang_porte}
                    </td>
                    <td className="py-3 px-4">
                      {diag ? (
                        <Badge variant={diagVariant}>{diagnosticLabel(diag.resultat)}</Badge>
                      ) : (
                        <Badge variant="outline">en attente</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}
      </section>

      {/* === FAB mobile === */}
      <ReproductionFab truies={truies ?? []} verrats={verrats ?? []} bandes={bandes ?? []} />
    </div>
  )
}
