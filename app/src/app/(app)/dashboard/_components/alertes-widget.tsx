import Link from 'next/link'
import { AlertOctagon, AlertTriangle, Info, ShieldCheck, ArrowUpRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { RelativeTime } from '@/components/ui/relative-time'
import { createClient } from '@/lib/supabase/server'
import { getAlertesActives, type Alerte } from '@/lib/alertes-engine'
import { ORDRE_GRAVITE } from '@/lib/alertes-regles'

/**
 * Smart Farm — Établi « Alertes actives » (poste de travail / dashboard)
 * -------------------------------------------------------------------------
 * Server Component. Panneau dense (PAS une card autonome) : vit dans la
 * grille bordée de la Zone 1 « À traiter aujourd'hui » du dashboard.
 * Affiche le top 5 des alertes actives triées par gravité décroissante.
 *
 * Source : `getAlertesActives(supabase)` — view SQL `v_alertes_actives`
 * queriée à la volée, jamais stockée.
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
  // on dégrade en panneau vide silencieusement plutôt que de crasher.
  let alertes: Alerte[] = []
  try {
    alertes = await getAlertesActives(sb)
  } catch {
    alertes = []
  }

  // Filtrer les alertes de test (titre contenant "test")
  const alertesFiltrees = alertes.filter((a) => {
    const titre = a.titre?.toLowerCase() || ''
    return !titre.includes('test')
  })

  const total = alertesFiltrees.length
  const top = trierParGravite(alertesFiltrees).slice(0, 5)

  const panelLabel =
    'font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.16em] text-[var(--sf-muted)] font-bold'
  const openCls =
    'group/open inline-flex items-center gap-1 min-h-[44px] py-2 text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--sf-primary)] hover:underline'

  return (
    <div className="flex min-w-0 flex-col p-4">
      <div className="flex items-center justify-between gap-3 pb-2">
        <h3 className={panelLabel}>
          Alertes actives
          {total > 0 && (
            <span className="ml-2 tabular-nums font-black text-[var(--sf-ink)]">{total}</span>
          )}
        </h3>
        <Link href="/alertes" className={openCls}>
          Alertes
          <ArrowUpRight className="size-3.5 transition-transform group-hover/open:-translate-y-px" aria-hidden />
        </Link>
      </div>

      {top.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-6">
          <EmptyState
            icon={ShieldCheck}
            tone="good"
            title="Aucune anomalie détectée"
            description="La ferme est saine. Rien à traiter pour l'instant."
          />
        </div>
      ) : (
        <ul className="-mx-2 divide-y divide-[var(--sf-line)]">
          {top.map((a) => {
            const meta = graviteMeta(a.gravite)
            const Icon = meta.Icon
            const detecte = new Date(a.detecte_le)
            return (
              <li key={`${a.regle_id}-${a.cible_id}`}>
                <Link
                  href={a.lien_suggere}
                  className="flex items-center gap-3 rounded-[var(--sf-radius-sm)] px-2 py-2.5 min-h-[48px] transition-colors hover:bg-[var(--sf-surface-1)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--sf-focus)]"
                >
                  <Badge variant={meta.variant} className="shrink-0">
                    <Icon className="size-3" aria-hidden />
                    {meta.label}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--sf-ink)]">
                      {a.titre}
                    </div>
                    <div className="truncate text-xs text-[var(--sf-muted)]">
                      {a.cible_label}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-[10px] uppercase tracking-[0.08em] tabular-nums text-[var(--sf-subtle)]">
                    <RelativeTime date={detecte} prefix="" addSuffix />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default AlertesWidget
