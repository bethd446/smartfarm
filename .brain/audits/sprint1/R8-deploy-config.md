# R8 — Déploiement Hostinger + Supabase Cloud (rapport)

**Date** : 22 mai 2026
**Sprint** : Sprint 1 — R8 Déploiement
**Statut** : ✅ Livré (5/5 missions, 5 fichiers touchés)

---

## Objectif

Préparer le repo `bethd446/smartfarm` pour un déploiement production sur
**Hostinger Node.js app** avec **Supabase Cloud** comme backend managé,
sans Docker / sans Supabase self-host.

---

## Livrables

| # | Fichier | Type | Taille | But |
|---|---|---|---|---|
| 1 | `app/.env.production.example` | créé | ~1.6 ko | Template env vars prod (Supabase + Demo OFF + OpenRouter optionnel) |
| 2 | `DEPLOY.md` (racine) | créé | ~5.9 ko | Guide complet Hostinger + Supabase Cloud + checklist post-deploy |
| 3 | `app/deploy-static-copy.sh` | créé + chmod +x | ~1.1 ko | Sync `.next/static` + `public/` dans standalone, sans restart (Hostinger gère) |
| 4 | `README.md` (racine) | réécrit | ~4.3 ko | v0.3.0 · quick start dev · lien vers DEPLOY.md · stack · état |
| 5 | `app/package.json` | patché | +3 scripts | `build:standalone`, `start:standalone`, `db:push` |

**Total** : 5 fichiers (cap respecté).

---

## M1 — `.env.production.example`

Variables documentées :
- **Supabase prod** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (marqué SECRET)
- **App** : `NEXT_PUBLIC_APP_NAME`, `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`
- **Demo OFF en prod** : `SMARTFARM_DEMO_MODE=false`, `NEXT_PUBLIC_DEMO_USER_ID=`, `NEXT_PUBLIC_DEMO_FERME_ID=`
- **Demo API token (legacy)** : `DEMO_API_TOKEN`, `NEXT_PUBLIC_DEMO_API_TOKEN` (vides en prod post-Auth)
- **Optionnel** : `OPENROUTER_API_KEY` (chatbot)

L'ancien `app/.env.production.template` (formé pour usage demo + service_role partagé) est **conservé tel quel** — non touché pour éviter de casser un workflow existant. Le nouveau `.example` est le standard prod cible.

---

## M2 — `DEPLOY.md`

7 sections :
1. **Architecture cible** (ASCII art Hostinger ↔ Supabase Cloud)
2. **Supabase Cloud** : create project (Frankfurt, Data API ON, Auto RLS ON, expose new tables OFF), récupérer URL + anon + service_role, `supabase link` + `supabase db push`, seed, Auth Magic Link
3. **Hostinger** : connect GitHub `bethd446/smartfarm`, branch `main`, Node 22.x, build command (`cd app && npm ci && npm run build && bash deploy-static-copy.sh`), start command (`cd app/.next/standalone/projects/smartfarm/app && node server.js`), env vars, domaine
4. **Post-deploy checklist** : HTTPS, logo, 7 pages (`/dashboard`, `/alertes`, `/cheptel`, `/bandes`, `/sanitaire`, `/alimentation`, `/kpi`), headers (X-Frame-Options, CSP, HSTS), Magic Link, persistance Supabase, absence de fuite service_role
5. **Mise à jour / redéploiement**
6. **Rollback rapide** (Hostinger Deployments + Supabase backups)
7. **Références** internes

---

## M3 — `deploy-static-copy.sh`

Version Hostinger-compatible de `deploy.sh` :
- Pas de `npm run build` (Hostinger le lance via build command)
- Pas de `fuser -k`, pas de `nohup node` (Hostinger gère le lifecycle)
- Pas de healthcheck local (le `/3000` n'existe pas pendant le build Hostinger)
- Conserve le fix critique : copier `.next/static` et `public/` dans `.next/standalone/projects/smartfarm/app/` sinon page blanche
- `chmod +x` appliqué (vérifié : `-rwxr-xr-x`)
- `bash -n` validation : OK

---

## M4 — `README.md` (racine)

Refonte ciblée :
- Statut **v0.3.0** affiché en tête
- Quick start dev : `supabase start` → `.env.local` → `npm install` → `npm run dev`
- Section build standalone (`npm run build:standalone` + `npm run start:standalone`)
- **Lien vers `DEPLOY.md`** mis en avant
- Stack mise à jour (Next 16.2.6 standalone, Supabase Cloud Frankfurt prod, Hostinger Node 22.x)
- Arbo projet incluant les nouveaux scripts (`deploy.sh`, `deploy-static-copy.sh`, `.env.production.example`)
- État v0.3.0 résumé (43 tables RLS, 28 règles R01–R28, identité Cachet B, KPI IFIP)
- Conservation conventions (FR/EN, server components, migrations append-only)

---

## M5 — `package.json` scripts

Ajouts (validés `node -e ...` → JSON OK) :

```json
"build:standalone": "next build && bash deploy-static-copy.sh",
"start:standalone": "cd .next/standalone/projects/smartfarm/app && node server.js",
"db:push": "supabase db push"
```

- `build:standalone` → utilisé par Hostinger (build command alternative concise)
- `start:standalone` → utilisé par Hostinger (start command)
- `db:push` → helper pour pousser les migrations vers Supabase Cloud

Scripts existants `dev`, `build`, `start` **conservés intacts**.

---

## Règles dures respectées

| Règle | Statut |
|---|---|
| ❌ Pas de `npm run build` | ✅ Aucune exécution |
| ❌ Pas de tuer le serveur local | ✅ Aucune action sur :3000 |
| ❌ Pas de modif `.env.local` | ✅ Intact (mtime préservé) |
| ✅ Créer `.env.production.example` uniquement | ✅ OK (template prod existant non touché) |
| ✅ Max 5 fichiers | ✅ Exactement 5 (1 patch + 4 nouveaux) |

---

## Points d'attention pour Christophe

1. **Auth Magic Link** : la config Site URL + Redirect URLs Supabase doit être faite *avant* le premier déploiement pour éviter une boucle de redirection.
2. **`SMARTFARM_DEMO_MODE=false` en prod** : implique que le wrapper `src/lib/supabase/server.ts` doit utiliser l'utilisateur authentifié (et non plus le service_role). À valider lors du smoke test.
3. **Build command Hostinger** : le `npm ci` impose un `package-lock.json` à jour committé (✓ présent, 286 ko).
4. **`SUPABASE_SERVICE_ROLE_KEY` côté serveur uniquement** : ne pas le préfixer `NEXT_PUBLIC_` sinon inliné dans le bundle client → fuite critique.
5. **Domaine** : penser à mettre à jour la CSP `connect-src` dans `next.config.ts` si le sous-domaine Supabase Cloud n'est pas un `*.supabase.co` standard (à vérifier sur le project ref final).
6. **Migrations** : `supabase db push` jouera **toutes** les migrations versionnées dans `supabase/migrations/` — vérifier qu'il n'y a pas de migration locale-only avant le premier push.

---

## Fichiers modifiés (récap absolu)

```
/root/projects/smartfarm/README.md                          (réécrit)
/root/projects/smartfarm/DEPLOY.md                          (créé)
/root/projects/smartfarm/app/.env.production.example        (créé)
/root/projects/smartfarm/app/deploy-static-copy.sh          (créé, chmod +x)
/root/projects/smartfarm/app/package.json                   (patché, +3 scripts)
```

---

**R8 — DONE.** Prêt pour commit + push `main`, puis branchement Hostinger sur le repo.
