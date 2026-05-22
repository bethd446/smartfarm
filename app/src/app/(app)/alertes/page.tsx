import type { Metadata } from 'next'
import { Bell, AlertTriangle, AlertCircle, Siren, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { getAlertesActives, compteParGravite } from '@/lib/alertes-engine'
import { AlertesList } from './_components/alertes-list'

export const metadata: Metadata = {
  title: 'Alertes — Smart Farm',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--sf-ink,#1a1a1a)]">
            <Bell className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Alertes
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Anomalies détectées automatiquement sur le cheptel, la reproduction,
            le sanitaire et le stock
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total */}
        <Card>
          <CardContent className="p-5">
            <Bell className="h-5 w-5 mb-2 text-[var(--sf-primary,#2D4A1F)]" />
            <div className="text-3xl font-bold tabular-nums text-[var(--sf-ink,#1a1a1a)]">
              {total}
            </div>
            <div className="eyebrow text-[11px] mt-1 text-[var(--sf-muted,#5C5346)]">
              Alertes actives
            </div>
          </CardContent>
        </Card>

        {/* Critiques */}
        <Card
          style={{
            background: 'var(--sf-danger-bg, #F1D4CE)',
            color: 'var(--sf-danger-ink, #7A2A1F)',
          }}
        >
          <CardContent className="p-5">
            <Siren
              className="h-5 w-5 mb-2"
              style={{ color: 'var(--sf-danger-ink, #7A2A1F)' }}
            />
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: 'var(--sf-danger-ink, #7A2A1F)' }}
            >
              {compte.critique ?? 0}
            </div>
            <div
              className="eyebrow text-[11px] mt-1"
              style={{ color: 'var(--sf-danger-ink, #7A2A1F)' }}
            >
              Critiques
            </div>
          </CardContent>
        </Card>

        {/* Élevées */}
        <Card
          style={{
            background: 'var(--sf-danger-bg, #F1D4CE)',
            color: 'var(--sf-danger-ink, #7A2A1F)',
            opacity: 0.85,
          }}
        >
          <CardContent className="p-5">
            <AlertTriangle
              className="h-5 w-5 mb-2"
              style={{ color: 'var(--sf-danger-ink, #7A2A1F)' }}
            />
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: 'var(--sf-danger-ink, #7A2A1F)' }}
            >
              {compte['élevée'] ?? 0}
            </div>
            <div
              className="eyebrow text-[11px] mt-1"
              style={{ color: 'var(--sf-danger-ink, #7A2A1F)' }}
            >
              Élevées
            </div>
          </CardContent>
        </Card>

        {/* Moyennes */}
        <Card
          style={{
            background: 'var(--sf-warning-bg, #F5E0B8)',
            color: 'var(--sf-warning-ink, #5A3E0E)',
          }}
        >
          <CardContent className="p-5">
            <AlertCircle
              className="h-5 w-5 mb-2"
              style={{ color: 'var(--sf-warning-ink, #5A3E0E)' }}
            />
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: 'var(--sf-warning-ink, #5A3E0E)' }}
            >
              {compte.moyenne ?? 0}
            </div>
            <div
              className="eyebrow text-[11px] mt-1"
              style={{ color: 'var(--sf-warning-ink, #5A3E0E)' }}
            >
              Moyennes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste ou état vide */}
      {total === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={ShieldCheck}
              tone="good"
              title="Aucune alerte active ✅"
              description="Tout va bien sur la ferme — aucune anomalie détectée sur le cheptel, la reproduction, le sanitaire ou le stock."
            />
          </CardContent>
        </Card>
      ) : (
        <AlertesList alertes={alertes} />
      )}
    </div>
  )
}
