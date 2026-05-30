import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Smart Farm — Eyebrow (atome « étiquette de section bordereau »)
 * -------------------------------------------------------------------------
 * Petite étiquette uppercase Big Shoulders qui coiffe un bloc (eyebrow / kicker).
 * Pendant typographique de l'estampille « SECTION » dans le carnet d'élevage.
 *
 * Utilise la classe globale `.eyebrow` (définie dans `smartfarm-tokens.css`
 * / `globals.css`) + couleur muted. Si la classe n'existe pas encore, les
 * styles inline garantissent le rendu (11 px, uppercase, tracking 0.1em,
 * Big Shoulders Display).
 */
type EyebrowProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode
}

export function Eyebrow({ className, children, ...props }: EyebrowProps) {
  return (
    <div
      data-slot="eyebrow"
      style={{
        fontFamily:
          "var(--sf-font-display, 'Big Shoulders Display', system-ui, sans-serif)",
      }}
      className={cn(
        "eyebrow",
        // Fallbacks si la classe .eyebrow globale n'est pas (encore) chargée :
        "text-[11px] leading-none font-semibold",
        "text-[var(--sf-muted,#5C5346)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default Eyebrow
