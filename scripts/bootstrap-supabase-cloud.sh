#!/usr/bin/env bash
# bootstrap-supabase-cloud.sh — Smart Farm
# Bootstrap NON-INTERACTIF d'un projet Supabase Cloud vierge.
# - Link projet
# - Push de toutes les migrations supabase/migrations/*.sql
# - (Optionnel) Application du seed de démo
#
# Pour la version INTERACTIVE avec confirmations et garde-fous,
# utiliser à la place : ./scripts/migrate-to-cloud.sh
#
# Usage :
#   PROJECT_REF=abcdefghijkl DB_PASSWORD='xxx' bash scripts/bootstrap-supabase-cloud.sh
#
# Variables optionnelles :
#   SEED_DEMO=1           → applique scripts/seed-demo-data.sql après push
#   DB_REGION=eu-west-3   → région pooler (défaut: eu-west-3 / Paris)
#   POOLER_HOST=...       → override hostname pooler complet
#
set -euo pipefail

# --- Pré-requis ---
if [[ -z "${PROJECT_REF:-}" || -z "${DB_PASSWORD:-}" ]]; then
  echo "Usage: PROJECT_REF=xxxx DB_PASSWORD='yyyy' bash $0"
  echo "Optional: SEED_DEMO=1  DB_REGION=eu-west-3"
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "[err] supabase CLI introuvable. Installer : npm i -g supabase"
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SUPABASE_DIR="${PROJECT_ROOT}/supabase"
SEED_FILE="${SCRIPT_DIR}/seed-demo-data.sql"
DB_REGION="${DB_REGION:-eu-west-3}"
POOLER_HOST="${POOLER_HOST:-aws-0-${DB_REGION}.pooler.supabase.com}"

cd "${PROJECT_ROOT}"

echo "▶ Bootstrap Supabase Cloud"
echo "  project_ref : ${PROJECT_REF}"
echo "  region      : ${DB_REGION}"
echo "  migrations  : $(ls -1 ${SUPABASE_DIR}/migrations/*.sql 2>/dev/null | wc -l) fichiers"
echo

# --- 1. Link ---
echo "▶ Link to Supabase project ${PROJECT_REF}…"
export SUPABASE_DB_PASSWORD="${DB_PASSWORD}"
supabase link --project-ref "${PROJECT_REF}" --password "${DB_PASSWORD}"
echo "✓ Linked"
echo

# --- 2. Push migrations ---
echo "▶ Push migrations to remote (supabase db push)…"
supabase db push --password "${DB_PASSWORD}"
echo "✓ Migrations applied"
echo

# --- 3. Seed (optionnel) ---
if [[ "${SEED_DEMO:-0}" == "1" ]]; then
  if [[ ! -f "${SEED_FILE}" ]]; then
    echo "[warn] SEED_DEMO=1 mais ${SEED_FILE} introuvable. Générer d'abord avec :"
    echo "       bash scripts/export-demo-data.sh"
    exit 3
  fi

  if ! command -v psql >/dev/null 2>&1; then
    echo "[err] psql introuvable. apt install postgresql-client"
    exit 4
  fi

  DB_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@${POOLER_HOST}:6543/postgres"
  echo "▶ Seeding demo data via pooler (${POOLER_HOST})…"

  # Garde-fou anti-écrasement : refuse si fermes contient déjà des données
  FERMES_N="$(PGPASSWORD="${DB_PASSWORD}" psql "${DB_URL}" -tAc 'SELECT count(*) FROM public.fermes;' 2>/dev/null || echo ERR)"
  if [[ "${FERMES_N}" == "ERR" ]]; then
    echo "[err] Impossible d'interroger fermes — credentials/region invalides ?"
    exit 5
  fi
  if [[ "${FERMES_N}" -gt 0 ]]; then
    echo "[err] La base cible contient déjà ${FERMES_N} ferme(s). Seed REFUSÉ (anti-écrasement)."
    exit 6
  fi

  PGPASSWORD="${DB_PASSWORD}" psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "${SEED_FILE}"
  echo "✓ Demo data seeded"
else
  echo "▶ Seed skipped (set SEED_DEMO=1 to enable)"
fi
echo

# --- 4. Récap ---
echo "═══════════════════════════════════════════════════"
echo "✓ Bootstrap complete"
echo
echo "  API URL    : https://${PROJECT_REF}.supabase.co"
echo "  Studio     : https://supabase.com/dashboard/project/${PROJECT_REF}"
echo "  DB pooler  : postgresql://postgres.${PROJECT_REF}:***@${POOLER_HOST}:6543/postgres"
echo
echo "▶ Étapes suivantes :"
echo "  1. Récupérer anon + service_role keys :"
echo "     https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api"
echo "  2. Remplir .env.production (cf MIGRATE-TO-CLOUD.md)"
echo "  3. Vérifier : ./scripts/verify-migration.sh"
echo "═══════════════════════════════════════════════════"
