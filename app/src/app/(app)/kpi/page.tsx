import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Award, Zap, Target } from 'lucide-react'

export default async function KpiPage() {
  const sb = await createClient()
  const [{ data: truies }, { data: bandes }] = await Promise.all([
    sb.from('v_kpi_truie').select('*'),
    sb.from('v_kpi_bande').select('*'),
  ])

  const totalProlificite = (truies ?? []).reduce((a, t: any) => a + Number(t.prolificite_moyenne ?? 0), 0)
  const avgProlif = truies?.length ? (totalProlificite / truies.length).toFixed(2) : '—'
  const totalSevres = (truies ?? []).reduce((a, t: any) => a + Number(t.total_sevres ?? 0), 0)
  const totalNV = (truies ?? []).reduce((a, t: any) => a + Number(t.total_nes_vivants ?? 0), 0)
  const tauxSurvie = totalNV > 0 ? ((totalSevres / totalNV) * 100).toFixed(1) : '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><TrendingUp className="h-7 w-7 text-emerald-600" />KPI & Rapports</h1>
        <p className="text-sm text-slate-500 mt-1">Performances technico-économiques de l'élevage</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-emerald-200">
          <CardContent className="p-5">
            <Target className="h-5 w-5 text-emerald-700 mb-2" />
            <div className="text-2xl font-bold text-emerald-900">{avgProlif}</div>
            <div className="text-xs text-emerald-700 mt-1">Prolificité moy. (nés vivants/portée)</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/30 border-blue-200">
          <CardContent className="p-5">
            <Award className="h-5 w-5 text-blue-700 mb-2" />
            <div className="text-2xl font-bold text-blue-900">{tauxSurvie}%</div>
            <div className="text-xs text-blue-700 mt-1">Taux de survie au sevrage</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/30 border-amber-200">
          <CardContent className="p-5">
            <Zap className="h-5 w-5 text-amber-700 mb-2" />
            <div className="text-2xl font-bold text-amber-900">{totalNV}</div>
            <div className="text-xs text-amber-700 mt-1">Total nés vivants</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/30 border-violet-200">
          <CardContent className="p-5">
            <TrendingUp className="h-5 w-5 text-violet-700 mb-2" />
            <div className="text-2xl font-bold text-violet-900">{totalSevres}</div>
            <div className="text-xs text-violet-700 mt-1">Total sevrés</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Performances par truie</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-slate-500">
              <tr><th className="pb-3 pr-4">Truie</th><th className="pb-3 pr-4">Saillies</th><th className="pb-3 pr-4">Portées</th><th className="pb-3 pr-4">Nés vivants</th><th className="pb-3 pr-4">Sevrés</th><th className="pb-3 pr-4">Prolificité</th></tr>
            </thead>
            <tbody>
              {(truies ?? []).map((t: any) => (
                <tr key={t.truie_id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-mono font-bold">{t.tag}</td>
                  <td className="py-3 pr-4">{t.nb_saillies}</td>
                  <td className="py-3 pr-4">{t.nb_portees}</td>
                  <td className="py-3 pr-4 font-mono">{t.total_nes_vivants}</td>
                  <td className="py-3 pr-4 font-mono">{t.total_sevres}</td>
                  <td className="py-3 pr-4 font-mono font-bold text-emerald-700">{Number(t.prolificite_moyenne).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
