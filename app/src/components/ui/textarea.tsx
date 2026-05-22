import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Smart Farm — Textarea (atome « field underline multi-ligne » v3.2)
 * -------------------------------------------------------------------------
 * - pas de border (sauf bas), pas de border-radius
 * - border-bottom 2 px solid ink, focus → primary
 * - background transparent
 * - field-sizing-content : la zone grandit avec le contenu
 * - font-size 16 px (évite zoom iOS)
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content w-full bg-transparent outline-none transition-colors",
        "rounded-none border-0",
        "border-b-2 border-[var(--sf-ink,#1a1a1a)]",
        // taille minimum confortable (3 lignes ~ 5rem)
        "min-h-20 px-0 py-2 text-base text-[var(--sf-ink,#1a1a1a)]",
        "placeholder:text-[var(--sf-muted,#5C5346)]",
        "focus:border-b-[var(--sf-primary,#2D4A1F)]",
        "focus-visible:border-b-[var(--sf-primary,#2D4A1F)]",
        "aria-invalid:border-b-[var(--sf-danger-ink,#7A2A1F)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
