import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PiggyBank, Layers, Heart, Baby, AlertTriangle,
  TrendingUp, Wheat, Package
} from 'lucide-react'

export default async function DashboardPage() {
  const sb = await createClient()

  const [
    { count: nbAnimaux },
    { count: nbTruies },
    { count: nbVerrats },
    { count: nbBandesActives },
    { count: nbSaillies },
    { count: nbMisesBas },
    { data: stockAlertes },
    { data: dernieresMb },
  ] = await Promise.all([
    sb.from('animaux').select('*', { count: 'exact', head: true }).eq('statut', 'actif'),
    sb.from('animaux').select('*', { count: 'exact', head: true }).eq('categorie', 'truie').eq('statut', 'actif'),
    sb.from('animaux').select('*', { count: 'exact', head: true }).eq('categorie', 'verrat').eq('statut', 'actif'),
    sb.from('bandes').select('*', { count: 'exact', head: true }).eq('statut', 'active'),
    sb.from('saillies').select('*', { count: 'exact', head: true }),
    sb.from('mises_bas').select('*', { count: 'exact', head: true }),
    sb.from('matieres_premieres').select('*').order('stock_actuel', { ascending: true }).limit(5),
    sb.from('mises_bas').select('*, animaux:truie_id(tag,nom)').order('date_mise_bas', { ascending: false }).limit(5),
  ])

  const kpis = [
    { label: 'Cheptel total',     value: nbAnimaux ?? 0,         icon: PiggyBank, color: 'emerald' },
    { label: 'Truies actives',    value: nbTruies ?? 0,          icon: Heart,     color: 'pink' },
    { label: 'Verrats actifs',    value: nbVerrats ?? 0,         icon: PiggyBank, color: 'amber' },
    { label: 'Bandes actives',    value: nbBandesActives ?? 0,   icon: Layers,    color: 'blue' },
    { label: 'Saillies (total)',  value: nbSaillies ?? 0,        icon: Heart,     color: 'rose' },
    { label: 'Mises-bas (total)', value: nbMisesBas ?? 0,        icon: Baby,      color: 'violet' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-1">Vue d'ensemble de l'exploitation</p>
        </div>
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
          ● En ligne
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <Card key={k.label} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-slate-900">{k.value}</div>
                <div className="text-xs text-slate-500 mt-1">{k.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 2 colonnes : stock + activité */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" />
              Stocks bas
            </CardTitle>
            <Badge variant="outline">{stockAlertes?.length ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(stockAlertes ?? []).map((s: any) => {
                const alerte = s.seuil_alerte && s.stock_actuel < s.seuil_alerte
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      {alerte && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                      <span className="text-sm font-medium">{s.nom}</span>
                      <Badge variant="outline" className="text-[10px]">{s.type}</Badge>
                    </div>
                    <div className={`text-sm font-mono ${alerte ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                      {s.stock_actuel} {s.unite}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Baby className="h-4 w-4 text-violet-600" />
              Dernières mises-bas
            </CardTitle>
            <Badge variant="outline">{dernieresMb?.length ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(dernieresMb ?? []).map((mb: any) => (
                <div key={mb.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="text-sm font-medium">
                      {mb.animaux?.nom ?? mb.animaux?.tag ?? '—'}
                      <span className="text-xs text-slate-400 ml-2">({mb.animaux?.tag})</span>
                    </div>
                    <div className="text-xs text-slate-500">{new Date(mb.date_mise_bas).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-emerald-700">{mb.nes_vivants} vivants</div>
                    <div className="text-[10px] text-slate-500">{mb.nes_totaux} totaux · {mb.nes_morts} morts</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
