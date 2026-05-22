import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { TYPE_LABELS, PRIORITE_LABEL, cleanDescription } from '@/lib/terrain-labels'

/**
 * Variante Badge sémantique selon priorité.
 * P1 → danger (rouge brique)
 * P2 → warning (jaune ocre)
 * P3+ → default (vert ferme)
 */
function variantPriorite(p: number): 'danger' | 'warning' | 'default' {
  if (p === 1) return 'danger'
  if (p === 2) return 'warning'
  return 'default'
}

/** Lundi (ISO) de la semaine qui contient la date d (en UTC pour stabilité). */
function lundiIso(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = x.getUTCDay() // 0 dim … 6 sam
  const delta = dow === 0 ? -6 : 1 - dow
  x.setUTCDate(x.getUTCDate() + delta)
  return x
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function labelSemaine(lundi: Date): string {
  const dim = new Date(lundi)
  dim.setUTCDate(dim.getUTCDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
  return `${fmt(lundi)} → ${fmt(dim)}`
}

type Evt = {
  id: string
  type_evenement: string
  date_prevue: string
  statut: string
  priorite: number
  notes: string | null
  animal_tag: string | null
  animal_nom: string | null
  bande_nom: string | null
  jours_restants: number
}

export default async function CalendrierPage() {
  const sb = await createClient()
  const { data, error } = await sb
    .from('v_calendrier_repro')
    .select('*')

  if (error) {
    return (
      <div className="p-6 text-[var(--sf-danger-ink,#7A2A1F)]">
        Erreur chargement calendrier : {error.message}
      </div>
    )
  }

  const evts = (data ?? []) as Evt[]

  // Groupement par semaine ISO
  const groupes = new Map<string, { lundi: Date; items: Evt[] }>()
  for (const e of evts) {
    const lundi = lundiIso(new Date(e.date_prevue + 'T00:00:00Z'))
    const key = ymd(lundi)
    if (!groupes.has(key)) groupes.set(key, { lundi, items: [] })
    groupes.get(key)!.items.push(e)
  }
  const semaines = Array.from(groupes.entries()).sort(([a], [b]) => a.localeCompare(b))

  const nbRetards = evts.filter(e => e.statut === 'retard').length
  const nbUrgents = evts.filter(e => e.priorite === 1).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--sf-ink,#1a1a1a)] flex items-center gap-2">
            <Calendar className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Calendrier de reproduction
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Événements planifiés sur les 30 prochains jours, groupés par semaine
          </p>
        </div>
        <div className="flex gap-2">
          {nbRetards > 0 && (
            <Badge variant="danger">
              {nbRetards} en retard
            </Badge>
          )}
          {nbUrgents > 0 && (
            <Badge variant="danger">
              {nbUrgents} urgent{nbUrgents > 1 ? 's' : ''}
            </Badge>
          )}
          <Badge variant="outline">{evts.length} événement{evts.length > 1 ? 's' : ''}</Badge>
        </div>
      </div>

      {semaines.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-[var(--sf-muted,#5C5346)]">
            Aucun événement planifié dans la fenêtre courante.
          </CardContent>
        </Card>
      ) : (
        semaines.map(([key, { lundi, items }]) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="eyebrow text-[13px]">
                Semaine du {labelSemaine(lundi)}
              </CardTitle>
              <Badge variant="outline">{items.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-[var(--sf-line,rgba(0,0,0,0.12))]">
                {items
                  .slice()
                  .sort((a, b) => a.priorite - b.priorite || a.date_prevue.localeCompare(b.date_prevue))
                  .map(e => {
                    const d = new Date(e.date_prevue + 'T00:00:00Z')
                    const jr = e.jours_restants
                    return (
                      <div key={e.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant={variantPriorite(e.priorite)}>
                            {PRIORITE_LABEL[e.priorite] ?? `P${e.priorite}`}
                          </Badge>
                          <div className="text-xs text-[var(--sf-muted,#5C5346)] w-20 shrink-0 font-mono tabular-nums">
                            {d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--sf-ink,#1a1a1a)] truncate">
                              {TYPE_LABELS[e.type_evenement] ?? e.type_evenement}
                              {e.animal_tag && (
                                <span className="text-xs text-[var(--sf-muted,#5C5346)] ml-2">
                                  · {e.animal_nom ?? e.animal_tag} ({e.animal_tag})
                                </span>
                              )}
                            </div>
                            {(e.bande_nom || e.notes) && (
                              <div className="text-xs text-[var(--sf-muted,#5C5346)] truncate">
                                {e.bande_nom && <>Bande : {e.bande_nom}</>}
                                {e.bande_nom && e.notes ? ' · ' : ''}
                                {cleanDescription(e.notes)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          {e.statut === 'retard' ? (
                            <Badge variant="danger">
                              {-jr}j de retard
                            </Badge>
                          ) : (
                            <span className="text-xs text-[var(--sf-muted,#5C5346)] tabular-nums">
                              {jr === 0 ? "aujourd'hui" : jr > 0 ? `dans ${jr}j` : `${-jr}j`}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
