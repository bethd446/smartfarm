import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Smart Farm — Card (atome VERGER « panneau »)
 * -------------------------------------------------------------------------
 * - background : var(--card) (blanc)
 * - bordure 1px var(--line), radius var(--r) (14px) ; --rl pour gros panneaux
 * - padding 16-18px (porté par CardHeader / CardContent)
 * - cartes PLATES (registre carnet VERGER) ; ombre réservée aux cartes
 *   interactives qui l'ajoutent via className (hover:shadow-[var(--sh-sm)])
 * - Titre de carte en --disp (Bricolage Grotesque)
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
        background: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r)",
      }}
      className={cn(
        "group/card flex flex-col gap-3 text-sm text-[var(--ink)]",
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
        // padding tactile mobile ; ≥md canon panneau VERGER (18px)
        "px-5 pt-5 md:px-[18px] md:pt-[18px]",
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
        fontFamily: "var(--disp)",
      }}
      className={cn(
        // Bricolage Grotesque, titre de panneau (cf §3.4 .pn-h h3)
        "text-base leading-snug font-bold tracking-[-0.02em]",
        "text-[var(--ink)]",
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
        "text-sm text-[var(--mut)]",
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
        // padding tactile mobile ; ≥md canon panneau VERGER (16-18px)
        "pt-5 px-5 pb-5 md:pt-4 md:px-[18px] md:pb-[18px]",
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
        // padding tactile mobile + canon ≥md
        "flex items-center gap-2 px-5 pb-5 pt-4 md:px-[18px] md:pb-[18px] md:pt-3",
        // Filet de séparation hairline
        "border-t border-[var(--line)]",
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
