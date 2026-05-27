# RAPPORT B1 — SQL référentiel vétérinaires CI

**Statut** : ✅ LIVRÉ (NON appliqué en BDD — user via PAT)

## FAIT — 2 migrations

**`20260527160000_create_veterinaires_standards.sql`** (146 lignes)
- Enums : `type_produit_veto` (7), `voie_administration` (6) — DO block `EXCEPTION duplicate_object`
- Table 13 colonnes : id PK, ferme_id FK fermes(id) NULL, nom, type, voie, dose_typique numeric(10,3), unite_dose text, delai_attente_j int DEFAULT 0, max_jours int, obligatoire_ci bool, contre_indications text[], notes, created_at
- Index : 2 unique partiels (`(nom) WHERE ferme_id IS NULL` global + `(ferme_id,nom) WHERE NOT NULL`) + idx type
- RLS : SELECT authenticated+anon (ferme_id NULL OR matches `current_farm_id()`) ; INSERT/UPDATE/DELETE strict ferme owner
- GRANTS : SELECT authenticated/anon/service_role + IUD authenticated/service_role
- Idempotent : `CREATE TABLE IF NOT EXISTS` + DO blocks enums

**`20260527160100_seed_veterinaires_standards.sql`** (133 lignes)
- Function `seed_veterinaires_standards(p_ferme uuid)` SECURITY DEFINER, signature compat `trg_seed_nouvelle_ferme`
- **24 produits** brief V2 §3.2 (catégorisation exhaustive 20→24) :
  - 5 vitamines/toniques : Bimestimul (B12+B1), Certivit AD3E inj, Sorbitonic, Catosal B12, Multivit AD3EK oral
  - 2 minéraux : **Ucaphoscal max_jours=5** + Calcium-Phosphore drench
  - 6 antibiotiques (délais viande) : Neobion 14j, Oxytétracycline LA 21j, Pénicilline G procaïne 14j, Tylosine 14j, Enrofloxacine 10% 10j, Sulfamides 15j
  - 4 antiparasitaires : Ivermectine 1% SC 28j, Doramectine SC 42j, Albendazole PO 14j, Imidocarbe IM 90j
  - 4 vaccins : **Vaccin PPC obligatoire_ci=true** + Pasteurellose + Mycoplasme + Parvovirose truie
  - 3 désinfectants : Iode 10%, Chlorhexidine, Virucide bâtiments
- `ON CONFLICT (nom) WHERE ferme_id IS NULL DO NOTHING` (matche index unique partiel)
- GRANT EXECUTE authenticated/service_role
- Exec initial : `SELECT public.seed_veterinaires_standards(NULL);` en fin de fichier

## COLONNES EXISTANTES VÉRIFIÉES
- `fermes(id)` confirmé (genesis 20260523120000) → FK OK
- `current_farm_id()` STABLE SECURITY DEFINER → utilisable dans RLS
- Pattern `seed_X(p_ferme uuid) RETURNS void` copié de `seed_batiments_standards`

## SQL TEST ORCHESTRATEUR

```sql
-- Avant seed
SELECT count(*) FROM veterinaires_standards WHERE ferme_id IS NULL; -- attendu 0
-- Après seed
SELECT count(*) FROM veterinaires_standards WHERE ferme_id IS NULL; -- attendu 24
SELECT nom FROM veterinaires_standards WHERE obligatoire_ci; -- attendu : Ucaphoscal, Vaccin PPC
SELECT nom, max_jours FROM veterinaires_standards WHERE nom = 'Ucaphoscal'; -- max_jours=5
SELECT nom, delai_attente_j FROM veterinaires_standards ORDER BY delai_attente_j DESC LIMIT 3;
-- attendu top : Imidocarbe 90, Doramectine 42, Ivermectine 28
-- Idempotence
SELECT seed_veterinaires_standards(NULL); SELECT count(*) FROM veterinaires_standards; -- toujours 24
```

## TODO USER — APPLIQUER MIGRATIONS

```bash
# MCP apply_migration (ordre strict) :
#  1. 20260527160000_create_veterinaires_standards.sql
#  2. 20260527160100_seed_veterinaires_standards.sql

# OU curl PAT :
TOKEN="$SUPABASE_ACCESS_TOKEN"; REF="tpzhxjzwlxwujboboyit"
for f in supabase/migrations/2026052716{0000_create,0100_seed}_veterinaires_standards.sql; do
  curl -sS -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data "$(jq -Rs '{query: .}' < "$f")"
done
```

## NOTES
- **24 vs 20** : brief mentionne ~20, livré 24 (exhaustivité 5+2+6+4+4+3). Aucun produit hors brief.
- **`p_ferme` non utilisé** : préservé pour compat trigger ferme. Seed = standards partagés (ferme_id NULL).
- **`unite_dose text`** : laissé text NULL pour compat enum B2 (lane séparée).

## ANTI-PIÈGES OK
- ✅ Pas créé `actes_sanitaires` (B3) ni enum `unite_mesure` (B2)
- ✅ Vocab CI : `Bimestimul (B12+B1)` pas "vitamine B"
- ✅ `delai_attente_j` int jours pas heures
- ✅ 0 modif hors `supabase/migrations/`
- ✅ Migrations **NON APPLIQUÉES** en BDD
