import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Smart Farm — Card (atome « bordereau imprimerie » v3.2)
 * -------------------------------------------------------------------------
 * - radius 0 (canonique carnet d'élevage)
 * - border-top épais primary (filet imprimerie),
 *   border-bottom hairline + 1 px sides (encadrement bordereau)
 * - background : `var(--sf-surface-1)` (cream légèrement plus chaud)
 * - padding CardContent : 18 top / 16 sides / 14 bottom
 * - CardHeader / CardTitle : Big Shoulders Display, uppercase pour eyebrow
 */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      style={{
        background: "var(--sf-surface-1, var(--sf-surface-0, #FAF7F0))",
        borderTop: "var(--sf-rule-top, 4px solid var(--sf-primary, #2D4A1F))",
        borderBottom:
          "var(--sf-rule-bottom, 1px solid var(--sf-border, rgba(0,0,0,0.18)))",
        borderLeft:
          "var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))",
        borderRight:
          "var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))",
        borderRadius: 0,
      }}
      className={cn(
        "group/card flex flex-col gap-3 text-sm text-[var(--sf-ink,#1a1a1a)]",
        // pas de overflow-hidden / pas de ring SaaS
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1",
        // C1 — padding tactile : 20px sides + 20px top mobile ; ≥md retrouve canon 16/18
        "px-5 pt-5 md:px-4 md:pt-[18px]",
        // Composition titre + action (eyebrow → action)
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      style={{
        fontFamily: "var(--sf-font-display, 'Big Shoulders Display', system-ui, sans-serif)",
      }}
      className={cn(
        // Big Shoulders display, lourd, légèrement écrasé : tampon de section
        "text-base leading-snug font-semibold tracking-[0.02em]",
        "text-[var(--sf-ink,#1a1a1a)]",
        "group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-sm text-[var(--sf-muted,#5C5346)]",
        className
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        // C1 — padding tactile mobile : 20px sides + ~18px vertical confort
        // ≥md retrouve le canon bordereau (18 top / 16 sides / 14 bottom)
        "pt-5 px-5 pb-5 md:pt-[18px] md:px-4 md:pb-[14px]",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // C1 — padding tactile mobile + canon ≥md
        "flex items-center gap-2 px-5 pb-5 pt-4 md:px-4 md:pb-[14px] md:pt-3",
        // Filet de séparation hairline ink
        "border-t border-[var(--sf-line,rgba(0,0,0,0.12))]",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
