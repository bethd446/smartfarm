#!/usr/bin/env bash
# migrate-to-cloud.sh — Smart Farm
# Pousse les migrations locales + seed (optionnel) vers un projet Supabase Cloud.
# Idempotent côté schéma (migrations). Refuse le seed si la base cible n'est pas vide.
#
# Usage : ./scripts/migrate-to-cloud.sh
#
set -euo pipefail

# --- Couleurs ---
RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
BLU='\033[0;34m'
BLD='\033[1m'
RST='\033[0m'

log()  { printf "${BLU}[migrate]${RST} %s\n" "$*"; }
ok()   { printf "${GRN}[ok]${RST} %s\n" "$*"; }
warn() { printf "${YLW}[warn]${RST} %s\n" "$*"; }
err()  { printf "${RED}[err]${RST} %s\n" "$*" >&2; }

# --- Localisation projet ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SUPABASE_DIR="${PROJECT_ROOT}/supabase"
APP_DIR="${PROJECT_ROOT}/app"
SEED_FILE="${SUPABASE_DIR}/seed.sql"

cd "${PROJECT_ROOT}"

printf "${BLD}=== Smart Farm — Migration locale → Supabase Cloud ===${RST}\n\n"

# --- a) Vérif CLI ---
log "Vérification de la CLI Supabase…"
if ! command -v supabase >/dev/null 2>&1; then
  err "supabase CLI introuvable dans le PATH."
  err "Installer via : npm i -g supabase  (ou voir https://supabase.com/docs/guides/cli)"
  exit 2
fi
SB_VER="$(supabase --version 2>/dev/null || echo '?')"
ok "supabase CLI v${SB_VER}"

# Sanity checks
[[ -d "${SUPABASE_DIR}" ]]    || { err "Dossier supabase/ introuvable : ${SUPABASE_DIR}"; exit 2; }
[[ -d "${SUPABASE_DIR}/migrations" ]] || { err "Dossier migrations/ introuvable."; exit 2; }
[[ -f "${SEED_FILE}" ]]       || warn "seed.sql introuvable : étape seed désactivée."

# --- b) Demande des credentials Cloud ---
printf "\n"
log "Configuration du projet Supabase Cloud cible."
log "Le PROJECT_REF est l'identifiant du projet (ex: abcdefghijklmnop), visible dans l'URL du dashboard."

read -r -p "PROJECT_REF (project ref Supabase Cloud) : " PROJECT_REF
PROJECT_REF="${PROJECT_REF//[[:space:]]/}"
if [[ -z "${PROJECT_REF}" ]]; then
  err "PROJECT_REF vide. Abandon."
  exit 1
fi
if ! [[ "${PROJECT_REF}" =~ ^[a-z0-9]{16,32}$ ]]; then
  warn "Le PROJECT_REF '${PROJECT_REF}' n'a pas le format attendu (16-32 chars [a-z0-9])."
  read -r -p "Continuer quand même ? (oui/non) : " CONFIRM_REF
  [[ "${CONFIRM_REF,,}" == "oui" ]] || { err "Abandon."; exit 1; }
fi

# Password silencieux
read -r -s -p "DB_PASSWORD (postgres password du projet Cloud) : " DB_PASSWORD
printf "\n"
if [[ -z "${DB_PASSWORD}" ]]; then
  err "DB_PASSWORD vide. Abandon."
  exit 1
fi
export SUPABASE_DB_PASSWORD="${DB_PASSWORD}"

# --- c) Link ---
printf "\n"
log "Liaison au projet Cloud (${PROJECT_REF})…"
if ! supabase link --project-ref "${PROJECT_REF}" --password "${DB_PASSWORD}"; then
  err "Échec du link. Vérifier le PROJECT_REF, le password, et que 'supabase login' a été exécuté."
  exit 3
fi
ok "Projet lié."

# --- d) Push migrations ---
printf "\n"
log "Push des migrations locales vers Cloud (supabase db push)…"
log "Migrations à appliquer :"
ls -1 "${SUPABASE_DIR}/migrations"/*.sql 2>/dev/null | sed 's|.*/|  - |' || warn "Aucune migration trouvée."
printf "\n"
read -r -p "Confirmer le push vers Cloud ? (oui/non) : " CONFIRM_PUSH
if [[ "${CONFIRM_PUSH,,}" != "oui" ]]; then
  warn "Push annulé par l'utilisateur."
  exit 0
fi

if ! supabase db push --password "${DB_PASSWORD}"; then
  err "Échec du push. Inspecter la sortie ci-dessus."
  exit 4
fi
ok "Migrations poussées."

# --- e) + f) Seed (optionnel + safe) ---
printf "\n"
SEED_APPLIED=0
if [[ -f "${SEED_FILE}" ]]; then
  log "Étape seed (données de démo Yamoussoukro)."
  warn "Le seed insère des données fictives. NE PAS appliquer sur une base de production qui contient déjà des données réelles."
  read -r -p "Appliquer le seed.sql ? (oui/non) : " CONFIRM_SEED

  if [[ "${CONFIRM_SEED,,}" == "oui" ]]; then
    # Construction de la DB URL pooler (port 6543) — utilisée pour exécuter le seed
    # Note : le format URI standard est postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres
    # On laisse psql via 'supabase db ...' ou via DB URL directe que l'utilisateur fournit pour fiabilité.
    DB_URL_DEFAULT="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"
    log "Une URL pooler par défaut a été générée (région eu-west-3)."
    log "Si votre projet est dans une autre région, fournissez la DB URL complète, sinon laissez vide."
    read -r -p "DB URL (laisser vide pour utiliser la valeur par défaut) : " DB_URL_INPUT
    DB_URL="${DB_URL_INPUT:-${DB_URL_DEFAULT}}"

    if ! command -v psql >/dev/null 2>&1; then
      err "psql introuvable. Installer postgresql-client puis relancer uniquement l'étape seed."
      warn "Le push des migrations a déjà été effectué — schéma OK, seed à faire manuellement."
    else
      log "Vérification que la base cible est vide (SELECT count(*) FROM fermes)…"
      FERMES_COUNT="$(PGPASSWORD="${DB_PASSWORD}" psql "${DB_URL}" -tAc 'SELECT count(*) FROM fermes;' 2>/dev/null || echo "ERR")"
      if [[ "${FERMES_COUNT}" == "ERR" ]]; then
        err "Impossible d'interroger la table 'fermes'. Vérifier la DB URL / les credentials."
        warn "Seed non appliqué."
      elif [[ "${FERMES_COUNT}" -gt 0 ]]; then
        err "La table 'fermes' contient déjà ${FERMES_COUNT} ligne(s). Seed REFUSÉ (sécurité anti-écrasement)."
        warn "Pour seed manuellement : truncate les tables puis 'psql \$DB_URL -f supabase/seed.sql'."
      else
        log "Base vide. Application du seed…"
        if PGPASSWORD="${DB_PASSWORD}" psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "${SEED_FILE}"; then
          ok "Seed appliqué."
          SEED_APPLIED=1
        else
          err "Échec du seed."
        fi
      fi
    fi
  else
    log "Seed ignoré (choix utilisateur)."
  fi
else
  warn "Pas de seed.sql — étape ignorée."
fi

# --- g) URLs / clés ---
printf "\n"
log "Récupération des informations du projet…"
API_URL="https://${PROJECT_REF}.supabase.co"
DB_URL_DISPLAY="postgresql://postgres.${PROJECT_REF}:[REDACTED]@aws-0-<region>.pooler.supabase.com:6543/postgres"

printf "\n${BLD}=== Informations projet ===${RST}\n"
printf "  API URL      : ${GRN}%s${RST}\n" "${API_URL}"
printf "  Studio       : ${GRN}https://supabase.com/dashboard/project/%s${RST}\n" "${PROJECT_REF}"
printf "  DB URL       : ${GRN}%s${RST}\n" "${DB_URL_DISPLAY}"
printf "  ANON KEY     : ${YLW}(à récupérer dans Dashboard → Project Settings → API)${RST}\n"
printf "  SERVICE KEY  : ${YLW}(idem — NE JAMAIS commit)${RST}\n"
printf "\n"

# --- h) Génération .env.production.template ---
ENV_TPL="${APP_DIR}/.env.production.template"
log "Génération du template ${ENV_TPL}…"
cat > "${ENV_TPL}" <<EOF
# Smart Farm — Environnement PRODUCTION (Supabase Cloud)
# Généré le $(date -u +"%Y-%m-%dT%H:%M:%SZ") par migrate-to-cloud.sh
# Projet : ${PROJECT_REF}
#
# Copier ce fichier en .env.production puis remplir les valeurs.
# Ne JAMAIS commit .env.production (cf .gitignore).

NEXT_PUBLIC_SUPABASE_URL=${API_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=<COLLER_ANON_KEY_DEPUIS_DASHBOARD>
SUPABASE_SERVICE_ROLE_KEY=<COLLER_SERVICE_ROLE_KEY_DEPUIS_DASHBOARD>

NEXT_PUBLIC_APP_NAME=Smart Farm
NEXT_PUBLIC_DEMO_USER_ID=aaaaaaaa-0000-0000-0000-000000000001
NEXT_PUBLIC_DEMO_FERME_ID=00000000-0000-0000-0000-000000000001
EOF
ok "Template écrit : ${ENV_TPL}"

# --- i) Étapes manuelles restantes ---
printf "\n${BLD}=== Étapes manuelles restantes ===${RST}\n"
cat <<EOF
  1. Récupérer ANON KEY + SERVICE_ROLE_KEY dans :
     https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api
  2. Créer ${APP_DIR}/.env.production à partir du template :
       cp ${APP_DIR}/.env.production.template ${APP_DIR}/.env.production
       \$EDITOR ${APP_DIR}/.env.production
  3. Basculer l'env actif :
       ${PROJECT_ROOT}/scripts/switch-env.sh production
  4. Vérifier la migration :
       ${PROJECT_ROOT}/scripts/verify-migration.sh
  5. DNS — créer un record A pointant le domaine vers l'IP du VPS :
       smartfarm.<domaine.tld>  A  187.127.225.24
  6. Certbot — émettre le certificat TLS :
       certbot --nginx -d smartfarm.<domaine.tld>
  7. Mettre à jour la conf Nginx (server_name) puis :
       nginx -t && systemctl reload nginx
  8. Rebuild + redéploiement Next.js :
       cd ${APP_DIR} && npm ci && npm run build && (kill old node, restart)
EOF

printf "\n${GRN}${BLD}✅ Migration cloud terminée.${RST}"
[[ "${SEED_APPLIED}" -eq 1 ]] && printf " ${GRN}(seed appliqué)${RST}"
printf "\n"
