import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * Smart Farm — Input (atome « field » VERGER)
 * -------------------------------------------------------------------------
 * Reskin VERGER (audit 1-grammar.md §3.5) :
 * - border-box : 1px solid var(--line2), background var(--paper), radius 11px
 * - padding 11px 13px, font var(--body), color var(--ink)
 * - focus : outline 2px var(--focus) offset 1px, border transparent (anneau sauge)
 * - erreur : border var(--bad), background var(--bad-bg)
 *
 * Terrain / gants (§5.2) :
 *   - h-12 + min-h-12 → tap target ≥ 48px
 *   - text-base (16px) mobile = anti-zoom iOS Safari, 14px ≥md (spec --body 14px)
 *   - inputmode numérique posé par le call-site (poids/effectifs)
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Box VERGER : bordure, surface papier, rayon champ
        "w-full min-w-0 rounded-[11px] border border-[var(--line2)] bg-[var(--paper)] transition-colors outline-none",
        // Tactile ≥48px + anti-zoom iOS (16px mobile, 14px ≥md) + padding 11/13
        "h-12 min-h-12 px-[13px] py-[11px] text-base md:text-sm text-[var(--ink)]",
        // Placeholder muted
        "placeholder:text-[var(--mut)]",
        // Focus : anneau sauge (outline), bordure transparente
        "focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]",
        // Erreur
        "aria-invalid:border-[var(--bad)] aria-invalid:bg-[var(--bad-bg)]",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // File input : rester tactile et cohérent
        "file:inline-flex file:h-10 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--ink)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
