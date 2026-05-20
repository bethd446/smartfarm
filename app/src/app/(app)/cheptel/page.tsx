import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PiggyBank } from 'lucide-react'
import { CheptelActions } from './_actions'
import { SEM_COLORS, toneTruie } from '@/lib/colors'

export default async function CheptelPage() {
  const sb = await createClient()
  const { data: animaux } = await sb
    .from('animaux')
    .select('*, races(nom)')
    .order('tag')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><PiggyBank className="h-7 w-7 text-emerald-600" />Cheptel</h1>
          <p className="text-sm text-slate-500 mt-1">{animaux?.length ?? 0} animaux enregistrés</p>
        </div>
        <CheptelActions />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste des animaux</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Tag</th>
                  <th className="pb-3 pr-4">Nom</th>
                  <th className="pb-3 pr-4">Sexe</th>
                  <th className="pb-3 pr-4">Catégorie</th>
                  <th className="pb-3 pr-4">Race</th>
                  <th className="pb-3 pr-4">Naissance</th>
                  <th className="pb-3 pr-4">Statut</th>
                </tr>
              </thead>
              <tbody>
                {(animaux ?? []).map((a: any) => {
                  const tone = toneTruie(a.rang_porte, a.statut)
                  const sem = SEM_COLORS[tone]
                  return (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 pr-4 font-mono font-bold text-slate-900">{a.tag}</td>
                      <td className="py-3 pr-4">{a.nom ?? '—'}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={a.sexe === 'M' ? 'default' : 'secondary'} className={a.sexe === 'M' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-pink-100 text-pink-700 hover:bg-pink-100'}>
                          {a.sexe === 'M' ? '♂ Mâle' : '♀ Femelle'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 capitalize">{a.categorie}</td>
                      <td className="py-3 pr-4">{a.races?.nom ?? '—'}</td>
                      <td className="py-3 pr-4 text-slate-600">{a.date_naissance ? new Date(a.date_naissance).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className={sem.badge}>
                          {a.statut}
                          {tone === 'attendu' && a.statut === 'actif' ? ' · à réformer' : ''}
                        </Badge>
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
