#!/usr/bin/env bash
# Smart Farm — Restaure un backup vers Supabase Cloud OU local
# Usage : ./restore-db.sh <backup.sql.gz> <target_url>
# Exemple : ./restore-db.sh sf-20260522-030000.sql.gz "postgresql://postgres:***@db.PROJET.supabase.co:5432/postgres"

set -euo pipefail

BACKUP_FILE="${1:-}"
TARGET_URL="${2:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage : $0 <backup.sql.gz> [target_url]"
  echo ""
  echo "Backups dispos :"
  ls -lh /root/backups/smartfarm/sf-*.sql.gz 2>/dev/null | tail -5
  exit 1
fi

echo "⚠️  ATTENTION : ceci va REMPLACER toutes les données de la cible"
echo "Cible  : $TARGET_URL"
echo "Backup : $BACKUP_FILE"
read -p "Continuer ? (oui/NON) " confirm
[ "$confirm" = "oui" ] || { echo "Annulé"; exit 0; }

gunzip -c "$BACKUP_FILE" | psql "$TARGET_URL"
echo "✓ Restauration terminée"
