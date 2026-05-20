import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Scale, Plus } from 'lucide-react'

export default async function PeseesPage() {
  const sb = await createClient()
  const { data: pesees } = await sb
    .from('pesees')
    .select(`*, animal:animal_id(tag,nom), bande:bande_id(nom,code)`)
    .order('date_pesee', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Scale className="h-7 w-7 text-indigo-600" />Pesées</h1>
          <p className="text-sm text-slate-500 mt-1">Suivi de croissance — GMQ & courbes de poids</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" />Nouvelle pesée</Button>
      </div>

      {(!pesees || pesees.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Scale className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm">Aucune pesée enregistrée pour le moment.</p>
            <p className="text-xs mt-1">Démarrez par une pesée individuelle ou collective.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Dernières pesées</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-slate-500">
                <tr><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Sujet</th><th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Poids</th></tr>
              </thead>
              <tbody>
                {pesees.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-mono">{new Date(p.date_pesee).toLocaleDateString('fr-FR')}</td>
                    <td className="py-3 pr-4">{p.animal?.nom ?? p.bande?.nom ?? '—'}</td>
                    <td className="py-3 pr-4">{p.type}</td>
                    <td className="py-3 pr-4 font-mono font-bold">{p.poids_kg} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
