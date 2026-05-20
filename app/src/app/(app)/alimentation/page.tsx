import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/export-button'
import { Wheat, Plus } from 'lucide-react'

export default async function AlimentationPage() {
  const sb = await createClient()
  const [{ data: types }, { data: conso }] = await Promise.all([
    sb.from('types_aliment').select('*').order('nom'),
    sb.from('consommations_aliment').select('*, bande:bande_id(nom), type_aliment:type_aliment_id(nom)').order('date', { ascending: false }).limit(20),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Wheat className="h-7 w-7 text-amber-600" />Alimentation</h1>
          <p className="text-sm text-slate-500 mt-1">Types d'aliment · Consommations · IC</p>
        </div>
        <div className="flex gap-2">
          <ExportButton table="matieres_premieres" />
          <Button className="bg-amber-600 hover:bg-amber-700"><Plus className="h-4 w-4 mr-2" />Nouvelle distribution</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Types d'aliment</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(types ?? []).map((t: any) => (
              <div key={t.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-sm">
                <div className="font-semibold text-sm mb-2">{t.nom}</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="capitalize">{t.categorie_cible}</Badge>
                  <Badge variant="outline">{t.proteine_pct}% protéines</Badge>
                  <Badge variant="outline">{t.energie_kcal_kg} kcal/kg</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Consommations récentes</CardTitle></CardHeader>
        <CardContent>
          {(!conso || conso.length === 0)
            ? <div className="text-sm text-slate-500 py-6 text-center">Aucune consommation enregistrée — démarrez le suivi</div>
            : <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-slate-500">
                  <tr><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Bande</th><th className="pb-3 pr-4">Aliment</th><th className="pb-3 pr-4">Quantité</th></tr>
                </thead>
                <tbody>
                  {conso.map((c: any) => (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-mono">{new Date(c.date).toLocaleDateString('fr-FR')}</td>
                      <td className="py-3 pr-4">{c.bande?.nom}</td>
                      <td className="py-3 pr-4">{c.type_aliment?.nom}</td>
                      <td className="py-3 pr-4 font-mono font-bold">{c.quantite_kg} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </CardContent>
      </Card>
    </div>
  )
}
