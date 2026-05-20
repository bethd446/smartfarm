import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Plus } from 'lucide-react'

export default async function BatimentsPage() {
  const sb = await createClient()
  const { data: batiments } = await sb.from('batiments').select('*, cases(*)').order('nom')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Building2 className="h-7 w-7 text-blue-600" />Bâtiments</h1>
          <p className="text-sm text-slate-500 mt-1">{batiments?.length ?? 0} bâtiments</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Nouveau bâtiment</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(batiments ?? []).map((b: any) => (
          <Card key={b.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{b.nom}</CardTitle>
                <Badge variant="outline" className="capitalize">{b.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Capacité</span><span className="font-mono font-bold">{b.capacite}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Surface</span><span className="font-mono">{b.surface_m2} m²</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cases</span><span className="font-mono font-bold text-emerald-700">{b.cases?.length ?? 0}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
