'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Baby, X, ArrowRightLeft, Truck, Skull } from 'lucide-react'
import { CheptelRowActions } from './_row-actions'
import { LIBELLES_STADE, type StadeAnimal } from '@/lib/stades-animaux'
import {
  DialogChangerStadeBatch,
  type AnimalLite,
} from './_dialog-changer-stade-batch'
import { DialogTransfertBatch } from './_dialog-transfert-batch'
import { DialogMortaliteBatch } from './_dialog-mortalite-batch'

type BatimentLite = { id: string; nom: string; type: string }

type Porcelet = {
  id: string
  tag: string
  nom: string | null
  sexe: string
  categorie: string
  stade: string
  date_naissance: string | null
  statut: string
  poids_actuel_kg?: number | null
  races?: { nom: string | null } | null
}

export function PorceletsTableBulk({
  rows,
  batiments = [],
}: {
  rows: Porcelet[]
  batiments?: BatimentLite[]
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTransfertOpen, setDialogTransfertOpen] = useState(false)
  const [dialogMortaliteOpen, setDialogMortaliteOpen] = useState(false)

  const allVisibleIds = useMemo(() => rows.map((r) => r.id), [rows])

  // Purge selectedIds devenus absents de rows (changement de filtre/recherche)
  useEffect(() => {
    setSelectedIds((prev) => {
      const visible = new Set(allVisibleIds)
      const next = new Set<string>()
      for (const id of prev) if (visible.has(id)) next.add(id)
      return next.size === prev.size ? prev : next
    })
  }, [allVisibleIds])
  const allSelected = rows.length > 0 && selectedIds.size === rows.length
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(allVisibleIds))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const selectedAnimaux: AnimalLite[] = useMemo(
    () =>
      rows
        .filter((r) => selectedIds.has(r.id))
        .map((r) => ({
          id: r.id,
          tag: r.tag,
          categorie: r.categorie,
          stade: r.stade,
        })),
    [rows, selectedIds],
  )

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Baby}
        title="Aucun porcelet"
        description="Aucun animal ne correspond aux filtres en cours."
      />
    )
  }

  return (
    <section aria-labelledby="porcelets-bulk-titre">
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm border-b border-[var(--sf-line)] border-t-2"
          style={{ borderTopColor: 'var(--sf-primary)' }}
        >
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
              <th className="py-3 pl-3 pr-2 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={toggleAll}
                  aria-label="Tout sélectionner"
                  className="h-5 w-5 cursor-pointer accent-[var(--sf-primary)]"
                />
              </th>
              <th className="py-3 pr-4 font-semibold">Tag</th>
              <th className="py-3 pr-4 font-semibold">Nom</th>
              <th className="py-3 pr-4 font-semibold">Sexe</th>
              <th className="py-3 pr-4 font-semibold">Catégorie</th>
              <th className="py-3 pr-4 font-semibold">Stade</th>
              <th className="py-3 pr-4 font-semibold">Race</th>
              <th className="py-3 pr-4 font-semibold">Naissance</th>
              <th className="py-3 pr-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const checked = selectedIds.has(r.id)
              return (
                <tr
                  key={r.id}
                  className={`border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40 ${
                    checked ? 'bg-[var(--sf-primary)]/5' : ''
                  }`}
                >
                  <td className="py-3 pl-3 pr-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(r.id)}
                      aria-label={`Sélectionner ${r.tag}`}
                      className="h-5 w-5 cursor-pointer accent-[var(--sf-primary)]"
                    />
                  </td>
                  <td className="py-3 pr-4 font-mono font-bold text-[var(--sf-ink)] tabular-nums">
                    <Link
                      href={`/cheptel/${r.id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {r.tag}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-[var(--sf-ink)]">{r.nom ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={r.sexe === 'M' ? 'outline' : 'secondary'}>
                      {r.sexe === 'M' ? '♂ Mâle' : '♀ Femelle'}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className="capitalize">
                      {r.categorie.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="secondary">
                      {LIBELLES_STADE[r.stade as StadeAnimal] ?? r.stade}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-[var(--sf-ink-soft)]">
                    {r.races?.nom ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-[var(--sf-muted)] tabular-nums">
                    {r.date_naissance
                      ? new Date(r.date_naissance).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <CheptelRowActions
                      animalId={r.id}
                      animalTag={r.tag}
                      stade={r.stade}
                      poidsActuel={r.poids_actuel_kg ?? undefined}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Sticky bar bas — apparaît si sélection non vide.
          Offset bottom-16 sur mobile pour ne pas être masquée par BottomNav (h-16 z-40).
          z-50 pour passer au-dessus de BottomNav. */}
      {selectedIds.size > 0 && (
        <div
          className="fixed bottom-16 lg:bottom-0 inset-x-0 z-50 border-t shadow-lg"
          style={{
            background: 'var(--sf-surface-1)',
            borderColor: 'var(--sf-line)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          role="region"
          aria-label="Actions bulk sélection"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-[var(--sf-ink)]">
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-1 h-10 px-3 rounded-md border border-[var(--sf-line)] text-sm text-[var(--sf-muted)] hover:text-[var(--sf-ink)] hover:bg-[var(--sf-surface-2)]/40"
                aria-label="Tout désélectionner"
              >
                <X className="h-4 w-4" /> Effacer
              </button>
              <button
                type="button"
                onClick={() => setDialogTransfertOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-[var(--sf-line)] text-sm font-semibold text-[var(--sf-ink)] hover:bg-[var(--sf-surface-2)]/40"
              >
                <Truck className="h-4 w-4" /> Transférer
              </button>
              <button
                type="button"
                onClick={() => setDialogMortaliteOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-[var(--sf-danger-border,#D89C92)] text-sm font-semibold text-[var(--sf-danger-ink,#7A2A1F)] hover:bg-[var(--sf-danger-bg,#F1D4CE)]/40"
              >
                <Skull className="h-4 w-4" /> Mortalité
              </button>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md font-semibold text-sm text-white"
                style={{ background: 'var(--sf-primary, #2D4A1F)' }}
              >
                <ArrowRightLeft className="h-4 w-4" />
                Changer le stade
              </button>
            </div>
          </div>
        </div>
      )}

      <DialogChangerStadeBatch
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        animaux={selectedAnimaux}
        onSuccess={clearSelection}
      />

      <DialogTransfertBatch
        open={dialogTransfertOpen}
        onOpenChange={setDialogTransfertOpen}
        animaux={selectedAnimaux}
        batiments={batiments}
        onSuccess={clearSelection}
      />

      <DialogMortaliteBatch
        open={dialogMortaliteOpen}
        onOpenChange={setDialogMortaliteOpen}
        animaux={selectedAnimaux}
        onSuccess={clearSelection}
      />
    </section>
  )
}
