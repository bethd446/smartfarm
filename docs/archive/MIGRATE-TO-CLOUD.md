# MIGRATE TO CLOUD — Smart Farm

Migration de la base PostgreSQL **Docker local → Supabase Cloud**.

> 42 migrations · 43 tables publiques · ~410 lignes de données de démo (17 animaux, 144 pesées, 36 matières premières CI, etc.)

---

## Prérequis

1. **Supabase CLI ≥ 2.x** installé :
   ```bash
   # Sur le VPS (Node déjà installé)
   npm i -g supabase
   # ou
   brew install supabase/tap/supabase
   supabase --version  # doit afficher ≥ 2.x
   ```

2. **psql** (client PostgreSQL) — nécessaire pour le seed optionnel :
   ```bash
   apt install postgresql-client   # Debian/Ubuntu
   ```

3. **Container local démarré** (pour exporter les données de démo) :
   ```bash
   docker ps | grep supabase_db_smartfarm   # doit être Up + healthy
   ```

4. **Login Supabase** (une fois par machine) :
   ```bash
   supabase login   # ouvre le navigateur, génère un token
   ```

---

## Étape 1 — Créer le projet Supabase Cloud

Sur [https://supabase.com/dashboard](https://supabase.com/dashboard) → **New project** :

| Champ | Valeur |
|---|---|
| **Region** | `Frankfurt (eu-central-1)` ou `Paris (eu-west-3)` — au plus proche du VPS Hostinger |
| **Database password** | générer aléatoire ≥ 20 chars, **noter dans 1Password** |
| **Pricing plan** | Free (jusqu'à 500 MB), Pro si > |

⚠️ **Cocher dès la création** :
- `Auto-generate RLS` : **OFF** (les migrations gèrent toutes les policies via `current_farm_id()`)
- `Data API` : **ON** (PostgREST exposé)
- `Expose new tables` : **OFF** par défaut (sécurité — les migrations exposent ce qu'il faut)

---

## Étape 2 — Récupérer les credentials

Une fois le projet créé :

- **PROJECT_REF** = partie unique de l'URL dashboard
  - Exemple : `https://supabase.com/dashboard/project/abcdefghijklmnop` → `PROJECT_REF=abcdefghijklmnop`
- **DB_PASSWORD** = celui choisi à l'étape 1
- **API URL** : `https://<PROJECT_REF>.supabase.co`
- **anon key** + **service_role key** : Dashboard → `Settings → API`

---

## Étape 3 — Bootstrap (push schéma)

### Option A — Non-interactif (CI / scripté)

```bash
cd /root/projects/smartfarm

PROJECT_REF=abcdefghijklmnop \
DB_PASSWORD='votre-mdp-fort' \
bash scripts/bootstrap-supabase-cloud.sh
```

Ce script :
1. `supabase link --project-ref ...`
2. `supabase db push` — applique les **42 migrations** dans l'ordre chronologique
3. Affiche les URLs et les étapes restantes

### Option B — Interactif (production, avec confirmations)

```bash
bash scripts/migrate-to-cloud.sh
```

Mode pas-à-pas avec confirmations + garde-fous anti-écrasement + génération de `.env.production.template`.

---

## Étape 4 — (Optionnel) Importer les données de démo

Pour avoir la ferme de Yamoussoukro pré-remplie (17 animaux, 144 pesées, 4 saillies, 2 mises bas, 36 matières premières CI, 15 protocoles vaccinaux) :

### A. Générer le seed depuis le Docker local
```bash
bash scripts/export-demo-data.sh
# → scripts/seed-demo-data.sql (~264 KB, 413 INSERTs)
```

### B. Appliquer sur Cloud
**Via le script bootstrap** (recommandé — vérifie que la base est vide) :
```bash
PROJECT_REF=xxx DB_PASSWORD='yyy' SEED_DEMO=1 bash scripts/bootstrap-supabase-cloud.sh
```

**Via SQL Editor du Dashboard** : copier-coller `scripts/seed-demo-data.sql` dans Studio → SQL Editor → Run.

**Via psql** :
```bash
psql "postgresql://postgres.$PROJECT_REF:$DB_PASSWORD@aws-0-eu-west-3.pooler.supabase.com:6543/postgres" \
  -f scripts/seed-demo-data.sql
```

⚠️ Le seed **désactive temporairement les triggers user** (`session_replication_role = replica`) pour éviter que les triggers auto-événements ne s'enclenchent à l'INSERT (Fer J1, Castration J5, etc.). Les triggers sont réactivés automatiquement à la fin du fichier.

---

## Étape 5 — Récupérer les clés API

Dashboard → `Settings → API` → noter :

| Variable | Where | Sensitivity |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "anon / public" | public (jwt) |
| `SUPABASE_SERVICE_ROLE_KEY` | "service_role / secret" | **SECRET — ne JAMAIS commit** |

---

## Étape 6 — Configurer Hostinger / Next.js

Voir `DEPLOY.md` pour le détail. Variables d'environnement à remplir dans `.env.production` :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Mode demo (single-tenant Yamoussoukro) — passer à false en multi-tenant réel
SMARTFARM_DEMO_MODE=true
NEXT_PUBLIC_DEMO_USER_ID=aaaaaaaa-0000-0000-0000-000000000001
NEXT_PUBLIC_DEMO_FERME_ID=00000000-0000-0000-0000-000000000001

NEXT_PUBLIC_APP_NAME='Smart Farm'
```

Puis :
```bash
bash scripts/switch-env.sh production
bash scripts/verify-migration.sh   # smoke tests anon + service_role
bash app/deploy.sh                 # build + sync + restart standalone
```

---

## Vérifications post-migration

| Check | Commande | Attendu |
|---|---|---|
| Nb tables publiques | `psql $DB_URL -c "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'"` | **43** |
| Nb vues | `psql $DB_URL -c "select count(*) from information_schema.views where table_schema='public'"` | **17+** (v_alertes_actives, v_kpi_*, etc.) |
| RLS activé | `psql $DB_URL -c "select count(*) from pg_tables where schemaname='public' and rowsecurity=false"` | **0** (toutes RLS ON) |
| 26+ règles alertes | `psql $DB_URL -c "select distinct code from v_alertes_actives order by code"` | R01 → R28 |
| Auth login | curl `https://$REF.supabase.co/auth/v1/health` | `{"version":...}` |

---

## Troubleshooting

### `supabase db push` : "migrations diverged"
Le remote contient déjà des migrations. Solutions :
- **Base vierge** : utiliser `supabase db reset --linked` puis re-push (DANGER : drop tout).
- **Sinon** : `supabase migration repair --status reverted <version>` pour resynchroniser.

### Timestamp collisions
3 paires de migrations partagent un préfixe (`20260522090000`, `20260524000000`, `20260526000000`) — voir `.brain/audits/sprint1/R8-migration-supabase.md`. **Pas bloquant** : l'ordre est lexicographique sur le nom complet, donc déterministe.

### Erreur "permission denied for schema public"
Le user `postgres` du Cloud a moins de droits que celui du Docker local. Vérifier que les `GRANT ... TO anon, authenticated` sont présents dans les migrations de vues (déjà fait dans toutes les migrations existantes — voir `security_invoker=true`).

### Seed échoue sur `animaux` (FK circulaire)
Connu : `animaux` a une FK self-référentielle (parents/descendants). Le script `export-demo-data.sh` désactive les triggers via `session_replication_role='replica'`. Si malgré tout ça échoue : vérifier qu'aucun trigger système n'est en mode `ENABLE ALWAYS`.

### "JWT expired" côté Next.js
Régénérer les clés Dashboard → API → Reset, mettre à jour `.env.production`, redéployer.

### Performance lente première semaine
Supabase Cloud Free pause les bases inactives après 7 jours. Pour éviter : passer en Pro, ou pinguer `/auth/v1/health` toutes les 6h via cron.

---

## Rollback

Si la migration cloud casse :
1. **Repasser en local** : `bash scripts/switch-env.sh local` + restart standalone
2. **Conserver le projet Cloud** comme env de staging tant que la prod tourne en local
3. **Drop & recreate** si nécessaire : `Settings → General → Pause/Delete project`

---

## Fichiers liés

- `scripts/bootstrap-supabase-cloud.sh` — bootstrap non-interactif (CI-friendly)
- `scripts/migrate-to-cloud.sh` — bootstrap interactif (prod avec garde-fous)
- `scripts/export-demo-data.sh` — génère `seed-demo-data.sql`
- `scripts/seed-demo-data.sql` — données de démo Yamoussoukro (264 KB, 413 INSERTs)
- `scripts/switch-env.sh` — bascule local ↔ production
- `scripts/verify-migration.sh` — smoke tests post-migration
- `supabase/config.toml` — config CLI (project_id, ports, auth)
- `supabase/migrations/*.sql` — 42 migrations chronologiques
- `.brain/audits/sprint1/R8-migration-supabase.md` — audit détaillé
