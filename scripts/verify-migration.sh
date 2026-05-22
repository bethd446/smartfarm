#!/usr/bin/env bash
# verify-migration.sh — Smart Farm
# Vérifie qu'une base PostgreSQL/Supabase cible contient bien TOUS les objets DB
# attendus, en couvrant l'ensemble des migrations du dépôt :
#   - 20260520000001_init_smartfarm.sql        (schéma initial)
#   - 20260520120001_normes_senior.sql         (audit_logs, salles, soft-delete)
#   - 20260520130001_rls_multitenant.sql       (fonctions current_*, policies)
#   - 20260520140001_calendrier_repro.sql      (evenements_prevus, v_calendrier_repro)
#   - 20260520150001_kpi_zootechniques.sql     (mv_kpi_*, refresh_kpi_views)
#   - 20260520160001_fix_ic_formule.sql        (correctifs)
#   - 20260520170001_fix_rls_leaks.sql         (correctifs)
#
# Usage : ./scripts/verify-migration.sh [DB_URL]
#   - Si DB_URL non fourni → SUPABASE_DB_URL, sinon prompts interactifs.
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

# =============================================================================
# Liste de référence — TOUTES les migrations
# =============================================================================

# --- TABLES (31) -------------------------------------------------------------
EXPECTED_TABLES=(
  # Référentiel / structure
  fermes batiments salles cases races
  # Cheptel
  animaux bandes bande_animaux
  # Reproduction
  saillies diagnostics_gestation mises_bas sevrages regles_sevrage
  # Sanitaire & croissance
  pesees protocoles_vaccinaux vaccinations traitements mortalites
  # Alimentation
  types_aliment formulations formulation_ingredients plans_alimentation consommations_aliment
  # Stocks / achats
  fournisseurs matieres_premieres mouvements_stock commandes
  # Sorties
  departs
  # Utilisateurs & multi-tenant
  utilisateurs utilisateur_fermes
  # Audit & calendrier
  audit_logs evenements_prevus
)

# --- VUES (3) ----------------------------------------------------------------
EXPECTED_VIEWS=(
  v_kpi_bande
  v_kpi_truie
  v_calendrier_repro
)

# --- MATERIALIZED VIEWS (3) --------------------------------------------------
EXPECTED_MATVIEWS=(
  mv_kpi_bande
  mv_kpi_ferme
  mv_kpi_truie
)

# --- FONCTIONS custom (16) ---------------------------------------------------
# Filtrage : on liste les fonctions schéma public propres à l'app (pas Supabase).
EXPECTED_FUNCTIONS=(
  # RLS multi-tenant
  current_farm_id current_user_internal_id current_user_role user_has_farm_access
  # Helpers techniques
  set_deleted_at trigger_set_updated_at
  # Audit
  trigger_audit_log
  # Calendrier repro
  marquer_retards
  trg_evp_touch_updated_at
  trg_saillie_planifier_diagnostics
  trg_diagnostic_planifier_suite
  trg_mise_bas_synchroniser_calendrier
  trg_sevrage_cloturer_evenements
  # Garde-fous délais
  trigger_check_mise_bas_delai
  trigger_check_sevrage_delai
  # KPI
  refresh_kpi_views
)

# --- INDEX nommés (36) -------------------------------------------------------
EXPECTED_INDEXES=(
  # Animaux
  idx_animaux_ferme idx_animaux_statut idx_animaux_categorie idx_animaux_vivants
  # Bandes & élevage
  idx_bandes_actives idx_cases_salle idx_salles_batiment
  # Reproduction
  idx_saillies_truie idx_saillies_bande idx_saillies_date idx_saillies_recentes
  idx_mb_truie idx_mb_date
  # Pesées
  idx_pesees_animal idx_pesees_bande idx_pesees_date
  # Mortalités
  idx_mortalites_date
  # Alimentation
  idx_conso_bande idx_conso_date
  # Stocks
  idx_mvt_matiere idx_mvt_date idx_stocks_alerte
  # Sorties
  idx_departs_date
  # Audit
  idx_audit_created_at idx_audit_table_record idx_audit_user
  # Calendrier repro
  idx_evp_animal idx_evp_date_statut idx_evp_ferme_statut_d
  idx_evp_mise_bas idx_evp_saillie
  # Materialized views KPI
  mv_kpi_bande_pk mv_kpi_bande_ferme
  mv_kpi_ferme_pk
  mv_kpi_truie_pk mv_kpi_truie_ferme
)

# --- Seuils ------------------------------------------------------------------
MIN_POLICIES=79
# 18 triggers distincts (trigger_name, table) couvrant audit_*, set_updated_at_*,
# planification calendrier repro (saillie/diagnostic/mise_bas/sevrage) et garde-fous délais.
MIN_TRIGGERS=18

# =============================================================================
# Récupération DB_URL
# =============================================================================
DB_URL="${1:-}"
if [[ -z "${DB_URL}" ]]; then
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

# =============================================================================
# Pré-requis
# =============================================================================
if ! command -v psql >/dev/null 2>&1; then
  err "psql introuvable. Installer postgresql-client."
  exit 2
fi

log "Test de connexion…"
if ! psql "${DB_URL}" -tAc "SELECT 1;" >/dev/null 2>&1; then
  err "Connexion impossible à la base. Vérifier l'URL/credentials/réseau."
  exit 2
fi
ok "Connexion établie."
printf "\n"

# =============================================================================
# Helpers
# =============================================================================
FAILED=0

check_object() {
  # $1 = label, $2 = sql renvoyant 't' si exists, $3 = name
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

check_count() {
  # $1 = label, $2 = sql renvoyant un entier, $3 = min attendu
  local kind="$1" sql="$2" minval="$3"
  local result
  result="$(psql "${DB_URL}" -tAc "${sql}" 2>/dev/null | tr -d '[:space:]' || echo "0")"
  if [[ "${result}" =~ ^[0-9]+$ ]] && (( result >= minval )); then
    printf "  ${GRN}✅${RST} %-12s %s (%d ≥ %d)\n" "${kind}" "count" "${result}" "${minval}"
    return 0
  else
    printf "  ${RED}❌${RST} %-12s %s (%s < %d)\n" "${kind}" "count" "${result}" "${minval}"
    return 1
  fi
}

# =============================================================================
# Vérifications par catégorie
# =============================================================================

printf "${BLD}— TABLES (%d attendues) —${RST}\n" "${#EXPECTED_TABLES[@]}"
for t in "${EXPECTED_TABLES[@]}"; do
  sql="SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name='${t}');"
  check_object "table" "${sql}" "${t}" || FAILED=$((FAILED+1))
done

printf "\n${BLD}— VUES (%d attendues) —${RST}\n" "${#EXPECTED_VIEWS[@]}"
for v in "${EXPECTED_VIEWS[@]}"; do
  sql="SELECT EXISTS(SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='${v}');"
  check_object "view" "${sql}" "${v}" || FAILED=$((FAILED+1))
done

printf "\n${BLD}— MATERIALIZED VIEWS (%d attendues) —${RST}\n" "${#EXPECTED_MATVIEWS[@]}"
for m in "${EXPECTED_MATVIEWS[@]}"; do
  sql="SELECT EXISTS(SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='${m}');"
  check_object "matview" "${sql}" "${m}" || FAILED=$((FAILED+1))
done

printf "\n${BLD}— FONCTIONS (%d attendues) —${RST}\n" "${#EXPECTED_FUNCTIONS[@]}"
for f in "${EXPECTED_FUNCTIONS[@]}"; do
  sql="SELECT EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND prokind='f' AND proname='${f}');"
  check_object "function" "${sql}" "${f}" || FAILED=$((FAILED+1))
done

printf "\n${BLD}— INDEX (%d attendus) —${RST}\n" "${#EXPECTED_INDEXES[@]}"
for i in "${EXPECTED_INDEXES[@]}"; do
  sql="SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='${i}');"
  check_object "index" "${sql}" "${i}" || FAILED=$((FAILED+1))
done

printf "\n${BLD}— POLICIES RLS (≥ %d attendues) —${RST}\n" "${MIN_POLICIES}"
check_count "policy" "SELECT COUNT(*) FROM pg_policies WHERE schemaname='public';" "${MIN_POLICIES}" \
  || FAILED=$((FAILED+1))

printf "\n${BLD}— TRIGGERS (≥ %d attendus) —${RST}\n" "${MIN_TRIGGERS}"
# information_schema.triggers compte chaque trigger par event_manipulation (INSERT/UPDATE/DELETE)
# → on dédoublonne via (trigger_name, event_object_table).
check_count "trigger" \
  "SELECT COUNT(*) FROM (SELECT DISTINCT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema='public') x;" \
  "${MIN_TRIGGERS}" || FAILED=$((FAILED+1))

# =============================================================================
# Détection objets inattendus (informatif)
# =============================================================================
printf "\n${BLD}— Objets supplémentaires détectés (informatif) —${RST}\n"

EXTRA_FOUND=0

emit_extras() {
  local label="$1" rows="$2"
  if [[ -n "${rows}" ]]; then
    while IFS= read -r line; do
      [[ -n "${line}" ]] && printf "  ${YLW}+${RST} %s inattendu(e) : %s\n" "${label}" "${line}" && EXTRA_FOUND=1
    done <<< "${rows}"
  fi
}

# Tables
LIST="$(printf "'%s'," "${EXPECTED_TABLES[@]}" | sed 's/,$//')"
ROWS="$(psql "${DB_URL}" -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name NOT IN (${LIST}) ORDER BY 1;" 2>/dev/null || true)"
emit_extras "table" "${ROWS}"

# Vues
LIST="$(printf "'%s'," "${EXPECTED_VIEWS[@]}" | sed 's/,$//')"
ROWS="$(psql "${DB_URL}" -tAc "SELECT table_name FROM information_schema.views WHERE table_schema='public' AND table_name NOT IN (${LIST}) ORDER BY 1;" 2>/dev/null || true)"
emit_extras "view" "${ROWS}"

# Matviews
LIST="$(printf "'%s'," "${EXPECTED_MATVIEWS[@]}" | sed 's/,$//')"
ROWS="$(psql "${DB_URL}" -tAc "SELECT matviewname FROM pg_matviews WHERE schemaname='public' AND matviewname NOT IN (${LIST}) ORDER BY 1;" 2>/dev/null || true)"
emit_extras "matview" "${ROWS}"

# Fonctions (filtrer celles clairement Supabase/internes)
LIST="$(printf "'%s'," "${EXPECTED_FUNCTIONS[@]}" | sed 's/,$//')"
ROWS="$(psql "${DB_URL}" -tAc "SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND prokind='f' AND proname NOT IN (${LIST}) ORDER BY 1;" 2>/dev/null || true)"
emit_extras "function" "${ROWS}"

# Index custom (ignore _pkey/_key automatiques)
LIST="$(printf "'%s'," "${EXPECTED_INDEXES[@]}" | sed 's/,$//')"
ROWS="$(psql "${DB_URL}" -tAc "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname NOT LIKE '%_pkey' AND indexname NOT LIKE '%_key' AND indexname NOT IN (${LIST}) ORDER BY 1;" 2>/dev/null || true)"
emit_extras "index" "${ROWS}"

[[ "${EXTRA_FOUND}" -eq 0 ]] && printf "  (aucun)\n"

# =============================================================================
# Résultat
# =============================================================================
printf "\n${BLD}=== Résultat ===${RST}\n"
TOTAL=$(( ${#EXPECTED_TABLES[@]} + ${#EXPECTED_VIEWS[@]} + ${#EXPECTED_MATVIEWS[@]} \
       + ${#EXPECTED_FUNCTIONS[@]} + ${#EXPECTED_INDEXES[@]} + 2 ))  # +2 = policies + triggers
OKCOUNT=$((TOTAL - FAILED))
printf "  %d/%d contrôles OK.\n" "${OKCOUNT}" "${TOTAL}"

if [[ "${FAILED}" -eq 0 ]]; then
  printf "${GRN}${BLD}✅ Migration vérifiée : tous les objets de référence sont présents.${RST}\n"
  exit 0
else
  printf "${RED}${BLD}❌ ${FAILED} contrôle(s) en échec. Migration incomplète.${RST}\n"
  exit 1
fi
