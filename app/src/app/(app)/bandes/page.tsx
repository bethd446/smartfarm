import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ExportButton } from '@/components/export-button'
import { Layers } from 'lucide-react'
import { DialogNouvelleBande } from './_dialog-nouvelle-bande'
import { FormattedDateTime } from '@/components/ui/formatted-date'

export default async function BandesPage() {
  const sb = await createClient()
  // Best-effort : la table `bandes` peut être bloquée par RLS/GRANT, on ne casse
  // pas la page si la requête échoue — on tombe sur un empty state explicatif.
  const { data: bandesData } = await sb
    .from('bandes')
    .select('*, bande_animaux(animal_id)')
    .order('date_debut', { ascending: false })

  const bandes = (bandesData ?? []) as any[]

  const statutVariant: Record<string, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'info'> = {
    preparation: 'secondary',
    active: 'success',
    sevree: 'outline',
    engraissement: 'warning',
    finie: 'info',
  }
  const statutLabel: Record<string, string> = {
    preparation: 'Préparation',
    active: 'Active',
    sevree: 'Sevrée',
    engraissement: 'Engraissement',
    finie: 'Finie',
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3 tracking-[-0.02em] text-[var(--ink)] font-[family-name:var(--disp)]">
            <Layers className="h-7 w-7 text-[var(--sage)]" />Bandes
          </h1>
          <p className="text-sm text-[var(--mut)] mt-1">Lots de production · {bandes.length} bande{bandes.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton table="bandes" />
          <DialogNouvelleBande />
        </div>
      </div>

      {bandes.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Aucune bande créée"
          description="Une bande regroupe les portées d'une même période (semaine ou mois) pour suivre les sevrages, transferts et engraissements en lots. Tes portées peuvent être organisées en bandes pour piloter les sevrages groupés."
          cta={{ label: 'Créer ma première bande', href: '#nouvelle-bande' }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bandes.map((b: any) => (
            <Card key={b.id} className="transition-shadow hover:shadow-[var(--sh-sm)]">
              <CardHeader>
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <CardTitle className="text-base font-[family-name:var(--disp)] tracking-[-0.01em]">{b.nom}</CardTitle>
                    <div className="text-xs text-[var(--mut)] font-mono mt-1">{b.code}</div>
                  </div>
                  <Badge variant={statutVariant[b.statut] ?? 'secondary'}>{statutLabel[b.statut] ?? b.statut}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-[var(--mut)]">Début</span><span className="font-mono text-[var(--ink-soft)]">{b.date_debut ? <FormattedDateTime date={b.date_debut} format="date" /> : '—'}</span></div>
                <div className="flex justify-between"><span className="text-[var(--mut)]">Fin prévue</span><span className="font-mono text-[var(--ink-soft)]">{b.date_fin_prevue ? <FormattedDateTime date={b.date_fin_prevue} format="date" /> : '—'}</span></div>
                <div className="flex justify-between items-baseline border-t border-[var(--line)] pt-2.5 mt-1"><span className="text-[var(--mut)]">Effectif</span><span className="font-[family-name:var(--disp)] font-bold tabular-nums text-xl leading-none text-[var(--sage-d)]">{b.bande_animaux?.length ?? 0}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
