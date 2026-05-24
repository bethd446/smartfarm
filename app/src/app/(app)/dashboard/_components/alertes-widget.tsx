import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertOctagon, AlertTriangle, Info, Bell, CheckCircle2 } from 'lucide-react'

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { createClient } from '@/lib/supabase/server'
import { getAlertesActives, type Alerte } from '@/lib/alertes-engine'
import { ORDRE_GRAVITE } from '@/lib/alertes-regles'

/**
 * Smart Farm — Widget « Alertes actives » (tableau de bord)
 * -------------------------------------------------------------------------
 * Server Component. Affiche le top 5 des alertes actives triées par gravité
 * décroissante (critique > élevée > moyenne > info). Format compact.
 *
 * Source : `getAlertesActives(supabase)` (cf. agent C3-A) — view SQL
 * `v_alertes_actives` queriée à la volée, jamais stockée.
 */

type GraviteMeta = {
  variant: 'destructive' | 'danger' | 'warning' | 'info'
  Icon: typeof AlertOctagon
  label: string
}

function graviteMeta(g: Alerte['gravite']): GraviteMeta {
  switch (g) {
    case 'critique':
      return { variant: 'destructive', Icon: AlertOctagon, label: 'CRITIQUE' }
    case 'élevée':
      return { variant: 'danger', Icon: AlertTriangle, label: 'ÉLEVÉE' }
    case 'moyenne':
      return { variant: 'warning', Icon: AlertTriangle, label: 'MOYENNE' }
    case 'info':
    default:
      return { variant: 'info', Icon: Info, label: 'INFO' }
  }
}

/** Tri par gravité décroissante puis date détection (la plus récente d'abord). */
function trierParGravite(alertes: Alerte[]): Alerte[] {
  return [...alertes].sort((a, b) => {
    const dg = ORDRE_GRAVITE[a.gravite] - ORDRE_GRAVITE[b.gravite]
    if (dg !== 0) return dg
    const da = new Date(a.detecte_le).getTime()
    const db = new Date(b.detecte_le).getTime()
    return db - da
  })
}

export async function AlertesWidget() {
  const sb = await createClient()

  // Resilience build : si la view v_alertes_actives n'existe pas encore
  // (migration C3-A pas appliquée), on dégrade en widget vide silencieusement
  // plutôt que de faire crasher le dashboard.
  let alertes: Alerte[] = []
  try {
    alertes = await getAlertesActives(sb)
  } catch {
    alertes = []
  }

  const total = alertes.length
  const top = trierParGravite(alertes).slice(0, 5)

  const eyebrowCls =
    "font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted)] font-bold"
  const seeAllCls =
    "inline-flex items-center min-h-[44px] py-2 px-1 -mx-1 text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--sf-primary)] hover:underline"

  return (
    <Card className="h-full min-h-[320px]">
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={eyebrowCls}>
            <Bell className="inline size-3 mr-1 -mt-0.5" aria-hidden />
            Alertes actives
          </h2>
          <div className="flex items-center gap-3">
            {total > 0 && (
              <Badge variant="secondary">
                <span className="tabular-nums">{total} au total</span>
              </Badge>
            )}
            <Link href="/alertes" className={seeAllCls}>
              Voir toutes →
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {top.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            tone="good"
            title="Aucune alerte ✓"
            description="Tout va bien sur la ferme. Aucune anomalie détectée."
          />
        ) : (
          <ul className="divide-y divide-[var(--sf-line)] border-t border-[var(--sf-line)]">
            {top.map((a) => {
              const meta = graviteMeta(a.gravite)
              const Icon = meta.Icon
              const detecte = new Date(a.detecte_le)
              const ilYA = formatDistanceToNow(detecte, {
                locale: fr,
                addSuffix: true,
              })
              return (
                <li
                  key={`${a.regle_id}-${a.cible_id}`}
                  className="flex items-center justify-between gap-3 py-3 min-h-[48px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={meta.variant}>
                      <Icon className="size-3" aria-hidden />
                      {meta.label}
                    </Badge>
                    <div className="min-w-0">
                      <Link
                        href={a.lien_suggere}
                        className="text-sm font-medium text-[var(--sf-ink)] truncate hover:underline block"
                      >
                        {a.titre}
                      </Link>
                      <div className="text-xs text-[var(--sf-muted)] truncate">
                        {a.cible_label}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--sf-subtle)] tabular-nums">
                      {ilYA}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default AlertesWidget
