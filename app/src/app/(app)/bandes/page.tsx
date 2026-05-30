import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ExportButton } from '@/components/export-button'
import type { ComponentProps } from 'react'
import { Layers, Plus } from 'lucide-react'
import { DialogNouvelleBande } from './_dialog-nouvelle-bande'
import { BandesFab } from './_fab'

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>

export default async function BandesPage() {
  const sb = await createClient()
  // Best-effort : la table `bandes` peut être bloquée par RLS/GRANT, on ne casse
  // pas la page si la requête échoue — on tombe sur un empty state explicatif.
  const { data: bandesData } = await sb
    .from('bandes')
    .select('*, bande_animaux(animal_id)')
    .order('date_debut', { ascending: false })

  const bandes = (bandesData ?? []) as any[]

  // Statuts → variantes Badge charte (paires bg/ink validées AA) plutôt que
  // des classes Tailwind brutes hors-charte (violet/slate/emerald banni).
  const statutVariants: Record<string, BadgeVariant> = {
    preparation: 'secondary',
    active: 'success',
    sevree: 'info',
    engraissement: 'warning',
    finie: 'secondary',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-2"><Layers className="h-7 w-7 text-[var(--sf-accent-warm,#A16207)]" />Bandes</h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">Lots de production · {bandes.length} bande{bandes.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton table="bandes" />
          <DialogNouvelleBande
            trigger={
              <Button size="lg" className="h-12 text-base bg-[var(--sf-accent-warm,#A16207)] hover:opacity-90">
                <Plus className="h-5 w-5 mr-2" />Nouvelle bande
              </Button>
            }
          />
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
            <Card key={b.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{b.nom}</CardTitle>
                    <div className="text-xs text-[var(--sf-muted,#5C5346)] font-mono mt-1">{b.code}</div>
                  </div>
                  <Badge variant={statutVariants[b.statut] ?? 'secondary'}>{b.statut}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[var(--sf-muted,#5C5346)]">Début</span><span className="font-mono">{b.date_debut ? new Date(b.date_debut).toLocaleDateString('fr-FR') : '—'}</span></div>
                <div className="flex justify-between"><span className="text-[var(--sf-muted,#5C5346)]">Fin prévue</span><span className="font-mono">{b.date_fin_prevue ? new Date(b.date_fin_prevue).toLocaleDateString('fr-FR') : '—'}</span></div>
                <div className="flex justify-between"><span className="text-[var(--sf-muted,#5C5346)]">Effectif</span><span className="font-mono font-bold text-[var(--sf-primary,#2D4A1F)]">{b.bande_animaux?.length ?? 0}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <BandesFab />
    </div>
  )
}
