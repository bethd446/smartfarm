# RAPPORT PROD-C — Backup quotidien BDD + monitoring

**Date** : 2026-05-21
**Statut** : ✅ TERMINÉ
**Périmètre touché** : scripts bash + crontab root + README. Aucune touche au code app.

## Livrables

### 1. Répertoire backups
`/root/backups/smartfarm/` créé, `chmod 700`.

### 2. Scripts (`/root/projects/smartfarm/scripts/`)
- `backup-db.sh` (2.2K, exécutable) — pg_dump via `docker exec supabase_db_smartfarm` + gzip + validation + rotation 30j
- `backup-monitor.sh` (1.1K, exécutable) — alerte via `hermes send` si pas de dump <25h, fallback `logger`, anti-spam 24h
- `restore-db.sh` (908B, exécutable) — restauration interactive (confirmation `oui`), target par défaut local, accepte URL Supabase Cloud
- `README.md` (3.3K) — procédure backup/restore/migration cloud documentée

### 3. Crontab root installé
```
0 3 * * * /root/projects/smartfarm/scripts/backup-db.sh
0 4 * * * /root/projects/smartfarm/scripts/backup-monitor.sh
```

### 4. Premier backup manuel validé
- Fichier : `/root/backups/smartfarm/sf-20260521-232606.sql.gz`
- Taille : **144 K** (compressé gzip)
- Lignes décompressées : **13 258**
- Tables (`CREATE TABLE`) : **92** (38 tables métier public + tables Supabase auth/storage/realtime)
- `gunzip -t` : OK
- Exit code backup-db.sh : **0**
- Exit code backup-monitor.sh : **0**

## Incident & correction
Premier essai du script a échoué avec exit 2.
Cause : `pg_dump` du système hôte = v16.13 (Ubuntu 24.04 APT), serveur Supabase = PG 17.6 → mismatch refusé par le serveur.

Correction : script modifié pour utiliser `docker exec supabase_db_smartfarm pg_dump` (binaire v17.6 natif du container). Connexion en `127.0.0.1:5432` *à l'intérieur* du container au lieu de `127.0.0.1:54322` côté hôte. Le stream stdout est piped vers `gzip` côté hôte → backup atterrit bien dans `/root/backups/smartfarm/`. Aucune dépendance au pg_dump système → aucun risque de cassure si Ubuntu met à jour `postgresql-client`.

## Procédure restore (documentée dans README.md)
- **Rollback local d'urgence** : `restore-db.sh <fichier.sql.gz>` (target par défaut = local 54322)
- **Migration Supabase Cloud** : `restore-db.sh <fichier> "postgresql://postgres:PASS@db.PROJET.supabase.co:5432/postgres"`
- **Test mensuel** : restore vers DB `sf_test` éphémère dans le container, vérif `\dt`, cleanup
- Confirmation `oui` exigée → pas de drop accidentel
- Dump fait avec `--clean --if-exists` → ré-exécutable sur DB peuplée

## Notification d'échec
- Canal principal : binaire `hermes send` (dispo : `/usr/local/bin/hermes`)
- Fallback : `logger -t smartfarm-backup` → `journalctl -t smartfarm-backup`
- Anti-spam : flag `/tmp/sf-backup-alert.flag`, 1 alerte max / 24h, reset auto au backup suivant réussi

## État pour Christophe le jour J Supabase Cloud
Après 30 jours de cron, Christophe disposera d'archives quotidiennes glissantes.
Au switch : `./restore-db.sh sf-YYYYMMDD-HHMMSS.sql.gz "<URL cloud>"` puis update `.env.local`.
Filet de sécurité opérationnel.
