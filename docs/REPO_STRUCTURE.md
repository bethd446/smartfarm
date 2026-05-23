# Repo Structure — Smart Farm

> Tour guidé du repo pour Claude Design. Pour le code applicatif, focaliser sur `app/src/` (le reste est infra/BDD).

---

## Vue d'ensemble

```
smartfarm/
├── DESIGN.md                        ← Spec design tokens (Google DESIGN.md format)
├── README.md                        ← Pitch + quick start + stack
├── DEPLOY.md                        ← Guide déploiement Hostinger + Supabase Cloud
├── CHANGELOG.md                     ← Historique sprints
├── .claude-design-ignore            ← Exclusions crawl Claude Design
│
├── app/                             ← APPLICATION Next.js (← cible principale Claude Design)
│   ├── src/
│   │   ├── app/                     ← App Router Next.js 16
│   │   │   ├── (auth)/              ← Pages auth (connexion, inscription, mot-de-passe-oublie)
│   │   │   │   ├── connexion/
│   │   │   │   ├── inscription/
│   │   │   │   ├── mot-de-passe-oublie/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── _actions.ts      ← Server actions auth
│   │   │   ├── (app)/               ← App SSR auth-required
│   │   │   │   ├── dashboard/
│   │   │   │   ├── cheptel/
│   │   │   │   ├── reproduction/
│   │   │   │   ├── mises-bas/
│   │   │   │   ├── sanitaire/
│   │   │   │   ├── alimentation/
│   │   │   │   ├── bandes/
│   │   │   │   ├── batiments/
│   │   │   │   ├── pesees/
│   │   │   │   ├── stock/
│   │   │   │   ├── alertes/
│   │   │   │   ├── kpi/
│   │   │   │   ├── performances/
│   │   │   │   ├── calendrier/
│   │   │   │   ├── actions-rapides/
│   │   │   │   ├── assistant/
│   │   │   │   ├── conseiller/
│   │   │   │   ├── onboarding/
│   │   │   │   ├── parametres/
│   │   │   │   └── layout.tsx       ← Sidebar + bottom-nav shell
│   │   │   ├── api/                 ← Route handlers (Next.js)
│   │   │   ├── auth/                ← Callback Supabase magic link
│   │   │   ├── globals.css          ← ★ Tokens CSS @theme Tailwind v4 (SOURCE des couleurs)
│   │   │   ├── layout.tsx           ← Root layout (fonts, themes provider)
│   │   │   └── page.tsx             ← ★ Landing publique
│   │   ├── components/
│   │   │   ├── ui/                  ← shadcn primitives (button, card, dialog, sheet…)
│   │   │   ├── kpi/                 ← Composants KPI métier (MCA, IC, GMQ)
│   │   │   ├── app-shell.tsx
│   │   │   ├── sidebar.tsx          ← Nav desktop 14 items / 5 groupes
│   │   │   ├── bottom-nav.tsx       ← Nav mobile 5 items
│   │   │   ├── mobile-drawer.tsx
│   │   │   ├── quick-actions-fab.tsx
│   │   │   ├── barcode-scanner.tsx
│   │   │   ├── animal-photo-upload.tsx
│   │   │   ├── contrast-toggle.tsx  ← Haut contraste plein soleil
│   │   │   ├── export-button.tsx
│   │   │   └── user-menu.tsx
│   │   └── lib/
│   │       ├── supabase/            ← Client SSR + browser (wrapper cookies)
│   │       └── utils/               ← Helpers (cn, formatters, date FR…)
│   ├── public/
│   │   ├── fonts/                   ← Big Shoulders + Instrument Sans (self-hosted woff2)
│   │   └── images/
│   ├── next.config.ts               ← output: standalone + headers sécu CSP/HSTS
│   ├── tsconfig.json
│   ├── package.json                 ← Next 16, React 19, Tailwind v4, shadcn/ui, Supabase SSR
│   ├── postcss.config.mjs           ← Tailwind v4 PostCSS plugin
│   ├── components.json              ← Config shadcn (registry, alias)
│   └── playwright.config.ts         ← E2E tests
│
├── supabase/                        ← (ignoré par Claude Design)
│   ├── config.toml
│   ├── migrations/                  ← SQL versionnées YYYYMMDDHHMMSS_*.sql
│   └── seed.sql
│
├── docs/                            ← Documentation projet
│   ├── DESIGN_BRIEF_CLAUDE.md       ← ★ Brief pour Claude Design (à lire en complément de DESIGN.md)
│   ├── SCREENSHOTS.md               ← Liste écrans à capturer
│   ├── REPO_STRUCTURE.md            ← ← Tu es ici
│   ├── screenshots/                 ← (à créer par Christophe avant envoi Claude Design)
│   ├── archive/                     ← Briefs historiques (ignoré)
│   └── audits/                      ← Audits internes sprints (ignoré)
│
├── scripts/                         ← Scripts d'import / seed (ignoré par Claude Design)
├── agents/                          ← Specs agents internes (ignoré)
├── docker-compose.yml               ← App Next (Supabase CLI gère son propre stack)
└── .github/workflows/               ← CI typecheck + build
```

## Fichiers clés pour Claude Design

Si Claude Design ne devait lire **que 6 fichiers** pour comprendre l'identité visuelle :

1. **`DESIGN.md`** (racine) — Tokens canoniques + rationale.
2. **`docs/DESIGN_BRIEF_CLAUDE.md`** — Cible utilisateur, do's/don'ts métier.
3. **`app/src/app/globals.css`** — Tokens CSS réels en production (`@theme` Tailwind v4 + variables `--sf-*`).
4. **`app/src/app/layout.tsx`** — Root layout : chargement fonts, theme provider, classes globales.
5. **`app/src/app/page.tsx`** — Landing publique actuelle (état avant refonte).
6. **`app/src/components/ui/`** — Primitives shadcn personnalisées (button, card, badge, dialog…).

Pour le ton éditorial et le vocabulaire métier, ajouter en lecture :
- **`README.md`** racine — pitch + état fonctionnel.
- **`app/src/components/sidebar.tsx`** — labels de navigation (Cheptel, Reproduction, Sanitaire, etc. — vocabulaire FR pro zootechnique).
- N'importe quel formulaire dans `app/src/app/(app)/reproduction/` ou `mises-bas/` — pour voir le vocabulaire en contexte (Saillie, Diagnostic gestation, Mise bas, Sevrage, Cochette, Verrat).

## Conventions de code respectées

- **Server Components** par défaut ; `'use client'` uniquement si interactivité (forms, dialogs, scanner).
- **Pas de `console.log`**, **pas de `any`** non justifié.
- **TypeScript strict** activé.
- **i18n** : 100% FR (UI + commentaires de domaine). Code/SQL en EN.
- **Imports absolus** via alias `@/` (configuré dans `tsconfig.json`).
- **Composants shadcn** importés et **personnalisés sur place** (pas re-exportés depuis une couche custom).
- **Tailwind v4 CSS-first** : pas de `tailwind.config.ts`, tout se passe dans `globals.css` via `@theme`.

## Ce qu'il ne faut PAS regarder (bruit pour Claude Design)

- `supabase/migrations/` — 80+ migrations SQL, inutile pour l'identité visuelle.
- `scripts/` — Scripts Python d'import / seed.
- `.brain/` — Cerveau projet privé (notes, sprints internes, secrets de domaine).
- `agents/` — Specs agents Hermes internes.
- `docs/archive/`, `docs/audits/` — Documents historiques de sprints passés.
- `test-results/`, `playwright-report/` — Artefacts tests.
- `node_modules/`, `.next/`, `*.log` — évidemment.

Voir [`.claude-design-ignore`](../.claude-design-ignore) pour la liste exhaustive des exclusions.
