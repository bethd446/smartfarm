import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Smart Farm — Button (atome « tampon encré » v3.2)
 * -------------------------------------------------------------------------
 * - radius 4 px (pas pill, sauf .pill / badge)
 * - effet tampon : box-shadow `var(--sf-stamp-ring)` (double bordure inset
 *   blanche dans le primary, type matrice d'imprimerie)
 * - :active = translateY(1px) + ombre intérieure « pression mécanique »
 *   (pas de scale(0.97))
 * - typo Big Shoulders Display, UPPERCASE, letter-spacing 0.08em
 * - hauteur ≥ 48 px partout (sm=48, default=48, lg=56) — gants K13
 *
 * Chantier C1 (responsive) :
 *   - Toutes les variantes size respectent déjà tap target ≥ 48px (h-12 / h-14)
 *     via `min-h-12` / `min-h-14`. Le size "sm" a été promu à 48px aussi
 *     (anti-pattern terrain : pas de bouton < 48px en prod).
 *   - text-size volontairement contenu (12–14px) pour ne pas casser l'identité
 *     "tampon imprimerie" (UPPERCASE display). Pas de surcharge text-base
 *     en mobile : le DS prime sur le défaut Airbnb. Les call-sites qui
 *     veulent text-base le mergent via className.
 *
 * Les variantes sémantiques (success/warning/danger) s'appuient sur les
 * paires de tokens `--sf-<x>-bg / --sf-<x>-ink` exposés par le fichier
 * `smartfarm-tokens.css`.
 */
const buttonVariants = cva(
  [
    // Layout / reset
    "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
    "border border-transparent select-none outline-none transition-[transform,box-shadow,background-color,color]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    // Identité « carnet d'élevage »
    "rounded-[4px]",
    "font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em]",
    // Focus terrain : pas de ring SaaS, on souligne via le tampon
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-primary)]",
    // État pressé : pression mécanique
    "active:translate-y-px",
  ].join(" "),
  {
    variants: {
      variant: {
        // Tampon plein primaire (vert ferme)
        default: [
          "bg-[var(--sf-primary)] text-white",
          "shadow-[var(--sf-stamp-ring)]",
          "hover:bg-[color-mix(in_srgb,var(--sf-primary)_90%,black)]",
          "active:shadow-[var(--sf-stamp-ring),var(--sf-stamp-press)]",
        ].join(" "),
        // Tampon accent terre cuite
        accent: [
          "bg-[var(--sf-accent)] text-white",
          "shadow-[var(--sf-stamp-ring-accent,var(--sf-stamp-ring))]",
          "hover:bg-[color-mix(in_srgb,var(--sf-accent)_90%,black)]",
          "active:shadow-[var(--sf-stamp-ring-accent,var(--sf-stamp-ring)),var(--sf-stamp-press)]",
        ].join(" "),
        // Contour seul, pas de fill
        outline: [
          "bg-transparent text-[var(--sf-primary)]",
          "border-2 border-solid border-[var(--sf-primary)]",
          "hover:bg-[var(--sf-primary)] hover:text-white",
          "active:shadow-[var(--sf-stamp-press)]",
        ].join(" "),
        // Secondaire (surface 1, ink ferme)
        secondary: [
          "bg-[var(--sf-surface-1,var(--sf-surface-0,#FAF7F0))] text-[var(--sf-ink)]",
          "border border-[var(--sf-line,rgba(0,0,0,0.18))]",
          "hover:bg-[var(--sf-surface-2,#EFE7D6)]",
          "active:shadow-[var(--sf-stamp-press)]",
        ].join(" "),
        // Ghost : pas de fond, juste l'ink
        ghost: [
          "bg-transparent text-[var(--sf-ink)]",
          "hover:bg-[var(--sf-surface-1,rgba(0,0,0,0.04))]",
        ].join(" "),
        // Danger sémantique (rouge sourd carnet)
        destructive: [
          "bg-[var(--sf-danger-bg,#7A2A1F)] text-[var(--sf-danger-ink,#FFFFFF)]",
          "shadow-[var(--sf-stamp-ring)]",
          "hover:bg-[color-mix(in_srgb,var(--sf-danger-bg,#7A2A1F)_90%,black)]",
          "active:shadow-[var(--sf-stamp-ring),var(--sf-stamp-press)]",
        ].join(" "),
        // Lien minimal (pas de tampon)
        link: [
          "bg-transparent text-[var(--sf-primary)]",
          "rounded-none underline underline-offset-4 hover:no-underline",
          "tracking-normal normal-case",
        ].join(" "),
      },
      size: {
        // Toutes les tailles ≥ 48 px (gants terrain)
        sm: "h-12 min-h-12 px-3 text-[12px]",
        default: "h-14 min-h-14 px-5 text-[13px]",
        lg: "h-14 min-h-14 px-6 text-[14px]",
        // Icon-only : carré 48
        icon: "size-12 min-h-12 p-0",
        "icon-lg": "size-14 min-h-14 p-0",
        // Compat shadcn (rétro-mappés sur 48 — pas en-dessous, touch K13)
        xs: "h-12 min-h-12 px-3 text-[12px]",
        "icon-xs": "size-12 min-h-12 p-0",
        "icon-sm": "size-12 min-h-12 p-0",
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
