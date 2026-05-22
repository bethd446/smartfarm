'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Smart Farm — PasswordInput (atome composé)
 * -------------------------------------------------------------------------
 * Réutilise <Input /> (design underline ink → primary) et ajoute un bouton
 * œil pour basculer la visibilité du mot de passe.
 *
 * API identique à <Input /> — passe-thru des props natives (id, name,
 * autoComplete, minLength, required, autoFocus, etc.). Le `type` est forcé
 * en interne (password ↔ text).
 *
 * Détails design / a11y :
 *   - wrapper position:relative
 *   - bouton type='button' (PAS de submit accidentel), absolute right-2
 *   - aria-label dynamique FR
 *   - pr-10 sur l'input pour laisser place au bouton
 *   - icônes lucide-react Eye / EyeOff (16px)
 *   - le bouton hérite des couleurs muted → ink (cohérence underline)
 */
type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'>

function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        className={cn(
          'absolute right-2 top-1/2 -translate-y-1/2',
          'inline-flex h-8 w-8 items-center justify-center',
          'text-[var(--sf-muted,#5C5346)] hover:text-[var(--sf-ink,#1a1a1a)]',
          'focus:outline-none focus-visible:text-[var(--sf-primary,#2D4A1F)]',
          'transition-colors',
        )}
        tabIndex={0}
      >
        {visible ? (
          <EyeOff size={18} aria-hidden="true" />
        ) : (
          <Eye size={18} aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

export { PasswordInput }
