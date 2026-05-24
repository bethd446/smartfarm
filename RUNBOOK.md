# Smart Farm — Runbook opérationnel

> Procédures de maintenance, incident response et opérations courantes.
> Cible : Christophe (admin) + futur ingé ops.
> **Lecture obligatoire** avant toute action sur la prod.

---

## 🚨 Crédentials sensibles (référence — secrets stockés ailleurs)

| Élément | Localisation |
|---|---|
| Service role Supabase | `/root/projects/smartfarm/app/.env.local` (jamais commit) |
| Access token Supabase Management | env var `SUPABASE_ACCESS_TOKEN` (jamais commit) |
| Mot de passe ferme réelle | Bitwarden / 1Password "Smart Farm prod" |
| Mot de passe compte démo | `demo@smartfarm.group` / `Demo6734N0xUHH1I` (public équipe) |
| Hostinger Cloud | hPanel hostinger.com |

---

## 🛑 Procédures d'urgence

### Site inaccessible (HTTP 5xx / boot loop)

1. Tester `curl -I https://smartfarm.group` → code retour
2. Hostinger hPanel → Node.js app → **Restart**
3. Logs : `/home/u123/logs/...` via SSH ou hPanel → Logs
4. Si build cassé : `git log --oneline -5` puis `git revert <SHA>` du dernier commit fautif → push
5. **Ne JAMAIS** modifier `next.config.ts` ou `package.json` sans triple check (cause répétée de 503)

### BDD Supabase inaccessible

1. Status : https://status.supabase.com
2. Tester direct : `curl -I "$SUPA_URL/rest/v1/"`
3. Si RLS error : vérifier policies via Management API
4. Backup point-in-time : Supabase Dashboard → Database → Backups (rétention 7j sur plan Free, 30j Pro)

### Données corrompues / suppression accidentelle

1. **STOP toute action** — ne pas pousser de fix qui aggrave
2. Supabase Dashboard → Database → Backups → **Point-in-time restore** (max 30j en arrière)
3. Si rollback impossible : export `pg_dump` quotidien → restore manuel sur table affectée
4. Audit `audit_log` table pour identifier l'action coupable

---

## 🔐 Reset mot de passe utilisateur

```bash
# Variables (à remplacer)
EMAIL="utilisateur@example.com"
PROJECT_REF="tpzhxjzwlxwujboboyit"
SUPA_URL="https://${PROJECT_REF}.supabase.co"
SUPA_KEY="$(grep SUPABASE_SERVICE_ROLE_KEY /root/projects/smartfarm/app/.env.local | cut -d= -f2-)"

# 1. Récupérer l'ID utilisateur (le query param ?email= ne filtre pas, lister tous)
USER_ID=$(curl -s "${SUPA_URL}/auth/v1/admin/users?per_page=500" \
  -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" \
  | python3 -c "import sys,json; print(next(u['id'] for u in json.load(sys.stdin)['users'] if u['email']=='$EMAIL'))")

# 2. Générer un nouveau mot de passe robuste
NEW_PASS="Reset!$(openssl rand -hex 6)"
echo "Nouveau pass: $NEW_PASS"

# 3. Appliquer
curl -X PUT "${SUPA_URL}/auth/v1/admin/users/${USER_ID}" \
  -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$NEW_PASS\",\"email_confirm\":true}"

# 4. Communiquer hors-bande (Signal, pas email)
```

**⚠️ Piège** : `?email=X` est ignoré par GoTrue. **Toujours lister tous les users puis filtrer côté script** (vérifié 2026-05-24, un mauvais reset a écrasé un autre user en suivant la doc Supabase).

---

## 🗃️ Migrations BDD

### Créer une migration

```bash
cd /root/projects/smartfarm/supabase/migrations
TS=$(date -u +%Y%m%d%H%M%S)
nano "${TS}_description_courte.sql"
```

Conventions :
- Toujours `IF EXISTS` / `IF NOT EXISTS` pour idempotence
- Test post-migration en SQL dans le même fichier (RAISE EXCEPTION si KO)
- `security_invoker=true` sur les vues
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` pour toute nouvelle table

### Exécuter sur prod

```bash
PROJECT_REF="tpzhxjzwlxwujboboyit"
SQL=$(cat /root/projects/smartfarm/supabase/migrations/<file>.sql | python3 -c "import sys,json;print(json.dumps(sys.stdin.read()))")

curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":$SQL}"
```

**Alternative** : Supabase Dashboard → SQL Editor → coller le contenu → Run.

---

## 🧪 Tests smoke prod

### Manuel local

```bash
cd /root/projects/smartfarm/app
SMOKE_URL=https://smartfarm.group \
SMOKE_EMAIL=demo@smartfarm.group \
SMOKE_PASS=Demo6734N0xUHH1I \
npm run e2e:smoke:desktop
```

11 tests doivent passer (< 30s). Si un test KO :
- Récupérer le screenshot `app/test-results/<test>/test-failed-1.png`
- Inspecter `app/playwright-report/index.html` (`npx playwright show-report`)

### Automatique (GitHub Actions)

- Workflow `.github/workflows/smoke.yml` lancé après chaque `push origin main`
- Secrets requis : `SMOKE_EMAIL`, `SMOKE_PASS` (Settings → Secrets and variables → Actions)

---

## 📦 Déploiement

### Cycle normal

1. Brancher localement, commit propre, `npm run build` doit passer
2. `git push origin main`
3. **Attendre 3 min** : Hostinger lance le build standalone (~50s) + propagation (~2 min)
4. Vérifier `curl -I https://smartfarm.group/dashboard` → 200
5. CI lance le smoke automatiquement (180s + tests)

### Rollback rapide

```bash
cd /root/projects/smartfarm
git log --oneline -10              # identifier le dernier commit OK
git revert <SHA-fautif> --no-edit
git push origin main
# Hostinger rebuild dans 3 min
```

---

## 💾 Backup & restore

### Backup quotidien automatique

- Supabase Cloud Frankfurt → backups journaliers (rétention 7j en Free, **30j en Pro**)
- Vérification mensuelle : Dashboard → Database → Backups → liste

### Backup manuel (dump complet)

```bash
PROJECT_REF="tpzhxjzwlxwujboboyit"
TS=$(date -u +%Y%m%d_%H%M%S)
mkdir -p /root/backups/smartfarm
# Via supabase CLI si configuré, sinon Management API SQL → pg_dump non exposé en Free.
# Workaround : dump par table via REST + export CSV
# Voir scripts/backup-csv.sh (à créer Phase 5)
```

### Restore point-in-time

1. Supabase Dashboard → Database → Backups → **Restore**
2. Choisir le timestamp cible
3. Génère un nouveau projet → migrer connection string si validé

---

## 🎯 Compte démo : reset complet

Si la démo est polluée par trop de tests :

```bash
PROJECT_REF="tpzhxjzwlxwujboboyit"
FERME_DEMO="3ed3960d-39e4-4b1b-8a12-bb28aff92fdf"

# Soft delete tout sauf le profil ferme + 1 batiment + 1 truie
curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"DELETE FROM saillies WHERE ferme_id='\'$FERME_DEMO\''; DELETE FROM mises_bas WHERE ferme_id='\'$FERME_DEMO\''; -- etc."}'

# Re-seed via les scripts /tmp/seed-*.py (cf historique session)
```

---

## 🛑 Interdits absolus

- ⛔ Ne pas modifier `next.config.ts` ou `package.json` sans triple-check (cause 503)
- ⛔ Pas de `rm -rf public/_next` (artifact build, géré par deploy script)
- ⛔ Ne pas exposer `SUPABASE_SERVICE_ROLE_KEY` côté client (`NEXT_PUBLIC_*` interdit pour secrets)
- ⛔ Pas de `git push --force` sur main
- ⛔ Pas de `DROP TABLE` ou `TRUNCATE` sans backup explicite < 5 min
- ⛔ Ne pas ignorer un test smoke KO en prod — toujours corriger ou revert

---

## 📞 Escalade

| Niveau | Cible | Délai |
|---|---|---|
| L1 | Christophe + ce runbook | immédiat |
| L2 | Hostinger support hPanel (cas hébergement) | 24h |
| L3 | Supabase support (cas BDD prod) | plan Pro = 24h, Free = best effort |

---

*Dernière mise à jour : 2026-05-24 — Phase 1 stabilisation.*
