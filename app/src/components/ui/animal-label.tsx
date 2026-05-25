import { cn } from '@/lib/utils'
import {
  isNomRedundant,
  type AnimalLabelFormat,
  type AnimalLike,
} from '@/lib/format/animal-label'

/**
 * Smart Farm — `<AnimalLabel>` (Server Component compatible).
 * -------------------------------------------------------------------------
 * Affiche `nom (tag)` ou `tag · nom` ou juste `tag`, en évitant le bug
 * "B.10 (B.10)" : si `nom` est vide ou égal au `tag`, on retombe sur le tag.
 *
 * Le tag est toujours rendu en `font-mono tabular-nums` (boucle = identifiant
 * stable, gain lisibilité plein soleil). Le nom est rendu en typo body avec
 * un léger contraste secondaire (jamais en gras pour ne pas concurrencer le
 * tag, qui reste l'ancre visuelle métier).
 *
 * Usage :
 *   <AnimalLabel animal={{ tag: 'B.26', nom: 'Pirouette' }} />
 *   <AnimalLabel animal={{ tag: 'B.10', nom: 'B.10' }} />          // → "B.10"
 *   <AnimalLabel animal={truie} format="inline" />                 // → "B.26 · Pirouette"
 *   <AnimalLabel animal={truie} format="tag-only" />               // → "B.26"
 */

export type AnimalLabelProps = {
  animal: AnimalLike
  /**
   * - `full` (défaut) → "Pirouette (B.26)" si nom utile, sinon "B.26"
   * - `tag-only`      → toujours "B.26"
   * - `inline`        → "B.26 · Pirouette" si nom utile, sinon "B.26"
   */
  format?: AnimalLabelFormat
  className?: string
}

export function AnimalLabel({
  animal,
  format = 'full',
  className,
}: AnimalLabelProps) {
  const tag = animal.tag
  const hideNom = format === 'tag-only' || isNomRedundant(animal)
  const nom = hideNom ? null : animal.nom!.trim()

  // Cas tag seul : pas de span imbriqué (DOM minimal).
  if (!nom) {
    return (
      <span
        className={cn(
          'font-mono font-bold tabular-nums',
          className,
        )}
      >
        {tag}
      </span>
    )
  }

  // Cas inline : "B.26 · Pirouette" — tag d'abord (ancre visuelle).
  if (format === 'inline') {
    return (
      <span className={cn('inline-flex items-baseline gap-1.5', className)}>
        <span className="font-mono font-bold tabular-nums">{tag}</span>
        <span aria-hidden="true" className="text-[var(--sf-muted)]">·</span>
        <span className="font-medium">{nom}</span>
      </span>
    )
  }

  // Cas full : "Pirouette (B.26)" — nom d'abord (vibe carnet), tag entre parenthèses.
  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      <span className="font-medium">{nom}</span>
      <span className="font-mono font-bold tabular-nums text-[var(--sf-ink-secondary)]">
        ({tag})
      </span>
    </span>
  )
}

/**
 * Re-export du formatter string pour les cas non-JSX (exports, logs, alt text).
 * Évite d'importer deux modules différents côté appelant.
 */
export { formatAnimalLabel, isNomRedundant } from '@/lib/format/animal-label'
export type { AnimalLabelFormat, AnimalLike } from '@/lib/format/animal-label'

export default AnimalLabel
