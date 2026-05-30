import Link from 'next/link'
import { BookOpen, ArrowLeft, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MaladiesSearch } from './_search'
import { MALADIES_PORCINES } from '@/lib/maladies-porcines'

export const metadata = {
  title: 'Catalogue maladies porcines',
  description:
    'Catalogue des 15 maladies porcines prioritaires en Côte d\'Ivoire : symptômes, diagnostic, traitement et prévention.',
}

export default function MaladiesPage() {
  const counts = MALADIES_PORCINES.reduce(
    (acc, m) => {
      acc[m.gravite] = (acc[m.gravite] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/sanitaire"
            className="inline-flex items-center gap-1 min-h-11 py-2 text-sm text-[var(--mut)] hover:text-[var(--sage-d)] transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour Soins
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--ink)] font-[family-name:var(--disp)] tracking-[-0.02em]">
            <BookOpen className="h-7 w-7 text-[var(--sage-d)]" />
            Catalogue maladies
          </h1>
          <p className="text-sm text-[var(--mut)] mt-1">
            {MALADIES_PORCINES.length} pathologies porcines prioritaires en
            Côte d&apos;Ivoire — sources OIE, FAO, INRAE
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="danger">
            {counts.critique ?? 0} critique{(counts.critique ?? 0) > 1 ? 's' : ''}
          </Badge>
          <Badge variant="danger">
            {counts['élevée'] ?? 0} élevée{(counts['élevée'] ?? 0) > 1 ? 's' : ''}
          </Badge>
          <Badge variant="warning">
            {counts.moyenne ?? 0} moyenne{(counts.moyenne ?? 0) > 1 ? 's' : ''}
          </Badge>
          <Badge variant="success">
            {counts.faible ?? 0} faible{(counts.faible ?? 0) > 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Avertissement — lecture en direct VERGER (.live.warn) */}
      <div className="live warn !max-w-none items-start">
        <span className="lv-ic mt-0.5">
          <AlertTriangle className="h-[17px] w-[17px]" aria-hidden="true" />
        </span>
        <div>
          <b>Aide à la décision — validation vétérinaire requise</b>
          <small>
            Toute prescription de médicament vétérinaire doit être validée par
            un vétérinaire agréé en Côte d&apos;Ivoire. Les molécules indiquées
            correspondent aux protocoles standards de référence (OIE/FAO/INRAE).
          </small>
        </div>
      </div>

      {/* Composant client recherche + grille */}
      <MaladiesSearch />
    </div>
  )
}
