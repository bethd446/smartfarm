'use client'

import * as React from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * InfoTip — petite bulle d'aide (?) qui explique un terme technique en mots simples.
 *
 * Usage :
 *   <InfoTip text="Combien de grammes l'animal gagne chaque jour." />
 *   <InfoTip text="..." label="Aide GMQ" />
 *
 * Comportement :
 *   - bouton (?) discret à côté du terme
 *   - au clic OU au focus : affiche la bulle d'explication
 *   - clic à l'extérieur ou Échap : ferme
 *   - mobile-friendly : c'est un VRAI bouton, pas un hover-only
 */
export function InfoTip({
  text,
  label,
  className,
  size = 'sm',
}: {
  text: string
  /** Label accessible (sr-only). Défaut : "Plus d'infos". */
  label?: string
  className?: string
  size?: 'sm' | 'md'
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLSpanElement | null>(null)

  // Ferme si clic à l'extérieur
  React.useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <span ref={ref} className={cn('relative inline-flex align-baseline', className)}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label={label ?? "Plus d'infos"}
        aria-expanded={open}
        className="inline-flex items-center justify-center rounded-full text-[var(--sf-muted,#6b6b6b)] hover:text-[var(--sf-primary,#2D4A1F)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-primary,#2D4A1F)]/40"
      >
        <HelpCircle className={iconSize} aria-hidden />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1.5 w-56 max-w-[80vw] rounded-md border border-[var(--sf-line,rgba(0,0,0,0.12))] bg-[var(--sf-surface-1,#fff)] px-3 py-2 text-xs leading-snug text-[var(--sf-ink,#1a1a1a)] shadow-md normal-case"
          style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)", letterSpacing: 0 }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
