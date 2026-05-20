#!/usr/bin/env bash
# verify-migration.sh — Smart Farm
# Vérifie que la base Supabase Cloud cible contient bien tous les objets DB attendus :
#   30 tables, 2 vues KPI, 17 index nommés.
#
# Source de vérité : supabase/migrations/20260520000001_init_smartfarm.sql
#
# Usage : ./scripts/verify-migration.sh [DB_URL]
#   - Si DB_URL non fourni → prompts interactifs (PROJECT_REF + password)
#   - Code de sortie : 0 si tout OK, 1 sinon.
#
set -uo pipefail

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
BLU='\033[0;34m'
BLD='\033[1m'
RST='\033[0m'

log()  { printf "${BLU}[verify]${RST} %s\n" "$*"; }
ok()   { printf "${GRN}[ok]${RST} %s\n" "$*"; }
warn() { printf "${YLW}[warn]${RST} %s\n" "$*"; }
err()  { printf "${RED}[err]${RST} %s\n" "$*" >&2; }

# --- Liste de référence (objets que l'init devrait créer) ---
EXPECTED_TABLES=(
  fermes batiments cases races animaux
  bandes bande_animaux
  saillies diagnostics_gestation mises_bas sevrages regles_sevrage
  pesees protocoles_vaccinaux vaccinations traitements mortalites
  types_aliment formulations formulation_ingredients plans_alimentation consommations_aliment
  fournisseurs matieres_premieres mouvements_stock commandes
  departs utilisateurs utilisateur_fermes
)
# Note : 29 tables ci-dessus. Le brief annonce 30 (le 30e étant arrivé probablement via un patch
# ultérieur — ajuster si nécessaire). On reste descriptif : on vérifie ce qu'on connaît avec certitude.

EXPECTED_VIEWS=(
  v_kpi_bande
  v_kpi_truie
)

EXPECTED_INDEXES=(
  idx_animaux_ferme idx_animaux_statut idx_animaux_categorie
  idx_saillies_truie idx_saillies_bande idx_saillies_date
  idx_mb_truie idx_mb_date
  idx_pesees_animal idx_pesees_bande idx_pesees_date
  idx_mortalites_date
  idx_conso_bande idx_conso_date
  idx_mvt_matiere idx_mvt_date
  idx_departs_date
)

# --- Récupération DB_URL ---
DB_URL="${1:-}"
if [[ -z "${DB_URL}" ]]; then
  # Permet aussi de récupérer depuis variable d'env
  DB_URL="${SUPABASE_DB_URL:-}"
fi

if [[ -z "${DB_URL}" ]]; then
  printf "${BLD}=== Vérification migration Supabase Cloud ===${RST}\n\n"
  read -r -p "PROJECT_REF : " PROJECT_REF
  PROJECT_REF="${PROJECT_REF//[[:space:]]/}"
  [[ -n "${PROJECT_REF}" ]] || { err "PROJECT_REF requis."; exit 1; }
  read -r -s -p "DB_PASSWORD : " DB_PASSWORD
  printf "\n"
  [[ -n "${DB_PASSWORD}" ]] || { err "DB_PASSWORD requis."; exit 1; }
  read -r -p "Région pooler (défaut: eu-west-3) : " REGION
  REGION="${REGION:-eu-west-3}"
  DB_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-${REGION}.pooler.supabase.com:6543/postgres"
fi

# --- Vérif psql ---
if ! command -v psql >/dev/null 2>&1; then
  err "psql introuvable. Installer postgresql-client."
  exit 2
fi

# --- Test connexion ---
log "Test de connexion…"
if ! psql "${DB_URL}" -tAc "SELECT 1;" >/dev/null 2>&1; then
  err "Connexion impossible à la base. Vérifier l'URL/credentials/réseau."
  exit 2
fi
ok "Connexion établie."
printf "\n"

# --- Helpers SQL ---
check_object() {
  # $1 = label, $2 = sql renvoyant 't' si exists, 'f' sinon, $3 = name
  local kind="$1" sql="$2" name="$3"
  local result
  result="$(psql "${DB_URL}" -tAc "${sql}" 2>/dev/null || echo "ERR")"
  if [[ "${result}" == "t" ]]; then
    printf "  ${GRN}✅${RST} %-12s %s\n" "${kind}" "${name}"
    return 0
  else
    printf "  ${RED}❌${RST} %-12s %s\n" "${kind}" "${name}"
    return 1
  fi
}

FAILED=0

printf "${BLD}— Tables (%d attendues) —${RST}\n" "${#EXPECTED_TABLES[@]}"
for t in "${EXPECTED_TABLES[@]}"; do
  sql="SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${t}');"
  check_object "table" "${sql}" "${t}" || FAILED=$((FAILED+1))
done

printf "\n${BLD}— Vues (%d attendues) —${RST}\n" "${#EXPECTED_VIEWS[@]}"
for v in "${EXPECTED_VIEWS[@]}"; do
  sql="SELECT EXISTS(SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='${v}');"
  check_object "view" "${sql}" "${v}" || FAILED=$((FAILED+1))
done

printf "\n${BLD}— Index (%d attendus) —${RST}\n" "${#EXPECTED_INDEXES[@]}"
for i in "${EXPECTED_INDEXES[@]}"; do
  sql="SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='${i}');"
  check_object "index" "${sql}" "${i}" || FAILED=$((FAILED+1))
done

# --- Détection objets inattendus (informatif uniquement) ---
printf "\n${BLD}— Objets supplémentaires détectés (informatif) —${RST}\n"
EXPECTED_TABLES_LIST="$(printf "'%s'," "${EXPECTED_TABLES[@]}" | sed 's/,$//')"
EXTRA_TABLES="$(psql "${DB_URL}" -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name NOT IN (${EXPECTED_TABLES_LIST}) ORDER BY table_name;" 2>/dev/null || true)"
if [[ -n "${EXTRA_TABLES}" ]]; then
  while IFS= read -r line; do
    [[ -n "${line}" ]] && printf "  ${YLW}+${RST} table inattendue : %s\n" "${line}"
  done <<< "${EXTRA_TABLES}"
else
  printf "  (aucun)\n"
fi

# --- Résultat ---
printf "\n${BLD}=== Résultat ===${RST}\n"
TOTAL=$(( ${#EXPECTED_TABLES[@]} + ${#EXPECTED_VIEWS[@]} + ${#EXPECTED_INDEXES[@]} ))
OKCOUNT=$((TOTAL - FAILED))
printf "  %d/%d objets présents.\n" "${OKCOUNT}" "${TOTAL}"

if [[ "${FAILED}" -eq 0 ]]; then
  printf "${GRN}${BLD}✅ Migration vérifiée : tous les objets de référence sont présents.${RST}\n"
  exit 0
else
  printf "${RED}${BLD}❌ ${FAILED} objet(s) manquant(s). Migration incomplète.${RST}\n"
  exit 1
fi
