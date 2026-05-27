import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * EmptyOnboarding — Card empty state riche pour onboarding éleveur.
 *
 * Différent de <EmptyState> (utilisé pour vides courts en tableau / liste) :
 * - Card pleine largeur, padding généreux (Sahel terrain, lecture 3s)
 * - Eyebrow + Titre Big Shoulders + description pédagogique
 * - CTA primary "Commencer en 30s" + CTA secondary "Voir exemple"
 *
 * Server-component compatible (pas de hook, pas de 'use client').
 *
 * Tokens utilisés (alias sémantiques globals.css) :
 *  - --sf-surface-1   (= mil-50, fond crème)
 *  - --sf-line        (= terre-200, border)
 *  - --sf-primary     (= sahel-700, icône + titre)
 *  - --sf-ink         (texte titre fallback)
 *  - --sf-ink-secondary (description)
 *  - --sf-font-display (Big Shoulders Display)
 */
export interface EmptyOnboardingProps {
  /** Icône Lucide (passée déjà rendue, ex: <Stethoscope className="h-12 w-12" />) */
  icon: React.ReactNode
  /** Eyebrow contextuel court (ex: "MODULE PROTOCOLES"). Uppercase auto. */
  eyebrow?: string
  /** Titre pédagogique (ex: "Aucun protocole enregistré") */
  title: string
  /** 1-2 lignes "pourquoi c'est utile" en français simple */
  description: string
  /** CTA principal */
  cta?: { label: string; href: string }
  /** CTA secondaire optionnel */
  ctaSecondary?: { label: string; href: string }
  className?: string
}

export function EmptyOnboarding({
  icon,
  eyebrow,
  title,
  description,
  cta,
  ctaSecondary,
  className = '',
}: EmptyOnboardingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-10 sm:py-12 ${className}`}
      style={{
        background: 'var(--sf-surface-1)',
        border: '1px solid var(--sf-line)',
        borderRadius: 'var(--sf-radius-lg, 12px)',
      }}
    >
      <div
        className="mb-4 inline-flex items-center justify-center"
        style={{ color: 'var(--sf-primary)' }}
        aria-hidden
      >
        {icon}
      </div>

      {eyebrow ? (
        <div
          className="mb-2 font-bold"
          style={{
            fontFamily: 'var(--sf-font-display)',
            fontSize: '12px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--sf-ink-secondary)',
          }}
        >
          {eyebrow}
        </div>
      ) : null}

      <h2
        className="mb-3"
        style={{
          fontFamily: 'var(--sf-font-display)',
          fontSize: 'clamp(22px, 2.4vw, 28px)',
          lineHeight: 1.15,
          fontWeight: 700,
          color: 'var(--sf-primary)',
        }}
      >
        {title}
      </h2>

      <p
        className="mb-6 max-w-[60ch] text-sm sm:text-base"
        style={{
          color: 'var(--sf-ink-secondary)',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {(cta || ctaSecondary) && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center w-full sm:w-auto">
          {cta ? (
            <Link href={cta.href} className="inline-flex">
              <Button variant="default" size="default">
                {cta.label}
              </Button>
            </Link>
          ) : null}
          {ctaSecondary ? (
            <Link href={ctaSecondary.href} className="inline-flex">
              <Button variant="outline" size="default">
                {ctaSecondary.label}
              </Button>
            </Link>
          ) : null}
        </div>
      )}
    </div>
  )
}
