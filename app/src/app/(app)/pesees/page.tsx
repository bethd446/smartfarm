import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { PageTitle } from '@/components/ui/page-title'
import { RelativeTime } from '@/components/ui/relative-time'
import { Scale } from 'lucide-react'
import { ActionsPeser } from './_actions-peser'
import { PeseesFab } from './_fab'

/**
 * V2-HARMONIE (Phase D3 — Task 5) — Pesées
 * -------------------------------------------------------------------------
 * Pattern E (header eyebrow + Big Shoulders) + Pattern C (table dense hairline).
 * KPI total intégré en sous-compteur tabular-nums du header (1 mesure isolée
 * ne justifie pas un bandeau Pattern A).
 */
export default async function PeseesPage({
  searchParams,
}: {
  searchParams?: Promise<{ action?: string; animal_id?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const defaultOpen = sp.action === 'new'
  const defaultAnimalId = sp.animal_id
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

  const total = pesees?.length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <PageTitle
            eyebrow="PERFORMANCES"
            icon={<Scale className="h-9 w-9 text-[var(--sf-primary)]" />}
            className="mb-1"
          >
            Pesées
          </PageTitle>
          <p className="text-sm text-[var(--sf-muted)]">
            <span className="tabular-nums font-semibold text-[var(--sf-ink)]">{total}</span>
            {' '}pesée{total > 1 ? 's' : ''} récente{total > 1 ? 's' : ''} · GMQ et courbes de poids
          </p>
        </div>
        <ActionsPeser
          animaux={animaux ?? []}
          bandes={bandes ?? []}
          defaultOpen={defaultOpen}
          defaultAnimalId={defaultAnimalId}
        />
      </div>

      {(!pesees || pesees.length === 0) ? (
        <div className="border border-[var(--sf-line)] py-12 text-center">
          <Scale className="h-12 w-12 mx-auto text-[var(--sf-line)] mb-3" />
          <p
            className="text-[11px] uppercase tracking-[0.18em] text-[var(--sf-muted)] font-bold"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            Aucune pesée pour l'instant
          </p>
          <p className="text-sm text-[var(--sf-muted)] mt-2">
            Commence par peser une bande.
          </p>
        </div>
      ) : (
        <section aria-labelledby="pesees-recentes-titre">
          <h2
            id="pesees-recentes-titre"
            className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)] mt-2 mb-3"
          >
            Dernières pesées
          </h2>
          <div
            className="overflow-x-auto -mx-4 sm:mx-0 border-t-2"
            style={{ borderTopColor: 'var(--sf-primary,#2D4A1F)' }}
          >
            <table className="w-full min-w-[640px] text-sm">
              <thead
                className="border-b border-[var(--sf-line)] text-left text-[var(--sf-muted)]"
                style={{
                  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Sujet</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold text-right">Poids</th>
                </tr>
              </thead>
              <tbody>
                {pesees.map((p: any) => {
                  const nom = p.animal?.nom ?? p.bande?.nom ?? '—'
                  const tag = p.animal?.tag ?? p.bande?.code ?? null
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40"
                    >
                      <td className="py-3 px-4 tabular-nums text-[var(--sf-ink)]">
                        <RelativeTime date={p.date_pesee} addSuffix />
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--sf-ink)]">
                        {nom}
                        {tag && (
                          <>
                            {' '}
                            <span className="text-sm text-[var(--sf-subtle)] font-mono">
                              ({tag})
                            </span>
                          </>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{p.type}</Badge>
                      </td>
                      <td className="py-3 px-4 tabular-nums font-bold text-[var(--sf-ink)] text-right">
                        {p.poids_kg} kg
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <PeseesFab animaux={animaux ?? []} bandes={bandes ?? []} />
    </div>
  )
}
