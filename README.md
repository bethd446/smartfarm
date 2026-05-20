# 🐖 Smart Farm

> Application de gestion d'élevage porcin multi-fermes — ancrage **Côte d'Ivoire**.
> **Statut : 🚧 Brouillon V1** (pas encore en production).

---

## Stack technique

| Couche       | Techno                                                                   |
| ------------ | ------------------------------------------------------------------------ |
| Frontend     | **Next.js 16.2.6** (App Router) + TypeScript + Tailwind v4 + shadcn/ui   |
| Backend      | **Supabase local** (Docker) — Postgres 17 + PostgREST + Auth + Storage   |
| Hébergement  | VPS Linux + Nginx + Certbot (Let's Encrypt)                              |
| CI/CD        | GitHub Actions (build + typecheck, déploiement SSH à venir)              |
| Conteneurs   | Dockerfile multi-stage Next.js (`output: standalone`)                    |

---

## Quick start (dev local)

```bash
# 1. Cloner
git clone <repo> smartfarm && cd smartfarm

# 2. Configurer l'env Next
cp app/.env.local.example app/.env.local   # puis renseigner les clés Supabase
# Variables attendues :
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 3. Démarrer Supabase local (nécessite Docker + supabase CLI)
supabase start --workdir .

# 4. Lancer l'app Next en dev
cd app
npm install
npm run dev
# → http://localhost:3000
```

### Build production (local)

```bash
cd app
npm run build && npm start
```

### Docker (app uniquement)

```bash
# Build + run via compose
docker compose --profile dev up --build
```

> ℹ️ Supabase a son **propre** docker-compose géré par le CLI Supabase — le
> `docker-compose.yml` à la racine ne lance que l'app Next.js.

---

## Structure du projet

```
smartfarm/
├── app/                      # Next.js (App Router)
│   ├── src/
│   ├── Dockerfile            # Multi-stage build (standalone)
│   ├── next.config.ts
│   └── package.json
├── supabase/
│   ├── config.toml
│   ├── migrations/           # YYYYMMDDHHMMSS_*.sql
│   └── seed.sql
├── docker-compose.yml        # App Next uniquement
├── .github/workflows/
│   ├── ci.yml                # PR : typecheck + build
│   └── deploy.yml            # main : build + (TODO: deploy SSH)
└── BRIEF_AGENTS.md           # Brief sous-agents
```

---

## Liens utiles

- 🌐 **URL test** : https://smartfarm.187-127-225-24.nip.io
- 🛠️ **Supabase Studio (local)** : http://127.0.0.1:54323
- 🗄️ **DB locale** : `postgresql://postgres:***@127.0.0.1:54322/postgres`
- 📋 **Brief sous-agents** : [`BRIEF_AGENTS.md`](./BRIEF_AGENTS.md)
- 📄 **Migrations** : [`supabase/migrations/`](./supabase/migrations/)

---

## Conventions

- **FR** pour l'UI, **EN** pour code/SQL/commentaires techniques
- Pas de `console.log`, pas de `any` non justifié
- Server Components par défaut, `'use client'` uniquement si interactif
- Migrations idempotentes quand possible
- Secrets **uniquement** dans `.env.local` (jamais committés)

---

## Domaines fonctionnels (MVP)

Fermes & bâtiments · Races & animaux · Bandes · Reproduction (saillies,
diagnostics, mises bas, sevrages) · Pesées · Santé (protocoles vaccinaux,
vaccinations, traitements, mortalités) · Alimentation (types, formulations,
plans, consommations) · Stocks (fournisseurs, matières premières, mouvements,
commandes) · Départs · Utilisateurs multi-fermes · KPI bande & truie

---

© Smart Farm — Christophe Liegeois · build privé, redistribution interdite.
