import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageTitle } from '@/components/ui/page-title'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ExportButton } from '@/components/export-button'
import { AlertCircle, Heart, Plus, Stethoscope } from 'lucide-react'
import { diagnosticLabel } from '@/lib/terrain-labels'
import { DialogFaireMonter } from './_dialog-faire-monter'
import { DialogDiagnostic } from './_dialog-diagnostic'

export const metadata: Metadata = {
  title: 'Reproduction — Smart Farm',
}

export default async function ReproductionPage() {
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
    .order('tag', { ascending: true })

  // Verrats actifs M catégorie verrat
  const { data: verrats } = await sb
    .from('animaux')
    .select('id, tag, nom')
    .eq('sexe', 'M')
    .eq('categorie', 'verrat')
    .eq('statut', 'actif')
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

  return (
    <div className="space-y-6">
      {/* === Header de page : PageTitle unifié === */}
      <div className="flex items-center justify-between gap-4">
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
            {saillies?.length ?? 0} montées enregistrées
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton table="saillies" />
          <DialogDiagnostic
            saillies={saillesSansDiagPositif}
            truies={truies ?? []}
            verrats={verrats ?? []}
            bandes={bandes ?? []}
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
            trigger={
              <Button size="lg" className="h-12 text-base">
                <Plus className="h-5 w-5 mr-2" />
                Nouvelle saillie
              </Button>
            }
          />
        </div>
      </div>

      {/* === Section : Saillies à diagnostiquer === */}
      {aDiagRows.length > 0 && (
        <section aria-labelledby="repro-diag-titre">
        <h2
          id="repro-diag-titre"
          className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)] mt-6 mb-3"
        >
          Saillies à diagnostiquer ({aDiagRows.length})
        </h2>
        <Card>
          <CardHeader>
            <h3
              data-slot="card-title"
              className="flex items-center gap-2 text-base leading-snug font-semibold tracking-[0.02em] text-[var(--sf-ink,#1a1a1a)]"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', system-ui, sans-serif)" }}
            >
              <AlertCircle className="h-5 w-5 text-[var(--sf-warning-ink,#5C4416)]" aria-hidden="true" />
              Fenêtre de diagnostic gestation
            </h3>
            <p className="text-xs text-[var(--sf-muted)] mt-1">
              Fenêtre 18-24 j post-saillie : détecter un retour en chaleur ou
              confirmer la gestation. Au-delà de 25 j, échographie recommandée.
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aDiagRows.map((s) => (
                <li
                  key={s.saillie_id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 border border-[var(--sf-line)] rounded-md bg-[var(--sf-surface-1,#FFFFFF)]"
                >
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-mono font-semibold text-[var(--sf-ink)]">
                      {s.truie_tag}
                      {s.truie_nom && (
                        <span className="text-[var(--sf-muted)] font-sans font-normal">
                          {' '}
                          ({s.truie_nom})
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--sf-muted)]">
                      Saillie{' '}
                      {new Date(s.date_saillie).toLocaleDateString('fr-FR')} ·
                      J+{s.jours_post_saillie}
                    </div>
                  </div>
                  <Badge variant={variantPhase(s.phase_diagnostic)}>
                    {labelPhase(s.phase_diagnostic)}
                  </Badge>
                  <DialogDiagnostic
                    saillies={saillesSansDiagPositif}
                    truies={truies ?? []}
                    verrats={verrats ?? []}
                    bandes={bandes ?? []}
                    defaultSaillieId={s.saillie_id}
                    trigger={
                      <Button size="sm" variant="outline">
                        <Stethoscope className="h-4 w-4 mr-1" />
                        Diagnostiquer
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        </section>
      )}

      {/* === Tableau carnet : double-trait top (épais primary) + bottom (hairline) === */}
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
          className="overflow-x-auto"
          style={{
            borderTop: 'var(--sf-rule-top, 4px solid var(--sf-primary, #2D4A1F))',
            borderBottom:
              'var(--sf-rule-bottom, 1px solid var(--sf-border, rgba(0,0,0,0.18)))',
            borderLeft:
              'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
            borderRight:
              'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
            background: 'var(--sf-surface-1, #FFFFFF)',
          }}
        >
          <table className="w-full text-sm">
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
                    <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">
                      {new Date(s.date_saillie).toLocaleDateString('fr-FR')}
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
    </div>
  )
}
