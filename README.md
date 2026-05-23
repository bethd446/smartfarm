# 🐖 Smart Farm

> **Application de gestion d'élevage porcin multi-fermes — ancrage Côte d'Ivoire.**
> Suivi reproduction, sanitaire, alimentation, KPI IFIP (MCA / IC / GMQ), alertes terrain.
> **Statut : v0.4.0** — production live sur [smartfarm.group](https://smartfarm.group)
>
> [![Production](https://img.shields.io/badge/prod-smartfarm.group-1c1916?style=flat-square)](https://smartfarm.group)
> [![Stack](https://img.shields.io/badge/stack-Next.js%2016%20%2B%20Supabase-1c1916?style=flat-square)](#stack)
> [![Hosting](https://img.shields.io/badge/hosting-Hostinger-1c1916?style=flat-square)](https://hostinger.com)

---

## Quick start (dev local)

```bash
# 1. Cloner
git clone git@github.com:bethd446/smartfarm.git && cd smartfarm

# 2. Démarrer Supabase local (Docker + supabase CLI requis)
supabase start --workdir .

# 3. Configurer l'env Next
cp app/.env.local.template app/.env.local
# → renseigner NEXT_PUBLIC_SUPABASE_URL + ANON_KEY (sorties par `supabase start`)

# 4. Installer et lancer
cd app
npm install
npm run dev
# → http://localhost:3000
```

### Build standalone (équivalent prod)

```bash
cd app
npm run build:standalone
npm run start:standalone
```

---

## 🚀 Déploiement production

Voir **[DEPLOY.md](./DEPLOY.md)** — guide complet Hostinger + Supabase Cloud.

- Hostinger Node.js app (`main` auto-deploy)
- Supabase Cloud (Frankfurt, RLS ON, Auth Magic Link)
- Checklist post-deploy (HTTPS, headers sécu, 7 routes critiques)

---

## Stack technique

| Couche       | Techno                                                                   |
| ------------ | ------------------------------------------------------------------------ |
| Frontend     | **Next.js 16.2.6** (App Router, output standalone) + React 19 + TS       |
| UI           | Tailwind v4 · shadcn/ui · Radix · Big Shoulders Display + Instrument Sans|
| Backend dev  | Supabase **local** (Docker) — Postgres 17 + PostgREST + Auth + Storage   |
| Backend prod | **Supabase Cloud** (Frankfurt, RLS ON, Auth Magic Link)                  |
| Hébergement  | **Hostinger Node.js app** (Node 22.x, HTTPS auto)                        |
| CI/CD        | GitHub Actions (typecheck + build) · Hostinger auto-deploy sur `main`    |

---

## Structure du projet

```
smartfarm/
├── app/                              # Next.js (App Router)
│   ├── src/
│   ├── deploy.sh                     # Deploy local (build + sync + restart)
│   ├── deploy-static-copy.sh         # Sync standalone (utilisé par Hostinger)
│   ├── .env.production.example       # Template env prod
│   ├── next.config.ts                # output: standalone + headers sécu
│   └── package.json
├── supabase/
│   ├── config.toml
│   ├── migrations/                   # YYYYMMDDHHMMSS_*.sql (versionnées)
│   └── seed.sql
├── DEPLOY.md                         # Guide déploiement Hostinger + Supabase Cloud
├── docker-compose.yml                # App Next uniquement (Supabase CLI gère le sien)
└── .github/workflows/
```

---

## État fonctionnel (v0.3.0)

✓ 43 tables RLS ON · 28 règles d'alertes (R01–R28 IFIP)
✓ Sidebar 14 items / 5 groupes · hub /sanitaire · bottom-nav mobile
✓ Repro : saillies, diagnostics gestation, mises bas, sevrages, BCS truie
✓ Sanitaire : calendrier porcelets J1/J5/J14/J28, biosécurité 12 items, PPA, mycotoxines
✓ KPI IFIP : MCA · IC · GMQ par stade (vues `v_kpi_*`)
✓ Identité Cachet B Minimal · palette Terre & Mil · dark mode
✓ Headers sécu (CSP / X-Frame-Options / HSTS) · empty states · export PDF KPI

Voir [`CHANGELOG.md`](./CHANGELOG.md) pour le détail des sprints.

---

## 🎨 Design & UX

L'identité visuelle **Terrain Vivant** (palette Terre & Mil, Big Shoulders Display + Instrument Sans) est documentée au format **Google DESIGN.md** :

- **[`DESIGN.md`](./DESIGN.md)** — Spec design tokens (couleurs, typo, components) lintable via `npx -y @google/design.md lint DESIGN.md`.
- **[`docs/DESIGN_BRIEF_CLAUDE.md`](./docs/DESIGN_BRIEF_CLAUDE.md)** — Brief destiné à Claude Design (cible utilisateur, do's/don'ts métier).
- **[`docs/SCREENSHOTS.md`](./docs/SCREENSHOTS.md)** — Liste écrans à capturer pour audits visuels.
- **[`docs/REPO_STRUCTURE.md`](./docs/REPO_STRUCTURE.md)** — Tour guidé du repo pour outils de design.

Source des tokens en production : [`app/src/app/globals.css`](./app/src/app/globals.css) (`@theme` Tailwind v4 CSS-first + variables `--sf-*`).

---

## Conventions

- **FR** pour l'UI / vocab terrain pro ; **EN** pour code/SQL/commentaires techniques
- Pas de `console.log`, pas de `any` non justifié
- Server Components par défaut, `'use client'` uniquement si interactif
- Migrations idempotentes : nouvelle migration `YYYYMMDDHHMMSS_*.sql`, **jamais** modifier une existante
- Secrets uniquement dans `.env.local` / `.env.production` (jamais committés)

---

## Domaines fonctionnels

Fermes & bâtiments · Races & animaux · Bandes · Reproduction (saillies,
diagnostics, mises bas, sevrages) · Pesées · Santé (protocoles vaccinaux,
vaccinations, traitements, mortalités, biosécurité, PPA, mycotoxines) ·
Alimentation (matières premières CI, formulations, plans, consommations,
ratios AA NRC) · Stocks · Utilisateurs multi-fermes · KPI bande / truie / IFIP.

---

© Smart Farm — Christophe Liegeois · build privé, redistribution interdite.
