import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Scale } from 'lucide-react'
import { ActionsPeser } from './_actions-peser'
import { PeseesFab } from './_fab'

export default async function PeseesPage() {
  const sb = await createClient()
  const [{ data: pesees }, { data: animaux }, { data: bandes }] =
    await Promise.all([
      sb
        .from('pesees')
        .select(`*, animal:animal_id(tag,nom), bande:bande_id(nom,code)`)
        .order('date_pesee', { ascending: false })
        .limit(50),
      sb.from('animaux').select('id, tag, nom').in('statut', ['actif', 'malade']).is('deleted_at', null).order('tag'),
      sb.from('bandes').select('id, nom, code').order('nom'),
    ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-2 text-[var(--sf-ink,#1a1a1a)]">
            <Scale className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />Pesées
          </h1>
          <p className="text-sm text-stone-700 mt-1">Gain par jour · Courbes de poids</p>
        </div>
        <ActionsPeser animaux={animaux ?? []} bandes={bandes ?? []} />
      </div>

      {(!pesees || pesees.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Scale className="h-12 w-12 mx-auto text-[var(--sf-line,rgba(0,0,0,0.2))] mb-3" />
            <p className="eyebrow text-[12px] text-stone-700">Aucune pesée pour l'instant</p>
            <p className="text-sm text-stone-700 mt-2">
              Commence par peser une bande.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="eyebrow text-[13px]">Dernières pesées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--sf-ink,#1a1a1a)] text-left">
                  <tr className="eyebrow text-[11px] text-stone-700">
                    <th className="pb-3 pr-4 font-semibold">Date</th>
                    <th className="pb-3 pr-4 font-semibold">Sujet</th>
                    <th className="pb-3 pr-4 font-semibold">Type</th>
                    <th className="pb-3 pr-4 font-semibold">Poids</th>
                  </tr>
                </thead>
                <tbody>
                  {pesees.map((p: any) => (
                    <tr key={p.id} className="border-b border-[var(--sf-line,rgba(0,0,0,0.12))]">
                      <td className="py-3 pr-4 font-mono tabular-nums text-[var(--sf-ink,#1a1a1a)]">
                        {new Date(p.date_pesee).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 pr-4 text-[var(--sf-ink,#1a1a1a)]">
                        {p.animal?.nom ?? p.bande?.nom ?? '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{p.type}</Badge>
                      </td>
                      <td className="py-3 pr-4 font-mono tabular-nums font-bold text-[var(--sf-ink,#1a1a1a)]">
                        {p.poids_kg} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      <PeseesFab animaux={animaux ?? []} bandes={bandes ?? []} />
    </div>
  )
}
