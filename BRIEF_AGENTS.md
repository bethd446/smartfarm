# Smart Farm — Brief Projet (lecture obligatoire sous-agents)

## CONTEXTE
Application **Smart Farm** : gestion d'élevage porcin multi-fermes, ancrage Côte d'Ivoire.
Version brouillon hébergée sur VPS, **pas encore en prod**.
Utilisateur : Christophe Liegeois (Senior DevOps/Agritech, attend du code NSA-level, FR partout).

## STACK FIGÉE (ne pas changer)
- Frontend : **Next.js 16.2.6** App Router + TypeScript + Tailwind v4 + shadcn/ui
- Backend : **Supabase local** (Docker) — Postgres 17 + PostgREST + Auth + Storage
- Path projet : `/root/projects/smartfarm/`
- Path app Next : `/root/projects/smartfarm/app/`
- Path migrations : `/root/projects/smartfarm/supabase/migrations/`
- Path scripts : `/root/projects/smartfarm/scripts/` (à créer si absent)

## ÉTAT ACTUEL
- App déployée HTTPS : `https://smartfarm.187-127-225-24.nip.io`
- Serveur Next tourne en background sur port 3000 (PID dans /tmp/smartfarm-next.log)
- Nginx + certbot OK
- Supabase local UP : 12 containers `supabase_*_smartfarm`
- DB locale : `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio Supabase : http://127.0.0.1:54323
- Migration initiale appliquée : `20260520000001_init_smartfarm.sql` (30 tables, 2 vues KPI, seed Yamoussoukro)

## CONVENTIONS À RESPECTER
1. **Tout en FR** pour l'UI, **EN** pour le code/SQL/commentaires techniques
2. Migrations Supabase : format `YYYYMMDDHHMMSS_nom_explicite.sql`, idempotent quand possible
3. Pages Next : Server Components par défaut, `'use client'` seulement si interactif
4. Supabase client : `@/lib/supabase/server` (server) et `@/lib/supabase/client` (browser)
5. shadcn/ui composants déjà installés : button, card, badge, table, input, label, select, dialog, dropdown-menu, tabs, sheet, sonner, skeleton, form, textarea, separator, avatar
6. Style : senior, dense, pas de fluff, pas de commentaires "// this function does X"
7. **Aucun secret en clair**, env vars dans `.env.local`
8. **Aucun `console.log` laissé**, pas de `any` TypeScript sauf justifié
9. Après modif SQL : appliquer via `supabase migration up --workdir /root/projects/smartfarm` (pas db reset, on garde le seed)

## TABLES PRINCIPALES (rappel)
fermes, batiments, cases, races, animaux, bandes, bande_animaux,
saillies, diagnostics_gestation, mises_bas, sevrages, regles_sevrage,
pesees, protocoles_vaccinaux, vaccinations, traitements, mortalites,
types_aliment, formulations, formulation_ingredients, plans_alimentation, consommations_aliment,
fournisseurs, matieres_premieres, mouvements_stock, commandes,
departs, utilisateurs, utilisateur_fermes
+ vues : v_kpi_bande, v_kpi_truie

## CRITÈRES DE SUCCÈS (s'applique à chaque patch)
- ✅ Build Next.js OK : `cd /root/projects/smartfarm/app && npm run build` doit passer
- ✅ Migration SQL applicable sans erreur sur DB locale
- ✅ Aucun warning TypeScript nouveau
- ✅ Code testé minimum : si tu ajoutes une fonction SQL, fais un `SELECT` qui la valide
- ✅ Rapport final : liste des fichiers créés/modifiés, points de friction rencontrés
