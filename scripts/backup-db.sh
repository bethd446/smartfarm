#!/usr/bin/env bash
# Smart Farm — Backup quotidien BDD
# Usage : cron quotidien à 03:00
#
# Note : utilise pg_dump du container Docker Supabase (PG 17.6)
# pour éviter le mismatch avec pg_dump 16 du système hôte Ubuntu 24.04.

set -euo pipefail

BACKUP_DIR="/root/backups/smartfarm"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/sf-${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"
DB_CONTAINER="supabase_db_smartfarm"

mkdir -p "$BACKUP_DIR"

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }

log "=== Début backup ==="

# Vérifier que le container DB est up
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  log "ERREUR : container $DB_CONTAINER non actif"
  exit 1
fi

# Vérifier que la DB répond
if ! docker exec -e PGPASSWORD=postgres "$DB_CONTAINER" \
     psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
  log "ERREUR : DB ne répond pas dans $DB_CONTAINER"
  exit 1
fi

# Dump compressé via docker exec (pg_dump 17.6 ↔ PG 17.6)
if docker exec -e PGPASSWORD=postgres "$DB_CONTAINER" \
    pg_dump \
      -h 127.0.0.1 -p 5432 -U postgres \
      --no-owner --no-acl --clean --if-exists \
      -d postgres 2>>"$LOG_FILE" | gzip > "$BACKUP_FILE"; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  log "OK : backup créé $BACKUP_FILE ($SIZE)"
else
  log "ERREUR : pg_dump a échoué"
  rm -f "$BACKUP_FILE"
  exit 2
fi

# Vérifier que le backup est valide (gzip)
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
