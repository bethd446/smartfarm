# Brief PROD-C — Backup quotidien automatique BDD + monitoring

## Périmètre
✅ Touche : scripts bash + crontab + 1 fichier JS de notification
❌ Pas : app code, DB schema. Pas `npm run build`.

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` ET `/root/CLAUDE.md`.

État :
- DB Supabase Docker local : `127.0.0.1:54322` user `postgres` pass `postgres` db `postgres`
- Pas de backup actuel → critique avant déploiement Supabase Cloud + domaine
- Crontab vide pour root
- VPS Hostinger Ubuntu 24.04, root, disque 387 Go

## Objectif
**Backup quotidien automatique avec rotation 30j** + notification en cas d'échec.

Quand Christophe migrera vers Supabase Cloud, il aura **30 jours d'archives** = filet de sécurité au moment du switch.

## Mission

### 1. Créer le répertoire backups

```bash
mkdir -p /root/backups/smartfarm
chmod 700 /root/backups/smartfarm
```

### 2. Script de backup

Fichier : `/root/projects/smartfarm/scripts/backup-db.sh`

```bash
#!/usr/bin/env bash
# Smart Farm — Backup quotidien BDD
# Usage : cron quotidien à 03:00

set -euo pipefail

BACKUP_DIR="/root/backups/smartfarm"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/sf-${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "$BACKUP_DIR"

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }

log "=== Début backup ==="

# Vérifier que la DB répond
if ! PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
  log "ERREUR : DB ne répond pas sur 127.0.0.1:54322"
  exit 1
fi

# Dump compressé
if PGPASSWORD=postgres pg_dump \
    -h 127.0.0.1 -p 54322 -U postgres \
    --no-owner --no-acl --clean --if-exists \
    -d postgres 2>>"$LOG_FILE" | gzip > "$BACKUP_FILE"; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  log "OK : backup créé $BACKUP_FILE ($SIZE)"
else
  log "ERREUR : pg_dump a échoué"
  rm -f "$BACKUP_FILE"
  exit 2
fi

# Vérifier que le backup est valide (gzip + contient des INSERT)
if ! gunzip -t "$BACKUP_FILE" 2>>"$LOG_FILE"; then
  log "ERREUR : fichier gzip corrompu"
  exit 3
fi

LINES=$(gunzip -c "$BACKUP_FILE" | wc -l)
if [ "$LINES" -lt 100 ]; then
  log "ERREUR : backup suspect (seulement $LINES lignes)"
  exit 4
fi

log "VALIDÉ : $LINES lignes dans le dump"

# Rotation : supprime les backups > 30 jours
find "$BACKUP_DIR" -name "sf-*.sql.gz" -mtime +${RETENTION_DAYS} -delete
COUNT=$(find "$BACKUP_DIR" -name "sf-*.sql.gz" | wc -l)
log "Rotation : $COUNT backups conservés"

# Espace disque alerte si > 80%
USAGE=$(df --output=pcent "$BACKUP_DIR" | tail -1 | tr -d ' %')
if [ "$USAGE" -gt 80 ]; then
  log "ATTENTION : espace disque à $USAGE%"
fi

log "=== Fin backup ==="
exit 0
```

```bash
chmod +x /root/projects/smartfarm/scripts/backup-db.sh
```

### 3. Script de notification Telegram en cas d'échec

Fichier : `/root/projects/smartfarm/scripts/backup-monitor.sh`

```bash
#!/usr/bin/env bash
# Smart Farm — Monitor backup
# Lancé après backup-db.sh, vérifie qu'un backup récent existe

set -uo pipefail

BACKUP_DIR="/root/backups/smartfarm"
LOG_FILE="${BACKUP_DIR}/backup.log"
ALERT_FILE="/tmp/sf-backup-alert.flag"

# Cherche un backup créé dans les 25 dernières heures
RECENT=$(find "$BACKUP_DIR" -name "sf-*.sql.gz" -mmin -1500 2>/dev/null | head -1)

if [ -z "$RECENT" ]; then
  # Pas de backup récent = problème
  MSG="🚨 Smart Farm BACKUP ÉCHEC : aucun dump dans les 25h. Vérifier $LOG_FILE"

  # Anti-spam : alerte 1x/jour seulement
  if [ -f "$ALERT_FILE" ] && [ "$(find "$ALERT_FILE" -mtime -1)" ]; then
    exit 0  # Alerte déjà envoyée
  fi
  touch "$ALERT_FILE"

  # Notification via hermes (déjà installé sur le VPS)
  if command -v hermes > /dev/null 2>&1; then
    echo "$MSG" | hermes send 2>/dev/null || true
  fi

  # Fallback : append au journalctl pour visibilité
  logger -t smartfarm-backup "$MSG"
  exit 1
fi

# Reset flag alerte si tout va bien
rm -f "$ALERT_FILE"
exit 0
```

```bash
chmod +x /root/projects/smartfarm/scripts/backup-monitor.sh
```

### 4. Crontab

```bash
# Ajouter au crontab root
(crontab -l 2>/dev/null; echo "") > /tmp/cron.tmp
echo "# Smart Farm — Backup quotidien BDD 03:00" >> /tmp/cron.tmp
echo "0 3 * * * /root/projects/smartfarm/scripts/backup-db.sh" >> /tmp/cron.tmp
echo "# Smart Farm — Monitor backup 04:00 (vérification après backup)" >> /tmp/cron.tmp
echo "0 4 * * * /root/projects/smartfarm/scripts/backup-monitor.sh" >> /tmp/cron.tmp
crontab /tmp/cron.tmp
rm /tmp/cron.tmp
```

### 5. Script de restauration (pour le jour J Supabase Cloud)

Fichier : `/root/projects/smartfarm/scripts/restore-db.sh`

```bash
#!/usr/bin/env bash
# Smart Farm — Restaure un backup vers Supabase Cloud OU local
# Usage : ./restore-db.sh <backup.sql.gz> <target_url>
# Exemple : ./restore-db.sh sf-20260522-030000.sql.gz "postgresql://postgres:PASS@db.PROJET.supabase.co:5432/postgres"

set -euo pipefail

BACKUP_FILE="${1:-}"
TARGET_URL="${2:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage : $0 <backup.sql.gz> [target_url]"
  echo "Backups dispos :"
  ls -lh /root/backups/smartfarm/sf-*.sql.gz 2>/dev/null | tail -5
  exit 1
fi

echo "⚠️  ATTENTION : ceci va REMPLACER toutes les données de la cible"
echo "Cible : $TARGET_URL"
echo "Backup : $BACKUP_FILE"
read -p "Continuer ? (oui/NON) " confirm
[ "$confirm" = "oui" ] || { echo "Annulé"; exit 0; }

gunzip -c "$BACKUP_FILE" | psql "$TARGET_URL"
echo "✓ Restauration terminée"
```

```bash
chmod +x /root/projects/smartfarm/scripts/restore-db.sh
```

### 6. Premier backup manuel pour valider

```bash
/root/projects/smartfarm/scripts/backup-db.sh
ls -lh /root/backups/smartfarm/
cat /root/backups/smartfarm/backup.log | tail -10
```

### 7. README de la procédure

Fichier : `/root/projects/smartfarm/scripts/README.md`

```md
# Smart Farm — Scripts de production

## Backup
- `backup-db.sh` : dump quotidien compressé, rotation 30j, lancé via cron 03:00
- `backup-monitor.sh` : alerte Telegram si backup échoue, cron 04:00
- `restore-db.sh <fichier> [target]` : restauration interactive

## Logs
- `/root/backups/smartfarm/backup.log`

## Vérifier les backups
```
ls -lh /root/backups/smartfarm/
tail -20 /root/backups/smartfarm/backup.log
```

## Migration Supabase Cloud (futur)
1. Création projet sur supabase.com
2. Récupère URL connexion DB
3. `./restore-db.sh /root/backups/smartfarm/sf-YYYYMMDD-HHMMSS.sql.gz "postgresql://..."`
4. Update `.env.local` avec nouvelle URL
5. Test en parallèle (local vs cloud) avant cutover

## Tests de restauration (mensuel recommandé)
```
# Vers une DB de test
docker exec -i supabase_db_smartfarm psql -U postgres -c "CREATE DATABASE sf_test;"
./restore-db.sh /root/backups/smartfarm/sf-LATEST.sql.gz "postgresql://postgres:postgres@127.0.0.1:54322/sf_test"
# Vérifier que les tables sont OK
docker exec -i supabase_db_smartfarm psql -U postgres -d sf_test -c "\dt"
# Cleanup
docker exec -i supabase_db_smartfarm psql -U postgres -c "DROP DATABASE sf_test;"
```
```

## Vérif

```bash
# Test du script de backup
/root/projects/smartfarm/scripts/backup-db.sh
echo "Exit code : $?"
ls -lh /root/backups/smartfarm/

# Crontab installé
crontab -l | grep -i smartfarm

# Test du monitor
/root/projects/smartfarm/scripts/backup-monitor.sh
echo "Exit code monitor : $?"
```

## Livrable
1. 3 scripts exécutables dans `/root/projects/smartfarm/scripts/`
2. Crontab quotidien à 03:00 (backup) + 04:00 (monitor)
3. Premier backup manuel validé (fichier .sql.gz présent)
4. README documenté
5. Rapport `/root/projects/smartfarm/agents/V2-PROD/RAPPORT_PROD_C.md` ≤ 60 lignes :
   - Taille du premier backup
   - Nb de lignes du dump
   - Crontab effectif (output `crontab -l`)
   - Procédure restore documentée

## Anti-pièges
- `pg_dump` doit fonctionner directement (Supabase Docker local, port 54322)
- Cron tourne en root → utilise chemins absolus partout
- Si `hermes` CLI pas installé, le monitor utilise `logger` en fallback
- Pas de touche aux migrations existantes ni au code app
- Le script `restore-db.sh` est destiné au futur — ne le teste pas en production
