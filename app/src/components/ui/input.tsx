import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Smart Farm — Input (atome « field underline » v3.2)
 * -------------------------------------------------------------------------
 * - pas de border (sauf bas), pas de border-radius
 * - border-bottom 2 px solid ink
 * - focus : border-bottom-color → primary, PAS de ring
 * - background transparent (bordereau)
 * - taille tactile : h ≥ 48 px (gants K13)
 * - font-size 16 px (évite zoom iOS au focus) — JAMAIS descendre en text-sm
 *
 * Chantier C1 (responsive) :
 *   - h-12 + min-h-12 garantissent un tap target ≥ 48px sur mobile
 *   - text-base (= 16px) verrouille l'anti-zoom iOS Safari
 *   - px-0 est volontaire (design underline : pas de chrome latéral)
 *     Si un call-site veut du padding, il merge via className.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Reset
        "w-full min-w-0 bg-transparent outline-none transition-colors",
        "rounded-none border-0",
        // Border bas uniquement
        "border-b-2 border-[var(--sf-ink,#1a1a1a)]",
        // C1 — Touch ≥48px + typo 16px anti-zoom iOS (mobile-first, conservé ≥md)
        "h-12 min-h-12 px-0 py-2 text-base text-[var(--sf-ink,#1a1a1a)]",
        // Placeholder muted
        "placeholder:text-[var(--sf-muted,#5C5346)]",
        // Focus : ink → primary (pas de ring)
        "focus:border-b-[var(--sf-primary,#2D4A1F)]",
        "focus-visible:border-b-[var(--sf-primary,#2D4A1F)]",
        // Erreur
        "aria-invalid:border-b-[var(--sf-danger-ink,#7A2A1F)]",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Cohérence file input (file:h-10 pour rester tactile)
        "file:inline-flex file:h-10 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--sf-ink,#1a1a1a)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
