import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/components/export-button'
import { Heart, Plus } from 'lucide-react'

export default async function ReproductionPage() {
  const sb = await createClient()
  const { data: saillies } = await sb
    .from('saillies')
    .select(`*, truie:truie_id(tag,nom), verrat:verrat_id(tag,nom), diagnostics_gestation(resultat,date_diagnostic)`)
    .order('date_saillie', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Heart className="h-7 w-7 text-rose-600" />Reproduction</h1>
          <p className="text-sm text-slate-500 mt-1">{saillies?.length ?? 0} saillies enregistrées</p>
        </div>
        <div className="flex gap-2">
          <ExportButton table="saillies" />
          <Button className="bg-rose-600 hover:bg-rose-700"><Plus className="h-4 w-4 mr-2" />Nouvelle saillie</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Historique des saillies</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Truie</th>
                  <th className="pb-3 pr-4">Verrat</th>
                  <th className="pb-3 pr-4">Méthode</th>
                  <th className="pb-3 pr-4">Rang portée</th>
                  <th className="pb-3 pr-4">Diagnostic</th>
                </tr>
              </thead>
              <tbody>
                {(saillies ?? []).map((s: any) => {
                  const diag = s.diagnostics_gestation?.[0]
                  return (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 pr-4 font-mono">{new Date(s.date_saillie).toLocaleDateString('fr-FR')}</td>
                      <td className="py-3 pr-4 font-medium">{s.truie?.nom} <span className="text-xs text-slate-400">({s.truie?.tag})</span></td>
                      <td className="py-3 pr-4">{s.verrat?.nom ?? '—'} <span className="text-xs text-slate-400">({s.verrat?.tag ?? ''})</span></td>
                      <td className="py-3 pr-4"><Badge variant="outline">{s.methode}</Badge></td>
                      <td className="py-3 pr-4">{s.rang_porte}</td>
                      <td className="py-3 pr-4">
                        {diag
                          ? <Badge className={diag.resultat === 'positif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}>{diag.resultat}</Badge>
                          : <Badge variant="outline">en attente</Badge>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
