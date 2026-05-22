import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageTitle } from '@/components/ui/page-title'
import { PiggyBank } from 'lucide-react'
import { CheptelActions } from './_actions'
import { CheptelRow, CheptelRowActions } from './_row-actions'
import { toneTruie } from '@/lib/colors'
import { categorieLabel } from '@/lib/terrain-labels'

export const metadata: Metadata = {
  title: 'Cheptel — Smart Farm',
}

/** Mapping ton sémantique → variante Badge atome carnet. */
const TONE_TO_VARIANT = {
  nominal: 'success',
  attendu: 'warning',
  urgence: 'danger',
  neutre: 'secondary',
} as const

export default async function CheptelPage() {
  const sb = await createClient()
  const [{ data: animaux }, { data: races }] = await Promise.all([
    sb.from('animaux').select('*, races(nom)').order('tag'),
    sb.from('races').select('id, nom').order('nom'),
  ])

  return (
    <div className="space-y-6">
      {/* === Header de page : PageTitle unifié === */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <PageTitle
            eyebrow="ÉLEVAGE"
            icon={<PiggyBank className="h-9 w-9 text-[var(--sf-primary)]" />}
            className="mb-1"
          >
            Cheptel
          </PageTitle>
          <p
            className="text-sm text-[var(--sf-muted)]"
            style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
          >
            {animaux?.length ?? 0} animaux sur la ferme
          </p>
        </div>
        <CheptelActions races={races ?? []} />
      </div>

      {/* === Tableau carnet : pas de Card englobante (cf. brief Vague 3) === */}
      {(animaux ?? []).length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Le cheptel est vide"
          description="Aucun animal n'est encore enregistré sur la ferme. Ajoute ta première truie, ton premier verrat ou ta première cochette pour commencer."
        />
      ) : (
      <section aria-labelledby="cheptel-liste-titre">
        <h2
          id="cheptel-liste-titre"
          className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)] mb-3"
        >
          Liste des animaux
        </h2>
        <h3
          className="font-[family-name:var(--sf-font-display)] text-sm uppercase tracking-[0.1em] text-[var(--sf-muted)] mb-2"
        >
          Truies, verrats et cochettes enregistrés
        </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-t border-b border-[var(--sf-line)]">
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
              <th className="py-3 pr-4 font-semibold">Tag</th>
              <th className="py-3 pr-4 font-semibold">Nom</th>
              <th className="py-3 pr-4 font-semibold">Sexe</th>
              <th className="py-3 pr-4 font-semibold">Catégorie</th>
              <th className="py-3 pr-4 font-semibold">Race</th>
              <th className="py-3 pr-4 font-semibold">Naissance</th>
              <th className="py-3 pr-4 font-semibold">Statut</th>
              <th className="py-3 pr-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(animaux ?? []).map((a: any) => {
              const tone = toneTruie(a.rang_porte, a.statut)
              const aSortir = tone === 'attendu' && a.statut === 'actif'
              const statutVariant = aSortir ? 'warning' : TONE_TO_VARIANT[tone]
              return (
                <CheptelRow
                  key={a.id}
                  animalId={a.id}
                  className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40"
                >
                  <td className="py-3 pr-4 font-mono font-bold text-[var(--sf-ink)] tabular-nums">
                    {a.tag}
                  </td>
                  <td className="py-3 pr-4 text-[var(--sf-ink)]">{a.nom ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={a.sexe === 'M' ? 'outline' : 'secondary'}>
                      {a.sexe === 'M' ? '♂ Mâle' : '♀ Femelle'}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className="capitalize">
                      {a.categorie}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-[var(--sf-ink-soft)]">{a.races?.nom ?? '—'}</td>
                  <td className="py-3 pr-4 text-[var(--sf-muted)] tabular-nums">
                    {a.date_naissance
                      ? new Date(a.date_naissance).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={statutVariant}>
                      {a.statut}
                      {aSortir ? ' · à sortir' : ''}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <CheptelRowActions animalId={a.id} animalTag={a.tag} />
                  </td>
                </CheptelRow>
              )
            })}
          </tbody>
        </table>
      </div>
      </section>
      )}
    </div>
  )
}
