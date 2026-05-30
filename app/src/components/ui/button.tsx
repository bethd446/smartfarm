import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Smart Farm — Button (atome VERGER)
 * -------------------------------------------------------------------------
 * - radius ~12px (rounded-xl), pas pill (sauf usage badge/chips dédié)
 * - typo DM Sans (var(--body)), weight 600, casse normale (pas d'UPPERCASE)
 * - transition background .16s
 * - cible tactile : ≥ 44px partout, ≥ 48px en primaire (default/lg)
 * - hover : primary → var(--sage-d) ; danger → brightness(.95) ; surfaces → var(--paper-3)
 *
 * Couleurs (tous via tokens VERGER, le pont --sf-* pointe sur VERGER) :
 *   primary  = fond var(--sage)  / texte #fff  / hover var(--sage-d)
 *   danger   = fond var(--bad)   / texte #fff  / hover brightness(.95)
 *   secondary/outline = fond var(--card) / bordure var(--line2) / texte var(--ink)
 *   ghost    = transparent / texte var(--ink)
 * Garde-fou contraste : --apri/--ocre jamais en texte courant (forme/bordure seulement).
 */
const buttonVariants = cva(
  [
    // Layout / reset
    "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
    "border border-transparent select-none outline-none transition-[background-color,color,filter] duration-[160ms] ease-[var(--ease-out)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    // Identité VERGER : rayon doux + labels DM Sans
    "rounded-xl",
    "font-[family-name:var(--body)] font-semibold",
    // Focus accessible
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
    // Pression discrète
    "active:translate-y-px",
  ].join(" "),
  {
    variants: {
      variant: {
        // Plein primaire (vert sauge)
        default: [
          "bg-[var(--sage)] text-white shadow-[var(--sh-sm)]",
          "hover:bg-[var(--sage-d)]",
        ].join(" "),
        // Accent (terre cuite) — réservé aux CTA secondaires forts, texte #fff garde AA
        accent: [
          "bg-[var(--apri)] text-white shadow-[var(--sh-sm)]",
          "hover:[filter:brightness(0.95)]",
        ].join(" "),
        // Contour seul
        outline: [
          "bg-[var(--card)] text-[var(--ink)]",
          "border border-[var(--line2)]",
          "hover:bg-[var(--paper-3)]",
        ].join(" "),
        // Secondaire (surface carte, ink ferme)
        secondary: [
          "bg-[var(--card)] text-[var(--ink)]",
          "border border-[var(--line2)]",
          "hover:bg-[var(--paper-3)]",
        ].join(" "),
        // Ghost : pas de fond
        ghost: [
          "bg-transparent text-[var(--ink)]",
          "hover:bg-[var(--paper-3)]",
        ].join(" "),
        // Danger sémantique (rouge)
        destructive: [
          "bg-[var(--bad)] text-white shadow-[var(--sh-sm)]",
          "hover:[filter:brightness(0.95)]",
        ].join(" "),
        // Lien minimal
        link: [
          "bg-transparent text-[var(--sage-d)]",
          "rounded-none underline underline-offset-4 hover:no-underline",
        ].join(" "),
      },
      size: {
        // sm ≥ 44px (cible tactile mini) ; default/lg ≥ 48px (primaire)
        sm: "h-11 min-h-11 px-3.5 text-[13px]",
        default: "h-12 min-h-12 px-4 text-[14px]",
        lg: "h-12 min-h-12 px-6 text-[14px]",
        // Icon-only
        icon: "size-12 min-h-12 p-0",
        "icon-lg": "size-12 min-h-12 p-0",
        // Compat shadcn (rétro-mappés ≥ 44px — pas en-dessous, touch terrain)
        xs: "h-11 min-h-11 px-3.5 text-[13px]",
        "icon-xs": "size-11 min-h-11 p-0",
        "icon-sm": "size-11 min-h-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * IMPORTANT — Bug base-ui v1.5 (réf. fix-f1) :
 * Le `useButton` interne de base-ui force `type='button'` après le merge des
 * props utilisateur via `getButtonProps`, ce qui FAIT SAUTER tout `type="submit"`
 * passé en prop. Conséquence : aucun formulaire ne soumettait, le bouton
 * Enregistrer fermait le Dialog sans déclencher `onSubmit` (cf. fix-f1-report.md).
 *
 * Contournement : si l'appelant passe `type="submit"` (ou "reset"), on contourne
 * complètement `ButtonPrimitive` et on rend un `<button>` natif avec les bons
 * gestionnaires d'événements. Pour les boutons normaux (type="button" implicite),
 * on conserve `ButtonPrimitive` pour garder le pattern `render={<Button />}`
 * utilisé par DialogTrigger, MenuTrigger, etc.
 */
type NativeButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>
type ButtonProps =
  | (ButtonPrimitive.Props & VariantProps<typeof buttonVariants>)
  | (NativeButtonProps & VariantProps<typeof buttonVariants> & { render?: never })

function Button({
  className,
  variant = "default",
  size = "default",
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }))

  // Pour les boutons de formulaire (submit/reset), on rend un <button> natif
  // afin que le `type` ne soit PAS écrasé par le `useButton` de base-ui.
  if (type === "submit" || type === "reset") {
    const { render: _ignored, ...rest } = props as ButtonPrimitive.Props
    void _ignored
    return (
      <button
        type={type}
        data-slot="button"
        className={classes}
        {...(rest as NativeButtonProps)}
      />
    )
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={classes}
      {...(props as ButtonPrimitive.Props)}
    />
  )
}

export { Button, buttonVariants }
