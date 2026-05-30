"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Label — atome "eyebrow" carnet d'élevage (DS Terrain Vivant v3.2)
 *
 * Style imposé par le pattern Field underline :
 *  - Big Shoulders Display, 11px, uppercase, letter-spacing 0.08em, weight 700
 *  - Couleur muted (terre/ink désaturé)
 *  - Bloc avec 6px de marge basse pour respirer au-dessus de l'input underline
 *
 * Signature shadcn conservée : function component, props natifs <label>,
 * className mergé via cn(). Pas de forwardRef (cohérent avec shadcn v2).
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "sf-label block select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      style={{
        fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
        fontSize: "11px",
        fontWeight: 700,
        color: "var(--sf-muted, #5C5346)",
        marginBottom: "6px",
        display: "block",
        lineHeight: 1.2,
      }}
      {...props}
    />
  )
}

export { Label }
