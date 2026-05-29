# Design Phase D3 — Harmonisation des 5 zones finales

> Spec validé le 2026-05-29 · Branche `feat/design-phase-d` (PR #11) · Suite directe de D1 + D2.

## 1. Objectif & cadrage

Harmoniser les 5 dernières pages de l'app au **registre app dense** (doctrine `DESIGN.md`, pattern de référence `batiments/page.tsx`, précédent posé par D1 + D2) **sans casser data / logique / navigation**.

- **Branche** : `feat/design-phase-d` (existante) → les commits D3 alimentent **PR #11**.
- **Périmètre par zone** : `page.tsx` **uniquement**. Sont exclus : `_dialog-*.tsx`, `_fab.tsx`, `_server-actions.ts`, `_schemas.ts`, `_actions-*.tsx`, sous-routes (`check-j1/`), composants `ui/*`.
- **Pas** de `npm run build` / `tsc` / commit / push **dans les sous-agents** : l'orchestrateur valide après merge.

## 2. État de départ (grep ciblé 2026-05-29)

| Page | Lignes | Anti-patterns durs | Hero-metric (`text-3xl+`) | `<Card>` | Card grids | Dates non-safe (`toLocaleDateString`) |
|---|---|---|---|---|---|---|
| mises-bas | 579 | 0 | 0 | 19 | 3 | 4 |
| mortalités | 458 | 0 | 2 | 28 | 1 | 1 |
| stock | 266 | 0 | 4 | 10 | 1 | 3 |
| pesees | 97 | 0 | 1 | 10 | 0 | 1 |
| actions-rapides | 77 | 0 | 1 | 0 | 1 | 0 |

Constats :
- **0 anti-pattern dur** partout (gradient / backdrop-blur / side-stripe `border-l-[2-9]` / Instrument Serif / font-editorial).
- Le gros du travail = **densifier les Card** (mortalités 28, mises-bas 19) et les **KPI hero-metric** (stock 4, mortalités 2).
- **9 dates `toLocaleDateString` en JSX serveur** = violations règle 10 (risque hydration), **0 `<RelativeTime>`** nulle part.

## 3. Cibles par page

### 3.1 mises-bas (579 l)
- Header → eyebrow + titre Big Shoulders (pattern hubs).
- KPI éventuels → bandeau registre dense (hairlines, `tabular-nums`, ton par icône/couleur).
- Listes (portées récentes / mises bas à venir) → registre hairline ou table dense alignée (modèle `reproduction` historique).
- Dates `toLocaleDateString` → `<RelativeTime>` / `<FormattedDate>`.
- **Préserver** : `_dialog-mise-bas`, `_dialog-adoption`, `_dialog-sevrage`, `_fab`, lien sous-route `check-j1`, server-actions, calculs.

### 3.2 mortalités (458 l)
- KPI hero (taux mortalité 30 j, etc.) → bandeau dense.
- Registre des mortalités → table hairline (Date / Animal / Motif / Poids… alignées, `tabular-nums`), badge motif tonal.
- Dates → `<RelativeTime>`.
- **Préserver** : `_dialog-mortalite`, **vocabulaire motif strict**, calcul du taux.

### 3.3 stock (266 l)
- KPI 3 cards → **bandeau dense** (modèle `alimentation`).
- Inventaire (liste articles) → registre hairline.
- Dates → `<RelativeTime>`.
- **Préserver** : alerte `isAlerte` (stock bas / `AlertTriangle`), **emoji `typeIcons` 🌾🥄💉💊🧴📦 (exception DS documentée dans le code)**, `ExportButton`, dialogs, header déjà tokenisé `--sf-*`.

### 3.4 pesees (97 l)
- KPI → dense.
- Pesées récentes → registre hairline.
- Dates → `<RelativeTime>`.
- **Préserver** : `_dialog-peser`, `_actions-peser`, `_fab`.

### 3.5 actions-rapides (77 l) — cas particulier
**Exception au principe de densification.** C'est un lanceur de saisie terrain « pensé pour les gants » (règle 7 : Android 4G, plein soleil 1500 lx, mains sales). On **garde les 4 grosses tuiles tactiles** (`h-32`, cibles ≥ 44 px).
- Fond → `--sf` surface + bordure hairline (fini le fond plein coloré).
- Label → Big Shoulders.
- **Icône** porte le ton sémantique via tokens `--sf-*` (fini `bg-violet-600` / `indigo` / `red` / `emerald` bruts). Mapping figé :
  - Nouvelle mise bas (`/mises-bas`) → `--sf-primary` (vert / naissance)
  - Peser (`/pesees`) → `--sf-info` (bleu / mesure)
  - Soin (`/sanitaire`) → `--sf-danger` (rouge / sanitaire)
  - Déplacer (`/cheptel`) → `--sf-accent` (or / logistique)
- Header → eyebrow + titre (fini `text-3xl font-bold` + `text-slate-500`).
- **Préserver** : hrefs `?quick=true`, ergonomie ≥ 44 px.

## 4. Orchestration — 2 vagues séquentielles

- **Vague 1** : 2 sous-agents Opus **parallèles** → `mises-bas` + `mortalités` (les 2 grosses, `page.tsx` disjoints, 0 conflit fichier). Puis prof reviewer (tsc + build + smoke localhost démo) → commit.
- **Vague 2** : 3 sous-agents **parallèles** → `stock` + `pesees` + `actions-rapides`. Puis prof reviewer → commit.
- Briefs caveman ≤ 200 l dans `agents/sprint-design-phase-d3/briefs/L*.md` ; rapports ≤ 120 l dans `agents/sprint-design-phase-d3/rapports/RAPPORT_L*.md`.

## 5. Garde-fous transverses (à inclure dans chaque brief)

- Data / logique / nav **100 % préservées**.
- Tokens `--sf-*` **only**.
- Big Shoulders (titres / eyebrows / chiffres) · Instrument Sans (body) · `tabular-nums` (chiffres).
- **0** gradient / glassmorphism / side-stripe (`border-l-[2-9]`) / backdrop-blur / Instrument Serif.
- Dates via `<RelativeTime>` / `<FormattedDate>` (règle 10) — **0 `toLocaleDateString` résiduel**.
- Cibles ≥ 44 px · mobile-first.
- Vocabulaire FR zootechnique strict.

## 6. Vérifications

**Par lane (dans le rapport, sorties réelles)** :
- `grep -niE "linear-gradient|backdrop-blur|border-l-[2-9]|instrument.serif|font-editorial" page.tsx` → 0
- `grep -c "href=" page.tsx` + dialogs → avant == après (nav préservée)
- `grep -c "toLocaleDateString\|formatDistanceToNow\|toLocaleString" page.tsx` → 0 après migration

**Orchestrateur (après merge de chaque vague)** :
- `npx tsc --noEmit -p tsconfig.json` → 0 erreur
- `npm run build:next-only` → exit 0
- Smoke visuel localhost démo (`demo@smartfarm.group`) sur les 5 routes + console : 0 erreur hydration **nouvelle**, 0 régression.

## 7. Hors scope (noté, traité ailleurs)

- Bug hydration pré-existant Radix `DialogTrigger asChild` + `Button` (déjà flaggé en tâche dédiée).
- Arbitrage `sanitaire-stats.tsx` orphelin (brancher ou supprimer).
- Vague 4 fonctionnel (backlog métier `PLAN_ARMEE`).
