"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Smart Farm — Dialog wrapper.
 *
 * Migration mai 2026 : on est passé de `@base-ui/react/dialog` à
 * `@radix-ui/react-dialog`. base-ui 1.5 + React 19 + Next 16 Turbopack avait
 * un bug où le DialogTrigger n'ouvrait jamais le Popup (aria-expanded
 * restait false au clic). Radix marche out-of-the-box.
 *
 * L'API publique exportée est identique à celle d'avant — `Dialog`,
 * `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`,
 * `DialogFooter`, `DialogClose` — pour limiter les modifs côté pages.
 *
 * Différence à connaître :
 *   - `<DialogTrigger render={element}>` → `<DialogTrigger asChild>{element}</DialogTrigger>`
 *     Mais on fournit ici un fallback compatible : si `render` est passé,
 *     on bascule automatiquement en asChild + clone.
 *
 * Chantier C1 (responsive Airbnb-style) — mai 2026 :
 *   - <768px : DialogContent devient un bottom-sheet plein écran (slide
 *     depuis le bas, rounded-t-2xl, max-h-90vh, handle visuel).
 *   - ≥768px : modal centré comme avant (zoom + fade), max-w-md.
 *   - Pas de swipe-to-dismiss (Radix ne le fait pas natif, reporté).
 *   - API publique inchangée : les pages qui consomment Dialog n'ont
 *     rien à modifier.
 */

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTriggerImpl({
  render,
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger> & {
  render?: React.ReactElement
}) {
  // Compat couche base-ui : on accepte `render={<button .../>}` et on le
  // traduit en pattern Radix `asChild` + child element.
  if (render) {
    return (
      <DialogPrimitive.Trigger asChild {...props} data-slot="dialog-trigger">
        {render}
      </DialogPrimitive.Trigger>
    )
  }
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      asChild={asChild}
      {...props}
    >
      {children}
    </DialogPrimitive.Trigger>
  )
}

const DialogTrigger = DialogTriggerImpl

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // === Mobile (<768px) : bottom-sheet plein écran ===
          "fixed inset-x-0 bottom-0 z-50 grid w-full gap-4",
          "max-h-[90vh] overflow-y-auto",
          "rounded-t-2xl rounded-b-none",
          "bg-[var(--sf-surface-1)] p-5 pt-4 text-sm text-[var(--sf-ink,#1a1a1a)]",
          "ring-1 ring-[var(--sf-line,rgba(0,0,0,0.08))] shadow-xl outline-none",
          // padding bottom safe-area (iPhone notch)
          "pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
          // animation mobile : slide from bottom
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          // === Desktop/tablette (≥768px) : modal centré ===
          // ATTENTION : ordre des classes critique. tailwind-merge déduplique
          // par catégorie utilitaire (inset). On utilise des utilities
          // individuelles (top/left/right) plutôt que inset-x-* pour éviter
          // que le merger n'écrase les positions desktop.
          "md:fixed md:top-1/2 md:left-1/2 md:right-auto md:bottom-auto",
          "md:-translate-x-1/2 md:-translate-y-1/2",
          "md:w-[calc(100%-2rem)] md:max-w-md md:max-h-[85vh]",
          "md:rounded-xl md:p-5 md:pb-5",
          // override animation desktop : zoom + fade (annule slide mobile)
          "md:data-[state=open]:zoom-in-95 md:data-[state=closed]:zoom-out-95",
          "md:data-[state=open]:fade-in-0 md:data-[state=closed]:fade-out-0",
          className
        )}
        {...props}
      >
        {/* Handle visuel mobile : barre 40x4 arrondie centrée */}
        <div
          aria-hidden="true"
          className="md:hidden mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-[var(--sf-muted,#6b6b6b)]/30"
        />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--sf-muted)] hover:bg-black/5 hover:text-[var(--sf-ink)] focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--sf-primary)]"
            aria-label="Fermer"
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 border-t border-[var(--sf-line,rgba(0,0,0,0.08))] sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-[family-name:var(--sf-font-display)] uppercase tracking-wide text-xl leading-tight text-[var(--sf-ink)]",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-[var(--sf-muted)]", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
