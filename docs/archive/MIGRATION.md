# Smart Farm — Migration locale → Supabase Cloud

Procédure pour passer du brouillon local (Supabase Docker sur le VPS) à une
instance **Supabase Cloud** + domaine de production, en une commande principale.

---

## Prérequis

- [ ] Projet **Supabase Cloud** créé sur https://supabase.com/dashboard
  - Noter le **PROJECT_REF** (visible dans l'URL : `…/project/<ref>/…`, ~20 caractères)
  - Noter le **DB password** choisi à la création (impossible à récupérer plus tard
    sans reset → si perdu, *Settings → Database → Reset database password*)
- [ ] `supabase` CLI installé et authentifié :
  ```bash
  which supabase            # doit retourner un chemin
  supabase login            # une seule fois (ouvre le navigateur ou demande un token)
  ```
- [ ] `psql` installé (client postgres, pour le seed et la vérification) :
  ```bash
  apt-get install -y postgresql-client
  ```
- [ ] `gh` CLI authentifié (utile pour le patch 8 — CI/CD) :
  ```bash
  gh auth status
  ```
- [ ] Domaine acheté + capacité à éditer la zone DNS chez le registrar.

---

## Étape 1 — Pousser le schéma + (optionnel) le seed

```bash
cd /root/projects/smartfarm
./scripts/migrate-to-cloud.sh
```

Le script va :

1. Vérifier la CLI Supabase.
2. Demander `PROJECT_REF` + `DB_PASSWORD`.
3. `supabase link --project-ref <ref>` vers le projet Cloud.
4. `supabase db push` : applique toutes les migrations de `supabase/migrations/`.
5. Proposer d'appliquer `supabase/seed.sql` (données démo Yamoussoukro).
   - **Garde-fou** : si `fermes` contient déjà des lignes, le seed est refusé pour
     éviter d'écraser des données réelles.
6. Afficher l'API URL, le lien Studio, la forme de la DB URL.
7. Générer `app/.env.production.template` pré-rempli avec l'URL du projet.
8. Lister les étapes manuelles (DNS, certbot, etc.).

À la fin du script, **rien n'est commité côté app** — il faut encore renseigner
les clés et basculer l'env (étape 2).

---

## Étape 2 — Basculer l'application sur l'env production

1. Créer `.env.production` à partir du template :
   ```bash
   cd /root/projects/smartfarm/app
   cp .env.production.template .env.production
   $EDITOR .env.production
   ```
   Remplir :
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← *Dashboard → Settings → API → `anon public`*
   - `SUPABASE_SERVICE_ROLE_KEY` ← *Dashboard → Settings → API → `service_role`*

2. Basculer :
   ```bash
   cd /root/projects/smartfarm
   ./scripts/switch-env.sh production
   ```
   - Sauvegarde l'ancien `.env.local` en `.env.local.bak.<timestamp>`.
   - Copie `.env.production` vers `.env.local` (Next.js lit ce nom-là).
   - Refuse de basculer si des placeholders (`<COLLER_…>`) sont encore présents.

---

## Étape 3 — Vérifier l'intégrité de la migration

```bash
cd /root/projects/smartfarm
./scripts/verify-migration.sh
```

Le script se connecte à la base Cloud et vérifie la présence de tous les objets
attendus (29 tables, 2 vues KPI, 17 index nommés). Sortie : ✅/❌ par objet,
code de sortie **0** si tout OK, **1** sinon.

> Variante non-interactive :
> ```bash
> ./scripts/verify-migration.sh "postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres"
> ```

---

## Étape 4 — Rebuild + redéploiement (manuel pour l'instant)

> ⏳ Cette étape sera automatisée par le **patch 8** (CI/CD via `gh` + webhook).
> Pour l'instant, procédure manuelle :

```bash
cd /root/projects/smartfarm/app

# Réinstaller les deps (au cas où) et build avec les nouvelles env vars
npm ci
npm run build

# Couper l'ancien serveur Next (PID dans /tmp/smartfarm-next.log)
OLD_PID="$(pgrep -f 'next-server|next start' | head -1)"
[ -n "$OLD_PID" ] && kill "$OLD_PID"

# Relancer
nohup npm run start -- -p 3000 > /tmp/smartfarm-next.log 2>&1 &
disown

# Vérifier
curl -fsS http://127.0.0.1:3000/ | head -1
```

### DNS + TLS

1. Chez le registrar du domaine, créer un **record A** :
   ```
   smartfarm.<domaine.tld>   A   187.127.225.24
   ```
2. Attendre la propagation (`dig smartfarm.<domaine.tld>` doit renvoyer l'IP).
3. Émettre le certificat TLS :
   ```bash
   certbot --nginx -d smartfarm.<domaine.tld>
   ```
4. Mettre à jour `server_name` dans `/etc/nginx/sites-available/smartfarm` puis :
   ```bash
   nginx -t && systemctl reload nginx
   ```

---

## Rollback — revenir au brouillon local

Si la migration cloud pose problème, on revient instantanément sur la DB locale :

```bash
cd /root/projects/smartfarm
./scripts/switch-env.sh local
```

- Restaure `.env.local` depuis `.env.local.source` (ou `.env.local.template`).
- Le backup `.env.local.bak.<timestamp>` reste disponible si besoin de retrouver
  la version Cloud :
  ```bash
  ls -lt app/.env.local.bak.*
  cp app/.env.local.bak.<ts> app/.env.local
  ```
- Redémarrer Next.js (cf étape 4).
- La DB locale (Docker) n'a **jamais été touchée** par la migration cloud → 100%
  intacte.

### Rollback côté Cloud

Si on veut **annuler** ce qui a été poussé côté Cloud :

- **Schéma** : Supabase ne propose pas de `db down` automatique. Soit on supprime
  le projet Cloud (Dashboard → Settings → General → *Delete project*), soit on
  applique une migration inverse manuelle.
- **Seed** : si appliqué, exécuter un `TRUNCATE` ciblé via `psql` ou supprimer
  le projet et recommencer.

---

## Récapitulatif des fichiers

```
/root/projects/smartfarm/
├── MIGRATION.md                          ← ce fichier
├── scripts/
│   ├── migrate-to-cloud.sh               ← orchestration push schéma + seed
│   ├── switch-env.sh                     ← bascule env local↔production
│   └── verify-migration.sh               ← contrôle d'intégrité DB Cloud
├── app/
│   ├── .env.local                        ← env actif (lu par Next.js)
│   ├── .env.local.template               ← template local (versionnable)
│   ├── .env.production.template          ← template prod (versionnable)
│   └── .env.production                   ← env prod réel (NON versionné)
└── supabase/
    ├── migrations/                       ← poussé par 'supabase db push'
    └── seed.sql                          ← poussé par 'psql -f' si base vide
```
