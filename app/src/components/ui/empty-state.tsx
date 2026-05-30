import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

/**
 * EmptyState — bloc affiché quand une section/liste est vide.
 * Pas de gradients, pas de shadows, aplats sémantiques carnet d'élevage.
 *
 * Variantes :
 *  - default : ton neutre + CTA optionnel (incite à créer une donnée)
 *  - good    : ton vert ferme — c'est une BONNE nouvelle (rien d'urgent, stocks OK)
 */
export type EmptyStateTone = 'default' | 'good'

export interface EmptyStateProps {
  /** Icône principale (lucide). Optionnelle. */
  icon?: LucideIcon
  /** Titre court (eyebrow style). */
  title: string
  /** Texte secondaire descriptif. */
  description?: string
  /** Ton sémantique — 'good' = bonne nouvelle. */
  tone?: EmptyStateTone
  /** CTA principal (lien). */
  cta?: {
    label: string
    href: string
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'default',
  cta,
  className = '',
}: EmptyStateProps) {
  const isGood = tone === 'good'
  // Couleurs aplats — pas de gradient. 'good' = bonne nouvelle (vert Sahel primary).
  const iconColor = isGood ? 'text-[var(--sf-primary)]' : 'text-[var(--sf-subtle)]'
  const titleColor = isGood ? 'text-[var(--sf-primary)]' : 'text-[var(--sf-ink)]'

  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-4 py-8 ${className}`}
    >
      {Icon ? (
        <Icon className={`mb-4 h-8 w-8 ${iconColor}`} strokeWidth={1.5} aria-hidden />
      ) : null}
      <div
        className={`font-[family-name:var(--sf-font-display)] text-[12px] font-bold ${titleColor}`}
      >
        {title}
      </div>
      {description ? (
        <p className="mt-2 max-w-[36ch] text-sm text-[var(--sf-ink-secondary)]">
          {description}
        </p>
      ) : null}
      {cta ? (
        <Link href={cta.href} className="mt-4 inline-flex">
          <Button size="sm">{cta.label}</Button>
        </Link>
      ) : null}
    </div>
  )
}
