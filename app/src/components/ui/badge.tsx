import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Smart Farm — Badge / Pill (atome « pastille terrain » v3.2)
 * -------------------------------------------------------------------------
 * - radius 999 (pill OK pour badges UNIQUEMENT — jamais sur boutons)
 * - padding 4 px / 10 px
 * - typo Big Shoulders Display, 11 px UPPERCASE, letter-spacing 0.1em
 * - Variantes sémantiques : utilisent les paires `--sf-<x>-bg / --sf-<x>-ink`
 *   (success / warning / danger / info) avec fallbacks safe.
 */
const badgeVariants = cva(
  [
    "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1",
    "rounded-full whitespace-nowrap transition-colors",
    // padding 4/10
    "px-[10px] py-[4px]",
    // typo carnet
    "font-[family-name:var(--sf-font-display)] uppercase tracking-[0.1em] text-[11px] leading-none font-semibold",
    // états
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-primary)]",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[var(--sf-primary)] text-white",
        secondary:
          "bg-[var(--sf-surface-2,#EFE7D6)] text-[var(--sf-ink,#1a1a1a)]",
        outline:
          "bg-transparent border border-[var(--sf-ink,#1a1a1a)] text-[var(--sf-ink,#1a1a1a)]",
        success:
          "bg-[var(--sf-success-bg,#D6E3CC)] text-[var(--sf-success-ink,#1F3B12)]",
        warning:
          "bg-[var(--sf-warning-bg,#F5E0B8)] text-[var(--sf-warning-ink,#5A3E0E)]",
        danger:
          "bg-[var(--sf-danger-bg,#F1D4CE)] text-[var(--sf-danger-ink,#7A2A1F)]",
        // Alias destructive (compat shadcn) → mappe sur danger
        destructive:
          "bg-[var(--sf-danger-bg,#F1D4CE)] text-[var(--sf-danger-ink,#7A2A1F)]",
        info:
          "bg-[var(--sf-info-bg,#D6E2EE)] text-[var(--sf-info-ink,#1F3A55)]",
        ghost:
          "bg-transparent text-[var(--sf-muted,#5C5346)] hover:bg-[var(--sf-surface-1,rgba(0,0,0,0.04))]",
        link:
          "bg-transparent text-[var(--sf-primary)] underline underline-offset-4 hover:no-underline tracking-normal normal-case",
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
