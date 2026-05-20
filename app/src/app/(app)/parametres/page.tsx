import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Database, Users, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function ParametresPage() {
  const sb = await createClient()
  const [{ data: fermes }, { data: utilisateurs }, { data: regles }] = await Promise.all([
    sb.from('fermes').select('*'),
    sb.from('utilisateurs').select('*'),
    sb.from('regles_sevrage').select('*'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Settings className="h-7 w-7 text-slate-600" />Paramètres</h1>
        <p className="text-sm text-slate-500 mt-1">Configuration de l'exploitation</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-600" />Fermes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(fermes ?? []).map((f: any) => (
            <div key={f.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-md">
              <div>
                <div className="font-semibold">{f.nom}</div>
                <div className="text-xs text-slate-500">{f.code} · {f.localisation}</div>
              </div>
              <Badge variant="outline">{f.type}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-blue-600" />Utilisateurs</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(utilisateurs ?? []).map((u: any) => (
            <div key={u.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-md">
              <div>
                <div className="font-semibold">{u.prenom} {u.nom}</div>
                <div className="text-xs text-slate-500 font-mono">{u.email}</div>
              </div>
              <Badge>{u.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-amber-600" />Règles de sevrage</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(regles ?? []).map((r: any) => (
            <div key={r.id} className="p-3 bg-slate-50 rounded-md">
              <div className="font-semibold mb-1">{r.nom}</div>
              <div className="text-xs text-slate-600 grid grid-cols-3 gap-2">
                <span>Âge min : <b>{r.age_min_jours} j</b></span>
                <span>Âge max : <b>{r.age_max_jours} j</b></span>
                <span>Poids min : <b>{r.poids_min_kg} kg</b></span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
