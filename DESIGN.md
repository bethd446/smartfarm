---
version: alpha
name: Smart Farm — Terrain Vivant
description: Sobre, dense, agronomique. Identité vétérinaire FR pro pour élevage porcin tropical (Côte d'Ivoire). Pas d'agritech générique, pas de cartoon, pas de vert pomme.
colors:
  primary: "#2D4A1F"
  primary-deep: "#14532D"
  primary-soft: "#4A7C23"
  secondary: "#A16207"
  tertiary: "#9A3412"
  neutral: "#1C1917"
  neutral-secondary: "#44403C"
  surface: "#FFFFFF"
  surface-warm: "#FFFBEB"
  surface-card: "#FEF3C7"
  line: "#E7E5E4"
  muted: "#5C5346"
  subtle: "#8A7E6E"
  success: "#2D4A1F"
  success-bg: "#DCE9CB"
  success-ink: "#1F3414"
  warning: "#A16207"
  warning-bg: "#FBE7C4"
  warning-ink: "#5C3E11"
  danger: "#DC2626"
  danger-bg: "#F4CCC8"
  danger-ink: "#5A1F19"
  info-bg: "#CDD9E3"
  info-ink: "#1F3344"
typography:
  display:
    fontFamily: Big Shoulders Display
    fontSize: 1.875rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  h1:
    fontFamily: Big Shoulders Display
    fontSize: 1.875rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  h2:
    fontFamily: Big Shoulders Display
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
  h3:
    fontFamily: Big Shoulders Display
    fontSize: 1.05rem
    fontWeight: 600
    lineHeight: 1.4
  body-md:
    fontFamily: Instrument Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Instrument Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.45
  body-xs:
    fontFamily: Instrument Sans
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.4
  eyebrow:
    fontFamily: Big Shoulders Display
    fontSize: 0.6875rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.1em"
  numeric:
    fontFamily: Instrument Sans
    fontSize: 1rem
    fontWeight: 500
    fontFeature: "tnum"
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 18px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  touch: 44px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#FFFFFF"
  button-secondary:
    backgroundColor: "{colors.surface-warm}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 44px
  button-warning:
    backgroundColor: "{colors.secondary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    padding: 16px
  card-elevated:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    padding: 16px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 48px
  badge-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-ink}"
    rounded: "{rounded.sm}"
    padding: 4px
  badge-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning-ink}"
    rounded: "{rounded.sm}"
    padding: 4px
  badge-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-ink}"
    rounded: "{rounded.sm}"
    padding: 4px
  alert-critical:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 16px
---

## Overview

Smart Farm est l'application de gestion d'un élevage porcin tropical multi-fermes en Côte d'Ivoire. L'utilisateur final est un éleveur ou un technicien d'élevage qui consulte l'app depuis un smartphone Android sur 4G variable, parfois en plein soleil, parfois dans une porcherie. La densité d'information est forte (cheptel, reproduction, sanitaire, alimentation, KPI IFIP) — l'interface doit être dense sans être brutale, hiérarchisée sans être verbeuse.

L'identité **Terrain Vivant** s'appuie sur la palette **Terre & Mil** : vert Sahel comme couleur d'autorité (`primary`), or mil mûr comme accent chaud (`secondary`), latérite CI comme accent terroir (`tertiary`). Tout est posé sur des crèmes chauds (`#FFFBEB`, `#FEF3C7`) pour évoquer la terre travaillée, pas le néon agritech. La typographie associe **Big Shoulders Display** (titrage condensé, presse agricole, robuste) à **Instrument Sans** (texte courant, lisibilité numérique avec chiffres tabulaires pour les KPI).

Inspirations : Stripe pour la sobriété et la mesure, Linear pour la densité d'information sans bruit, Notion pour la clarté hiérarchique. **Pas** d'inspiration "agritech californien" (vert pomme, dégradés cyan, illustrations cartoon).

## Colors

- **Primary `#2D4A1F` (Sahel-700)** — Vert profond d'autorité. Couleur des CTA principaux, du logo, des en-têtes. C'est la couleur "veterinaire/agronome" : sérieuse, posée, pas joyeuse.
- **Primary deep `#14532D`** — Hover de `primary`, états pressés, texte foncé sur fond clair.
- **Primary soft `#4A7C23`** — Variante claire pour dark mode et états désactivés discrets.
- **Secondary `#A16207` (Or mil mûr)** — Accent chaud. Utilisé pour : CTA secondaires, badges "en attente", warnings non critiques, focus ring. Évoque le grain mûr, pas le danger.
- **Tertiary `#9A3412` (Latérite CI)** — Accent terroir. Réservé aux badges de lots/bandes et aux accents identitaires. Ne pas utiliser pour les actions.
- **Neutral `#1C1917` (Terre profonde)** — Encre principale, tirée vers le brun, jamais noir pur (le noir pur "écran" est trop froid pour cet univers).
- **Surface `#FFFFFF`** — Fond de base. **Surface-warm `#FFFBEB`** (mil-50) — fond de section. **Surface-card `#FEF3C7`** (mil-100) — cards mises en avant.
- **Success / Warning / Danger** — Paires `bg + ink + border` toutes validées WCAG AA. `success` reprend volontairement `primary` (un cycle reproductif sain = vert Sahel) pour cohérence sémantique.
- **Danger `#DC2626`** — Réservé aux alertes critiques (mortalité, maladie, biosécurité), JAMAIS pour décorer.

Mode haut contraste (`html[data-contrast='high']`) : noir/blanc purs, bordures forcées, ombres marquées. Activable depuis la barre supérieure pour consultation en plein soleil.

## Typography

- **Big Shoulders Display** (display, h1, h2, h3, eyebrow) — sans-serif condensé, robuste, lisible petite taille. Utilisé pour TOUS les titrages et eyebrows.
- **Instrument Sans** (body, formulaires, navigation, chiffres) — humaniste neutre, excellente lisibilité smartphone, supporte `font-feature-settings: "tnum"` pour les chiffres tabulaires (KPI, tableaux).

Échelle stricte : H1 30px → H2 20px → H3 ~17px → body 16px → body-sm 14px → body-xs 13px (jamais en dessous, lisibilité terrain). Les `.eyebrow` (11px uppercase letter-spacing 0.1em) servent UNIQUEMENT aux étiquettes de section ou de KPI, jamais comme titre.

Tous les nombres (effectifs, poids, dates, KPI MCA/IC/GMQ) utilisent `font-variant-numeric: tabular-nums` pour alignement vertical dans les tables.

## Layout

- **Mobile-first.** Breakpoints Tailwind par défaut : `sm` 640px, `md` 768px, `lg` 1024px. Le smartphone Android 360-414px est le terrain de référence.
- **Bottom navigation** sur mobile (5 items max), **sidebar gauche** sur ≥`lg`.
- **Cibles tactiles ≥ 44×44 px** sur tous les éléments interactifs en `pointer: coarse` (WCAG 2.5.5). Checkboxes/radios ≥ 24px. Cette règle est appliquée globalement via CSS, ne pas la contourner.
- **Inputs larges (48px)** sur les formulaires saisie terrain (gants, doigts mouillés).
- **Spacing** : grille 4 / 8 / 16 / 24 / 32 px. Pas d'espacements arbitraires en `px` brut.
- **Densité** : préférer 2 lignes d'info par ligne d'écran à 1 ligne aérée. L'éleveur veut voir l'effectif d'un coup d'œil.

## Shapes

Coins arrondis modérés (sm 6 / md 10 / lg 14 / xl 18). Pas de squircle marketing, pas de pure square brutaliste. Les cards utilisent `rounded.lg`, les buttons `rounded.md`, les badges `rounded.sm`.

## Components

- **`button-primary`** — CTA principal d'une page (une seule occurrence). Fond `primary`, texte blanc, hauteur 44px touch-safe.
- **`button-secondary`** — Actions secondaires (annuler, voir détail). Fond `surface-warm`, texte `neutral`.
- **`button-warning`** — Actions à confirmer non destructives (ex. déclarer une saillie sans diagnostic). Fond `secondary` (or).
- **`button-danger`** — Actions destructives (mortalité, suppression, soft-delete). Fond `danger`, jamais utilisé pour autre chose.
- **`card`** / **`card-elevated`** — Container de groupe sémantique. `card-elevated` (fond `surface-card` mil-100) pour KPI vedette ou alertes importantes non critiques.
- **`input`** — Hauteur 48px en `.input-large`, 40px sinon. Toujours associé à un `<label>` visible, pas de placeholder-only.
- **`badge-*`** — Statuts (Saillie, Gestation, Mise bas, Sevrage, Mortalité). Toujours en paire `bg + ink` validée AA.
- **`alert-critical`** — Bannière pleine largeur pour PPA, biosécurité rompue, mortalité massive. Fond `danger` plein, texte blanc.

Hiérarchie d'alertes à 3 niveaux par **forme** (pas seulement couleur) :
- **Critical** — Fond rouge plein + icône pleine
- **High** — Fond clair + bordure rouge épaisse + icône contour
- **Medium** — Fond clair + bordure ambre + icône contour

## Do's and Don'ts

**Do's :**
- ✓ Vocabulaire FR pro zootechnique : Saillie, Mise bas, Sevrage, Gestation, Cochette, Verrat, Truie, Porcelet, Bande, Lot. Pas de "porc" générique en métier.
- ✓ Iconographie sobre style Lucide (line icons), jamais cartoon.
- ✓ Photographies : style documentaire vétérinaire (animal en condition réelle, lumière naturelle). Pas de stock photo "happy farm".
- ✓ Tabular nums sur tous les chiffres et dates.
- ✓ Toujours afficher l'unité après un nombre (kg, j, %, FCFA).
- ✓ Empty states avec action claire : pas "Aucune donnée" mais "Aucune saillie ce mois — [Déclarer une saillie]".
- ✓ Confirmer chaque action destructive (mortalité, suppression).

**Don'ts :**
- ✗ Pas de visuels "porc rose cartoon", pas de mascotte. L'élevage est un métier sérieux.
- ✗ Pas de vert pomme `#4ADE80`, pas de cyan `#06B6D4`, pas de violet marketing. La palette Terre & Mil est exhaustive.
- ✗ Pas de dégradés cosmétiques (sauf gradient subtil hero landing si vraiment justifié).
- ✗ Pas de glassmorphism, pas de neumorphism. Surfaces opaques nettes.
- ✗ Pas d'animations décoratives. Transitions ≤ 200ms, motrices uniquement (focus, accordion, modal entry).
- ✗ Pas de texte sous 13px en mobile (`text-xs` est rehaussé à 13px globalement).
- ✗ Pas de `console.log`, pas de dummy data en prod, pas de Lorem Ipsum dans le code livré.
- ✗ Pas de devises hors XOF (FCFA) sauf besoin export. Format `1 250 000 FCFA` (espace fine, pas virgule).
- ✗ Pas de dates US (`MM/DD/YYYY`). Format FR : `19/05/2026` ou `19 mai 2026`.
