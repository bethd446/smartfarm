import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Smart Farm — Badge / Pill VERGER (atome « tag terrain », grammaire §3.2)
 * -------------------------------------------------------------------------
 * - pill (--rp / rounded-full), padding 4/10
 * - typo --body (DM Sans) weight 600, ~12px (pas d'uppercase ni tracking)
 * - Paires de statut (couleur + forme, jamais couleur seule) :
 *     succès / sage   → --sage-bg / --sage-d
 *     attention / apri→ --apri-bg / --apri-d
 *     prune / info    → --plum-bg / --berry
 *     neutre          → --paper-3 / --mut
 *     danger          → --bad-bg  / --bad-d
 *     critique pleine → --bad     / #fff
 * - Mode plein soleil (html[data-contrast="high"]) : border 1px currentColor
 *   ajoutée automatiquement → statut perceptible sans dépendre de la couleur.
 * - Fallbacks alignés sur les tokens VERGER réels (pas de couleur inventée).
 */
const badgeVariants = cva(
  [
    "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5",
    "rounded-full whitespace-nowrap transition-colors",
    // padding 4/10 + touch target ≥44px si clickable (via data-clickable)
    "px-[10px] py-[4px]",
    "has-[[data-clickable]]:min-h-[var(--sf-touch-min)] has-[[data-clickable]]:min-w-[var(--sf-touch-min)]",
    // typo VERGER : corps DM Sans, 12px, weight 600
    "font-[family-name:var(--body)] text-[12px] leading-none font-semibold",
    // mode plein soleil : bordure currentColor pour perception sans couleur seule
    "[html[data-contrast='high']_&]:border [html[data-contrast='high']_&]:border-current",
    // états
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ].join(" "),
  {
    variants: {
      variant: {
        // statut neutre primaire — fond sauge plein, texte blanc (AA)
        default:
          "bg-[var(--sf-primary,var(--sage))] text-white",
        // neutre atténué
        secondary:
          "bg-[var(--paper-3)] text-[var(--mut)]",
        // contour discret sur ligne affirmée
        outline:
          "bg-transparent border border-[var(--line2)] text-[var(--ink-soft)]",
        // succès / sage
        success:
          "bg-[var(--sf-success-bg,var(--sage-bg))] text-[var(--sf-success-ink,var(--sage-d))]",
        // attention / abricot
        warning:
          "bg-[var(--sf-warning-bg,var(--apri-bg))] text-[var(--sf-warning-ink,var(--apri-d))]",
        // danger (fond clair)
        danger:
          "bg-[var(--sf-danger-bg,var(--bad-bg))] text-[var(--sf-danger-ink,var(--bad-d))]",
        // critique pleine (compat shadcn destructive) → fond --bad, texte blanc
        destructive:
          "bg-[var(--bad)] text-white",
        // prune / info
        info:
          "bg-[var(--sf-info-bg,var(--plum-bg))] text-[var(--sf-info-ink,var(--berry))]",
        // neutre transparent
        ghost:
          "bg-transparent text-[var(--mut)] hover:bg-[var(--paper-3)]",
        // lien textuel
        link:
          "bg-transparent text-[var(--sage-d)] underline underline-offset-4 hover:no-underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
