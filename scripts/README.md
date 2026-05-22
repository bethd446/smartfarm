# Smart Farm — Scripts de production

## Backup
- `backup-db.sh` : dump quotidien compressé via `docker exec` (pg_dump 17.6 du container `supabase_db_smartfarm`), rotation 30j, lancé via cron 03:00
- `backup-monitor.sh` : alerte Hermes/Telegram si aucun backup dans les 25 dernières heures, cron 04:00
- `restore-db.sh <fichier> [target_url]` : restauration interactive (confirmation `oui` requise)

## Logs
- `/root/backups/smartfarm/backup.log`
- Stockage backups : `/root/backups/smartfarm/sf-YYYYMMDD-HHMMSS.sql.gz` (chmod 700)

## Vérifier les backups
```bash
ls -lh /root/backups/smartfarm/
tail -20 /root/backups/smartfarm/backup.log
```

## Crontab actif (root)
```
0 3 * * * /root/projects/smartfarm/scripts/backup-db.sh
0 4 * * * /root/projects/smartfarm/scripts/backup-monitor.sh
```

## Détails techniques
- Serveur PG : PostgreSQL 17.6 dans container `supabase_db_smartfarm`
- Pourquoi `docker exec` : pg_dump du système hôte (Ubuntu 24.04) est en v16 → mismatch refusé par le serveur. On utilise donc directement le binaire `pg_dump` 17.6 du container.
- Options `pg_dump` : `--no-owner --no-acl --clean --if-exists` → backup portable, ré-exécutable sur n'importe quelle instance Postgres 17.
- Compression : gzip (taux ~10:1 sur dumps Postgres).
- Validation post-dump : `gunzip -t` + minimum 100 lignes décompressées.

## Migration Supabase Cloud (futur)
1. Création projet sur supabase.com
2. Récupérer URL connexion DB (Settings → Database → Connection string, mode `URI`)
3. Lancer la restauration :
   ```bash
   /root/projects/smartfarm/scripts/restore-db.sh \
     /root/backups/smartfarm/sf-YYYYMMDD-HHMMSS.sql.gz \
     "postgresql://postgres:MOT_DE_PASSE@db.PROJET.supabase.co:5432/postgres"
   ```
4. Update `.env.local` SmartFarm avec nouvelle `DATABASE_URL` / clés Supabase
5. Test en parallèle (local vs cloud) avant cutover
6. Une fois validé : couper le container `supabase_db_smartfarm` local

## Tests de restauration (mensuel recommandé)
```bash
# Créer une DB de test dans le container
docker exec supabase_db_smartfarm psql -U postgres -c "CREATE DATABASE sf_test;"

# Restaurer le dernier backup dedans
LATEST=$(ls -t /root/backups/smartfarm/sf-*.sql.gz | head -1)
/root/projects/smartfarm/scripts/restore-db.sh "$LATEST" \
  "postgresql://postgres:postgres@127.0.0.1:54322/sf_test"

# Vérifier les tables (38 attendues post-Harmonie)
docker exec supabase_db_smartfarm psql -U postgres -d sf_test -c "\dt" | tail -5
docker exec supabase_db_smartfarm psql -U postgres -d sf_test -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"

# Cleanup
docker exec supabase_db_smartfarm psql -U postgres -c "DROP DATABASE sf_test;"
```

## Restauration d'urgence (rollback local)
Si la DB locale est corrompue / migration foirée :
```bash
LATEST=$(ls -t /root/backups/smartfarm/sf-*.sql.gz | head -1)
/root/projects/smartfarm/scripts/restore-db.sh "$LATEST"
# (target_url par défaut = 127.0.0.1:54322 local)
```

## Notification d'échec
Le script `backup-monitor.sh` envoie une alerte si aucun dump `sf-*.sql.gz` n'a moins de 25h.
- Canal principal : binaire `hermes send` (CLI Hermes Agent installé sur le VPS)
- Fallback : `logger -t smartfarm-backup` → visible via `journalctl -t smartfarm-backup`
- Anti-spam : flag `/tmp/sf-backup-alert.flag` → max 1 alerte par 24h
