# BRIEF B1-B — PALETTE "Terre & Mil" (caveman ≤80L)

## TOI
Designer système. Tu produis tokens.css + showcase HTML/PNG. Pas modifier code app (orchestrateur applique).

## LIS D'ABORD
1. `skill_view(name='brand-guidelines')` — méthode application charte
2. `skill_view(name='ckm:design-system')` — tokens 3 couches (primitive→semantic→component)
3. `/tmp/sf-r4d/RAPPORT-VISUEL.md` (RECO-2 palette validée DB)
4. CONTEXT.md sections "CHARTE Terrain Vivant" + "SKILLS DESIGN OBLIGATOIRES"

## PALETTE FINALE (validée DB ui-ux-pro-max)
```
PRIMITIVES
--sahel-900 #14532D   (deep)
--sahel-700 #2D4A1F   (primary existant)
--sahel-500 #4A7C23   (light)
--gold-600  #A16207   (harvest gold WCAG ✓)
--gold-400  #CA8A04   (light)
--latérite-700 #9A3412 (brique)
--latérite-500 #DC2626 (alerte rouge — réutiliser destructive)
--mil-50   #FFFBEB   (crème chaud)
--mil-100  #FEF3C7   (surface chaude)
--terre-900 #1C1917  (ink profond)
--terre-700 #44403C  (ink secondaire)
--terre-200 #E7E5E4  (line)
SEMANTICS (override existant)
--sf-primary       = sahel-700
--sf-primary-deep  = sahel-900
--sf-accent-warm   = gold-600   ← NOUVEAU
--sf-terre         = latérite-700 ← NOUVEAU
--sf-surface-0     = white
--sf-surface-1     = mil-50      ← override existant
--sf-surface-2     = mil-100     ← NOUVEAU
--sf-ink           = terre-900
--sf-ink-secondary = terre-700
--sf-line          = terre-200
--sf-danger        = latérite-500
--sf-warning       = gold-600
--sf-success       = sahel-700
```

## LIVRABLES (4 fichiers)
1. `tokens.css` — TOUS les variables CSS ci-dessus + commentaires roles + dark mode equivalents (génère version dark intelligente: surfaces inversées vers terre-900, ink vers mil-50, etc.)
2. `palette-showcase.html` — 1 page autonome (CSS inline) montrant :
   - Bandeau couleur primaire/accent/terre en plein écran avec hex + RGB + WCAG ratios vs blanc/noir
   - Section "Surfaces" avec layout 3 cards (light/dark/contraste)
   - Section "Application réelle" : reproduction simplifiée d'une card alerte critique + 1 card stat + 1 bouton CTA + 1 badge
   - Tagline "PALETTE TERRE & MIL — SMART FARM 2026" en bas
3. `palette-showcase-dark.html` — même page mais en thème dark, pour valider l'inversion
4. `application-screens.html` — 3 mini-mockups côte à côte (dashboard, alertes, kpi) avec la nouvelle palette appliquée, à comparer visuellement avec captures actuelles `/tmp/sf-r4d/desktop-*.png`

## EXPORT PNG des HTML
Via : `cd /tmp/b1-palette && for f in *.html; do chromium --headless --no-sandbox --screenshot="${f%.html}.png" --window-size=1440,900 "file://$(pwd)/$f"; done`
Si chromium absent : `playwright screenshot file:///... output.png --viewport-size 1440,900`.

## VÉRIFICATIONS OBLIGATOIRES (rapport doit prouver)
- Contraste WCAG AA : ink/mil-50, ink/white, sahel-700/white, gold-600/white, accent-warm sur surface-0
- Cohérence avec charte existante (Big Shoulders + Instrument Sans préservés)
- Dark mode lisible (pas le bug `--sf-cream` corrigé en mai)

## SORTIE
- Tous fichiers dans `/tmp/b1-palette/`
- 1 rapport `/tmp/b1-palette/RAPPORT-PALETTE.md` ≤ 4 KB :
  - Tableau primitives/sémantique
  - Tableau WCAG ratios (8-10 paires testées)
  - Notes : ce qui CHANGE vs charte actuelle / ce qui reste / migration path
  - Conclusion : palette prête à push dans `globals.css` ou besoin itération ?

## INTERDICTIONS
- ❌ npm/build
- ❌ modifier `src/app/globals.css` (livrer fichier séparé `tokens.css`)
- ❌ vision_analyze
- ❌ rapport >4 KB

Go. Tu es designer pro, propre et rapide.
