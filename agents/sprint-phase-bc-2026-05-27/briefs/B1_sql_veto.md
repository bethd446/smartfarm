# BRIEF B1 — SQL référentiel vétérinaires CI

## TOI
Senior DBA Postgres + Supabase. Mode caveman.

## PÉRIMÈTRE
✅ Touche : `supabase/migrations/YYYYMMDDHHMMSS_*.sql` (créations only)
❌ Touche pas : tout le reste
❌ N'APPLIQUE PAS les migrations (le user applique via PAT)

## CONTEXTE
- Repo `/Users/13mac/smartfarm/`
- Brief V2 §3.2 : 20 produits véto CI à seeder
- Existant : `seed_matieres_premieres_standards(p_ferme)` (cf brain CONTEXT.md §3.1)
- Schema attendu : table `veterinaires_standards` (id, nom, type, voie, dose_unit, delai_attente_j, obligatoire_ci, max_jours, contre_indications[], notes)

## MISSION

### 1. Migration `20260527160000_create_veterinaires_standards.sql`
- Table `public.veterinaires_standards` :
  - `id uuid PK default gen_random_uuid()`
  - `ferme_id uuid NULL` (NULL = standard partagé, FK fermes(id) si seed user)
  - `nom text NOT NULL UNIQUE WHERE ferme_id IS NULL`
  - `type text NOT NULL` (enum à créer : `tonique|vitamine|mineral|antibiotique|antiparasitaire|vaccin|desinfectant`)
  - `voie text` (enum à créer : `IM|SC|IV|PO|topique|drench`)
  - `dose_typique numeric(10,3) NULL`
  - `unite_dose text NULL` (compatible enum unité à venir B2)
  - `delai_attente_j int DEFAULT 0` (jours d'attente viande)
  - `max_jours int NULL` (limite de durée traitement, ex: Ucaphoscal=5)
  - `obligatoire_ci bool DEFAULT false`
  - `contre_indications text[] NULL`
  - `notes text NULL`
  - `created_at timestamptz DEFAULT now()`
- Enum SQL `type_produit_veto` et `voie_administration`
- RLS : `SELECT public TO authenticated` (lecture standards) + policy ferme_id IS NULL OR matches `current_farm_id()`
- GRANT SELECT TO authenticated, anon, service_role
- Idempotent : `CREATE TABLE IF NOT EXISTS`, `DO $$ ... BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` pour enums

### 2. Migration `20260527160100_seed_veterinaires_standards.sql`
- Function `public.seed_veterinaires_standards(p_ferme uuid)` qui INSERT idempotent (`ON CONFLICT (nom) WHERE ferme_id IS NULL DO NOTHING`) les 20 refs brief V2 §3.2 :
  - Vitamines/Toniques (5) : Bimestimul, Certivit AD3E inj, Sorbitonic, Catosal B12, Multivit AD3EK oral
  - Minéraux (2) : Ucaphoscal (max_jours=5 OBLIGATOIRE), Calcium-Phosphore drench
  - Antibiotiques (6) avec delai_attente_j : Neobion (14j), Oxytetracycline LA (21j), Pénicilline G procaïne (14j), Tylosine (14j), Enrofloxacine 10% (10j), Sulfamides (15j)
  - Antiparasitaires (4) : Ivermectine 1% inj SC (28j), Doramectine SC (42j), Albendazole PO (14j), Imidocarbe IM (90j)
  - Vaccins (4) : Vaccin PPC (obligatoire_ci=true), Pasteurellose, Mycoplasme, Parvovirose truie
  - Désinfectants (3) : Iode 10%, Chlorhexidine, Virucide bâtiments
- Function `SECURITY DEFINER` (peut INSERT en tant qu'admin)
- GRANT EXECUTE TO authenticated
- COMMENT explicatif

## VÉRIFICATIONS OBLIGATOIRES
```bash
# Validation SQL syntactique (Postgres lint si dispo, sinon visuelle)
cat supabase/migrations/20260527160000_create_veterinaires_standards.sql | head -50
cat supabase/migrations/20260527160100_seed_veterinaires_standards.sql | head -50
```

Vérifie cohérence colonnes brain CONTEXT.md (pas inventer). Si doute sur `current_farm_id()` signature → lis vue existante `v_animaux_stade_repro` pour pattern.

## LIVRABLES
1. `supabase/migrations/20260527160000_create_veterinaires_standards.sql`
2. `supabase/migrations/20260527160100_seed_veterinaires_standards.sql`
3. Rapport `agents/sprint-phase-bc-2026-05-27/RAPPORT_B1.md` (≤80 lignes caveman) :
   - Fait : 2 fichiers
   - Colonnes existantes vérifiées
   - SQL test pour orchestrateur (`SELECT count(*) FROM veterinaires_standards;` attendu 0 avant seed, 20 après)
   - TODO user : appliquer via MCP `apply_migration` ou curl PAT

## ANTI-PIÈGES
- ❌ Ne créer PAS `actes_sanitaires` (Lane B3 s'en occupe)
- ❌ Pas d'enum `unite_mesure` ici (Lane B2 future)
- ❌ Vocab strict CI : `Bimestimul (B12+B1)` pas `vitamine B`
- ❌ `delai_attente_j` int (jours), pas hours

Mode caveman. Pas de prose. Direct.
