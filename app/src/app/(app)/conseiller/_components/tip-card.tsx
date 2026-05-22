import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Smart Farm — TipCard (C2-SCHEMA)
 * Card cliquable affichée dans la grille `/conseiller`.
 * - Titre + résumé tronqué
 * - Badges catégorie (default) + niveau (outline)
 * - Tags (max 4 visibles)
 */

export type TipCardData = {
  slug: string
  titre: string
  categorie: string
  niveau: string
  resume: string
  tags: string[]
}

export const CATEGORIE_LABELS: Record<string, string> = {
  reproduction: 'Reproduction',
  sanitaire: 'Sanitaire',
  nutrition: 'Nutrition',
  conduite: 'Conduite',
  economique: 'Économique',
  installation: 'Installation',
}

export const CATEGORIE_BADGE_VARIANT: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
> = {
  reproduction: 'info',
  sanitaire: 'danger',
  nutrition: 'success',
  conduite: 'secondary',
  economique: 'warning',
  installation: 'default',
}

export const NIVEAU_LABELS: Record<string, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  expert: 'Expert',
}

export function TipCard({ tip }: { tip: TipCardData }) {
  const catVariant = CATEGORIE_BADGE_VARIANT[tip.categorie] ?? 'secondary'
  const visibleTags = tip.tags.slice(0, 4)
  const extraTags = tip.tags.length - visibleTags.length

  return (
    <Link
      href={`/conseiller/${tip.slug}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-primary,#2D4A1F)] focus-visible:ring-offset-2 rounded-lg"
    >
      <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight text-[var(--sf-ink,#1a1a1a)]">
              {tip.titre}
            </CardTitle>
            <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-[var(--sf-muted,#5C5346)] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={catVariant}>
              {CATEGORIE_LABELS[tip.categorie] ?? tip.categorie}
            </Badge>
            <Badge variant="outline">
              {NIVEAU_LABELS[tip.niveau] ?? tip.niveau}
            </Badge>
          </div>
          <p className="text-xs text-[var(--sf-muted,#5C5346)] line-clamp-3">
            {tip.resume}
          </p>
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {visibleTags.map((t) => (
                <span
                  key={t}
                  className="inline-block rounded-md bg-[var(--sf-surface-2,#EFE7D6)]/60 px-1.5 py-0.5 text-[10px] text-[var(--sf-muted,#5C5346)]"
                >
                  #{t}
                </span>
              ))}
              {extraTags > 0 && (
                <span className="inline-block text-[10px] text-[var(--sf-subtle,#8A7E6E)] px-1 py-0.5">
                  +{extraTags}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
