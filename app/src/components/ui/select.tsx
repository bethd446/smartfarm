"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Smart Farm — Select wrapper.
 *
 * Migration mai 2026 : `@base-ui/react/select` -> `@radix-ui/react-select`
 * (même cause que le Dialog : bug `aria-expanded` qui ne s'ouvre pas avec
 * base-ui 1.5 + React 19 + Next 16 Turbopack).
 *
 * Compat surface :
 *   - `<Select value=... onValueChange=...>` : identique
 *   - `<SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>` :
 *     identique
 *   - `<SelectValue>{(value) => label[value]}</SelectValue>` : pattern
 *     base-ui (render-prop). On le détecte et on rend le label correspondant.
 */

const Select = SelectPrimitive.Root

function SelectGroup(props: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

/**
 * SelectValue compat couche base-ui :
 * Si `children` est une fonction (pattern `{(value) => label[value]}`),
 * on l'appelle avec la value courante en lisant le state Radix via
 * `useFormControlContext` n'est pas exposé — on utilise donc le placeholder
 * Radix natif et on s'appuie sur SelectItem qui rend lui-même son label.
 *
 * Concrètement : Radix montre par défaut le contenu de `<SelectItem>`
 * sélectionné comme value du trigger, donc le pattern fonctionne sans
 * adaptation tant que les call-sites ont mis le BON LABEL dans
 * `<SelectItem>...</SelectItem>` (ex : `<SelectItem value="F">♀ Femelle</SelectItem>`).
 *
 * Pour le pattern render-prop legacy (children fn), on extrait le placeholder
 * et on l'utilise directement, en ignorant la fn (déjà résolu par Radix).
 */
function SelectValue({
  className,
  children,
  placeholder,
  ...props
}: Omit<React.ComponentProps<typeof SelectPrimitive.Value>, "children"> & {
  children?: React.ReactNode | ((value: string) => React.ReactNode)
}) {
  // Si children est une fonction (legacy base-ui), on ignore et on laisse
  // Radix afficher le label de l'item sélectionné automatiquement.
  const safeChildren = typeof children === "function" ? undefined : children
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      placeholder={placeholder}
      className={cn("flex flex-1 text-left", className)}
      {...props}
    >
      {safeChildren as any}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        // Box VERGER (audit §3.5) : bordure, surface papier, rayon champ
        "flex w-full items-center justify-between gap-1.5 rounded-[11px] border border-[var(--line2)] bg-[var(--paper)] whitespace-nowrap text-[var(--ink)] transition-colors outline-none data-[placeholder]:text-[var(--mut)] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        // Focus : anneau sauge (outline), bordure transparente
        "focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]",
        // Tactile : 48px mobile (anti-zoom iOS via text-base + padding confort)
        "h-12 min-h-12 py-3 pl-[13px] pr-3 text-base md:text-sm",
        // Variante sm : 40px (tactile mais compact, ex. cellules tableau)
        size === "sm" && "h-10 min-h-10 py-2 pl-3 pr-2 text-sm md:text-xs",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="h-4 w-4 text-[var(--sf-muted)]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-md bg-[var(--sf-surface-1)] text-[var(--sf-ink)] shadow-md ring-1 ring-[var(--sf-line,rgba(0,0,0,0.08))] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width) scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1 text-xs text-[var(--sf-muted)]", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // Layout (inchangé)
        "relative flex w-full cursor-default items-center gap-2 rounded-md outline-none select-none focus:bg-[var(--sf-primary)]/10 focus:text-[var(--sf-ink)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // C1 — tactile : ≥44px par item (WCAG 2.5.5), padding confort, texte 16px mobile (anti-zoom)
        "min-h-11 py-3 pr-8 pl-4 text-base md:py-2 md:pl-3 md:text-sm",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="pointer-events-none absolute right-2 flex h-4 w-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="h-4 w-4 text-[var(--sf-primary)]" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "pointer-events-none -mx-1 my-1 h-px bg-[var(--sf-line,rgba(0,0,0,0.08))]",
        className
      )}
      {...props}
    />
  )
}

function SelectScrollUpButton(
  props: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>
) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className="flex cursor-default items-center justify-center py-1"
      {...props}
    >
      <ChevronUpIcon className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton(
  props: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>
) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className="flex cursor-default items-center justify-center py-1"
      {...props}
    >
      <ChevronDownIcon className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
