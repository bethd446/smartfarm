# 🚀 Smart Farm — Guide de déploiement

Cible : **Hostinger (Node.js app)** + **Supabase Cloud** (Postgres + Auth + Storage managés).

---

## 1. Architecture cible

```
┌──────────────────────┐         ┌──────────────────────────┐
│  Hostinger Node.js   │         │      Supabase Cloud      │
│  ──────────────────  │  HTTPS  │  ──────────────────────  │
│  Next.js 16          │ ──────▶ │  Postgres 17 + PostgREST │
│  standalone :3000    │         │  Auth · Storage · RLS    │
│  (server.js)         │         │  (Frankfurt — EU)        │
└──────────┬───────────┘         └──────────────────────────┘
           │
           ▼
   smartfarm.<domain>
   (HTTPS auto Hostinger)
```

- **Pas de Docker / pas de Supabase self-host en prod.**
- Build effectué par Hostinger via GitHub (CI managée).
- Migrations DB poussées via `supabase db push` (poste local ou GitHub Action).

---

## 2. Étapes Supabase Cloud

### 2.1. Créer le projet

1. Dashboard → https://supabase.com/dashboard → **New project**
2. Paramètres recommandés :
   - **Region** : `Frankfurt (eu-central-1)` (proximité Côte d'Ivoire / latence raisonnable)
   - **Data API** : `ON`
   - **Auto-enable RLS on new tables** : `ON`
   - **Expose new tables in Data API** : `OFF` (on expose explicitement les vues utiles)
   - **DB password** : générer fort, stocker dans gestionnaire de secrets
3. Attendre provisioning (~2 min).

### 2.2. Récupérer les clés API

Dashboard → **Settings → API** :

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` `secret` (⚠️ jamais côté client) |

### 2.3. Pousser les migrations

```bash
# Depuis le poste local, dans le repo cloné :
cd supabase
supabase link --project-ref <project-ref>   # demande la DB password
supabase db push                            # joue toutes les migrations versionnées
```

> Vérifier dans Studio → SQL Editor : 43 tables, 28 règles `v_alertes_actives`, RLS ON partout.

### 2.4. Seed des données initiales (optionnel)

```bash
# Si un seed prod existe :
psql "$(supabase db remote-url)" -f supabase/seed.prod.sql
```

Ou via Studio → SQL Editor (copier-coller les inserts).

### 2.5. Auth — Magic Link

Dashboard → **Authentication → Providers** :
- Email **enabled**
- Site URL : `https://<votre-domaine>`
- Redirect URLs : `https://<votre-domaine>/**`

---

## 3. Étapes Hostinger

### 3.1. Créer l'app Node.js

Panneau Hostinger → **Websites → Node.js** → **Create application** :

1. **Connect GitHub repo** : `bethd446/smartfarm`
2. **Branch** : `main`
3. **Node version** : `22.x`
4. **Application root** : laisser racine (`/`) — les scripts ciblent `app/`.
5. **Build command** :
   ```
   cd app && npm ci && npm run build && bash deploy-static-copy.sh
   ```
6. **Start command** :
   ```
   cd app/.next/standalone/projects/smartfarm/app && node server.js
   ```

### 3.2. Variables d'environnement

Onglet **Environment Variables** : copier-coller le contenu de
[`app/.env.production.example`](app/.env.production.example) et remplir avec
les valeurs Supabase Cloud (étape 2.2).

Variables critiques :

| Variable | Valeur prod |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role (⚠️ secret) |
| `SMARTFARM_DEMO_MODE` | `false` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOSTNAME` | `0.0.0.0` |

### 3.3. Domaine

- Onglet **Domains** → ajouter le domaine custom.
- Pointer le DNS (A record) vers l'IP Hostinger.
- HTTPS auto (Let's Encrypt managé Hostinger).

### 3.4. Déclencher le 1er build

- Bouton **Deploy** dans le panneau → Hostinger pull `main`, exécute build + start.
- Logs visibles dans l'onglet **Logs**.

---

## 4. Post-deploy checklist

Tests à passer **avant** d'annoncer l'app live :

- [ ] HTTPS fonctionne (`curl -I https://<domaine>` → `200 OK`)
- [ ] Logo Cachet B s'affiche (`https://<domaine>/logo-smartfarm.svg` → `200`)
- [ ] 7 pages essentielles HTTP 200 :
  - [ ] `/dashboard`
  - [ ] `/alertes`
  - [ ] `/cheptel`
  - [ ] `/bandes`
  - [ ] `/sanitaire`
  - [ ] `/alimentation`
  - [ ] `/kpi`
- [ ] Headers sécu présents (vérifier via `curl -I`) :
  - [ ] `X-Frame-Options: DENY`
  - [ ] `Content-Security-Policy: default-src 'self'; ...`
  - [ ] `Strict-Transport-Security: max-age=...`
- [ ] Auth Magic Link fonctionne (envoi mail + redirection OK)
- [ ] Une création réelle (ex. nouvelle saillie) persiste dans Supabase Cloud
- [ ] Pas de fuite de `SUPABASE_SERVICE_ROLE_KEY` dans le bundle client
      (`curl https://<domaine> | grep -i service_role` → vide)

---

## 5. Mise à jour / redéploiement

1. `git push origin main` depuis le poste local.
2. Hostinger détecte le push → rebuild automatique (si auto-deploy activé).
3. Pour les migrations DB : `supabase db push` depuis le poste local.

---

## 6. Rollback rapide

- Hostinger → onglet **Deployments** → bouton **Redeploy** sur un commit antérieur.
- DB : restaurer un point-in-time depuis Supabase Dashboard → **Database → Backups**.

---

## 7. Références

- Build pipeline : `app/deploy-static-copy.sh` (sync `.next/static` + `public/` dans standalone)
- Headers sécu : `app/next.config.ts`
- Migrations : `supabase/migrations/` (dernière : `20260523010000_aa_matieres_ci.sql`)
- Env example : `app/.env.production.example`
