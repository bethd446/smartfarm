import Link from 'next/link'
import { AlertOctagon, AlertTriangle, Stethoscope, CheckCircle2 } from 'lucide-react'

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { RelativeTime } from '@/components/ui/relative-time'
import { createClient } from '@/lib/supabase/server'
import { getAlertesActives, type Alerte } from '@/lib/alertes-engine'
import { REGLES_ALERTES, ORDRE_GRAVITE } from '@/lib/alertes-regles'

/**
 * Smart Farm — Sous-widget « Alertes sanitaires prioritaires »
 * -------------------------------------------------------------------------
 * Server Component dédié à la page `/sanitaire`. Ne montre que les alertes
 * de catégorie `sanitaire` (R06 vaccin, R12 acte en retard, …) ET de
 * gravité `élevée` ou `critique`. Tout le reste est filtré.
 *
 * S'appuie sur les métadonnées `REGLES_ALERTES` (agent C3-A) pour
 * déterminer la catégorie de chaque règle.
 */

function graviteMeta(g: Alerte['gravite']) {
  if (g === 'critique') {
    return { variant: 'destructive' as const, Icon: AlertOctagon, label: 'CRITIQUE' }
  }
  return { variant: 'danger' as const, Icon: AlertTriangle, label: 'ÉLEVÉE' }
}

/** Conserve uniquement les alertes catégorie sanitaire + gravité élevée/critique. */
function filtrerSanitairePrioritaire(alertes: Alerte[]): Alerte[] {
  return alertes
    .filter((a) => {
      if (a.gravite !== 'critique' && a.gravite !== 'élevée') return false
      const meta = REGLES_ALERTES?.[a.regle_id]
      return meta?.categorie === 'sanitaire'
    })
    .sort((a, b) => {
      const dg = ORDRE_GRAVITE[a.gravite] - ORDRE_GRAVITE[b.gravite]
      if (dg !== 0) return dg
      return new Date(b.detecte_le).getTime() - new Date(a.detecte_le).getTime()
    })
}

export async function AlertesSanitaires({ limit = 8 }: { limit?: number }) {
  const sb = await createClient()

  let alertes: Alerte[] = []
  try {
    alertes = await getAlertesActives(sb)
  } catch {
    alertes = []
  }

  const prioritaires = filtrerSanitairePrioritaire(alertes).slice(0, limit)

  const eyebrowCls =
    "font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted)] font-bold"
  const seeAllCls =
    "inline-flex items-center min-h-[44px] py-2 px-1 -mx-1 text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--sf-primary)] hover:underline"

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={eyebrowCls}>
            <Stethoscope className="inline size-3 mr-1 -mt-0.5" aria-hidden />
            Alertes sanitaires prioritaires
          </h2>
          <Link href="/alertes?categorie=sanitaire" className={seeAllCls}>
            Voir tout →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {prioritaires.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            tone="good"
            title="Aucune alerte sanitaire ✓"
            description="Pas de vaccin ni d'acte en retard. Le calendrier sanitaire est à jour."
          />
        ) : (
          <ul className="divide-y divide-[var(--sf-line)] border-t border-[var(--sf-line)]">
            {prioritaires.map((a) => {
              const meta = graviteMeta(a.gravite)
              const Icon = meta.Icon
              const detecte = new Date(a.detecte_le)
              return (
                <li
                  key={`${a.regle_id}-${a.cible_id}`}
                  className="flex items-center justify-between gap-3 py-3 min-h-[48px] pl-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-[var(--sf-danger)] shrink-0"
                      aria-hidden
                    />
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
                        {a.description ? <> · {a.description}</> : null}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--sf-subtle)] tabular-nums">
                      <RelativeTime date={detecte} prefix="" addSuffix />
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

export default AlertesSanitaires
