#!/usr/bin/env bash
# export-demo-data.sh — Smart Farm
# Exporte les données de démo (17 animaux, 144 pesées, etc.) du Postgres local
# vers un fichier SQL prêt à charger sur Supabase Cloud.
#
# Output : scripts/seed-demo-data.sql
#
# Usage : bash scripts/export-demo-data.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${SCRIPT_DIR}/seed-demo-data.sql"
CONTAINER="${CONTAINER:-supabase_db_smartfarm}"

# Vérifie que le container tourne
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "[err] Container ${CONTAINER} non démarré."
  echo "      docker start ${CONTAINER}"
  exit 1
fi

# Ordre topologique (parents avant enfants — FK-safe)
TABLES=(
  # Référentiels / racine
  public.fermes
  public.utilisateurs
  public.utilisateur_fermes
  public.races
  public.types_aliment
  public.fournisseurs
  public.matieres_premieres
  public.lots_matieres_premieres
  public.protocoles_vaccinaux
  public.protocoles_anti_mycotoxines
  public.produits_anti_mycotoxines
  public.biosecurite_checklist
  public.regles_sevrage
  public.tips_conseiller

  # Infra élevage
  public.batiments
  public.salles
  public.cases
  public.bandes
  public.animaux
  public.bande_animaux

  # Reproduction
  public.saillies
  public.diagnostics_gestation
  public.mises_bas
  public.checks_post_mb
  public.sevrages

  # Suivi
  public.pesees
  public.observations_bcs
  public.transits_phase
  public.evenements_prevus

  # Nutrition
  public.formulations
  public.formulation_ingredients
  public.plans_alimentation
  public.consommations_aliment
  public.consommations_eau

  # Santé / mortalité
  public.vaccinations
  public.traitements
  public.mortalites
  public.departs

  # Biosécurité / PPA / myco
  public.biosecurite_audits
  public.visites_biosecurite
  public.ppa_observations

  # Stock / logistique
  public.commandes
  public.mouvements_stock
)

# Construit les flags -t pour pg_dump
DUMP_FLAGS=()
for t in "${TABLES[@]}"; do
  DUMP_FLAGS+=(-t "${t}")
done

echo "▶ Export des données de démo depuis ${CONTAINER}…"
echo "  Tables : ${#TABLES[@]}"
echo "  Sortie : ${OUT}"
echo

# Header explicatif
{
  echo "-- ============================================================"
  echo "-- Smart Farm — Seed de données de démo"
  echo "-- Généré : $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "-- Source : ${CONTAINER} (Postgres local Docker)"
  echo "-- Tables : ${#TABLES[@]}"
  echo "--"
  echo "-- À appliquer sur une base VIDE seulement (RLS + FK respectées)."
  echo "-- Désactive temporairement les triggers user pour éviter les"
  echo "-- effets de bord (auto-événements, audit logs)."
  echo "-- ============================================================"
  echo
  echo "BEGIN;"
  echo "SET session_replication_role = 'replica';  -- désactive triggers user"
  echo
} > "${OUT}"

# Dump data-only, INSERT statements (idempotents + lisibles)
docker exec "${CONTAINER}" pg_dump \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  -U postgres \
  -d postgres \
  "${DUMP_FLAGS[@]}" \
  >> "${OUT}"

# Footer
{
  echo
  echo "SET session_replication_role = 'origin';"
  echo "COMMIT;"
  echo
  echo "-- Fin du seed de démo"
} >> "${OUT}"

echo "✓ Export terminé"
wc -l "${OUT}"
du -h "${OUT}" | awk '{print "  Taille: "$1}'
echo
echo "▶ Appliquer sur Cloud :"
echo "  PROJECT_REF=xxxx DB_PASSWORD='yyy' SEED_DEMO=1 bash scripts/bootstrap-supabase-cloud.sh"
echo "ou manuellement :"
echo "  psql \$DB_URL -f ${OUT}"
