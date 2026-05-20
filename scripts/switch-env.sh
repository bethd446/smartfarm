#!/usr/bin/env bash
# switch-env.sh — Smart Farm
# Bascule .env.local entre 'local' et 'production' avec backup automatique.
#
# Usage : ./scripts/switch-env.sh <local|production>
#
set -euo pipefail

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
BLU='\033[0;34m'
RST='\033[0m'

log()  { printf "${BLU}[switch-env]${RST} %s\n" "$*"; }
ok()   { printf "${GRN}[ok]${RST} %s\n" "$*"; }
warn() { printf "${YLW}[warn]${RST} %s\n" "$*"; }
err()  { printf "${RED}[err]${RST} %s\n" "$*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/../app" && pwd)"

usage() {
  cat <<EOF
Usage : $0 <local|production>

  local       → copie .env.local.source   vers .env.local
  production  → copie .env.production     vers .env.local

Crée automatiquement un backup .env.local.bak.<timestamp> avant écrasement.
EOF
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

TARGET_ENV="$1"
case "${TARGET_ENV}" in
  local|production) ;;
  -h|--help) usage; exit 0 ;;
  *) err "Argument invalide : '${TARGET_ENV}' (attendu : local | production)"; usage; exit 1 ;;
esac

# Conventions de nommage :
#  - .env.local.source : la source de vérité pour le mode 'local' (versionnable sans secrets sensibles
#    via templates, ou non-versionnée selon politique). Si absent, on retombe sur .env.local.template.
#  - .env.production   : non versionné, contient les clés Cloud réelles.
SRC_LOCAL_PRIMARY="${APP_DIR}/.env.local.source"
SRC_LOCAL_FALLBACK="${APP_DIR}/.env.local.template"
SRC_PROD="${APP_DIR}/.env.production"
DEST="${APP_DIR}/.env.local"

case "${TARGET_ENV}" in
  local)
    if [[ -f "${SRC_LOCAL_PRIMARY}" ]]; then
      SRC="${SRC_LOCAL_PRIMARY}"
    elif [[ -f "${SRC_LOCAL_FALLBACK}" ]]; then
      SRC="${SRC_LOCAL_FALLBACK}"
      warn "Source primaire absente, fallback sur le template : ${SRC}"
      warn "Renseignez vos clés locales dans ${DEST} après bascule si nécessaire."
    else
      err "Aucune source 'local' trouvée (.env.local.source ni .env.local.template)."
      exit 2
    fi
    ;;
  production)
    if [[ ! -f "${SRC_PROD}" ]]; then
      err "Fichier ${SRC_PROD} introuvable."
      err "Créez-le d'abord à partir du template :"
      err "  cp ${APP_DIR}/.env.production.template ${SRC_PROD}"
      err "  \$EDITOR ${SRC_PROD}"
      exit 2
    fi
    SRC="${SRC_PROD}"
    # Garde-fou : refuser de basculer en production si placeholders non remplis
    if grep -qE '<COLLER_|<REMPLIR_|<TODO' "${SRC}"; then
      err "${SRC} contient encore des placeholders (<COLLER_…>). Remplissez-le avant de basculer."
      exit 3
    fi
    ;;
esac

log "Source       : ${SRC}"
log "Destination  : ${DEST}"

# Backup si destination existante
if [[ -f "${DEST}" ]]; then
  TS="$(date +%Y%m%d-%H%M%S)"
  BACKUP="${DEST}.bak.${TS}"
  cp -p "${DEST}" "${BACKUP}"
  ok "Backup créé : ${BACKUP}"
fi

cp -p "${SRC}" "${DEST}"
chmod 600 "${DEST}"
ok "Environnement basculé sur '${TARGET_ENV}'."

# Aperçu (clés masquées)
printf "\n${BLU}--- Aperçu .env.local (clés masquées) ---${RST}\n"
sed -E 's/(KEY|PASSWORD|SECRET)=.+/\1=********/' "${DEST}"
printf "${BLU}-----------------------------------------${RST}\n"

warn "Pensez à redémarrer le serveur Next.js pour prendre en compte les nouvelles variables."
