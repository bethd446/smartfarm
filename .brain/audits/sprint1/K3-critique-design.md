# K3 — Critique Design (DA Stripe/Linear-level)

> Reviewer : Design Director ex-Stripe/Linear/Notion. Mode adversaire.
> Build audité : `http://127.0.0.1:3000` (standalone), 22 mai 2026, post-D4.
> Charte référence : CONTEXT.md "Terre & Mil" B1, logo Cachet B Minimal.
> Méthodologie : lecture `globals.css` + `smartfarm-tokens.css` (464 lignes), 19 composants `ui/`, curl HTML rendu de 7 pages canoniques, grep classes Tailwind, comptage variants, diff logos.

---

## Verdict : LANCEABLE PUBLIQUEMENT ? **NON.**

Cinq raisons rédhibitoires :

1. **Deux logos officiels en parallèle dans `public/`.** `logo-smartfarm.svg` (Cachet C v2.2 octogonal 240×240 avec truie au pied) ET `images/logo-smartfarm.svg` (logo horizontal 220×80). Le sidebar / app-shell / mobile-drawer affichent le cachet ratatiné à 36×36 (h-9 w-9) — un sceau illisible. La landing `/` charge l'autre. Le CONTEXT.md dit "Cachet B Minimal", le fichier dit "Cachet C v2.2". Personne ne sait quel logo est officiel. **C'est le critère #1 d'amateurisme.**

2. **Le système de tokens est cassé en deux.** `globals.css` définit une palette OKLCH shadcn générique (`--primary: oklch(0.205 0 0)` = noir, pas le vert sahel) ET la palette `--sf-*` Terre & Mil par-dessus. `smartfarm-tokens.css` (464 lignes) ajoute une TROISIÈME couche avec des valeurs DIFFÉRENTES (`--sf-surface-0: #FAF7F0` dans tokens vs `#FFFFFF` dans globals, `--sf-ink: #1a1a1a` vs `#1C1917`, `--sf-accent: #B8703D` vs `--sf-accent-warm: #A16207`). Selon l'ordre d'import, c'est l'un ou l'autre qui gagne. Dans le DOM rendu : 19 couleurs hardcodées distinctes coexistent. Pas de source of truth.

3. **Hiérarchie typographique incohérente entre pages.**
   - `/dashboard` : H1 = `text-3xl font-black tracking-tight` (30px noir 900)
   - `/cheptel` `/kpi` : H1 = `text-4xl font-black tracking-[0.02em]` (36px noir 900)
   - `/stock` `/parametres` : H1 = `text-4xl font-bold tracking-[0.01em]` (36px bold 700)
   - `/alertes` `/sanitaire/*` `/alimentation/*` (13 pages) : H1 = `text-3xl font-bold` (30px bold 700)
   
   **Quatre styles H1 différents sur 14 pages.** Pour H2, c'est pire : sur `/dashboard`, 5 H2 sont rendus en `text-[11px]` (eyebrow 11px) ; sur `/kpi`, les H2 cumulent les classes `.eyebrow` (11px) ET `text-xl` (20px) — conflit CSS résolu silencieusement par cascade, comportement non-déterministe. Le `globals.css` h2 dit `1.25rem` (20px) mais les pages overrident en `text-[11px]`. Bordel intégral.

4. **9 `<Button variant="danger">`, 3 `variant="success"`, 1 `variant="warning"` dans le code → variants qui N'EXISTENT PAS dans `button.tsx`.** Le composant définit `default | accent | outline | secondary | ghost | destructive | link`. Aucun `danger/success/warning`. Tous ces boutons tombent en `default` (vert sahel) sans erreur TypeScript visible. Bonne nouvelle : ce sont des `Badge` (où ces variantes existent). Mauvaise nouvelle : ça prouve que personne ne sait ce qui est valide où.

5. **Dark mode visuellement cassé sur 9/14 pages.** Seules `sanitaire/mycotoxines`, `sanitaire/ppa`, `sanitaire/ppa/_dialog-observation` ont des classes `dark:`. Les autres (dashboard, cheptel, alertes, kpi, bandes, batiments, reproduction, mises-bas, etc. — 0 classe `dark:` chacune) reposent uniquement sur les tokens CSS. Or `/bandes` utilise `bg-amber-100 text-amber-700`, `/actions-rapides` utilise `bg-violet-600`, `/lib/colors.ts` distribue partout `bg-red-100 text-red-700`, `bg-emerald-100`, `bg-orange-100`. **Ces classes Tailwind palette par défaut RESTENT EN LIGHT en mode dark.** Toggle `.dark` = badges qui éclairent en pleine lumière sur fond noir. Honteux.

---

## Score /10 par axe

| Axe | Score | Justif courte |
|---|---|---|
| **Couleur** | 4/10 | 3 couches tokens en conflit + 51 bg/61 text/25 border palette Tailwind par défaut hors charte = 137 occurrences "hors système". 19 hex différents dans `/dashboard` rendu. |
| **Typographie** | 3/10 | 4 styles H1, ≥3 styles H2 (eyebrow déguisé, text-xl, text-sm), 1 seule font chargée (Big Shoulders) — Instrument Sans annoncée mais 0 occurrence dans HTML rendu de `/dashboard`. Cumul `.eyebrow` + `text-xl` = conflit CSS. |
| **Espacement** | 6/10 | Card padding `pt-5 px-5 pb-5 md:pt-[18px] md:px-4 md:pb-[14px]` est précis mais utilise des pixels arbitraires (14/18) qui sortent du grid 4pt/8pt. Sinon gap-2/gap-3 et p-4 dominent ailleurs. |
| **Composants** | 5/10 | Button bien typé (cva, 7 variants, sizes ≥48px), mais 9 call-sites passent des variants fantômes. Card propre. Pas de `Tooltip` natif (CONTEXT.md "fallback `title=""`" — anti-pattern). Pas de `Switch`/`Toggle` standardisé. Empty state n'est utilisé que dans 6 pages sur 14. |
| **Iconographie** | 5/10 | 77 imports `lucide-react` (bonne base) MAIS emojis hardcodés en parallèle (🌾🥄💉💊🧴📦🐷🐖 dans `/stock`, `/sanitaire/calendrier`, `/sanitaire/mycotoxines`, `/assistant`). Tailles d'icônes : 19× `h-4 w-4`, 10× `h-5 w-5`, 10× `h-3 w-3` — 3 tailles concurrentes sans règle. Logo Cachet ratatiné 36×36 dans sidebar = illisible. |
| **Mobile** | 6/10 | `@media (pointer:coarse)` force min 44×44 ✓ ; bottom-nav + mobile-drawer existent ; FAB quick-actions présent. Mais tableaux 8 colonnes non scrollables (audit A `/mises-bas`). Card padding mobile bumped à 5×5 (bien). Pas de viewport meta `theme-color` dans le rendu. |
| **Micro-IX** | 4/10 | Button `active:translate-y-px` + double shadow stamp = identité forte ✓. Mais : pas de transition skeleton→content (juste un Skeleton importé), pas d'état `loading` standardisé sur boutons, toasts via sonner mais sans pattern documenté success/error/info, hover states présents uniquement sur primary. |
| **Brand** | 4/10 | DEUX logos officiels en parallèle. Tagline "Élevage porcin · Côte d'Ivoire" présente mais 🇨🇮 emoji drapeau en clair sur landing (anti-charte typo). Cachet aux dimensions 240×240 rendu en 36×36. Vocab FR pro (Truie/Verrat/Saillie) maintenant cohérent (corrigé post-A), mais `/sanitaire/mycotoxines` et `/sanitaire/calendrier` gardent emojis 🐷/🐖 dans les empty states. |

**Moyenne 4,6/10.** Le geste graphique (cachet imprimerie, Big Shoulders uppercase, palette Terre & Mil) est SAVOUREUX, l'exécution est BORDÉLIQUE.

---

## TOP 12 PROBLÈMES VISUELS P0

### P0-1 — Deux logos officiels dans `public/`
- `/public/logo-smartfarm.svg` (2486 octets, octogone 240×240, Cachet C v2.2 "truie au pied")
- `/public/images/logo-smartfarm.svg` (1777 octets, horizontal 220×80, "Smart Farm" plain)
- Référencés depuis 6 fichiers : sidebar, mobile-drawer, app-shell, layout favicon → le cachet octogonal ; page.tsx landing → le horizontal.
- **CONTEXT.md dit "Cachet B Minimal" — aucun des deux n'est Cachet B.** 3 cachets différents en circulation (B promis, C v2.2 utilisé en favicon/sidebar, horizontal "plain" sur landing).
- **Fix : décider UN logo, supprimer les 2 autres, valider à 5 tailles (16/32/64/128/256).**

### P0-2 — Cachet octogonal ratatiné à 36×36 dans sidebar
- `src/components/sidebar.tsx:75` : `<img src="/logo-smartfarm.svg" className="h-9 w-9" />` charge un SVG dessiné pour 240×240 avec 2 octogones, "SF" 96px, filets gold, "EST · 2026" 11px et silhouette de truie 22px. À 36×36, tout est compressé en une bouillie verte. Linear utilise un **glyph** monogramme (juste "L" stylisé) à cette taille — pas un cachet complet.
- **Fix : créer `glyph-smartfarm.svg` (déjà présent dans `/public/images/` mais inutilisé !) ou ne garder que le monogramme SF.**

### P0-3 — Triple couche de tokens en conflit silencieux
- Couche 1 : `globals.css` `@theme` → `--color-primary: #2D4A1F`, `--color-accent: #B8703D`.
- Couche 2 : `globals.css :root` shadcn OKLCH → `--primary: oklch(0.205 0 0)` (NOIR, pas vert).
- Couche 3 : `globals.css :root` Terre & Mil → `--sf-primary: #2D4A1F`, `--sf-accent-warm: #A16207` (or, pas terracotta).
- Couche 4 : `smartfarm-tokens.css` (importé EN PREMIER, donc écrasable) → `--sf-accent: #B8703D` (terracotta), `--sf-ink: #1a1a1a`, `--sf-surface-0: #FAF7F0`.
- **Résultat** : `--sf-accent` final = `#B8703D` (terracotta tokens) mais `--sf-accent-warm` final = `#A16207` (or globals). Deux accents qui se contredisent. `--sf-ink` final = `#1C1917` (globals override) tandis que les fallbacks dans 30+ fichiers hardcodent encore `#1a1a1a`.
- **Fix : tuer `smartfarm-tokens.css` OU tuer la définition `--sf-*` dans `globals.css`. Pas les deux.**

### P0-4 — 4 styles H1 différents sur 14 pages
```
/dashboard       → text-3xl font-black tracking-tight uppercase (Big Shoulders)
/cheptel /kpi    → text-4xl font-black uppercase tracking-[0.02em] (Big Shoulders inline style)
/stock /paramètres → text-4xl font-bold tracking-[0.01em] (Big Shoulders inline style)
/alertes /alimentation/* /sanitaire/* (13 pages) → text-3xl font-bold flex items-center gap-2
```
**Linear** a 1 style H1, point. Stripe idem.
- **Fix : exporter `<PageTitle>` composant unique. Bannir les `<h1 className=…>` ad-hoc.**

### P0-5 — H2 "eyebrow déguisé" sur `/dashboard` (11px là où on attend 20px)
- Le `globals.css` h2 (ligne 239) prescrit `font-size: 1.25rem` (20px) avec un commentaire pleurnichard "FIX-B #4 — H2 affiché jusqu'ici 11px (eyebrow par défaut Tailwind) → cassé."
- **Le fix n'a pas pris.** `/dashboard` H2 affiche EFFECTIVEMENT 11px : `<h2 className="font-[…]uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted)] font-bold">` (variable `eyebrowCls` réutilisée 8 fois).
- Sur `/kpi`, c'est ENCORE PIRE : classes `.eyebrow` + `text-xl` cumulées, le CSS `.eyebrow` du globals (ligne 254) force `font-size: 11px`, donc le `text-xl` est ignoré silencieusement. **Cascade non-déterministe.**
- **Fix : `<Eyebrow>` distinct de `<SectionTitle>`. Bannir le pattern "h2 avec apparence d'eyebrow".**

### P0-6 — Instrument Sans annoncée mais jamais chargée
- `globals.css` ligne 10 : `--font-family: 'Instrument Sans', system-ui, sans-serif`
- `smartfarm-tokens.css` lignes 22-29 : `@font-face` avec `src: url("/fonts/InstrumentSans-Regular.woff2")`
- Curl `/dashboard` : `grep -c "Instrument Sans"` = **0**. Le HTML ne mentionne jamais cette font. Elle est probablement absente de `/public/fonts/`.
- **Conséquence** : tout le body tombe en system-ui (San Francisco / Segoe UI / Roboto selon OS). L'identité "Instrument Sans + Big Shoulders" promise par la charte n'est pas livrée.
- **Fix : vérifier `public/fonts/InstrumentSans-*.woff2` présent ; sinon retirer la promesse de globals.css.**

### P0-7 — `bg-amber-100 text-amber-700` etc. sur `/bandes` + `/alertes` + 13 autres : 137 occurrences hors palette
- 51 `bg-{couleur}-{niveau}` + 61 `text-{couleur}-{niveau}` + 25 `border-{couleur}-{niveau}` Tailwind par défaut.
- Pas un seul `dark:` correspondant sur ces classes hors `globals.css`. **Mode dark = badges fluo orange sur fond noir.**
- Pire : `lib/colors.ts` (la source de vérité documentée) distribue ces classes en dur : `bg: 'bg-red-100', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200'`. Donc le bordel est **codifié**.
- **Fix : remplacer `lib/colors.ts` par tokens sémantiques `--sf-success-bg/ink`, `--sf-warning-bg/ink`, `--sf-danger-bg/ink`. Ils existent déjà ! Personne ne les utilise.**

### P0-8 — Tailles de texte fines hardcodées : 72× `text-[11px]`, 32× `text-[10px]`, 5× `text-[9px]`
- À 9px, lisibilité plein soleil = 0. Sur badges de calendrier sanitaire (`/sanitaire/calendrier` lignes 349, 524 : `<Badge variant="danger" className="text-[9px]">`).
- L'audit A persona Konan disait "boutons h-14, text-xs 13px base" — bien — mais les badges contournent en arbitrary values.
- **Stripe** plancher : 12px. **Linear** : 11px (et ils ont une font Inter optimisée pour). Big Shoulders à 9px est illisible.
- **Fix : caption-xs = 11px minimum dans le DS. Tokeniser : `--sf-font-size-caption: 11px`.**

### P0-9 — Sidebar et mobile-drawer : `bg-[#1a1a1a] dark:bg-[#0d0c09]` hardcodés
- `sidebar.tsx:65` : `bg-[#1a1a1a]` (mais `--sf-ink` est censé être cette couleur !)
- `sidebar.tsx:127` : `bg-[#2a2a2a]` (popover hover — vient d'où ?)
- `mobile-drawer.tsx:74` : pareil
- `contrast-toggle.tsx:40-41` : `bg-amber-500 text-slate-900 / text-slate-300 hover:bg-slate-800`
- **Sidebar = composant le plus visible. Pas tokenisé.**
- **Fix : `bg-[var(--sf-ink)] dark:bg-[var(--sf-ink-deep)]`.**

### P0-10 — Emojis pictographiques en table dense `/stock`
- `src/app/(app)/stock/page.tsx` lignes 23-28 : `🌾🥄💉💊🧴📦` mappés aux types de matières.
- En table dense avec colonne "stock actuel / seuil / coût" lignes financières, ces emojis ressemblent à une appli Telegram, pas à un outil pro.
- L'audit A persona Konan : "comme indiqué dans le code 'dérogation autorisée', mais sur table dense ça ressemble à un jouet, pas à un outil pro. Préférer Lucide."
- **Notion** utilise emojis dans des covers de page (zone décorative). Jamais en première colonne d'une table de valorisation.
- **Fix : passer à `<Wheat/>, <Pill/>, <Syringe/>, <Package/>` Lucide. 8 minutes de remplacement.**

### P0-11 — Bouton `bg-amber-600` sur "Nouvelle bande" qui ne fait rien (cassé) + `bg-violet-600/indigo-600/red-600/emerald-600` sur `/actions-rapides`
- `/bandes/page.tsx:32` : `<Button size="lg" className="h-12 text-base bg-amber-600 hover:bg-amber-700">` — couleur ambre hors charte (la charte dit gold `#A16207` ou accent terre `#B8703D`).
- `/actions-rapides/page.tsx:18-39` : 4 actions colorées en violet / indigo / red / emerald — **PALETTE ARC-EN-CIEL** qui violent la charte Terre & Mil dans tous les sens.
- **Fix : variants sémantiques (success/warning/danger/accent) avec tokens, jamais Tailwind brut.**

### P0-12 — EmptyState utilisé dans 6 pages sur 14 ; les 8 autres ont du texte brut "Aucun X enregistré pour ce filtre"
- Bon EmptyState : `dashboard`, `reproduction`, `kpi`, `alertes-widget`, `tip-du-jour`, `sanitaire/mycotoxines`.
- Texte brut sans icône, sans CTA, sans tone : `/alimentation/plans` "Aucun plan d'alimentation enregistré pour ce filtre.", `/alimentation/consommations` "Aucune consommation enregistrée — démarrez le suivi.", `/alimentation/matieres`, `/alimentation/concentres`, `/alimentation/formulation/nouveau`, `/alimentation/formulation`, `/sanitaire/biosecurite`, `/conseiller`.
- **Fix : empty states = obligatoires partout. C'est la signature design d'une app premium (cf. Linear vide = jolie illustration, pas un `<p>`).**

---

## Incohérences flagrantes

- **Charte CONTEXT.md "Cachet B Minimal"** → fichier `/public/logo-smartfarm.svg` dit dans son `aria-label` "**Cachet C v2.2 Truie au pied**". Aucun des deux logos n'est B. Le fichier prétend être C v2.2 mais la silhouette truie est dessinée à 22px de haut → invisible à 36×36 dans le sidebar. C'est un Cachet C qui se fait passer pour B.

- **Logo landing `/` vs logo sidebar** : la landing affiche un wordmark horizontal 220×80 ("Smart Farm" en typo lisible). Le sidebar affiche un sceau octogonal vert. **Mêmes mots "Smart Farm", deux identités visuelles disjointes.** L'utilisateur qui clique "Se connecter" voit le brand changer instantanément.

- **`--sf-accent` (terracotta `#B8703D`)** dans `smartfarm-tokens.css` vs **`--sf-accent-warm` (or `#A16207`)** dans `globals.css` (lignes 13 et 125) : deux accents différents, deux noms différents, deux fichiers différents. Stripe a `--color-accent`. Un. Linear a `--accent`. Un.

- **`--sf-ink`** : `#1a1a1a` (tokens, ligne 64) → écrasé par `#1C1917` (globals, ligne 127, commentaire : "override : tiré vers brun"). Pourquoi définir dans tokens si on override partout ? **Dead code visuel.**

- **`--radius`** : `0.625rem` (globals shadcn) → mais Card `borderRadius: 0` en inline style, Button `rounded-[4px]` en arbitrary value, Badge `rounded-full`. Le système radius existe (radius-sm/md/lg/xl/2xl/3xl/4xl) mais **personne n'utilise les tokens, tout est hardcodé**.

- **H2 dashboard `text-[11px]`** vs **H2 cheptel `text-xl` (20px)** vs **H2 kpi cumul `.eyebrow text-xl` (résolu à 11px par cascade `.eyebrow`)**. Trois interprétations de "H2" dans le même build.

- **`Aucune naissance récente`** (dashboard, EmptyState propre) vs **`Aucun concentré ne correspond à ces filtres.`** (concentres, `<p>` brut). Même intention, deux UX différentes.

- **Mode dark** : `globals.css` lignes 188-211 définit les overrides `--sf-*` complets (surface-0, surface-1, etc.). Mais **9 pages sur 14 utilisent des classes Tailwind par défaut `bg-emerald-100 / bg-amber-100` SANS `dark:` correspondants**. Le mode dark est annoncé comme fonctionnel dans CONTEXT.md ("Dark mode fonctionnel post-fix v3") — **fonctionnel ≠ visuel**. Toggle = catastrophe.

- **`html[data-contrast='high']`** dans globals.css force `bg-emerald-700 → #064e3b`, `bg-red-600 → #991b1b` etc. (lignes 307-329) — **ce qui CONFIRME que les classes Tailwind palette sont attendues**. Donc le système assume une dualité tokens + Tailwind classes. C'est de la bricole, pas un DS.

---

## Couleurs hardcodées trouvées

### Hex `#XXXXXX` dans le DOM rendu de `/dashboard`
```
#1a1a1a × 32  (--sf-ink fallback)
#F1D4CE × 26  (--sf-danger-bg fallback)
#7A2A1F × 26  (--sf-danger-ink fallback)
#2D4A1F × 18  (--sf-primary direct, hors token)
#FAF7F0 × 16  (--sf-surface-0 fallback)
#2a2a2a × 14  (sidebar popover hover — hardcodé, hors charte)
#1f1f1f × 14  (sidebar dark variant — hardcodé)
#EFE7D6 × 6   (--sf-surface-2 fallback)
#D6E3CC × 6   (--sf-success-bg fallback)
#1F3B12 × 6   (--sf-success-ink fallback)
#fff × 4      (white explicite)
#B45309 × 4   (?? aucune définition trouvée — orphelin)
#6b6b6b × 4   (?? gris orphelin)
#000 × 4      (black explicite)
#F5E0B8 × 2   (--sf-warning-bg fallback)
#DCE9CB × 2   (--sf-success-bg autre version)
#5A3E0E × 2   (--sf-warning-ink fallback)
#A16207 × 1   (--sf-accent-warm direct)
#0d0c09 × 1   (sidebar dark — hardcodé)
```
**19 hex distincts** pour une seule page. Un système propre = 5-7 max.

### Classes Tailwind palette par défaut (audit grep `src/`)
- `bg-{couleur}-{niveau}` : **51 occurrences** (emerald-600/100, amber-500/600/700, red-50/600/700/200, blue-100/700, violet-100/600/700, indigo-600/700, slate-100/200/700/900, orange-100/200/700)
- `text-{couleur}-{niveau}` : **61 occurrences**
- `border-{couleur}-{niveau}` : **25 occurrences**
- `from-/to-/via-{couleur}` (gradients) : 0 (bon point)

**Fichiers les plus contaminés** :
- `src/lib/colors.ts` (16 hits) — la source devenue le problème
- `src/app/(app)/actions-rapides/page.tsx` (4 boutons rainbow)
- `src/app/(app)/bandes/page.tsx` (5 statuts en couleurs Tailwind)
- `src/app/(app)/sanitaire/mycotoxines/page.tsx` (cards amber-50/orange-50)
- `src/app/(app)/sanitaire/ppa/page.tsx` (cards red-50/red-200)

### `bg-[#XXX]` arbitrary values (hex en dur dans className)
- `src/components/sidebar.tsx:65` → `bg-[#1a1a1a] dark:bg-[#0d0c09]`
- `src/components/sidebar.tsx:127` → `bg-[#2a2a2a] dark:bg-[#1f1f1f]`
- `src/components/mobile-drawer.tsx:74` → `bg-[#1a1a1a] dark:bg-[#0d0c09]`

3 occurrences identifiées. Aucune ne devrait exister — devraient utiliser `bg-[var(--sf-ink)]` ou un token dédié `--sf-nav-bg`.

### Couleurs orphelines (présentes dans le DOM mais nulle part dans tokens)
- `#B45309` (4 occurrences) — orange foncé, non documenté
- `#6b6b6b` (4 occurrences) — gris neutre, non documenté
- `#2a2a2a`, `#1f1f1f`, `#0d0c09` — sidebar custom palette, non documentés
- **Fix : tracer ces couleurs et soit les tokeniser soit les éliminer.**

---

## Charte vs réalité

| CONTEXT.md prescrit | Code livré | Verdict |
|---|---|---|
| Logo **Cachet B Minimal** | Cachet **C v2.2 Truie au pied** + wordmark horizontal en parallèle | ❌ MENT |
| Palette **Terre & Mil** : `--sf-accent-warm #A16207` | `--sf-accent #B8703D` (terracotta) coexiste | ❌ DOUBLE |
| **Big Shoulders** display + **Instrument Sans** body | Big Shoulders OK ; Instrument Sans absent du HTML rendu | ⚠️ DEMI |
| **Boutons min-h-14, uppercase, stamp shadows** | Conforme dans `button.tsx` | ✅ |
| **Dark mode light 9/10 + dark 9/10 (post-fix v3)** | Dark mode tokens définis mais 9/14 pages bypass via Tailwind classes par défaut | ❌ CASSÉ |
| **Vocab FR pro (Cochette, Reproduction, Mises bas, Sanitaire)** | Conforme depuis fix post-A | ✅ |
| **Tagline sidebar `Élevage porcin · Côte d'Ivoire`** `text-[10px] uppercase tracking-[0.15em]` | Présente | ✅ |
| **WCAG 10/10 paires AA+ validées** | Tokens définis pour ça MAIS classes hors-palette (`bg-amber-100/text-amber-700`) non auditées | ⚠️ DOUTEUX |
| **Tokens 3 couches primitive→semantic→component (skill ckm:design-system)** | 4 couches (theme + shadcn OKLCH + sf vars globals + sf vars tokens.css) qui se contredisent | ❌ |

---

## Inspirations pour fix

### P0-1 / P0-2 — Logo unifié
- **Linear** : un logo wordmark (`Linear`) + un glyph (le L stylisé). Le glyph fonctionne de 16×16 à 256×256. **Jamais** d'élément narratif (truie, date "EST·2026", filets) en glyph.
- **Stripe** : `stripe.com` + glyph "S" inversé. Même règle.
- **Action** : garder le cachet octogonal **pour le marketing/print/login splash uniquement**. Créer un `glyph-smartfarm.svg` (juste "SF" Big Shoulders 900 sur fond crème, sans octogone, 64×64 viewBox) pour sidebar/favicon/avatar OS.

### P0-3 / P0-4 / P0-5 — Tokens 3 couches + typo
- **Stripe DS** : primitive (`color-blue-500: #635BFF`) → semantic (`color-action-primary: var(--color-blue-500)`) → component (`button-primary-bg: var(--color-action-primary)`). 1 source.
- **Notion** : pour les headings, composants `<H1>`, `<H2>`, `<H3>` exposés, **pas** de `<h1 className=…>` ad-hoc dans les pages.
- **Action** : 
  1. Tuer `smartfarm-tokens.css` ou tuer `:root --sf-*` dans `globals.css` — un seul des deux.
  2. Créer `<PageTitle>`, `<SectionTitle>`, `<Eyebrow>` composants. Bannir `<h1/h2/h3 className>` direct dans les pages.

### P0-7 / P0-11 — Couleurs sémantiques only
- **Linear** : `bg-elevation-1 / bg-elevation-2 / bg-elevation-3` + `text-primary / text-secondary / text-tertiary` + 4 couleurs sémantiques. Pas de `red-700` en clair, jamais.
- **Action** : transformer `lib/colors.ts` pour renvoyer des classes tokenisées : `'bg-[var(--sf-danger-bg)] text-[var(--sf-danger-ink)]'` au lieu de `'bg-red-100 text-red-700'`. Variants `success/warning/danger/accent` sur Button (les ajouter aussi côté Button vu qu'ils sont déjà utilisés en pratique).

### P0-9 — Sidebar tokens
- **Linear sidebar** : `--sidebar-bg: oklch(...)` tokenisé. Pareil pour `--sidebar-hover`, `--sidebar-active-bg`.
- **Action** : `--sf-nav-bg: #1a1a1a; --sf-nav-bg-deep: #0d0c09; --sf-nav-item-hover: #2a2a2a;` puis remplacer les 3 hardcodes.

### P0-10 — Lucide partout
- **Notion / Linear / Stripe** : exclusivement icônes vectorielles cohérentes (Lucide ou interne). Emojis = zones d'expression utilisateur (covers, réactions), jamais système.
- **Action** : map `stock` matière_type → Lucide :
  - `aliment` → `<Wheat/>`
  - `concentre` → `<Beaker/>`
  - `vaccin` → `<Syringe/>`
  - `medicament` → `<Pill/>`
  - `desinfectant` → `<SprayCan/>`
  - `consommable` → `<Package/>`

### P0-12 — Empty states obligatoires
- **Linear backlog vide** : illustration custom + heading + body + CTA. Pas un `<p>`.
- **Action** : remplacer les 8 textes bruts par `<EmptyState icon={Icon} title=… description=… cta=…/>`.

---

## Verdict final

**LAUNCH READY : NON.**

Smart Farm a une **DIRECTION ARTISTIQUE forte et originale** — le geste "cachet imprimerie + Big Shoulders + Terre & Mil + bordereau d'élevage" est mémorable, identifiable, ne ressemble à AUCUN SaaS générique. C'est la moitié du chemin que la plupart des startups ratent.

L'autre moitié — **la rigueur d'exécution** — est manquante. Tokens dédoublés, typo incohérente, 137 classes hors palette, 2 logos officiels, dark mode cassé sur 9/14 pages, variants Button fantômes appelés 13 fois. Linear/Stripe/Notion mettent ÉNORMÉMENT plus d'énergie sur l'exécution que sur la créa de la charte. SmartFarm a fait l'inverse.

### Comparaison verticale (autres SaaS élevage / agritech)

| Concurrent | Score visuel estimé | Différentiel |
|---|---|---|
| **Hipra Cloud** (vaccins porc, leader EU) | 5/10 — Bootstrap 2017 enterprise. Bleu/blanc/gris. AUCUNE identité. | SmartFarm **+2** sur identité, **-1** sur cohérence d'exécution. |
| **IFIP GTTT/GTE-TB** (référence FR) | 3/10 — Excel-like, années 2000. | SmartFarm **+5** sur visuel, **+2** sur UX globale. |
| **PigChamp** (référence US) | 6/10 — Material Design 2019 propre mais générique. | SmartFarm **+1** sur identité, **-1** sur rigueur. |
| **AgriWebb** (Australie, élevage gen) | 8/10 — Design solide, mobile-first, tokens propres. | SmartFarm **-3** sur exécution, **+0** sur identité (différente cible). |
| **Connecterra Ida** (élevage laitier) | 7/10 — Charte verte propre, dashboards lisibles. | SmartFarm **-2** sur exécution, **+1** sur ancrage culturel (CI). |

**Conclusion** : SmartFarm est **MEILLEUR que la concurrence directe CI/Afrique de l'Ouest** (qui n'a rien) et la concurrence FR/EU (Bootstrap-grade). Mais à **2 sprints de design system** d'être au niveau AgriWebb / Stripe (vertical SaaS premium).

### Plan de remédiation 12 jours (priorité décroissante)

1. **Jour 1** : décider UN logo. Supprimer les 2 autres SVG. Créer un glyph 64×64 dédié pour sidebar/favicon.
2. **Jour 2** : tuer `smartfarm-tokens.css` OU `:root --sf-*` dans globals. Une seule source.
3. **Jour 3** : composants `<PageTitle>`, `<SectionTitle>`, `<Eyebrow>`. Refactor 14 pages.
4. **Jour 4** : ajouter `success/warning/danger/accent` à `buttonVariants` cva (mappés sur tokens). Tester les 13 call-sites existants.
5. **Jour 5** : refactor `lib/colors.ts` → tokens sémantiques. Supprimer les 137 occurrences `bg-{couleur}-{niveau}` Tailwind brutes.
6. **Jour 6** : `--sf-nav-bg/hover/deep` tokenisés. Refactor sidebar / mobile-drawer / app-shell.
7. **Jour 7** : remplacer 6 emojis stock par icônes Lucide. Idem `/sanitaire/calendrier`, `/sanitaire/mycotoxines`.
8. **Jour 8** : EmptyState sur les 8 pages qui n'en ont pas.
9. **Jour 9** : tester dark mode page par page, ajouter les `dark:` manquants OU bannir totalement les classes Tailwind palette.
10. **Jour 10** : vérifier `Instrument Sans` chargé. Sinon retirer la promesse ou ajouter les `.woff2`.
11. **Jour 11** : audit Lighthouse + axe DevTools sur les 14 pages.
12. **Jour 12** : capture screenshot de chaque page light + dark, side-by-side avec design tokens.

**Après ces 12 jours, score estimé : 7,5/10 → LAUNCH READY.**

Avant ces 12 jours : **NE PAS LANCER PUBLIQUEMENT**. Bêta fermée à 3-5 éleveurs technophiles tolérants OK ; presse / grand public / DSV démo officielle NON.

---

**Fin de critique K3 — Design Director adversaire · 22 mai 2026**
