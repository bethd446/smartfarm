#!/usr/bin/env bash
# Smart Farm — Deploy standalone (build + sync assets + restart server)
# Usage : bash deploy.sh
#
# Pourquoi ce script ?
# `next build` avec `output: "standalone"` génère .next/standalone/ MAIS
# n'y copie PAS .next/static/ ni public/. Sans ces dossiers, le serveur
# Node retourne 404 sur tous les chunks JS/CSS et les images, ce qui
# casse complètement le rendu côté navigateur.
#
# Référence : https://nextjs.org/docs/app/api-reference/config/next-config-js/output
set -euo pipefail

APP_DIR="/root/projects/smartfarm/app"
STANDALONE_DIR="$APP_DIR/.next/standalone/projects/smartfarm/app"

cd "$APP_DIR"
export PATH=/root/.hermes/node/bin:/usr/local/bin:/usr/bin:/bin

echo "▶  Build Next.js standalone…"
npm run build

echo "▶  Sync .next/static → standalone…"
rm -rf "$STANDALONE_DIR/.next/static"
cp -r "$APP_DIR/.next/static" "$STANDALONE_DIR/.next/"

echo "▶  Sync public/ → standalone…"
rm -rf "$STANDALONE_DIR/public"
cp -r "$APP_DIR/public" "$STANDALONE_DIR/"

echo "▶  Kill ancienne instance node sur :3000…"
fuser -k -9 3000/tcp 2>/dev/null || true
sleep 2

echo "▶  Démarrer nouvelle instance…"
set -a; source "$APP_DIR/.env.local"; set +a
export SMARTFARM_DEMO_MODE=true PORT=3000 HOSTNAME=0.0.0.0

cd "$STANDALONE_DIR"
nohup node server.js > /tmp/sf-standalone.log 2>&1 &
echo "▶  Server PID: $!"

sleep 4
echo "▶  Healthcheck…"
# 1) Liveness Node sur :3000 — HTML uniquement
#    Les assets statiques (_next/static, public/) sont servis par LiteSpeed en prod,
#    PAS par Node. Tester localhost:3000/asset.svg donne un faux 404 même quand
#    la prod fonctionne. On vérifie donc :
#      a) Node bind :3000 (HTML 200)
#      b) Présence physique des assets clés sur disque (standalone + public/_next/static)
#      c) URL publique smartfarm.group OK (HTML + 1 asset CSS référencé)
HTTP_LOCAL=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3000/)

# Vérif présence assets sur disque
STATIC_OK=0
[ -d "$STANDALONE_DIR/.next/static" ] && [ -d "$APP_DIR/public/_next/static" ] && STATIC_OK=1

# Vérif prod externe (HTML + 1 asset CSS référencé par le HTML)
HTTP_PROD=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 https://smartfarm.group/connexion || echo "000")
ASSET_URL=$(curl -s --max-time 5 https://smartfarm.group/connexion 2>/dev/null | grep -oE '/_next/static/chunks/[^"]+\.css' | head -1)
ASSET_PROD="skip"
if [ -n "$ASSET_URL" ]; then
  ASSET_PROD=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://smartfarm.group$ASSET_URL" || echo "000")
fi

echo "  · Node local  : HTML=$HTTP_LOCAL"
echo "  · Assets disk : $([ $STATIC_OK = 1 ] && echo OK || echo MISSING)"
echo "  · Prod HTTPS  : HTML=$HTTP_PROD  CSS=$ASSET_PROD"

if [ "$HTTP_LOCAL" = "200" ] && [ "$STATIC_OK" = "1" ] && [ "$HTTP_PROD" = "200" ] && { [ "$ASSET_PROD" = "200" ] || [ "$ASSET_PROD" = "skip" ]; }; then
  echo "✓  Smart Farm UP  ·  Node=$HTTP_LOCAL  ·  Prod=$HTTP_PROD  ·  CSS=$ASSET_PROD"
  echo "✓  https://smartfarm.group"
else
  echo "✗  Deploy FAILED  ·  Node=$HTTP_LOCAL  ·  Disk=$STATIC_OK  ·  Prod=$HTTP_PROD  ·  CSS=$ASSET_PROD"
  tail -20 /tmp/sf-standalone.log
  exit 1
fi
