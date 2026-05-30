import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Scale } from 'lucide-react'
import { FormattedDateTime } from '@/components/ui/formatted-date'
import { ActionsPeser } from './_actions-peser'

export default async function PeseesPage({
  searchParams,
}: {
  searchParams?: Promise<{ action?: string; animal_id?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const defaultOpen = sp.action === 'new'
  const defaultAnimalId = sp.animal_id
  const sb = await createClient()
  const [{ data: pesees, error: peseesErr }, { data: animaux }, { data: bandes }] =
    await Promise.all([
      sb
        .from('pesees')
        .select(`*, animal:animal_id(tag,nom)`)
        .order('date_pesee', { ascending: false })
        .limit(50),
      sb.from('animaux').select('id, tag, nom').in('statut', ['actif', 'malade']).is('deleted_at', null).order('tag'),
      sb.from('bandes').select('id, nom, code').order('nom'),
    ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-2 text-[var(--ink)]">
            <Scale className="h-7 w-7 text-[var(--sage)]" />Pesées
          </h1>
          <p className="text-sm text-[var(--mut)] mt-1">Gain par jour · Courbes de poids</p>
        </div>
        <ActionsPeser
          animaux={animaux ?? []}
          bandes={bandes ?? []}
          defaultOpen={defaultOpen}
          defaultAnimalId={defaultAnimalId}
        />
      </div>

      {peseesErr ? (
        <ErrorState
          title="Erreur de chargement des pesées"
          message={peseesErr.message}
        />
      ) : (!pesees || pesees.length === 0) ? (
        <EmptyState
          icon={<Scale className="h-[22px] w-[22px]" strokeWidth={1.8} />}
          title="Aucune pesée pour l'instant"
          message="Commence par peser un animal."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="eyebrow text-[13px]">Dernières pesées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sujet</th>
                    <th>Type</th>
                    <th className="num">Poids</th>
                  </tr>
                </thead>
                <tbody>
                  {pesees.map((p: any) => (
                    <tr key={p.id}>
                      <td className="font-mono tabular-nums text-[var(--mut)]">
                        <FormattedDateTime date={p.date_pesee} format="date" />
                      </td>
                      <td className="text-[var(--ink)]">
                        {p.animal?.nom ?? '—'}
                      </td>
                      <td>
                        <Badge variant="outline">{p.type}</Badge>
                      </td>
                      <td className="num font-mono tabular-nums font-bold text-[var(--ink)]">
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
    </div>
  )
}
