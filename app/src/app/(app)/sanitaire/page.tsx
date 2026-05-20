import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/export-button'
import { Stethoscope, Plus, Syringe, AlertCircle } from 'lucide-react'

export default async function SanitairePage() {
  const sb = await createClient()
  const [{ data: vac }, { data: trt }, { data: mort }] = await Promise.all([
    sb.from('vaccinations').select('*, animal:animal_id(tag,nom)').order('date_vaccination', { ascending: false }).limit(20),
    sb.from('traitements').select('*, animal:animal_id(tag,nom)').order('date_debut', { ascending: false }).limit(20),
    sb.from('mortalites').select('*, animal:animal_id(tag,nom)').order('date_mort', { ascending: false }).limit(20),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Stethoscope className="h-7 w-7 text-red-600" />Sanitaire</h1>
          <p className="text-sm text-slate-500 mt-1">Vaccinations · Traitements · Mortalités</p>
        </div>
        <div className="flex gap-2">
          <ExportButton table="vaccinations" label="Export vaccinations" />
          <ExportButton table="traitements" label="Export traitements" />
          <ExportButton table="mortalites" label="Export mortalités" />
          <Button className="bg-red-600 hover:bg-red-700"><Plus className="h-4 w-4 mr-2" />Nouvelle entrée</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-5">
            <Syringe className="h-5 w-5 text-blue-700 mb-2" />
            <div className="text-3xl font-bold text-blue-900">{vac?.length ?? 0}</div>
            <div className="text-xs text-blue-700 mt-1">Vaccinations enregistrées</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-5">
            <Stethoscope className="h-5 w-5 text-amber-700 mb-2" />
            <div className="text-3xl font-bold text-amber-900">{trt?.length ?? 0}</div>
            <div className="text-xs text-amber-700 mt-1">Traitements en cours/passés</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="p-5">
            <AlertCircle className="h-5 w-5 text-red-700 mb-2" />
            <div className="text-3xl font-bold text-red-900">{mort?.length ?? 0}</div>
            <div className="text-xs text-red-700 mt-1">Mortalités</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Syringe className="h-4 w-4 text-blue-600" />Dernières vaccinations</CardTitle></CardHeader>
        <CardContent>
          {(!vac || vac.length === 0)
            ? <div className="text-sm text-slate-500 py-6 text-center">Aucune vaccination enregistrée</div>
            : <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-slate-500">
                  <tr><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Animal</th><th className="pb-3 pr-4">Produit</th><th className="pb-3 pr-4">Dose</th></tr>
                </thead>
                <tbody>
                  {vac.map((v: any) => (
                    <tr key={v.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-mono">{new Date(v.date_vaccination).toLocaleDateString('fr-FR')}</td>
                      <td className="py-3 pr-4">{v.animal?.nom ?? v.animal?.tag ?? '—'}</td>
                      <td className="py-3 pr-4"><Badge variant="outline">{v.produit}</Badge></td>
                      <td className="py-3 pr-4 font-mono">{v.dose_ml ?? '—'} ml</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </CardContent>
      </Card>
    </div>
  )
}
