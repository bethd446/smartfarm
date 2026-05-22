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
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3000/)
ASSET=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3000/logo-smartfarm.svg)

if [ "$HTTP" = "200" ] && [ "$ASSET" = "200" ]; then
  echo "✓  Smart Farm UP  ·  HTML=$HTTP  ·  Assets=$ASSET"
  echo "✓  https://smartfarm.187-127-225-24.nip.io"
else
  echo "✗  Deploy FAILED  ·  HTML=$HTTP  ·  Assets=$ASSET"
  tail -20 /tmp/sf-standalone.log
  exit 1
fi
