"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Smart Farm — Sheet (bottom-sheet systématique).
 *
 * Wrapper léger sur Radix Dialog, dédié aux bottom-sheets affichés
 * **partout** (mobile ET desktop), à l'inverse de `Dialog` qui n'est en
 * bottom-sheet que sur <768px.
 *
 * Cas d'usage typiques (chantier C1) :
 *   - Menu d'actions rapides du FAB (bottom-nav mobile)
 *   - Mobile drawer (côté gauche/droit possible via prop `side`)
 *   - Tout panneau coulissant systématique
 *
 * Implémentation : Radix Dialog (cohérent avec le wrapper Dialog migré
 * mai 2026, après le bug base-ui 1.5 + React 19). API simple et alignée
 * sur `Dialog` pour limiter la charge cognitive.
 *
 * Sides supportés : `bottom` (défaut), `left`, `right`, `top`.
 *   - bottom : rounded-t-2xl, slide depuis le bas, max-h-[90vh]
 *   - top    : rounded-b-2xl, slide depuis le haut
 *   - left   : largeur 18rem (max 80% écran), pleine hauteur, slide depuis gauche
 *   - right  : idem, slide depuis droite
 *
 * Pas de swipe-to-dismiss (reporté). Fermeture via backdrop tap, X, ou Esc.
 */

type SheetSide = "top" | "right" | "bottom" | "left"

function Sheet({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTriggerImpl({
  render,
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger> & {
  render?: React.ReactElement
}) {
  // Compat base-ui ancien API : `render={<button .../>}` → asChild Radix.
  if (render) {
    return (
      <DialogPrimitive.Trigger asChild {...props} data-slot="sheet-trigger">
        {render}
      </DialogPrimitive.Trigger>
    )
  }
  return (
    <DialogPrimitive.Trigger
      data-slot="sheet-trigger"
      asChild={asChild}
      {...props}
    >
      {children}
    </DialogPrimitive.Trigger>
  )
}

const SheetTrigger = SheetTriggerImpl

function SheetPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

// Classes par côté — chacune définit position, dimensions, arrondi, animation.
const sideClasses: Record<SheetSide, string> = {
  bottom: cn(
    "inset-x-0 bottom-0 w-full max-h-[90vh] overflow-y-auto",
    "rounded-t-2xl rounded-b-none",
    "pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
    "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
  ),
  top: cn(
    "inset-x-0 top-0 w-full max-h-[90vh] overflow-y-auto",
    "rounded-b-2xl rounded-t-none",
    "pt-[calc(1.25rem+env(safe-area-inset-top))]",
    "data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
  ),
  left: cn(
    "inset-y-0 left-0 h-full w-[18rem] max-w-[80vw] overflow-y-auto",
    "rounded-r-2xl rounded-l-none",
    "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
  ),
  right: cn(
    "inset-y-0 right-0 h-full w-[18rem] max-w-[80vw] overflow-y-auto",
    "rounded-l-2xl rounded-r-none",
    "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
  ),
}

function SheetContent({
  className,
  children,
  side = "bottom",
  showCloseButton = true,
  showHandle,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: SheetSide
  showCloseButton?: boolean
  /**
   * Affiche un handle visuel (barre arrondie) — par défaut activé sur
   * `side="bottom"` uniquement (codes Airbnb/iOS), désactivable manuellement.
   */
  showHandle?: boolean
}) {
  const showHandleResolved = showHandle ?? side === "bottom"

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 grid gap-4",
          "bg-[var(--sf-surface-1)] p-5 text-sm text-[var(--sf-ink,#1a1a1a)]",
          "ring-1 ring-[var(--sf-line,rgba(0,0,0,0.08))] shadow-xl outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          sideClasses[side],
          className
        )}
        {...props}
      >
        {showHandleResolved && side === "bottom" && (
          <div
            aria-hidden="true"
            className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-[var(--sf-muted,#6b6b6b)]/30"
          />
        )}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="sheet-close"
            className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--sf-muted)] hover:bg-black/5 hover:text-[var(--sf-ink)] focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--sf-primary)]"
            aria-label="Fermer"
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex flex-col-reverse gap-2 pt-2 border-t border-[var(--sf-line,rgba(0,0,0,0.08))] sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-[family-name:var(--sf-font-display)] tracking-wide text-xl leading-tight text-[var(--sf-ink)]",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-[var(--sf-muted)]", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
}
