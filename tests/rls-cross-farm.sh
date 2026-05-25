#!/bin/bash
# Smart Farm — Test RLS multi-tenant (audit sécurité automatisé)
#
# Vérifie qu'un user authentifié ne voit QUE les données de sa ferme.
# Usage local :  SMOKE_EMAIL=... SMOKE_PASS=... bash tests/rls-cross-farm.sh
# Usage CI    :  variables injectées via secrets (cf .github/workflows/rls-monitor.yml)
#
# Sortie :
#   exit 0 → RLS étanche
#   exit 1 → erreurs (permissions / réseau / colonnes manquantes)
#   exit 2 → 🔴 LEAK DÉTECTÉ (P0 sécurité)

set -euo pipefail

# ─── Config ────────────────────────────────────────────────────────────────
ANON="${SUPABASE_ANON_KEY:-sb_publishable_VdYNHQZS-1ZMMSO4tpiVIg_bETYXHIT}"
BASE="${SUPABASE_URL:-https://tpzhxjzwlxwujboboyit.supabase.co}"
EMAIL="${SMOKE_EMAIL:?SMOKE_EMAIL required}"
PASS="${SMOKE_PASS:?SMOKE_PASS required}"

echo "╔════════════════════════════════════════╗"
echo "║  RLS MULTI-TENANT MONITOR              ║"
echo "║  $(date -u +'%Y-%m-%d %H:%M:%S UTC')        ║"
echo "╚════════════════════════════════════════╝"

# ─── Auth ──────────────────────────────────────────────────────────────────
JWT=$(curl -fsS -X POST "$BASE/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq -r .access_token)

if [ -z "$JWT" ] || [ "$JWT" = "null" ]; then
  echo "❌ LOGIN FAIL — vérifier SMOKE_EMAIL / SMOKE_PASS"
  exit 1
fi
echo "✅ Authentifié (JWT ${#JWT} chars)"
echo ""

# ─── Probe ─────────────────────────────────────────────────────────────────
LEAK=0
ERRORS=0

probe() {
  local table=$1
  local col=$2
  printf "%-18s" "[$table]"

  RESP=$(curl -fsS "$BASE/rest/v1/$table?select=$col&limit=2000" \
    -H "apikey: $ANON" -H "Authorization: Bearer $JWT") || {
    echo " ⚠️  curl failed"
    ERRORS=$((ERRORS+1))
    return
  }

  if echo "$RESP" | jq -e '.code' >/dev/null 2>&1; then
    local MSG
    MSG=$(echo "$RESP" | jq -r '.message')
    echo " ⚠️  $MSG"
    ERRORS=$((ERRORS+1))
    return
  fi

  local ROWS FERMES
  ROWS=$(echo "$RESP" | jq "length")
  FERMES=$(echo "$RESP" | jq "[.[].$col] | unique | length")

  if [ "$FERMES" -gt 1 ]; then
    echo " 🔴 $ROWS rows, $FERMES FERMES (LEAK P0)"
    LEAK=$((LEAK+1))
  else
    echo " ✅ $ROWS rows, $FERMES ferme"
  fi
}

# 7 tables critiques métier (donnees_metier exclu — dict global volontaire)
probe "animaux"    "ferme_id"
probe "saillies"   "ferme_id"
probe "mises_bas"  "ferme_id"
probe "pesees"     "ferme_id"
probe "user_farms" "ferme_id"
probe "portees"    "ferme_id"
probe "batiments"  "ferme_id"

echo ""
# ─── Verdict ───────────────────────────────────────────────────────────────
if [ $LEAK -gt 0 ]; then
  echo "╔════════════════════════════════════════╗"
  echo "║   🔴 RLS LEAK CRITIQUE — $LEAK tables   ║"
  echo "║   ALERTE P0 SÉCURITÉ — bloquer prod    ║"
  echo "╚════════════════════════════════════════╝"
  exit 2
elif [ $ERRORS -gt 0 ]; then
  echo "⚠️  $ERRORS erreurs non-bloquantes (permissions / colonnes)"
  exit 1
else
  echo "✅ RLS ÉTANCHE — 7/7 tables isolées"
  exit 0
fi
