import type { Metadata } from 'next'
import Link from 'next/link'
import { Bell, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageTitle } from '@/components/ui/page-title'
import { getAlertesActives, compteParGravite } from '@/lib/alertes-engine'
import { AlertesList } from './_components/alertes-list'
import { DialogAlerteManuelle } from './_components/dialog-alerte-manuelle'

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

      {/* Bilan gravité — 4 KPI .kpi (gabarit VERGER). Sévérité encodée par DOT
          (forme), pas par fond coloré ni faux-dégradé. Total en tête, puis 3
          niveaux décroissants.
          FIX S5-L3 #3 : cap visuel total à 99+ pour ne pas désensibiliser. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total */}
        <div className="kpi">
          <div className="k flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 shrink-0 text-[var(--sage-d)]" />
            Alertes actives
          </div>
          <div className="v tabular-nums" aria-label={`${total} alertes actives`}>
            {total > 99 ? '99+' : total}
          </div>
        </div>

        {/* Critiques — dot plein rouge */}
        <div className="kpi">
          <div className="k flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: 'var(--bad)' }}
              aria-hidden="true"
            />
            Critiques
          </div>
          <div className="v tabular-nums">{compte.critique ?? 0}</div>
        </div>

        {/* Élevées — anneau rouge épais */}
        <div className="kpi">
          <div className="k flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                background: 'transparent',
                boxShadow: 'inset 0 0 0 3px var(--bad)',
              }}
              aria-hidden="true"
            />
            Élevées
          </div>
          <div className="v tabular-nums">{compte['élevée'] ?? 0}</div>
        </div>

        {/* Moyennes — anneau ambre */}
        <div className="kpi">
          <div className="k flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                background: 'transparent',
                boxShadow: 'inset 0 0 0 2px var(--warn)',
              }}
              aria-hidden="true"
            />
            Moyennes
          </div>
          <div className="v tabular-nums">{compte.moyenne ?? 0}</div>
        </div>
      </div>

      {/* Liste ou état vide */}
      {total === 0 ? (
        <div className="sf-empty">
          <div className="sf-empty-ic">
            <CheckCircle2 className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h3>Aucune alerte active</h3>
          <p>
            Toutes les tâches critiques sont à jour. Continue ton suivi quotidien depuis le dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-[var(--rp)] bg-[var(--sage)] text-[var(--paper)] font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Voir le tableau de bord
            </Link>
            <Link
              href="/parametres"
              className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-[var(--rp)] border border-[var(--line)] text-[var(--ink)] font-semibold text-sm hover:bg-[var(--paper-3)] transition-colors"
            >
              Configurer les règles d&apos;alerte
            </Link>
          </div>
        </div>
      ) : (
        <AlertesList alertes={alertes} />
      )}
    </div>
  )
}
