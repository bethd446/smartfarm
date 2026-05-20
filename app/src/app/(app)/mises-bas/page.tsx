import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/components/export-button'
import { Baby, Plus } from 'lucide-react'

export default async function MisesBasPage() {
  const sb = await createClient()
  const { data: mb } = await sb
    .from('mises_bas')
    .select(`*, truie:truie_id(tag,nom), sevrages(date_sevrage,nb_sevres,poids_total_kg)`)
    .order('date_mise_bas', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Baby className="h-7 w-7 text-violet-600" />Mises-bas & Sevrages</h1>
          <p className="text-sm text-slate-500 mt-1">{mb?.length ?? 0} portées enregistrées</p>
        </div>
        <div className="flex gap-2">
          <ExportButton table="mises_bas" />
          <Button className="bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4 mr-2" />Nouvelle mise-bas</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(mb ?? []).map((m: any) => {
          const sev = m.sevrages?.[0]
          return (
            <Card key={m.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between">
                  <div>
                    <CardTitle className="text-base">{m.truie?.nom ?? m.truie?.tag}</CardTitle>
                    <div className="text-xs text-slate-500 font-mono">{m.truie?.tag} · {new Date(m.date_mise_bas).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-emerald-50 rounded-md p-2 text-center">
                    <div className="text-xl font-bold text-emerald-700">{m.nes_vivants}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Vivants</div>
                  </div>
                  <div className="bg-slate-50 rounded-md p-2 text-center">
                    <div className="text-xl font-bold text-slate-700">{m.nes_totaux}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Totaux</div>
                  </div>
                  <div className="bg-red-50 rounded-md p-2 text-center">
                    <div className="text-xl font-bold text-red-700">{m.nes_morts + m.momifies}</div>
                    <div className="text-[10px] text-slate-500 uppercase">M+M</div>
                  </div>
                </div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Poids portée</span><span className="font-mono">{m.poids_portee_kg ?? '—'} kg</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Durée</span><span className="font-mono">{m.duree_minutes ?? '—'} min</span></div>
                {sev && (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="font-semibold text-emerald-700 mb-1">✓ Sevrage {new Date(sev.date_sevrage).toLocaleDateString('fr-FR')}</div>
                    <div className="flex justify-between"><span>Sevrés</span><span className="font-mono font-bold">{sev.nb_sevres}</span></div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
