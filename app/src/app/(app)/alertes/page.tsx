import type { Metadata } from 'next'
import Link from 'next/link'
import { Bell, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { PageTitle } from '@/components/ui/page-title'
import { getAlertesActives, compteParGravite } from '@/lib/alertes-engine'
import { AlertesList } from './_components/alertes-list'
import { DialogAlerteManuelle } from './_components/dialog-alerte-manuelle'
import { AlertesFab } from './_fab'

export const metadata: Metadata = {
  title: 'Alertes',
}

/**
 * Smart Farm — Page hub /alertes (C3-B)
 *
 * Affiche :
 *   - 4 KPI cards : total / critique / élevée / moyenne
 *   - Liste filtrable + groupable des alertes actives
 *
 * Données : view SQL `v_alertes_actives` agrégée par `getAlertesActives()`
 * (cf. C3-A — `@/lib/alertes-engine`).
 */

export const dynamic = 'force-dynamic'

export default async function AlertesPage() {
  const sb = await createClient()
  const alertes = await getAlertesActives(sb)
  const compte = compteParGravite(alertes)
  const total = alertes.length

  // Fetch animaux + bâtiments pour cible dialog "nouvelle alerte"
  const [{ data: animaux }, { data: batiments }] = await Promise.all([
    sb.from('animaux')
      .select('id, tag, categorie')
      .eq('statut', 'actif')
      .is('deleted_at', null)
      .order('tag'),
    sb.from('batiments')
      .select('id, nom, type')
      .is('deleted_at', null)
      .order('nom'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <PageTitle
            eyebrow="PILOTAGE"
            icon={<Bell className="h-9 w-9 text-[var(--sf-primary)]" />}
            className="mb-1"
          >
            Alertes
          </PageTitle>
          <p className="text-sm text-[var(--sf-muted)]">
            Anomalies détectées automatiquement sur le cheptel, la reproduction,
            le sanitaire et le stock
          </p>
        </div>
        <DialogAlerteManuelle
          animaux={animaux ?? []}
          batiments={batiments ?? []}
        />
      </div>

      {/* Bilan gravité — bande dense, sévérité par DOT (forme), pas par fond
          coloré ni faux-dégradé. Total en tête, puis 3 niveaux décroissants.
          FIX S5-L3 #3 : cap visuel total à 99+ pour ne pas désensibiliser. */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y divide-x divide-[var(--sf-line)] md:divide-y-0">
            {/* Total */}
            <div className="flex items-center gap-3 p-4">
              <Bell className="h-5 w-5 shrink-0 text-[var(--sf-primary,#2D4A1F)]" />
              <div className="min-w-0">
                <div
                  className="text-3xl font-bold leading-none tabular-nums text-[var(--sf-ink,#1a1a1a)]"
                  style={{
                    fontFamily:
                      "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  }}
                  aria-label={`${total} alertes actives`}
                >
                  {total > 99 ? '99+' : total}
                </div>
                <div className="eyebrow text-[10px] mt-1.5 text-[var(--sf-muted,#5C5346)]">
                  Alertes actives
                </div>
              </div>
            </div>

            {/* Critiques — dot plein rouge */}
            <div className="flex items-center gap-3 p-4">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: 'var(--sf-danger,#DC2626)' }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div
                  className="text-3xl font-bold leading-none tabular-nums text-[var(--sf-ink,#1a1a1a)]"
                  style={{
                    fontFamily:
                      "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  }}
                >
                  {compte.critique ?? 0}
                </div>
                <div className="eyebrow text-[10px] mt-1.5 text-[var(--sf-muted,#5C5346)]">
                  Critiques
                </div>
              </div>
            </div>

            {/* Élevées — anneau rouge épais */}
            <div className="flex items-center gap-3 p-4">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: 'transparent',
                  boxShadow: 'inset 0 0 0 3px var(--sf-danger,#DC2626)',
                }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div
                  className="text-3xl font-bold leading-none tabular-nums text-[var(--sf-ink,#1a1a1a)]"
                  style={{
                    fontFamily:
                      "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  }}
                >
                  {compte['élevée'] ?? 0}
                </div>
                <div className="eyebrow text-[10px] mt-1.5 text-[var(--sf-muted,#5C5346)]">
                  Élevées
                </div>
              </div>
            </div>

            {/* Moyennes — anneau ambre */}
            <div className="flex items-center gap-3 p-4">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: 'transparent',
                  boxShadow: 'inset 0 0 0 2px var(--sf-warning,#A16207)',
                }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div
                  className="text-3xl font-bold leading-none tabular-nums text-[var(--sf-ink,#1a1a1a)]"
                  style={{
                    fontFamily:
                      "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  }}
                >
                  {compte.moyenne ?? 0}
                </div>
                <div className="eyebrow text-[10px] mt-1.5 text-[var(--sf-muted,#5C5346)]">
                  Moyennes
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste ou état vide */}
      {total === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
              <CheckCircle2 
                className="h-6 w-6 text-[var(--sf-success-ink,#166534)]" 
                strokeWidth={2.5} 
              />
              <div>
                <h2 className="text-lg font-semibold text-[var(--sf-ink,#1a1a1a)] mb-1">
                  Aucune alerte active
                </h2>
                <p className="text-sm text-[var(--sf-muted,#5C5346)]">
                  Toutes les tâches critiques sont à jour. Continue ton suivi quotidien depuis le dashboard.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2">
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg bg-[var(--sf-primary,#2D4A1F)] text-[var(--sf-warm,#FFFBEB)] font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Voir le tableau de bord
                </Link>
                <Link 
                  href="/parametres" 
                  className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg border border-[var(--sf-line,rgba(0,0,0,0.12))] text-[var(--sf-ink,#1a1a1a)] font-semibold text-sm hover:bg-[var(--sf-surface-2,#F5F1ED)] transition-colors"
                >
                  Configurer les règles d&apos;alerte
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AlertesList alertes={alertes} />
      )}

      {/* === FAB mobile === */}
      <AlertesFab />
    </div>
  )
}
