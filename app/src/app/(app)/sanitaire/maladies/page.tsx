import Link from 'next/link'
import { BookOpen, ArrowLeft } from 'lucide-react'
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
            className="inline-flex items-center gap-1 min-h-11 py-2 text-sm text-[var(--sf-muted,#5C5346)] hover:text-[var(--sf-primary,#2D4A1F)] transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour Soins
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--sf-ink,#1a1a1a)]">
            <BookOpen className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Catalogue maladies
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            {MALADIES_PORCINES.length} pathologies porcines prioritaires en
            Côte d&apos;Ivoire — sources OIE, FAO, INRAE
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full px-3 py-1 bg-[var(--sf-danger-bg,#F1D4CE)] text-[var(--sf-danger-ink,#7A2A1F)]">
            {counts.critique ?? 0} critique{(counts.critique ?? 0) > 1 ? 's' : ''}
          </span>
          <span className="rounded-full px-3 py-1 bg-[var(--sf-danger-bg,#F1D4CE)] text-[var(--sf-danger-ink,#7A2A1F)]">
            {counts['élevée'] ?? 0} élevée{(counts['élevée'] ?? 0) > 1 ? 's' : ''}
          </span>
          <span className="rounded-full px-3 py-1 bg-[var(--sf-warning-bg,#F5E0B8)] text-[var(--sf-warning-ink,#5A3E0E)]">
            {counts.moyenne ?? 0} moyenne{(counts.moyenne ?? 0) > 1 ? 's' : ''}
          </span>
          <span className="rounded-full px-3 py-1 bg-[var(--sf-success-bg,#D6E3CC)] text-[var(--sf-success-ink,#1F3B12)]">
            {counts.faible ?? 0} faible{(counts.faible ?? 0) > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Avertissement */}
      <div className="rounded-lg border-l-4 border-[var(--sf-warning-ink,#5A3E0E)] bg-[var(--sf-warning-bg,#F5E0B8)] p-3 text-sm text-[var(--sf-warning-ink,#5A3E0E)]">
        Ce catalogue est un outil d&apos;aide à la décision. Toute prescription
        de médicament vétérinaire doit être validée par un vétérinaire agréé en
        Côte d&apos;Ivoire. Les molécules indiquées correspondent aux
        protocoles standards de référence (OIE/FAO/INRAE).
      </div>

      {/* Composant client recherche + grille */}
      <MaladiesSearch />
    </div>
  )
}
