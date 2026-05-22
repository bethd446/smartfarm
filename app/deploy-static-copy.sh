#!/usr/bin/env bash
# Smart Farm — Post-build static + public sync (Hostinger compatible)
# -----------------------------------------------------------------------------
# Équivalent de deploy.sh SANS le restart serveur (Hostinger gère le restart).
#
# Pourquoi ? `next build` avec `output: "standalone"` génère .next/standalone/
# MAIS n'y copie PAS .next/static/ ni public/. Sans ces dossiers, le serveur
# Node retourne 404 sur tous les chunks JS/CSS → page blanche.
#
# Référence : https://nextjs.org/docs/app/api-reference/config/next-config-js/output
# -----------------------------------------------------------------------------
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
STANDALONE_DIR="$APP_DIR/.next/standalone/projects/smartfarm/app"

echo "▶  Sync .next/static → standalone…"
mkdir -p "$STANDALONE_DIR/.next"
rm -rf "$STANDALONE_DIR/.next/static"
cp -r "$APP_DIR/.next/static" "$STANDALONE_DIR/.next/"

echo "▶  Sync public/ → standalone…"
rm -rf "$STANDALONE_DIR/public"
cp -r "$APP_DIR/public" "$STANDALONE_DIR/"

echo "✓  Standalone ready: $STANDALONE_DIR"
