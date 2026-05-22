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
