'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * AnimalTabs — stub initial.
 * Affiche 4 onglets (Pesées, Reproduction, Santé, Mouvements).
 * Le contenu détaillé sera ajouté par la prochaine itération ; pour
 * l'instant on garantit juste un rendu propre et le build qui passe.
 */
export function AnimalTabs({
  animalId,
  isFemelle,
  nbVaccinations,
  nbTraitements,
}: {
  animalId: string
  isFemelle: boolean
  nbVaccinations: number
  nbTraitements: number
}) {
  const allTabs = [
    { id: 'pesees', label: 'Pesées' },
    ...(isFemelle ? [{ id: 'repro', label: 'Reproduction' }] : []),
    { id: 'sante', label: 'Santé' },
    { id: 'mouvements', label: 'Mouvements' },
  ]
  const [active, setActive] = useState(allTabs[0].id)

  const eyebrowCls =
    'font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted)] font-bold'

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

      <Card>
        <CardHeader>
          <div className={eyebrowCls}>{allTabs.find((t) => t.id === active)?.label}</div>
        </CardHeader>
        <CardContent>
          {active === 'pesees' && (
            <p className="text-sm text-[var(--sf-muted)]">
              Historique des pesées — à venir (animal {animalId.slice(0, 8)}…).
            </p>
          )}
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
          {active === 'mouvements' && (
            <p className="text-sm text-[var(--sf-muted)]">
              Historique des mouvements entre bâtiments — à venir.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
