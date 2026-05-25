'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, AlertTriangle, ChevronRight } from 'lucide-react'
import {
  MALADIES_PORCINES,
  GRAVITE_BADGE_VARIANT,
  CATEGORIE_LABELS,
  type Maladie,
} from '@/lib/maladies-porcines'

const GRAVITE_ORDER: Record<Maladie['gravite'], number> = {
  critique: 0,
  'élevée': 1,
  moyenne: 2,
  faible: 3,
}

type CategorieFilter = 'toutes' | Maladie['categorie']

export function MaladiesSearch() {
  const [query, setQuery] = useState('')
  const [categorie, setCategorie] = useState<CategorieFilter>('toutes')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MALADIES_PORCINES.filter((m) => {
      if (categorie !== 'toutes' && m.categorie !== categorie) return false
      if (!q) return true
      return (
        m.nom.toLowerCase().includes(q) ||
        m.nom_scientifique.toLowerCase().includes(q) ||
        m.symptomes.some((s) => s.toLowerCase().includes(q)) ||
        m.categorie.toLowerCase().includes(q) ||
        m.age_concerne.toLowerCase().includes(q)
      )
    }).sort((a, b) => GRAVITE_ORDER[a.gravite] - GRAVITE_ORDER[b.gravite])
  }, [query, categorie])

  const categories: { value: CategorieFilter; label: string }[] = [
    { value: 'toutes', label: 'Toutes' },
    { value: 'virale', label: 'Virales' },
    { value: 'bactérienne', label: 'Bactériennes' },
    { value: 'parasitaire', label: 'Parasitaires' },
    { value: 'nutritionnelle', label: 'Nutritionnelles' },
    { value: 'autre', label: 'Autres' },
  ]

  return (
    <div className="space-y-4">
      {/* Barre recherche + filtres */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sf-muted,#5C5346)]" />
          <Input
            type="search"
            placeholder="Rechercher par nom, symptôme, catégorie…"
            aria-label="Rechercher maladie"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategorie(c.value)}
              className={
                // Touch target ≥ 44px (audit mobile 2026-05-25) — terrain CI gants/mains sales
                'inline-flex items-center min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors border ' +
                (categorie === c.value
                  ? 'bg-[var(--sf-primary,#2D4A1F)] text-white border-[var(--sf-primary,#2D4A1F)]'
                  : 'bg-transparent text-[var(--sf-ink,#1a1a1a)] border-[var(--sf-muted,#5C5346)]/30 hover:bg-[var(--sf-surface-1,rgba(0,0,0,0.04))]')
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compteur */}
      <p className="text-sm text-[var(--sf-muted,#5C5346)]">
        {filtered.length} maladie{filtered.length > 1 ? 's' : ''} affichée
        {filtered.length > 1 ? 's' : ''}
      </p>

      {/* Grille de cards */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--sf-muted,#5C5346)]/30 p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-[var(--sf-muted,#5C5346)]" />
          <p className="mt-2 text-sm text-[var(--sf-muted,#5C5346)]">
            Aucune maladie ne correspond à votre recherche.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <Link
              key={m.slug}
              href={`/sanitaire/maladies/${m.slug}`}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-primary,#2D4A1F)] focus-visible:ring-offset-2 rounded-lg"
            >
              <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight text-[var(--sf-ink,#1a1a1a)]">
                      {m.nom}
                    </CardTitle>
                    <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-[var(--sf-muted,#5C5346)] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-xs italic text-[var(--sf-muted,#5C5346)] line-clamp-1">
                    {m.nom_scientifique}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={GRAVITE_BADGE_VARIANT[m.gravite]}>
                      {m.gravite}
                    </Badge>
                    <Badge variant="outline">
                      {CATEGORIE_LABELS[m.categorie]}
                    </Badge>
                    <Badge variant="secondary">
                      Contagiosité {m.contagiosite}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--sf-muted,#5C5346)]">
                    <span className="font-medium text-[var(--sf-ink,#1a1a1a)]">
                      Âge concerné :
                    </span>{' '}
                    {m.age_concerne}
                  </p>
                  <div>
                    <p className="text-xs font-medium text-[var(--sf-ink,#1a1a1a)] mb-1">
                      Symptômes clés :
                    </p>
                    <ul className="text-xs text-[var(--sf-muted,#5C5346)] space-y-0.5 list-disc list-inside">
                      {m.symptomes.slice(0, 3).map((s, i) => (
                        <li key={i} className="line-clamp-1">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
