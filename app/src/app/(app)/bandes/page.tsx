import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/components/export-button'
import { Layers, Plus } from 'lucide-react'
import { DialogNouvelleBande } from './_dialog-nouvelle-bande'

export default async function BandesPage() {
  const sb = await createClient()
  const { data: bandes } = await sb.from('bandes').select('*, bande_animaux(animal_id)').order('date_debut', { ascending: false })

  const statutColors: any = {
    preparation: 'bg-slate-100 text-slate-700',
    active: 'bg-emerald-100 text-emerald-700',
    sevree: 'bg-blue-100 text-blue-700',
    engraissement: 'bg-amber-100 text-amber-700',
    finie: 'bg-violet-100 text-violet-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Layers className="h-7 w-7 text-amber-600" />Bandes</h1>
          <p className="text-sm text-slate-500 mt-1">Lots de production · {bandes?.length ?? 0} bandes</p>
        </div>
        <div className="flex gap-2">
          <ExportButton table="bandes" />
          <DialogNouvelleBande
            trigger={
              <Button size="lg" className="h-12 text-base bg-amber-600 hover:bg-amber-700">
                <Plus className="h-5 w-5 mr-2" />Nouvelle bande
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(bandes ?? []).map((b: any) => (
          <Card key={b.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{b.nom}</CardTitle>
                  <div className="text-xs text-slate-500 font-mono mt-1">{b.code}</div>
                </div>
                <Badge className={statutColors[b.statut] ?? 'bg-slate-100'}>{b.statut}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Début</span><span className="font-mono">{new Date(b.date_debut).toLocaleDateString('fr-FR')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Fin prévue</span><span className="font-mono">{b.date_fin_prevue ? new Date(b.date_fin_prevue).toLocaleDateString('fr-FR') : '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Effectif</span><span className="font-mono font-bold text-emerald-700">{b.bande_animaux?.length ?? 0}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
