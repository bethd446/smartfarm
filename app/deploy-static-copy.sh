#!/usr/bin/env bash
# Smart Farm — Post-build static sync (Hostinger LSNODE/Passenger compatible)
# -----------------------------------------------------------------------------
# Sur Hostinger Cloud Node.js :
#   - LiteSpeed sert `app/public/` comme document root statique
#   - Les requêtes non statiques sont relayées au worker Passenger (server.js
#     standalone via socket Unix)
#
# Problème : `next build` avec `output:"standalone"` génère .next/static/ qui
# contient TOUS les chunks JS/CSS hashés. Ces fichiers sont demandés par le
# client sous l'URL `/_next/static/...`. Or :
#   - LiteSpeed les cherche dans public/_next/static (n'existe pas) → 404
#   - Le worker Node ne les voit pas non plus s'ils ne sont pas dans
#     .next/standalone/.../.next/static
#
# Sans CSS/JS chunks accessibles → HTML brut sans style (le user voit du Times
# noir sur fond blanc au lieu du design system).
#
# Fix : copier .next/static à DEUX endroits
#   1. .next/standalone/projects/smartfarm/app/.next/static/  (worker Node)
#   2. app/public/_next/static/                                (LiteSpeed)
# -----------------------------------------------------------------------------
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
STANDALONE_DIR="$APP_DIR/.next/standalone/projects/smartfarm/app"

# 1) Sync vers le worker Node standalone (fallback si LiteSpeed proxy au lieu de servir)
echo "▶  Sync .next/static → standalone (worker Node)…"
mkdir -p "$STANDALONE_DIR/.next"
rm -rf "$STANDALONE_DIR/.next/static"
cp -r "$APP_DIR/.next/static" "$STANDALONE_DIR/.next/"

# 2) Sync vers public/_next/static (LiteSpeed sert en statique direct)
echo "▶  Sync .next/static → public/_next/static (LiteSpeed direct)…"
mkdir -p "$APP_DIR/public/_next"
rm -rf "$APP_DIR/public/_next/static"
cp -r "$APP_DIR/.next/static" "$APP_DIR/public/_next/"

# 3) Sync public/ → standalone (au cas où le worker doive servir des assets)
echo "▶  Sync public/ → standalone…"
rm -rf "$STANDALONE_DIR/public"
cp -r "$APP_DIR/public" "$STANDALONE_DIR/"

echo "✓  Standalone ready: $STANDALONE_DIR"
echo "✓  Public assets ready: $APP_DIR/public/_next/static"
