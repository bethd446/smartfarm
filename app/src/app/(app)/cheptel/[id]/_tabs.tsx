'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DialogDeplacerAnimal } from './_dialog-deplacer-animal'

type Batiment = { id: string; nom: string; type?: string | null }
type Mouvement = {
  id: string
  type: string
  date_mouvement: string
  batiment_source_id: string | null
  batiment_dest_id: string | null
  motif: string | null
  effectif: number | null
}

/**
 * AnimalTabs — onglets de la fiche animal.
 * F3 — Onglet "Mouvements" : bouton déplacer + historique transferts.
 */
export function AnimalTabs({
  animalId,
  animalTag,
  isFemelle,
  nbVaccinations,
  nbTraitements,
  batimentSourceId,
  batimentSourceNom,
  batiments,
  mouvements,
}: {
  animalId: string
  animalTag: string
  isFemelle: boolean
  nbVaccinations: number
  nbTraitements: number
  batimentSourceId: string | null
  batimentSourceNom: string | null
  batiments: Batiment[]
  mouvements: Mouvement[]
}) {
  // NOTE : l'onglet "Pesées" a été retiré — l'historique des pesées est rendu
  // en pleine page (composant <HistoriquePoids/> avant les onglets) car c'est
  // le cœur du suivi de l'animal et doit être immédiatement visible.
  const allTabs = [
    ...(isFemelle ? [{ id: 'repro', label: 'Reproduction' }] : []),
    { id: 'sante', label: 'Santé' },
    { id: 'mouvements', label: 'Mouvements' },
  ]
  const [active, setActive] = useState(allTabs[0].id)

  const eyebrowCls =
    'font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted)] font-bold'

  const batimentNom = (id: string | null): string => {
    if (!id) return '—'
    return batiments.find((b) => b.id === id)?.nom ?? id.slice(0, 8)
  }

  const typeLabel = (t: string): string => {
    switch (t) {
      case 'transfert':
        return 'Transfert'
      case 'entree':
        return 'Entrée'
      case 'sortie':
        return 'Sortie'
      case 'mort':
        return 'Mort'
      case 'vente':
        return 'Vente'
      case 'reforme':
        return 'Réforme'
      default:
        return t
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-[var(--sf-line)]">
        {allTabs.map((t) => {
          const isActive = t.id === active
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
                (isActive
                  ? 'border-[var(--sf-leaf)] text-[var(--sf-ink)]'
                  : 'border-transparent text-[var(--sf-muted)] hover:text-[var(--sf-ink)]')
              }
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {active === 'mouvements' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className={eyebrowCls}>Mouvements bâtiment</div>
              <DialogDeplacerAnimal
                animalId={animalId}
                animalTag={animalTag}
                batimentSourceId={batimentSourceId}
                batimentSourceNom={batimentSourceNom}
                batiments={batiments}
              />
            </div>
          </CardHeader>
          <CardContent>
            {mouvements.length === 0 ? (
              <p className="text-sm text-[var(--sf-muted)]">
                Aucun mouvement enregistré pour cet animal.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>De</th>
                      <th>Vers</th>
                      <th>Motif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mouvements.map((m) => (
                      <tr key={m.id}>
                        <td className="tabular-nums">
                          {new Date(m.date_mouvement).toLocaleDateString('fr-FR')}
                        </td>
                        <td>
                          <Badge variant="outline">{typeLabel(m.type)}</Badge>
                        </td>
                        <td>{batimentNom(m.batiment_source_id)}</td>
                        <td>{batimentNom(m.batiment_dest_id)}</td>
                        <td className="text-[var(--sf-muted)]">{m.motif ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className={eyebrowCls}>{allTabs.find((t) => t.id === active)?.label}</div>
          </CardHeader>
          <CardContent>
            {active === 'repro' && (
              <p className="text-sm text-[var(--sf-muted)]">
                Saillies, diagnostics, mises-bas — à venir.
              </p>
            )}
            {active === 'sante' && (
              <p className="text-sm text-[var(--sf-muted)]">
                {nbVaccinations} vaccination{nbVaccinations > 1 ? 's' : ''} ·{' '}
                {nbTraitements} traitement{nbTraitements > 1 ? 's' : ''}. Détail à venir.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
