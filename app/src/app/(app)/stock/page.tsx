import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/export-button'
import { Package, Plus, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react'

export default async function StockPage() {
  const sb = await createClient()
  const [{ data: stocks }, { data: fournisseurs }] = await Promise.all([
    sb.from('matieres_premieres').select('*').order('nom'),
    sb.from('fournisseurs').select('*').order('nom'),
  ])

  const typeIcons: any = {
    matiere_premiere: '🌾',
    aliment_fini: '🥄',
    vaccin: '💉',
    medicament: '💊',
    desinfectant: '🧴',
    consommable: '📦',
  }

  const totalValeur = (stocks ?? []).reduce((acc, s: any) => acc + (s.stock_actuel * (s.cout_moyen_unite ?? 0)), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Package className="h-7 w-7 text-orange-600" />Stock & Intrants</h1>
          <p className="text-sm text-slate-500 mt-1">Matières premières · Vaccins · Médicaments · Consommables</p>
        </div>
        <div className="flex gap-2">
          <ExportButton table="matieres_premieres" />
          <ExportButton table="mouvements_stock" label="Export mouvements" />
          <Button variant="outline"><ArrowUp className="h-4 w-4 mr-2" />Entrée</Button>
          <Button variant="outline"><ArrowDown className="h-4 w-4 mr-2" />Sortie</Button>
          <Button className="bg-orange-600 hover:bg-orange-700"><Plus className="h-4 w-4 mr-2" />Article</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5">
          <div className="text-xs text-slate-500 uppercase">Articles en stock</div>
          <div className="text-3xl font-bold mt-1">{stocks?.length ?? 0}</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-xs text-slate-500 uppercase">Valeur stock</div>
          <div className="text-3xl font-bold mt-1">{totalValeur.toLocaleString('fr-FR')} <span className="text-sm text-slate-500">FCFA</span></div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-xs text-slate-500 uppercase">Fournisseurs</div>
          <div className="text-3xl font-bold mt-1">{fournisseurs?.length ?? 0}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Inventaire</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Article</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Stock</th>
                <th className="pb-3 pr-4">Seuil alerte</th>
                <th className="pb-3 pr-4">Coût unitaire</th>
                <th className="pb-3 pr-4">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {(stocks ?? []).map((s: any) => {
                const alerte = s.seuil_alerte && s.stock_actuel < s.seuil_alerte
                return (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span>{typeIcons[s.type] ?? '📦'}</span>
                        <span className="font-medium">{s.nom}</span>
                        {alerte && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                      </div>
                    </td>
                    <td className="py-3 pr-4"><Badge variant="outline" className="capitalize text-xs">{s.type.replace('_',' ')}</Badge></td>
                    <td className={`py-3 pr-4 font-mono font-bold ${alerte ? 'text-red-600' : 'text-slate-900'}`}>{s.stock_actuel} {s.unite}</td>
                    <td className="py-3 pr-4 font-mono text-slate-500">{s.seuil_alerte ?? '—'} {s.unite}</td>
                    <td className="py-3 pr-4 font-mono">{s.cout_moyen_unite?.toLocaleString('fr-FR') ?? '—'} FCFA</td>
                    <td className="py-3 pr-4 font-mono font-bold">{(s.stock_actuel * (s.cout_moyen_unite ?? 0)).toLocaleString('fr-FR')} FCFA</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
