-- =============================================================================
-- SMART FARM — GENESIS MIGRATION V2 (cerveau métier porcin CI)
-- Fichier : 20260523120000_smartfarm_genesis.sql
-- Auteur  : Hermes Agent (sous-agent SQL)
-- Date    : 2026-05-23
-- Cible   : Supabase Cloud tpzhxjzwlxwujboboyit (POST-NUKE)
-- Esprit  : idempotent, RLS multi-tenant strict, vues intelligentes, backcalc,
--           enrichi brief métier porcin Côte d'Ivoire (Christophe Liegeois).
-- Aucune donnée seed — la phase d'import EasyFarm + seed donnees_metier suit.
-- =============================================================================

-- =============================================================================
-- 0. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- compat éventuelle

-- =============================================================================
-- 1. ENUMS (V1 + V2 brief CI)
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE phase_batiment AS ENUM (
    'verraterie','gestation','maternite',
    'demarrage_1','demarrage_2','croissance','finition',
    'observation','quarantaine'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sexe_animal AS ENUM ('M','F');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE categorie_animal AS ENUM (
    'truie','verrat','cochette',
    'porcelet_lait','porcelet_sevre','porcelet_croissance',
    'porc_engraissement','reforme'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- V2 brief 2.1 : stades CI (cycle de vie porcin ivoirien)
DO $$ BEGIN
  CREATE TYPE stade_porc AS ENUM (
    'lactation','demarrage_1','demarrage_2','croissance','finition',
    'cochette','truie_vide','truie_gestante','truie_allaitante',
    'verrat','reforme'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- V2 brief 1.3 : races CI
DO $$ BEGIN
  CREATE TYPE race_porc AS ENUM (
    'LARGE_WHITE','LANDRACE','PIETRAIN','DUROC','KORHOGO','CROISE','AUTRE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE statut_animal AS ENUM (
    'actif','sortie','mort','vendu','reforme','malade'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE couleur_boucle AS ENUM ('BLEU','VERT','ROUGE','JAUNE','BLANC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE methode_saillie AS ENUM ('naturelle','IA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resultat_diag AS ENUM ('positif','negatif','retour','avorte','en_attente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE statut_saillie AS ENUM ('en_cours','echec','confirmee','aboutie');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assistance_mb AS ENUM ('aucune','manuelle','medicale');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE role_user_farm AS ENUM ('admin','editeur','lecteur');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contexte_pesee AS ENUM (
    'naissance','sevrage','demarrage_1','demarrage_2',
    'croissance','finition','controle','depart'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE type_mouvement AS ENUM (
    'entree','sortie','transfert','mort','vente','reforme'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- V2 : severity étendu pour cohérence brief (info / warning / alert / critical)
DO $$ BEGIN
  CREATE TYPE severity_alerte AS ENUM ('info','warning','alert','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Si l'enum existait déjà en V1 (info/warning/critical), on ajoute 'alert' idempotent
DO $$ BEGIN
  ALTER TYPE severity_alerte ADD VALUE IF NOT EXISTS 'alert' BEFORE 'critical';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE statut_evenement AS ENUM ('planifie','realise','annule','retard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE action_audit AS ENUM ('INSERT','UPDATE','DELETE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 2. UTILITAIRE updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

-- =============================================================================
-- 3. SÉQUENCES (numéros client + code ferme)
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS seq_numero_client START 100001;
CREATE SEQUENCE IF NOT EXISTS seq_code_ferme    START 100001;

-- =============================================================================
-- 4. TABLE fermes
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.fermes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             text NOT NULL,
  code            text UNIQUE,
  localisation    text,
  pays            text DEFAULT 'CI',
  type            text DEFAULT 'porcine',
  createur_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_fermes_createur ON public.fermes(createur_user_id);
CREATE INDEX IF NOT EXISTS idx_fermes_code     ON public.fermes(code);

DROP TRIGGER IF EXISTS trg_fermes_updated_at ON public.fermes;
CREATE TRIGGER trg_fermes_updated_at
  BEFORE UPDATE ON public.fermes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-set code SF + 6 digits
CREATE OR REPLACE FUNCTION public.tg_fermes_set_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'SF' || lpad(nextval('seq_code_ferme')::text, 6, '0');
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_fermes_set_code ON public.fermes;
CREATE TRIGGER trg_fermes_set_code
  BEFORE INSERT ON public.fermes
  FOR EACH ROW EXECUTE FUNCTION public.tg_fermes_set_code();

-- =============================================================================
-- 5. TABLE utilisateurs (extension auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.utilisateurs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id            uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email              text,
  nom                text,
  prenom             text,
  telephone          text,
  numero_client      text UNIQUE,
  derniere_connexion timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_utilisateurs_auth_id ON public.utilisateurs(auth_id);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email   ON public.utilisateurs(email);

DROP TRIGGER IF EXISTS trg_utilisateurs_updated_at ON public.utilisateurs;
CREATE TRIGGER trg_utilisateurs_updated_at
  BEFORE UPDATE ON public.utilisateurs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 6. TABLE user_farms (liaison many-to-many)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_farms (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ferme_id   uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  role       role_user_farm NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ferme_id)
);

CREATE INDEX IF NOT EXISTS idx_user_farms_user  ON public.user_farms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_farms_ferme ON public.user_farms(ferme_id);

DROP TRIGGER IF EXISTS trg_user_farms_updated_at ON public.user_farms;
CREATE TRIGGER trg_user_farms_updated_at
  BEFORE UPDATE ON public.user_farms
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 7. RPC current_farm_id (utilisée par ferme-context.ts)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.current_farm_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT ferme_id
  FROM public.user_farms
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_farm_id() TO authenticated;

-- =============================================================================
-- 8. TABLE races (+ code race_porc V2)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.races (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id     uuid REFERENCES public.fermes(id) ON DELETE CASCADE,
  nom          text NOT NULL,
  espece       text DEFAULT 'porc',
  origine      text,
  observations text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

-- V2 brief 1.3 : code race_porc enum (référentiel partagé)
ALTER TABLE public.races ADD COLUMN IF NOT EXISTS code race_porc;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uq_races_code_global ON public.races(code) WHERE ferme_id IS NULL;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_races_ferme ON public.races(ferme_id);
CREATE INDEX IF NOT EXISTS idx_races_code  ON public.races(code);

DROP TRIGGER IF EXISTS trg_races_updated_at ON public.races;
CREATE TRIGGER trg_races_updated_at
  BEFORE UPDATE ON public.races
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 9. TABLE matieres_premieres (avant batiments car FK)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.matieres_premieres (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id          uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  nom_commercial    text NOT NULL,
  fournisseur       text,
  type_aliment      text,
  phase_cible       phase_batiment,
  prix_xof_kg       numeric(10,2),
  conditionnement_kg int,
  composition_json  jsonb DEFAULT '{}'::jsonb,
  actif             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mp_ferme  ON public.matieres_premieres(ferme_id);
CREATE INDEX IF NOT EXISTS idx_mp_phase  ON public.matieres_premieres(phase_cible);
CREATE INDEX IF NOT EXISTS idx_mp_actif  ON public.matieres_premieres(actif);

DROP TRIGGER IF EXISTS trg_mp_updated_at ON public.matieres_premieres;
CREATE TRIGGER trg_mp_updated_at
  BEFORE UPDATE ON public.matieres_premieres
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 10. TABLE batiments (+ enrichissements V2 brief 3.5 : T°, hygro, eau, ventil)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.batiments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id                 uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  nom                      text NOT NULL,
  type                     text,
  phase                    phase_batiment,
  capacite                 int,
  surface_m2               numeric(10,2),
  ration_kg_jour_par_sujet numeric(8,3),
  aliment_id               uuid REFERENCES public.matieres_premieres(id) ON DELETE SET NULL,
  ordre_cycle              int,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz
);

-- V2 brief 3.5 : invariants environnement (cibles thermohydrométriques + eau)
ALTER TABLE public.batiments ADD COLUMN IF NOT EXISTS temperature_cible_min_c numeric(4,1);
ALTER TABLE public.batiments ADD COLUMN IF NOT EXISTS temperature_cible_max_c numeric(4,1);
ALTER TABLE public.batiments ADD COLUMN IF NOT EXISTS humidite_cible_min_pct  numeric(4,1);
ALTER TABLE public.batiments ADD COLUMN IF NOT EXISTS humidite_cible_max_pct  numeric(4,1);
ALTER TABLE public.batiments ADD COLUMN IF NOT EXISTS debit_eau_min_l_min     numeric(4,1);
ALTER TABLE public.batiments ADD COLUMN IF NOT EXISTS ventilation_obligatoire boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_batiments_ferme    ON public.batiments(ferme_id);
CREATE INDEX IF NOT EXISTS idx_batiments_phase    ON public.batiments(phase);
CREATE INDEX IF NOT EXISTS idx_batiments_aliment  ON public.batiments(aliment_id);
CREATE INDEX IF NOT EXISTS idx_batiments_ordre    ON public.batiments(ordre_cycle);

DROP TRIGGER IF EXISTS trg_batiments_updated_at ON public.batiments;
CREATE TRIGGER trg_batiments_updated_at
  BEFORE UPDATE ON public.batiments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 11. TABLE animaux (+ stade V2, race_code, destination, sortie)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.animaux (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id              uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  tag                   text NOT NULL,
  nom                   text,
  sexe                  sexe_animal NOT NULL,
  categorie             categorie_animal NOT NULL,
  race_id               uuid REFERENCES public.races(id) ON DELETE SET NULL,
  date_naissance        date,
  date_entree           date,
  mere_id               uuid REFERENCES public.animaux(id) ON DELETE SET NULL,
  pere_id               uuid REFERENCES public.animaux(id) ON DELETE SET NULL,
  batiment_id           uuid REFERENCES public.batiments(id) ON DELETE SET NULL,
  portee_id             uuid, -- FK ajoutée après création portees
  poids_naissance_kg    numeric(6,2),
  poids_actuel_kg       numeric(7,2),
  date_derniere_pesee   date,
  couleur_boucle        couleur_boucle,
  boucle_posee_le       date,
  statut                statut_animal NOT NULL DEFAULT 'actif',
  observations          text,
  photo_url             text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  CONSTRAINT uq_animaux_tag UNIQUE (ferme_id, tag, sexe)
);

-- V2 brief 2.1 : stade cycle de vie CI (cohabite avec categorie pour rétrocompat)
ALTER TABLE public.animaux ADD COLUMN IF NOT EXISTS stade stade_porc NOT NULL DEFAULT 'lactation';

-- V2 brief 1.3 : race_code (référentiel race_porc, en plus de race_id)
ALTER TABLE public.animaux ADD COLUMN IF NOT EXISTS race_code race_porc NOT NULL DEFAULT 'CROISE';

-- V2 brief 5.x : suivi destination/sortie
ALTER TABLE public.animaux ADD COLUMN IF NOT EXISTS destination text DEFAULT 'ELEVAGE';
DO $$ BEGIN
  ALTER TABLE public.animaux ADD CONSTRAINT chk_animaux_destination
    CHECK (destination IN ('ELEVAGE','ABATTAGE','REPRODUCTION','REFORME','MORT','VENTE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.animaux ADD COLUMN IF NOT EXISTS cause_sortie text;
ALTER TABLE public.animaux ADD COLUMN IF NOT EXISTS date_sortie  date;

CREATE INDEX IF NOT EXISTS idx_animaux_ferme       ON public.animaux(ferme_id);
CREATE INDEX IF NOT EXISTS idx_animaux_tag         ON public.animaux(tag);
CREATE INDEX IF NOT EXISTS idx_animaux_categorie   ON public.animaux(categorie);
CREATE INDEX IF NOT EXISTS idx_animaux_stade       ON public.animaux(stade);
CREATE INDEX IF NOT EXISTS idx_animaux_race_code   ON public.animaux(race_code);
CREATE INDEX IF NOT EXISTS idx_animaux_destination ON public.animaux(destination);
CREATE INDEX IF NOT EXISTS idx_animaux_statut      ON public.animaux(statut);
CREATE INDEX IF NOT EXISTS idx_animaux_batiment    ON public.animaux(batiment_id);
CREATE INDEX IF NOT EXISTS idx_animaux_portee      ON public.animaux(portee_id);
CREATE INDEX IF NOT EXISTS idx_animaux_race        ON public.animaux(race_id);
CREATE INDEX IF NOT EXISTS idx_animaux_mere        ON public.animaux(mere_id);
CREATE INDEX IF NOT EXISTS idx_animaux_pere        ON public.animaux(pere_id);
CREATE INDEX IF NOT EXISTS idx_animaux_date_naiss  ON public.animaux(date_naissance);

DROP TRIGGER IF EXISTS trg_animaux_updated_at ON public.animaux;
CREATE TRIGGER trg_animaux_updated_at
  BEFORE UPDATE ON public.animaux
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 12. TABLE saillies
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.saillies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id          uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  truie_id          uuid NOT NULL REFERENCES public.animaux(id) ON DELETE CASCADE,
  verrat_id         uuid REFERENCES public.animaux(id) ON DELETE SET NULL,
  date_saillie      date NOT NULL,
  methode           methode_saillie NOT NULL DEFAULT 'naturelle',
  date_diag_prevue  date,
  date_mb_prevue    date,
  resultat_diag     resultat_diag NOT NULL DEFAULT 'en_attente',
  statut            statut_saillie NOT NULL DEFAULT 'en_cours',
  observations      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_saillies_ferme    ON public.saillies(ferme_id);
CREATE INDEX IF NOT EXISTS idx_saillies_truie    ON public.saillies(truie_id);
CREATE INDEX IF NOT EXISTS idx_saillies_verrat   ON public.saillies(verrat_id);
CREATE INDEX IF NOT EXISTS idx_saillies_date     ON public.saillies(date_saillie);
CREATE INDEX IF NOT EXISTS idx_saillies_statut   ON public.saillies(statut);
CREATE INDEX IF NOT EXISTS idx_saillies_resultat ON public.saillies(resultat_diag);

DROP TRIGGER IF EXISTS trg_saillies_updated_at ON public.saillies;
CREATE TRIGGER trg_saillies_updated_at
  BEFORE UPDATE ON public.saillies
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Trigger predictions saillie BEFORE INSERT : J+30 diag, J+114 MB
CREATE OR REPLACE FUNCTION public.tg_saillie_set_predictions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.date_saillie IS NOT NULL THEN
    NEW.date_diag_prevue := COALESCE(NEW.date_diag_prevue, NEW.date_saillie + INTERVAL '30 days');
    NEW.date_mb_prevue   := COALESCE(NEW.date_mb_prevue,   NEW.date_saillie + INTERVAL '114 days');
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_saillies_predictions ON public.saillies;
CREATE TRIGGER trg_saillies_predictions
  BEFORE INSERT OR UPDATE OF date_saillie ON public.saillies
  FOR EACH ROW EXECUTE FUNCTION public.tg_saillie_set_predictions();

-- =============================================================================
-- 13. TABLE mises_bas
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mises_bas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id          uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  truie_id          uuid NOT NULL REFERENCES public.animaux(id) ON DELETE CASCADE,
  saillie_id        uuid REFERENCES public.saillies(id) ON DELETE SET NULL,
  date_mb           date NOT NULL,
  nes_vivants       int NOT NULL DEFAULT 0,
  morts_nes         int NOT NULL DEFAULT 0,
  momifies          int NOT NULL DEFAULT 0,
  duree_mb_minutes  int,
  assistance        assistance_mb DEFAULT 'aucune',
  observations      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mb_ferme    ON public.mises_bas(ferme_id);
CREATE INDEX IF NOT EXISTS idx_mb_truie    ON public.mises_bas(truie_id);
CREATE INDEX IF NOT EXISTS idx_mb_saillie  ON public.mises_bas(saillie_id);
CREATE INDEX IF NOT EXISTS idx_mb_date     ON public.mises_bas(date_mb);

DROP TRIGGER IF EXISTS trg_mb_updated_at ON public.mises_bas;
CREATE TRIGGER trg_mb_updated_at
  BEFORE UPDATE ON public.mises_bas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 14. TABLE portees
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.portees (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id                    uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  mb_id                       uuid REFERENCES public.mises_bas(id) ON DELETE CASCADE,
  code_portee                 text UNIQUE,
  truie_id                    uuid REFERENCES public.animaux(id) ON DELETE SET NULL,
  verrat_pere_id              uuid REFERENCES public.animaux(id) ON DELETE SET NULL,
  date_naissance              date,
  date_sevrage_prevue         date,
  date_sevrage_reelle         date,
  effectif_naissance          int,
  effectif_actuel             int,
  poids_moyen_sevrage_kg      numeric(6,2),
  poids_moyen_demarrage_1_kg  numeric(6,2),
  date_entree_demarrage_1     date,
  poids_moyen_demarrage_2_kg  numeric(6,2),
  date_entree_demarrage_2     date,
  poids_moyen_croissance_kg   numeric(6,2),
  date_entree_croissance      date,
  poids_moyen_finition_kg     numeric(6,2),
  date_entree_finition        date,
  date_sortie_finition        date,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_portees_ferme  ON public.portees(ferme_id);
CREATE INDEX IF NOT EXISTS idx_portees_truie  ON public.portees(truie_id);
CREATE INDEX IF NOT EXISTS idx_portees_mb     ON public.portees(mb_id);
CREATE INDEX IF NOT EXISTS idx_portees_date_n ON public.portees(date_naissance);
CREATE INDEX IF NOT EXISTS idx_portees_code   ON public.portees(code_portee);

DROP TRIGGER IF EXISTS trg_portees_updated_at ON public.portees;
CREATE TRIGGER trg_portees_updated_at
  BEFORE UPDATE ON public.portees
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- FK animaux.portee_id (différée car cycle)
DO $$ BEGIN
  ALTER TABLE public.animaux
    ADD CONSTRAINT fk_animaux_portee
    FOREIGN KEY (portee_id) REFERENCES public.portees(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 15. TABLE pesees (+ T° ambiante / humidité / collective V2)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pesees (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id     uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  animal_id    uuid REFERENCES public.animaux(id) ON DELETE CASCADE,
  portee_id    uuid REFERENCES public.portees(id) ON DELETE CASCADE,
  date_pesee   date NOT NULL DEFAULT current_date,
  poids_kg     numeric(7,2) NOT NULL,
  contexte     contexte_pesee DEFAULT 'controle',
  observations text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CONSTRAINT chk_pesees_target CHECK (animal_id IS NOT NULL OR portee_id IS NOT NULL)
);

-- V2 brief : conditions ambiantes au moment de la pesée + flag collective
ALTER TABLE public.pesees ADD COLUMN IF NOT EXISTS temperature_ambiante_c numeric(4,1);
ALTER TABLE public.pesees ADD COLUMN IF NOT EXISTS humidite_ambiante_pct  numeric(4,1);
ALTER TABLE public.pesees ADD COLUMN IF NOT EXISTS pesee_collective       boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pesees_ferme    ON public.pesees(ferme_id);
CREATE INDEX IF NOT EXISTS idx_pesees_animal   ON public.pesees(animal_id);
CREATE INDEX IF NOT EXISTS idx_pesees_portee   ON public.pesees(portee_id);
CREATE INDEX IF NOT EXISTS idx_pesees_date     ON public.pesees(date_pesee);
CREATE INDEX IF NOT EXISTS idx_pesees_contexte ON public.pesees(contexte);

DROP TRIGGER IF EXISTS trg_pesees_updated_at ON public.pesees;
CREATE TRIGGER trg_pesees_updated_at
  BEFORE UPDATE ON public.pesees
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 16. TABLE mouvements
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mouvements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id            uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  animal_id           uuid REFERENCES public.animaux(id) ON DELETE CASCADE,
  type                type_mouvement NOT NULL,
  batiment_source_id  uuid REFERENCES public.batiments(id) ON DELETE SET NULL,
  batiment_dest_id    uuid REFERENCES public.batiments(id) ON DELETE SET NULL,
  date_mouvement      date NOT NULL DEFAULT current_date,
  effectif            int NOT NULL DEFAULT 1,
  motif               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mouvements_ferme   ON public.mouvements(ferme_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_animal  ON public.mouvements(animal_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_type    ON public.mouvements(type);
CREATE INDEX IF NOT EXISTS idx_mouvements_date    ON public.mouvements(date_mouvement);
CREATE INDEX IF NOT EXISTS idx_mouvements_src     ON public.mouvements(batiment_source_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_dest    ON public.mouvements(batiment_dest_id);

DROP TRIGGER IF EXISTS trg_mouvements_updated_at ON public.mouvements;
CREATE TRIGGER trg_mouvements_updated_at
  BEFORE UPDATE ON public.mouvements
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 17. TABLE rations
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id                 uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  batiment_id              uuid NOT NULL REFERENCES public.batiments(id) ON DELETE CASCADE,
  aliment_id               uuid NOT NULL REFERENCES public.matieres_premieres(id) ON DELETE CASCADE,
  qte_kg_jour_par_sujet    numeric(8,3) NOT NULL,
  date_debut               date NOT NULL DEFAULT current_date,
  date_fin                 date,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rations_ferme    ON public.rations(ferme_id);
CREATE INDEX IF NOT EXISTS idx_rations_batiment ON public.rations(batiment_id);
CREATE INDEX IF NOT EXISTS idx_rations_aliment  ON public.rations(aliment_id);
CREATE INDEX IF NOT EXISTS idx_rations_dates    ON public.rations(date_debut, date_fin);

DROP TRIGGER IF EXISTS trg_rations_updated_at ON public.rations;
CREATE TRIGGER trg_rations_updated_at
  BEFORE UPDATE ON public.rations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 18. TABLE alertes_loge
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.alertes_loge (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id          uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  type              text NOT NULL,
  severity          severity_alerte NOT NULL DEFAULT 'info',
  animal_id         uuid REFERENCES public.animaux(id) ON DELETE CASCADE,
  batiment_id       uuid REFERENCES public.batiments(id) ON DELETE CASCADE,
  portee_id         uuid REFERENCES public.portees(id) ON DELETE CASCADE,
  titre             text NOT NULL,
  message           text,
  date_evenement    date NOT NULL DEFAULT current_date,
  traitee           boolean NOT NULL DEFAULT false,
  traitee_le        timestamptz,
  traitee_par_user  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_alertes_ferme    ON public.alertes_loge(ferme_id);
CREATE INDEX IF NOT EXISTS idx_alertes_type     ON public.alertes_loge(type);
CREATE INDEX IF NOT EXISTS idx_alertes_severity ON public.alertes_loge(severity);
CREATE INDEX IF NOT EXISTS idx_alertes_traitee  ON public.alertes_loge(traitee);
CREATE INDEX IF NOT EXISTS idx_alertes_date     ON public.alertes_loge(date_evenement);
CREATE INDEX IF NOT EXISTS idx_alertes_animal   ON public.alertes_loge(animal_id);
CREATE INDEX IF NOT EXISTS idx_alertes_portee   ON public.alertes_loge(portee_id);

DROP TRIGGER IF EXISTS trg_alertes_updated_at ON public.alertes_loge;
CREATE TRIGGER trg_alertes_updated_at
  BEFORE UPDATE ON public.alertes_loge
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 19. TABLE evenements_prevus
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.evenements_prevus (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id          uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  animal_id         uuid REFERENCES public.animaux(id) ON DELETE CASCADE,
  portee_id         uuid REFERENCES public.portees(id) ON DELETE CASCADE,
  type              text NOT NULL,
  date_prevue       date NOT NULL,
  date_realisation  date,
  statut            statut_evenement NOT NULL DEFAULT 'planifie',
  observations      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_evt_ferme   ON public.evenements_prevus(ferme_id);
CREATE INDEX IF NOT EXISTS idx_evt_type    ON public.evenements_prevus(type);
CREATE INDEX IF NOT EXISTS idx_evt_statut  ON public.evenements_prevus(statut);
CREATE INDEX IF NOT EXISTS idx_evt_date    ON public.evenements_prevus(date_prevue);
CREATE INDEX IF NOT EXISTS idx_evt_animal  ON public.evenements_prevus(animal_id);
CREATE INDEX IF NOT EXISTS idx_evt_portee  ON public.evenements_prevus(portee_id);

DROP TRIGGER IF EXISTS trg_evt_updated_at ON public.evenements_prevus;
CREATE TRIGGER trg_evt_updated_at
  BEFORE UPDATE ON public.evenements_prevus
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 20. TABLE audit_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  row_id      uuid,
  action      action_audit NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ferme_id    uuid,
  ts          timestamptz NOT NULL DEFAULT now(),
  before_data jsonb,
  after_data  jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_table  ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_row    ON public.audit_log(row_id);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_ferme  ON public.audit_log(ferme_id);
CREATE INDEX IF NOT EXISTS idx_audit_ts     ON public.audit_log(ts);

-- =============================================================================
-- 20bis. V2 NOUVELLES TABLES MÉTIER (brief CI)
-- =============================================================================

-- 20bis.1 donnees_metier — référentiel partagé (multi-tenant global)
CREATE TABLE IF NOT EXISTS public.donnees_metier (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL CHECK (type IN (
    'nutritional_requirements','ingredients','suppliers',
    'pathologies','growth_curves','feed_formulas',
    'environment_targets','reproduction_parameters'
  )),
  cle         text NOT NULL,
  version     integer NOT NULL DEFAULT 1,
  data        jsonb NOT NULL,
  pays        text DEFAULT 'CI',
  actif       boolean DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, cle, version)
);

CREATE INDEX IF NOT EXISTS idx_dm_type   ON public.donnees_metier(type);
CREATE INDEX IF NOT EXISTS idx_dm_cle    ON public.donnees_metier(cle);
CREATE INDEX IF NOT EXISTS idx_dm_actif  ON public.donnees_metier(actif);
CREATE INDEX IF NOT EXISTS idx_dm_pays   ON public.donnees_metier(pays);

DROP TRIGGER IF EXISTS trg_dm_updated_at ON public.donnees_metier;
CREATE TRIGGER trg_dm_updated_at
  BEFORE UPDATE ON public.donnees_metier
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 20bis.2 evenements_sante — observations sanitaires (distinct du planning)
CREATE TABLE IF NOT EXISTS public.evenements_sante (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id               uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  animal_id              uuid REFERENCES public.animaux(id) ON DELETE CASCADE,
  portee_id              uuid REFERENCES public.portees(id) ON DELETE SET NULL,
  batiment_id            uuid REFERENCES public.batiments(id) ON DELETE SET NULL,
  date_observation       date NOT NULL,
  type_evenement         text NOT NULL, -- 'vaccin','traitement','symptome','maladie','blessure','deparasitage','mort'
  pathologie_suspectee   text,
  symptomes              text[],
  severity               severity_alerte NOT NULL DEFAULT 'info',
  effectif_concerne      int DEFAULT 1,
  traitement_propose     text,
  veterinaire_consulte   boolean DEFAULT false,
  veterinaire_nom        text,
  observations           text,
  created_by_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz
);

CREATE INDEX IF NOT EXISTS idx_es_ferme     ON public.evenements_sante(ferme_id);
CREATE INDEX IF NOT EXISTS idx_es_animal    ON public.evenements_sante(animal_id);
CREATE INDEX IF NOT EXISTS idx_es_portee    ON public.evenements_sante(portee_id);
CREATE INDEX IF NOT EXISTS idx_es_batiment  ON public.evenements_sante(batiment_id);
CREATE INDEX IF NOT EXISTS idx_es_date      ON public.evenements_sante(date_observation);
CREATE INDEX IF NOT EXISTS idx_es_type      ON public.evenements_sante(type_evenement);
CREATE INDEX IF NOT EXISTS idx_es_severity  ON public.evenements_sante(severity);

DROP TRIGGER IF EXISTS trg_es_updated_at ON public.evenements_sante;
CREATE TRIGGER trg_es_updated_at
  BEFORE UPDATE ON public.evenements_sante
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 20bis.3 tracabilite_decisions — audit du moteur IA / règles
CREATE TABLE IF NOT EXISTS public.tracabilite_decisions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id               uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  animal_id              uuid REFERENCES public.animaux(id) ON DELETE SET NULL,
  portee_id              uuid REFERENCES public.portees(id) ON DELETE SET NULL,
  bande_id               uuid, -- nullable, bande virtuelle
  type_decision          text NOT NULL, -- 'alerte','recommandation','transition_stade','suggestion_ration','projection_abattage'
  decision               text NOT NULL,
  regle_declenchee       text,
  valeurs_observees      jsonb,
  seuils_applicables     jsonb,
  sources_donnees        text[],
  severity               severity_alerte NOT NULL DEFAULT 'info',
  generee_le             timestamptz NOT NULL DEFAULT now(),
  acquittee_par_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acquittee_le           timestamptz
);

CREATE INDEX IF NOT EXISTS idx_td_ferme    ON public.tracabilite_decisions(ferme_id);
CREATE INDEX IF NOT EXISTS idx_td_animal   ON public.tracabilite_decisions(animal_id);
CREATE INDEX IF NOT EXISTS idx_td_portee   ON public.tracabilite_decisions(portee_id);
CREATE INDEX IF NOT EXISTS idx_td_type     ON public.tracabilite_decisions(type_decision);
CREATE INDEX IF NOT EXISTS idx_td_severity ON public.tracabilite_decisions(severity);
CREATE INDEX IF NOT EXISTS idx_td_generee  ON public.tracabilite_decisions(generee_le);
CREATE INDEX IF NOT EXISTS idx_td_acquit   ON public.tracabilite_decisions(acquittee_le);

-- 20bis.4 playbooks — arbres de décision métier (référentiel partagé)
CREATE TABLE IF NOT EXISTS public.playbooks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text UNIQUE NOT NULL,
  titre                 text NOT NULL,
  contexte              text,
  declencheur           jsonb,
  arbre_decision        jsonb,
  actions_recommandees  jsonb,
  references_metier     text[],
  actif                 boolean DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pb_code  ON public.playbooks(code);
CREATE INDEX IF NOT EXISTS idx_pb_actif ON public.playbooks(actif);

DROP TRIGGER IF EXISTS trg_pb_updated_at ON public.playbooks;
CREATE TRIGGER trg_pb_updated_at
  BEFORE UPDATE ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================================
-- 21. TRIGGER auto utilisateurs sur auth.users + numero_client
-- =============================================================================
CREATE OR REPLACE FUNCTION public.tg_on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_num text;
BEGIN
  v_num := 'SF-' || lpad(nextval('seq_numero_client')::text, 6, '0');

  INSERT INTO public.utilisateurs (auth_id, email, numero_client)
  VALUES (NEW.id, NEW.email, v_num)
  ON CONFLICT (auth_id) DO NOTHING;

  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.tg_on_auth_user_created();

-- =============================================================================
-- 22. TRIGGER mb_creates_portee — AFTER INSERT mises_bas (enrichi V2 brief 2.4)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.tg_mb_creates_portee()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_code   text;
  v_seq    int;
  v_portee uuid;
BEGIN
  -- Code portée P-YYYYMM-NNN
  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.portees
  WHERE ferme_id = NEW.ferme_id
    AND to_char(date_naissance, 'YYYYMM') = to_char(NEW.date_mb, 'YYYYMM');

  v_code := 'P-' || to_char(NEW.date_mb, 'YYYYMM') || '-' || lpad(v_seq::text, 3, '0');

  INSERT INTO public.portees (
    ferme_id, mb_id, code_portee, truie_id,
    date_naissance, date_sevrage_prevue,
    effectif_naissance, effectif_actuel
  )
  VALUES (
    NEW.ferme_id, NEW.id, v_code, NEW.truie_id,
    NEW.date_mb, NEW.date_mb + INTERVAL '28 days',
    NEW.nes_vivants, NEW.nes_vivants
  )
  RETURNING id INTO v_portee;

  -- Alerte J+1 prise colostrale (brief 2.4 enrichi)
  INSERT INTO public.alertes_loge (
    ferme_id, type, severity, animal_id, portee_id,
    titre, message, date_evenement
  )
  VALUES (
    NEW.ferme_id, 'colostrum_check', 'critical', NEW.truie_id, v_portee,
    'Vérif prise colostrale J+1',
    'Portée née le ' || NEW.date_mb::text || ' — vérifier que tous les porcelets ont tété le colostrum (priorité absolue 12h).',
    NEW.date_mb + INTERVAL '1 day'
  );

  -- Alerte J+3 soins porcelets (fer, dents, identif)
  INSERT INTO public.alertes_loge (
    ferme_id, type, severity, animal_id, portee_id,
    titre, message, date_evenement
  )
  VALUES (
    NEW.ferme_id, 'soins_porcelets_j3', 'warning', NEW.truie_id, v_portee,
    'Soins porcelets J+3',
    'Portée ' || v_code || ' — fer injectable, taille dents si nécessaire, identification (boucles).',
    NEW.date_mb + INTERVAL '3 days'
  );

  -- Alerte J+21 planifier sevrage
  INSERT INTO public.alertes_loge (
    ferme_id, type, severity, animal_id, portee_id,
    titre, message, date_evenement
  )
  VALUES (
    NEW.ferme_id, 'sevrage_planifier', 'info', NEW.truie_id, v_portee,
    'Planifier le sevrage',
    'Portée ' || v_code || ' aura 28j le ' || (NEW.date_mb + 28)::text || ' — préparer aliment démarrage_1 et loge sevrage.',
    NEW.date_mb + INTERVAL '21 days'
  );

  -- Alerte J+28 sevrage à effectuer
  INSERT INTO public.alertes_loge (
    ferme_id, type, severity, animal_id, portee_id,
    titre, message, date_evenement
  )
  VALUES (
    NEW.ferme_id, 'sevrage_a_effectuer', 'alert', NEW.truie_id, v_portee,
    'Sevrage à effectuer',
    'Portée ' || v_code || ' née le ' || NEW.date_mb::text || ' — sevrage prévu ' || (NEW.date_mb + 28)::text,
    NEW.date_mb + INTERVAL '28 days'
  );

  -- Événement prévu sevrage
  INSERT INTO public.evenements_prevus (
    ferme_id, animal_id, portee_id, type, date_prevue, statut
  )
  VALUES (
    NEW.ferme_id, NEW.truie_id, v_portee, 'sevrage',
    NEW.date_mb + INTERVAL '28 days', 'planifie'
  );

  -- Alerte chaleurs post-sevrage truie (J+28+5 brief 2.4)
  INSERT INTO public.alertes_loge (
    ferme_id, type, severity, animal_id,
    titre, message, date_evenement
  )
  VALUES (
    NEW.ferme_id, 'chaleurs_post_sevrage', 'info', NEW.truie_id,
    'Chaleurs post-sevrage attendues',
    'Truie sevrée — chaleurs probables 5j après sevrage. Préparer saillie.',
    NEW.date_mb + INTERVAL '33 days'
  );

  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_mb_creates_portee ON public.mises_bas;
CREATE TRIGGER trg_mb_creates_portee
  AFTER INSERT ON public.mises_bas
  FOR EACH ROW EXECUTE FUNCTION public.tg_mb_creates_portee();

-- =============================================================================
-- 22bis. TRIGGER V2 — saillie_creates_calendar (brief 2.4)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.tg_saillie_creates_calendar()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- J+21 retour chaleurs (surveillance)
  INSERT INTO public.evenements_prevus (
    ferme_id, animal_id, type, date_prevue, statut, observations
  ) VALUES (
    NEW.ferme_id, NEW.truie_id, 'retour_chaleurs_surveillance',
    NEW.date_saillie + INTERVAL '21 days', 'planifie',
    'Surveiller signes de retour en chaleurs (échec saillie probable).'
  );

  -- J+28 diagnostic écho
  INSERT INTO public.evenements_prevus (
    ferme_id, animal_id, type, date_prevue, statut, observations
  ) VALUES (
    NEW.ferme_id, NEW.truie_id, 'diag_gestation_echo',
    NEW.date_saillie + INTERVAL '28 days', 'planifie',
    'Diagnostic gestation par échographie.'
  );

  -- J+85 préparation maternité
  INSERT INTO public.evenements_prevus (
    ferme_id, animal_id, type, date_prevue, statut, observations
  ) VALUES (
    NEW.ferme_id, NEW.truie_id, 'preparation_maternite',
    NEW.date_saillie + INTERVAL '85 days', 'planifie',
    'Préparer loge maternité (nettoyage, désinfection, lampe).'
  );

  -- J+108 transfert maternité
  INSERT INTO public.evenements_prevus (
    ferme_id, animal_id, type, date_prevue, statut, observations
  ) VALUES (
    NEW.ferme_id, NEW.truie_id, 'transfert_maternite',
    NEW.date_saillie + INTERVAL '108 days', 'planifie',
    'Transférer truie en maternité (J-7 avant MB prévue).'
  );

  -- J+112 surveillance MB
  INSERT INTO public.evenements_prevus (
    ferme_id, animal_id, type, date_prevue, statut, observations
  ) VALUES (
    NEW.ferme_id, NEW.truie_id, 'surveillance_mb',
    NEW.date_saillie + INTERVAL '112 days', 'planifie',
    'Surveillance rapprochée mise bas (J-2 à J0).'
  );

  -- J+114 MB attendue
  INSERT INTO public.evenements_prevus (
    ferme_id, animal_id, type, date_prevue, statut, observations
  ) VALUES (
    NEW.ferme_id, NEW.truie_id, 'mise_bas_attendue',
    NEW.date_saillie + INTERVAL '114 days', 'planifie',
    'Mise bas attendue ce jour.'
  );

  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_saillie_creates_calendar ON public.saillies;
CREATE TRIGGER trg_saillie_creates_calendar
  AFTER INSERT ON public.saillies
  FOR EACH ROW EXECUTE FUNCTION public.tg_saillie_creates_calendar();

-- =============================================================================
-- 22ter. TRIGGER V2 — stade_change_trigger (brief 2.1)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.tg_stade_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.stade IS DISTINCT FROM NEW.stade THEN
    -- Traçabilité décision
    INSERT INTO public.tracabilite_decisions (
      ferme_id, animal_id, type_decision, decision,
      regle_declenchee, valeurs_observees, severity
    ) VALUES (
      NEW.ferme_id, NEW.id, 'transition_stade',
      'Transition de ' || OLD.stade::text || ' vers ' || NEW.stade::text,
      'stade_change_trigger',
      jsonb_build_object(
        'stade_avant', OLD.stade,
        'stade_apres', NEW.stade,
        'poids_actuel_kg', NEW.poids_actuel_kg,
        'date_transition', current_date
      ),
      'info'
    );

    -- Alerte changement formule alimentaire
    INSERT INTO public.alertes_loge (
      ferme_id, type, severity, animal_id,
      titre, message, date_evenement
    ) VALUES (
      NEW.ferme_id, 'transition_stade', 'info', NEW.id,
      'Transition stade : ' || OLD.stade::text || ' → ' || NEW.stade::text,
      'Animal ' || NEW.tag || ' change de stade. Adapter la formule alimentaire et la conduite (rations, environnement).',
      current_date
    );
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_stade_change ON public.animaux;
CREATE TRIGGER trg_stade_change
  AFTER UPDATE OF stade ON public.animaux
  FOR EACH ROW EXECUTE FUNCTION public.tg_stade_change();

-- =============================================================================
-- 23. TRIGGER audit_writes (animaux, saillies, mises_bas, portees, pesees)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.tg_audit_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ferme uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ferme := OLD.ferme_id;
    INSERT INTO public.audit_log (table_name, row_id, action, user_id, ferme_id, before_data, after_data)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), v_ferme, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_ferme := NEW.ferme_id;
    INSERT INTO public.audit_log (table_name, row_id, action, user_id, ferme_id, before_data, after_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', auth.uid(), v_ferme, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    v_ferme := NEW.ferme_id;
    INSERT INTO public.audit_log (table_name, row_id, action, user_id, ferme_id, before_data, after_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', auth.uid(), v_ferme, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY['animaux','saillies','mises_bas','portees','pesees','evenements_sante']) AS t LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%s ON public.%I;', r.t, r.t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.tg_audit_writes();',
      r.t, r.t
    );
  END LOOP;
END$$;

-- =============================================================================
-- 24. RPC creer_ferme_et_lier
-- =============================================================================
CREATE OR REPLACE FUNCTION public.creer_ferme_et_lier(
  nom_ferme text,
  pays_ferme text DEFAULT 'CI'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id   uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  INSERT INTO public.fermes (nom, pays, createur_user_id)
  VALUES (nom_ferme, pays_ferme, v_user)
  RETURNING id INTO v_id;

  INSERT INTO public.user_farms (user_id, ferme_id, role)
  VALUES (v_user, v_id, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END$$;

GRANT EXECUTE ON FUNCTION public.creer_ferme_et_lier(text, text) TO authenticated;

-- =============================================================================
-- 25. RPC enregistrer_mise_bas
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enregistrer_mise_bas(
  truie_uuid uuid,
  date_mb_val date,
  nes_vivants_val int,
  morts_nes_val int DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_ferme uuid;
  v_mb    uuid;
BEGIN
  SELECT ferme_id INTO v_ferme FROM public.animaux WHERE id = truie_uuid;
  IF v_ferme IS NULL THEN
    RAISE EXCEPTION 'Truie introuvable';
  END IF;

  INSERT INTO public.mises_bas (
    ferme_id, truie_id, date_mb, nes_vivants, morts_nes
  )
  VALUES (v_ferme, truie_uuid, date_mb_val, nes_vivants_val, morts_nes_val)
  RETURNING id INTO v_mb;

  RETURN v_mb;
END$$;

GRANT EXECUTE ON FUNCTION public.enregistrer_mise_bas(uuid, date, int, int) TO authenticated;

-- =============================================================================
-- 26. RPC transferer_phase
-- =============================================================================
CREATE OR REPLACE FUNCTION public.transferer_phase(
  portee_uuid uuid,
  nouvelle_phase text,
  date_transit date DEFAULT current_date,
  poids_moyen numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_ferme    uuid;
  v_bat_dest uuid;
  v_bat_src  uuid;
  v_animal   record;
BEGIN
  SELECT ferme_id INTO v_ferme FROM public.portees WHERE id = portee_uuid;
  IF v_ferme IS NULL THEN
    RAISE EXCEPTION 'Portée introuvable';
  END IF;

  SELECT id INTO v_bat_dest
  FROM public.batiments
  WHERE ferme_id = v_ferme AND phase = nouvelle_phase::phase_batiment
    AND deleted_at IS NULL
  ORDER BY ordre_cycle NULLS LAST, nom ASC
  LIMIT 1;

  IF nouvelle_phase = 'demarrage_1' THEN
    UPDATE public.portees
      SET date_entree_demarrage_1 = date_transit,
          poids_moyen_demarrage_1_kg = COALESCE(poids_moyen, poids_moyen_demarrage_1_kg)
      WHERE id = portee_uuid;
  ELSIF nouvelle_phase = 'demarrage_2' THEN
    UPDATE public.portees
      SET date_entree_demarrage_2 = date_transit,
          poids_moyen_demarrage_2_kg = COALESCE(poids_moyen, poids_moyen_demarrage_2_kg)
      WHERE id = portee_uuid;
  ELSIF nouvelle_phase = 'croissance' THEN
    UPDATE public.portees
      SET date_entree_croissance = date_transit,
          poids_moyen_croissance_kg = COALESCE(poids_moyen, poids_moyen_croissance_kg)
      WHERE id = portee_uuid;
  ELSIF nouvelle_phase = 'finition' THEN
    UPDATE public.portees
      SET date_entree_finition = date_transit,
          poids_moyen_finition_kg = COALESCE(poids_moyen, poids_moyen_finition_kg)
      WHERE id = portee_uuid;
  END IF;

  FOR v_animal IN
    SELECT id, batiment_id FROM public.animaux
    WHERE portee_id = portee_uuid AND statut = 'actif'
  LOOP
    v_bat_src := v_animal.batiment_id;

    UPDATE public.animaux
      SET batiment_id = v_bat_dest,
          stade = nouvelle_phase::stade_porc,
          poids_actuel_kg = COALESCE(poids_moyen, poids_actuel_kg),
          date_derniere_pesee = CASE WHEN poids_moyen IS NOT NULL THEN date_transit ELSE date_derniere_pesee END
      WHERE id = v_animal.id;

    INSERT INTO public.mouvements (
      ferme_id, animal_id, type, batiment_source_id, batiment_dest_id,
      date_mouvement, motif
    )
    VALUES (
      v_ferme, v_animal.id, 'transfert', v_bat_src, v_bat_dest,
      date_transit, 'Transit phase ' || nouvelle_phase
    );

    IF poids_moyen IS NOT NULL THEN
      INSERT INTO public.pesees (
        ferme_id, animal_id, portee_id, date_pesee, poids_kg, contexte
      )
      VALUES (
        v_ferme, v_animal.id, portee_uuid, date_transit, poids_moyen,
        nouvelle_phase::contexte_pesee
      );
    END IF;
  END LOOP;
END$$;

GRANT EXECUTE ON FUNCTION public.transferer_phase(uuid, text, date, numeric) TO authenticated;

-- =============================================================================
-- 27. RPC backcalc_phases_portee — algo intelligent (V1)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.backcalc_phases_portee(portee_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_portee     record;
  v_naissance  date;
  v_sevrage    date;
  v_d1         date;
  v_d2         date;
  v_cro        date;
  v_fin        date;
  v_sortie_est date;
  v_age        int;
  v_poids_act  numeric;
  v_gmq_global numeric;
BEGIN
  SELECT * INTO v_portee FROM public.portees WHERE id = portee_uuid;
  IF v_portee IS NULL THEN
    RETURN jsonb_build_object('error', 'portee_introuvable');
  END IF;

  v_naissance := v_portee.date_naissance;

  SELECT AVG(poids_actuel_kg)::numeric INTO v_poids_act
  FROM public.animaux
  WHERE portee_id = portee_uuid AND statut = 'actif' AND poids_actuel_kg IS NOT NULL;

  IF v_poids_act IS NULL THEN
    v_poids_act := COALESCE(
      v_portee.poids_moyen_finition_kg,
      v_portee.poids_moyen_croissance_kg,
      v_portee.poids_moyen_demarrage_2_kg,
      v_portee.poids_moyen_demarrage_1_kg,
      v_portee.poids_moyen_sevrage_kg
    );
  END IF;

  IF v_naissance IS NULL THEN
    RETURN jsonb_build_object('error', 'date_naissance_manquante');
  END IF;

  v_age := GREATEST((current_date - v_naissance)::int, 1);

  IF v_poids_act IS NOT NULL AND v_poids_act > 1.5 THEN
    v_gmq_global := (v_poids_act - 1.5) / v_age;
  ELSE
    v_gmq_global := 0.4;
  END IF;

  v_sevrage := COALESCE(v_portee.date_sevrage_reelle, v_portee.date_sevrage_prevue, v_naissance + 28);
  v_d1      := COALESCE(v_portee.date_entree_demarrage_1, v_sevrage + 5);
  v_d2      := COALESCE(v_portee.date_entree_demarrage_2, v_d1 + 20);
  v_cro     := COALESCE(v_portee.date_entree_croissance,  v_d2 + 22);
  v_fin     := COALESCE(v_portee.date_entree_finition,    v_cro + 67);
  v_sortie_est := COALESCE(v_portee.date_sortie_finition, v_fin + 50);

  RETURN jsonb_build_object(
    'portee_id',        portee_uuid,
    'naissance',        v_naissance,
    'sevrage',          v_sevrage,
    'demarrage_1',      v_d1,
    'demarrage_2',      v_d2,
    'croissance',       v_cro,
    'finition',         v_fin,
    'sortie_estimee',   v_sortie_est,
    'age_jours',        v_age,
    'poids_actuel_kg',  v_poids_act,
    'gmq_global_kg_j',  round(v_gmq_global::numeric, 3)
  );
END$$;

GRANT EXECUTE ON FUNCTION public.backcalc_phases_portee(uuid) TO authenticated;

-- =============================================================================
-- 27bis. RPC V2 — calcul_gmq_actuel (brief 2.3)
-- GMQ entre les 2 dernières pesées (g/jour)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.calcul_gmq_actuel(animal_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_p1 record;
  v_p2 record;
  v_dj int;
BEGIN
  SELECT date_pesee, poids_kg INTO v_p1
  FROM public.pesees
  WHERE animal_id = animal_uuid AND deleted_at IS NULL
  ORDER BY date_pesee DESC, created_at DESC
  LIMIT 1;

  SELECT date_pesee, poids_kg INTO v_p2
  FROM public.pesees
  WHERE animal_id = animal_uuid AND deleted_at IS NULL
    AND date_pesee < v_p1.date_pesee
  ORDER BY date_pesee DESC, created_at DESC
  LIMIT 1;

  IF v_p1 IS NULL OR v_p2 IS NULL THEN
    RETURN NULL;
  END IF;

  v_dj := (v_p1.date_pesee - v_p2.date_pesee);
  IF v_dj <= 0 THEN
    RETURN NULL;
  END IF;

  -- GMQ en g/jour
  RETURN round(((v_p1.poids_kg - v_p2.poids_kg) * 1000.0 / v_dj)::numeric, 1);
END$$;

GRANT EXECUTE ON FUNCTION public.calcul_gmq_actuel(uuid) TO authenticated;

-- =============================================================================
-- 27ter. RPC V2 — date_abattage_projetee (brief 2.3)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.date_abattage_projetee(
  animal_uuid uuid,
  poids_cible_kg numeric DEFAULT 100
)
RETURNS date
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_poids_actuel numeric;
  v_date_pesee   date;
  v_gmq          numeric;
  v_jours        int;
BEGIN
  SELECT poids_kg, date_pesee INTO v_poids_actuel, v_date_pesee
  FROM public.pesees
  WHERE animal_id = animal_uuid AND deleted_at IS NULL
  ORDER BY date_pesee DESC, created_at DESC
  LIMIT 1;

  IF v_poids_actuel IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_poids_actuel >= poids_cible_kg THEN
    RETURN v_date_pesee;
  END IF;

  v_gmq := public.calcul_gmq_actuel(animal_uuid); -- g/j
  IF v_gmq IS NULL OR v_gmq <= 0 THEN
    v_gmq := 600; -- fallback standard CI croissance/finition
  END IF;

  v_jours := ceil(((poids_cible_kg - v_poids_actuel) * 1000.0) / v_gmq);
  RETURN current_date + v_jours;
END$$;

GRANT EXECUTE ON FUNCTION public.date_abattage_projetee(uuid, numeric) TO authenticated;

-- =============================================================================
-- 27quater. RPC V2 — gmq_corrige_stress_thermique (brief 3.5)
-- Correction g/jour : -25 g/j par °C au-dessus de 24°C
--                    + pénalité hygro >75% (-12 g/j par tranche de 10% au-dessus)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.gmq_corrige_stress_thermique(
  animal_uuid  uuid,
  temperature_c numeric,
  humidite_pct  numeric DEFAULT 70
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_gmq_base    numeric;
  v_stade       stade_porc;
  v_correction  numeric := 0;
BEGIN
  v_gmq_base := public.calcul_gmq_actuel(animal_uuid);
  IF v_gmq_base IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT stade INTO v_stade FROM public.animaux WHERE id = animal_uuid;

  IF temperature_c > 24 AND v_stade IN ('croissance','finition') THEN
    v_correction := -25 * (temperature_c - 24);
    IF humidite_pct > 75 THEN
      v_correction := v_correction - (12 * (humidite_pct - 75) / 10);
    END IF;
  END IF;

  RETURN round((v_gmq_base + v_correction)::numeric, 1);
END$$;

GRANT EXECUTE ON FUNCTION public.gmq_corrige_stress_thermique(uuid, numeric, numeric) TO authenticated;

-- =============================================================================
-- 27quinquies. RPC V2 — statut_progression (brief 2.3)
-- Compare poids actuel vs courbe référentielle (donnees_metier.growth_curves)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.statut_progression(animal_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_animal       record;
  v_age_jours    int;
  v_poids_actuel numeric;
  v_date_pesee   date;
  v_gmq_courant  numeric;
  v_curve_data   jsonb;
  v_curve_key    text;
  v_poids_theo   numeric;
  v_gmq_attendu  numeric;
  v_temp_moy     numeric;
  v_correction   numeric := 0;
  v_poids_corr   numeric;
  v_ecart_rel    numeric;
  v_statut       text;
BEGIN
  SELECT a.*, r.code AS race_code_resolved
  INTO v_animal
  FROM public.animaux a
  LEFT JOIN public.races r ON r.id = a.race_id
  WHERE a.id = animal_uuid;

  IF v_animal IS NULL THEN
    RETURN jsonb_build_object('error', 'animal_introuvable');
  END IF;

  IF v_animal.date_naissance IS NULL THEN
    RETURN jsonb_build_object('error', 'date_naissance_manquante');
  END IF;

  v_age_jours := GREATEST((current_date - v_animal.date_naissance)::int, 1);

  SELECT poids_kg, date_pesee INTO v_poids_actuel, v_date_pesee
  FROM public.pesees
  WHERE animal_id = animal_uuid AND deleted_at IS NULL
  ORDER BY date_pesee DESC, created_at DESC
  LIMIT 1;

  IF v_poids_actuel IS NULL THEN
    v_poids_actuel := v_animal.poids_actuel_kg;
  END IF;

  v_gmq_courant := public.calcul_gmq_actuel(animal_uuid);

  -- Cherche la courbe race_x_race_CI puis fallback générique CI
  v_curve_key := COALESCE(v_animal.race_code::text, 'CROISE') || '_CI';
  SELECT data INTO v_curve_data
  FROM public.donnees_metier
  WHERE type = 'growth_curves'
    AND (cle = v_curve_key OR cle = 'CROISE_CI' OR cle = 'default_CI')
    AND actif = true
  ORDER BY (cle = v_curve_key) DESC, version DESC
  LIMIT 1;

  -- Interpolation simple : data attendu = {"points":[{"age_jours":X,"poids_kg":Y,"gmq_g_j":Z},...]}
  IF v_curve_data IS NOT NULL THEN
    WITH pts AS (
      SELECT
        (p->>'age_jours')::int   AS age_j,
        (p->>'poids_kg')::numeric AS poids_k,
        (p->>'gmq_g_j')::numeric  AS gmq_g
      FROM jsonb_array_elements(v_curve_data->'points') p
    ),
    bounded AS (
      SELECT
        (SELECT row_to_json(t) FROM (SELECT * FROM pts WHERE age_j <= v_age_jours ORDER BY age_j DESC LIMIT 1) t) AS low,
        (SELECT row_to_json(t) FROM (SELECT * FROM pts WHERE age_j >  v_age_jours ORDER BY age_j ASC  LIMIT 1) t) AS high
    )
    SELECT
      CASE
        WHEN (low->>'age_j') IS NULL THEN (high->>'poids_k')::numeric
        WHEN (high->>'age_j') IS NULL THEN (low->>'poids_k')::numeric
        ELSE
          (low->>'poids_k')::numeric
          + ((high->>'poids_k')::numeric - (low->>'poids_k')::numeric)
            * (v_age_jours - (low->>'age_j')::int)::numeric
            / NULLIF(((high->>'age_j')::int - (low->>'age_j')::int), 0)
      END,
      COALESCE((low->>'gmq_g')::numeric, (high->>'gmq_g')::numeric)
    INTO v_poids_theo, v_gmq_attendu
    FROM bounded;
  END IF;

  -- Si pas de courbe trouvée → modèle linéaire fallback (cf RPC backcalc)
  IF v_poids_theo IS NULL THEN
    IF v_age_jours <= 28 THEN
      v_poids_theo := 1.5 + (v_age_jours * 0.20); -- pré-sevrage
      v_gmq_attendu := 200;
    ELSIF v_age_jours <= 53 THEN
      v_poids_theo := 7 + ((v_age_jours - 28) * 0.35);
      v_gmq_attendu := 350;
    ELSIF v_age_jours <= 75 THEN
      v_poids_theo := 15 + ((v_age_jours - 53) * 0.45);
      v_gmq_attendu := 450;
    ELSIF v_age_jours <= 142 THEN
      v_poids_theo := 25 + ((v_age_jours - 75) * 0.60);
      v_gmq_attendu := 600;
    ELSE
      v_poids_theo := 65 + ((v_age_jours - 142) * 0.70);
      v_gmq_attendu := 700;
    END IF;
  END IF;

  -- Correction thermique moyenne 7j
  SELECT AVG(temperature_ambiante_c) INTO v_temp_moy
  FROM public.pesees
  WHERE animal_id = animal_uuid
    AND date_pesee >= current_date - INTERVAL '7 days'
    AND temperature_ambiante_c IS NOT NULL;

  IF v_temp_moy IS NOT NULL AND v_temp_moy > 24
     AND v_animal.stade IN ('croissance','finition') THEN
    v_correction := -25 * (v_temp_moy - 24) / 1000.0 * v_age_jours;
  END IF;

  v_poids_corr := v_poids_theo + v_correction;
  IF v_poids_corr IS NULL OR v_poids_corr = 0 THEN
    v_ecart_rel := NULL;
  ELSE
    v_ecart_rel := round(((v_poids_actuel - v_poids_corr) / v_poids_corr)::numeric, 3);
  END IF;

  -- Seuils brief 2.3
  v_statut := CASE
    WHEN v_ecart_rel IS NULL THEN 'inconnu'
    WHEN v_ecart_rel < -0.15 THEN 'retard_severe'
    WHEN v_ecart_rel < -0.08 THEN 'retard_modere'
    WHEN v_ecart_rel >  0.10 THEN 'avance'
    ELSE 'normal'
  END;

  RETURN jsonb_build_object(
    'statut',                         v_statut,
    'ecart_relatif',                  v_ecart_rel,
    'poids_actuel',                   v_poids_actuel,
    'poids_theorique',                v_poids_theo,
    'poids_corrige',                  v_poids_corr,
    'age_jours',                      v_age_jours,
    'gmq_courant_g_j',                v_gmq_courant,
    'gmq_attendu_g_j',                v_gmq_attendu,
    'correction_thermique_appliquee', v_correction,
    'temperature_moyenne_7j',         v_temp_moy,
    'courbe_utilisee',                v_curve_key
  );
END$$;

GRANT EXECUTE ON FUNCTION public.statut_progression(uuid) TO authenticated;

-- =============================================================================
-- 27sexies. RPC V2 — prochaines_alertes_calendaires (brief 2.4)
-- Pour chaque truie saillie active : génère événements calendaires post-saillie
-- =============================================================================
CREATE OR REPLACE FUNCTION public.prochaines_alertes_calendaires(ferme_uuid uuid)
RETURNS TABLE (
  animal_id    uuid,
  truie_tag    text,
  type_alerte  text,
  date_prevue  date,
  message      text,
  priorite     severity_alerte,
  jours_depuis_saillie int
)
LANGUAGE sql
STABLE
AS $$
  WITH saillies_actives AS (
    SELECT s.truie_id, s.date_saillie, a.tag,
           (current_date - s.date_saillie)::int AS j
    FROM public.saillies s
    JOIN public.animaux a ON a.id = s.truie_id
    WHERE s.ferme_id = ferme_uuid
      AND s.deleted_at IS NULL
      AND s.statut IN ('en_cours','confirmee')
      AND s.date_saillie >= current_date - INTERVAL '120 days'
  ),
  events AS (
    SELECT truie_id, tag, 'retour_chaleurs_surveillance' AS t, date_saillie + 21 AS d,
           'J+21 : surveiller signes de retour en chaleurs.' AS m, 'warning'::severity_alerte AS p, j
    FROM saillies_actives
    UNION ALL
    SELECT truie_id, tag, 'diag_gestation_echo', date_saillie + 28,
           'J+28 : diagnostic gestation (échographie).', 'alert'::severity_alerte, j
    FROM saillies_actives
    UNION ALL
    SELECT truie_id, tag, 'preparation_maternite', date_saillie + 85,
           'J+85 : préparer la loge maternité.', 'info'::severity_alerte, j
    FROM saillies_actives
    UNION ALL
    SELECT truie_id, tag, 'transfert_maternite', date_saillie + 108,
           'J+108 : transférer la truie en maternité.', 'warning'::severity_alerte, j
    FROM saillies_actives
    UNION ALL
    SELECT truie_id, tag, 'surveillance_mb', date_saillie + 112,
           'J+112 : surveillance rapprochée mise bas.', 'alert'::severity_alerte, j
    FROM saillies_actives
    UNION ALL
    SELECT truie_id, tag, 'mise_bas_attendue', date_saillie + 114,
           'J+114 : mise bas attendue.', 'critical'::severity_alerte, j
    FROM saillies_actives
  )
  SELECT truie_id, tag, t, d, m, p, j
  FROM events
  WHERE d BETWEEN current_date - INTERVAL '3 days' AND current_date + INTERVAL '14 days'
  ORDER BY d ASC, p DESC;
$$;

GRANT EXECUTE ON FUNCTION public.prochaines_alertes_calendaires(uuid) TO authenticated;

-- =============================================================================
-- 28. VUES INTELLIGENTES V1 (security_invoker=true)
-- =============================================================================

-- 28.1 v_dashboard_kpi
DROP VIEW IF EXISTS public.v_dashboard_kpi CASCADE;
CREATE VIEW public.v_dashboard_kpi
WITH (security_invoker = true) AS
SELECT
  f.id AS ferme_id,
  f.nom AS ferme_nom,
  (SELECT count(*) FROM public.animaux a WHERE a.ferme_id = f.id AND a.statut = 'actif' AND a.deleted_at IS NULL) AS cheptel_total,
  (SELECT count(*) FROM public.animaux a WHERE a.ferme_id = f.id AND a.categorie = 'truie' AND a.statut = 'actif' AND a.deleted_at IS NULL) AS truies_actives,
  (SELECT count(*) FROM public.animaux a WHERE a.ferme_id = f.id AND a.categorie = 'verrat' AND a.statut = 'actif' AND a.deleted_at IS NULL) AS verrats_actifs,
  (SELECT count(*) FROM public.saillies s WHERE s.ferme_id = f.id AND s.statut = 'confirmee' AND s.deleted_at IS NULL) AS truies_pleines,
  (SELECT count(*) FROM public.saillies s WHERE s.ferme_id = f.id AND s.date_mb_prevue BETWEEN current_date AND current_date + 7 AND s.statut IN ('confirmee','en_cours') AND s.deleted_at IS NULL) AS mb_attendues_7j,
  (SELECT count(*) FROM public.portees p WHERE p.ferme_id = f.id AND p.date_sevrage_reelle IS NULL AND p.deleted_at IS NULL) AS portees_en_cours,
  (SELECT count(*) FROM public.alertes_loge al WHERE al.ferme_id = f.id AND al.traitee = false AND al.deleted_at IS NULL) AS alertes_actives
FROM public.fermes f
WHERE f.deleted_at IS NULL;

-- 28.2 v_fertilite_truies
DROP VIEW IF EXISTS public.v_fertilite_truies CASCADE;
CREATE VIEW public.v_fertilite_truies
WITH (security_invoker = true) AS
WITH stats AS (
  SELECT
    a.ferme_id,
    a.id AS truie_id,
    a.tag,
    a.nom,
    count(s.id) FILTER (WHERE s.deleted_at IS NULL) AS nb_saillies,
    count(s.id) FILTER (WHERE s.resultat_diag = 'positif' AND s.deleted_at IS NULL) AS nb_positifs,
    count(s.id) FILTER (WHERE s.resultat_diag = 'retour' AND s.deleted_at IS NULL) AS nb_retours,
    count(mb.id) FILTER (WHERE mb.deleted_at IS NULL) AS nb_mb,
    COALESCE(avg(mb.nes_vivants) FILTER (WHERE mb.deleted_at IS NULL), 0)::numeric(5,2) AS moy_nes_vivants
  FROM public.animaux a
  LEFT JOIN public.saillies s ON s.truie_id = a.id
  LEFT JOIN public.mises_bas mb ON mb.truie_id = a.id
  WHERE a.categorie = 'truie' AND a.deleted_at IS NULL
  GROUP BY a.ferme_id, a.id, a.tag, a.nom
)
SELECT
  *,
  CASE WHEN nb_saillies > 0
       THEN round((nb_positifs::numeric / nb_saillies::numeric) * 100, 1)
       ELSE 0 END AS taux_reussite_pct,
  CASE
    WHEN nb_saillies >= 3
         AND nb_positifs::numeric / GREATEST(nb_saillies,1) < 0.70
      THEN true
    WHEN nb_retours >= 2 THEN true
    WHEN nb_mb >= 8 THEN true
    WHEN nb_mb >= 3 AND moy_nes_vivants < 8 THEN true
    ELSE false
  END AS suggestion_reforme
FROM stats;

-- 28.3 v_fertilite_verrats
DROP VIEW IF EXISTS public.v_fertilite_verrats CASCADE;
CREATE VIEW public.v_fertilite_verrats
WITH (security_invoker = true) AS
WITH stats AS (
  SELECT
    a.ferme_id,
    a.id AS verrat_id,
    a.tag,
    a.nom,
    count(s.id) FILTER (WHERE s.deleted_at IS NULL) AS nb_saillies,
    count(s.id) FILTER (WHERE s.resultat_diag = 'positif' AND s.deleted_at IS NULL) AS nb_positifs,
    max(s.date_saillie) AS derniere_saillie
  FROM public.animaux a
  LEFT JOIN public.saillies s ON s.verrat_id = a.id
  WHERE a.categorie = 'verrat' AND a.deleted_at IS NULL
  GROUP BY a.ferme_id, a.id, a.tag, a.nom
)
SELECT
  *,
  CASE WHEN nb_saillies > 0
       THEN round((nb_positifs::numeric / nb_saillies::numeric) * 100, 1)
       ELSE 0 END AS taux_reussite_pct,
  CASE
    WHEN derniere_saillie IS NULL THEN true
    WHEN derniere_saillie < current_date - 30 THEN true
    ELSE false
  END AS verrat_inactif
FROM stats;

-- 28.4 v_alertes_actives
DROP VIEW IF EXISTS public.v_alertes_actives CASCADE;
CREATE VIEW public.v_alertes_actives
WITH (security_invoker = true) AS
SELECT
  al.id,
  al.ferme_id,
  al.type,
  al.severity,
  al.titre,
  al.message,
  al.date_evenement,
  al.animal_id,
  al.batiment_id,
  al.portee_id,
  al.created_at,
  CASE WHEN al.date_evenement < current_date THEN true ELSE false END AS en_retard,
  (current_date - al.date_evenement) AS jours_retard
FROM public.alertes_loge al
WHERE al.traitee = false AND al.deleted_at IS NULL

UNION ALL

SELECT
  e.id,
  e.ferme_id,
  e.type,
  'warning'::severity_alerte AS severity,
  ('Événement en retard : ' || e.type) AS titre,
  COALESCE(e.observations, '') AS message,
  e.date_prevue AS date_evenement,
  e.animal_id,
  NULL::uuid AS batiment_id,
  e.portee_id,
  e.created_at,
  true AS en_retard,
  (current_date - e.date_prevue) AS jours_retard
FROM public.evenements_prevus e
WHERE e.statut = 'planifie'
  AND e.date_prevue < current_date
  AND e.deleted_at IS NULL;

-- 28.5 v_inventaire_batiment
DROP VIEW IF EXISTS public.v_inventaire_batiment CASCADE;
CREATE VIEW public.v_inventaire_batiment
WITH (security_invoker = true) AS
SELECT
  b.id AS batiment_id,
  b.ferme_id,
  b.nom,
  b.type,
  b.phase,
  b.capacite,
  b.surface_m2,
  b.ration_kg_jour_par_sujet,
  b.temperature_cible_min_c,
  b.temperature_cible_max_c,
  b.humidite_cible_min_pct,
  b.humidite_cible_max_pct,
  b.debit_eau_min_l_min,
  b.ventilation_obligatoire,
  count(a.id) FILTER (WHERE a.statut = 'actif' AND a.deleted_at IS NULL) AS effectif_actuel,
  CASE WHEN b.capacite IS NOT NULL AND b.capacite > 0
       THEN round((count(a.id) FILTER (WHERE a.statut = 'actif' AND a.deleted_at IS NULL)::numeric / b.capacite::numeric) * 100, 1)
       ELSE NULL END AS taux_occupation_pct,
  (count(a.id) FILTER (WHERE a.statut = 'actif' AND a.deleted_at IS NULL)
    * COALESCE(b.ration_kg_jour_par_sujet, 0))::numeric(10,2) AS ration_totale_kg_jour,
  CASE WHEN b.capacite IS NOT NULL
            AND count(a.id) FILTER (WHERE a.statut = 'actif' AND a.deleted_at IS NULL) > b.capacite
       THEN true ELSE false END AS surpopulation
FROM public.batiments b
LEFT JOIN public.animaux a ON a.batiment_id = b.id
WHERE b.deleted_at IS NULL
GROUP BY b.id;

-- 28.6 v_cycle_vie_portee
DROP VIEW IF EXISTS public.v_cycle_vie_portee CASCADE;
CREATE VIEW public.v_cycle_vie_portee
WITH (security_invoker = true) AS
SELECT
  p.id AS portee_id,
  p.ferme_id,
  p.code_portee,
  p.truie_id,
  t.tag AS truie_tag,
  t.nom AS truie_nom,
  p.effectif_naissance,
  p.effectif_actuel,
  p.date_naissance,
  p.date_sevrage_prevue,
  p.date_sevrage_reelle,
  COALESCE(p.date_sevrage_reelle, p.date_sevrage_prevue) AS sevrage_effective_or_prevue,
  p.poids_moyen_sevrage_kg,
  p.date_entree_demarrage_1,
  p.poids_moyen_demarrage_1_kg,
  p.date_entree_demarrage_2,
  p.poids_moyen_demarrage_2_kg,
  p.date_entree_croissance,
  p.poids_moyen_croissance_kg,
  p.date_entree_finition,
  p.poids_moyen_finition_kg,
  p.date_sortie_finition,
  (current_date - p.date_naissance) AS age_jours,
  CASE
    WHEN p.date_sortie_finition IS NOT NULL THEN 'sortie'
    WHEN p.date_entree_finition IS NOT NULL THEN 'finition'
    WHEN p.date_entree_croissance IS NOT NULL THEN 'croissance'
    WHEN p.date_entree_demarrage_2 IS NOT NULL THEN 'demarrage_2'
    WHEN p.date_entree_demarrage_1 IS NOT NULL THEN 'demarrage_1'
    WHEN p.date_sevrage_reelle IS NOT NULL THEN 'sevre'
    ELSE 'allaitement'
  END AS phase_actuelle
FROM public.portees p
LEFT JOIN public.animaux t ON t.id = p.truie_id
WHERE p.deleted_at IS NULL;

-- 28.7 v_gmq_par_phase
DROP VIEW IF EXISTS public.v_gmq_par_phase CASCADE;
CREATE VIEW public.v_gmq_par_phase
WITH (security_invoker = true) AS
WITH ordered AS (
  SELECT
    p.ferme_id,
    p.animal_id,
    p.portee_id,
    p.contexte,
    p.date_pesee,
    p.poids_kg,
    lag(p.date_pesee) OVER (PARTITION BY p.animal_id ORDER BY p.date_pesee) AS date_prec,
    lag(p.poids_kg)   OVER (PARTITION BY p.animal_id ORDER BY p.date_pesee) AS poids_prec,
    lag(p.contexte)   OVER (PARTITION BY p.animal_id ORDER BY p.date_pesee) AS contexte_prec
  FROM public.pesees p
  WHERE p.animal_id IS NOT NULL AND p.deleted_at IS NULL
)
SELECT
  ferme_id, animal_id, portee_id,
  contexte_prec AS phase_depart,
  contexte      AS phase_arrivee,
  date_prec     AS date_debut,
  date_pesee    AS date_fin,
  poids_prec    AS poids_debut_kg,
  poids_kg      AS poids_fin_kg,
  (date_pesee - date_prec) AS duree_jours,
  CASE WHEN (date_pesee - date_prec) > 0
       THEN round(((poids_kg - poids_prec) / (date_pesee - date_prec))::numeric, 3)
       ELSE NULL END AS gmq_kg_jour
FROM ordered
WHERE date_prec IS NOT NULL;

-- =============================================================================
-- 28bis. VUES V2 — intelligentes brief CI
-- =============================================================================

-- 28bis.1 v_gmq_corrige_thermique — brief 3.5
DROP VIEW IF EXISTS public.v_gmq_corrige_thermique CASCADE;
CREATE VIEW public.v_gmq_corrige_thermique
WITH (security_invoker = true) AS
WITH last_pesee AS (
  SELECT DISTINCT ON (animal_id)
    animal_id, ferme_id, poids_kg AS poids_actuel_kg, date_pesee
  FROM public.pesees
  WHERE animal_id IS NOT NULL AND deleted_at IS NULL
  ORDER BY animal_id, date_pesee DESC, created_at DESC
),
temp_moy AS (
  SELECT
    animal_id,
    AVG(temperature_ambiante_c) AS temperature_moyenne_7j
  FROM public.pesees
  WHERE animal_id IS NOT NULL
    AND deleted_at IS NULL
    AND date_pesee >= current_date - INTERVAL '7 days'
    AND temperature_ambiante_c IS NOT NULL
  GROUP BY animal_id
)
SELECT
  a.ferme_id,
  a.id AS animal_id,
  a.tag,
  a.stade,
  lp.poids_actuel_kg,
  public.calcul_gmq_actuel(a.id) AS gmq_courant_g_j,
  tm.temperature_moyenne_7j,
  CASE
    WHEN tm.temperature_moyenne_7j IS NOT NULL
         AND tm.temperature_moyenne_7j > 24
         AND a.stade IN ('croissance','finition')
    THEN public.gmq_corrige_stress_thermique(a.id, tm.temperature_moyenne_7j, 70)
    ELSE public.calcul_gmq_actuel(a.id)
  END AS gmq_corrige_g_j
FROM public.animaux a
LEFT JOIN last_pesee lp ON lp.animal_id = a.id
LEFT JOIN temp_moy   tm ON tm.animal_id = a.id
WHERE a.deleted_at IS NULL
  AND a.statut = 'actif'
  AND a.stade IN ('croissance','finition');

-- 28bis.2 v_score_progression_porc — brief 2.3
DROP VIEW IF EXISTS public.v_score_progression_porc CASCADE;
CREATE VIEW public.v_score_progression_porc
WITH (security_invoker = true) AS
SELECT
  a.ferme_id,
  a.id AS animal_id,
  a.tag,
  a.stade,
  (current_date - a.date_naissance) AS age_jours,
  (public.statut_progression(a.id) ->> 'poids_actuel')::numeric    AS poids_actuel,
  (public.statut_progression(a.id) ->> 'poids_theorique')::numeric AS poids_theorique,
  (public.statut_progression(a.id) ->> 'poids_corrige')::numeric   AS poids_corrige,
  (public.statut_progression(a.id) ->> 'ecart_relatif')::numeric   AS ecart_relatif,
  (public.statut_progression(a.id) ->> 'statut')                   AS statut,
  (public.statut_progression(a.id) ->> 'gmq_courant_g_j')::numeric AS gmq_courant_g_j,
  (public.statut_progression(a.id) ->> 'gmq_attendu_g_j')::numeric AS gmq_attendu_g_j
FROM public.animaux a
WHERE a.deleted_at IS NULL
  AND a.statut = 'actif'
  AND a.stade IN ('lactation','demarrage_1','demarrage_2','croissance','finition')
  AND a.date_naissance IS NOT NULL;

-- 28bis.3 v_priorisation_alertes — brief 5.5
DROP VIEW IF EXISTS public.v_priorisation_alertes CASCADE;
CREATE VIEW public.v_priorisation_alertes
WITH (security_invoker = true) AS
WITH ranked AS (
  SELECT
    al.*,
    row_number() OVER (
      PARTITION BY al.ferme_id
      ORDER BY
        CASE al.severity
          WHEN 'critical' THEN 1
          WHEN 'alert'    THEN 2
          WHEN 'warning'  THEN 3
          ELSE 4
        END,
        al.date_evenement ASC
    ) AS rang
  FROM public.alertes_loge al
  WHERE al.traitee = false AND al.deleted_at IS NULL
)
SELECT
  ferme_id, id AS alerte_id, type, severity, titre, message,
  date_evenement, animal_id, batiment_id, portee_id, created_at, rang
FROM ranked
WHERE rang <= 2;

-- 28bis.4 v_courbe_croissance_referentielle
DROP VIEW IF EXISTS public.v_courbe_croissance_referentielle CASCADE;
CREATE VIEW public.v_courbe_croissance_referentielle
WITH (security_invoker = true) AS
SELECT
  dm.id           AS donnee_metier_id,
  dm.cle          AS race_contexte,
  dm.pays,
  dm.version,
  dm.actif,
  (p->>'age_jours')::int   AS age_jours,
  (p->>'poids_kg')::numeric AS poids_kg,
  (p->>'gmq_g_j')::numeric  AS gmq_g_j,
  (p->>'stade')             AS stade,
  (p->>'contexte')          AS contexte
FROM public.donnees_metier dm
CROSS JOIN LATERAL jsonb_array_elements(dm.data->'points') p
WHERE dm.type = 'growth_curves' AND dm.actif = true;

-- 28bis.5 v_calendrier_reproductif
DROP VIEW IF EXISTS public.v_calendrier_reproductif CASCADE;
CREATE VIEW public.v_calendrier_reproductif
WITH (security_invoker = true) AS
WITH derniere_saillie AS (
  SELECT DISTINCT ON (s.truie_id)
    s.truie_id, s.ferme_id, s.date_saillie, s.statut, s.resultat_diag, s.date_mb_prevue
  FROM public.saillies s
  WHERE s.deleted_at IS NULL
  ORDER BY s.truie_id, s.date_saillie DESC
),
derniere_mb AS (
  SELECT DISTINCT ON (mb.truie_id)
    mb.truie_id, mb.date_mb, mb.nes_vivants
  FROM public.mises_bas mb
  WHERE mb.deleted_at IS NULL
  ORDER BY mb.truie_id, mb.date_mb DESC
),
portee_active AS (
  SELECT DISTINCT ON (p.truie_id)
    p.truie_id, p.date_sevrage_reelle, p.date_sevrage_prevue, p.date_naissance
  FROM public.portees p
  WHERE p.deleted_at IS NULL
  ORDER BY p.truie_id, p.date_naissance DESC
)
SELECT
  a.ferme_id,
  a.id AS truie_id,
  a.tag,
  a.nom,
  a.stade,
  ds.date_saillie,
  ds.statut         AS statut_saillie,
  ds.resultat_diag,
  ds.date_mb_prevue,
  dmb.date_mb       AS derniere_mb,
  dmb.nes_vivants   AS derniere_portee_vivants,
  pa.date_sevrage_prevue,
  pa.date_sevrage_reelle,
  CASE
    WHEN pa.date_sevrage_reelle IS NULL AND dmb.date_mb IS NOT NULL
         AND (current_date - dmb.date_mb) < 35 THEN 'allaitante'
    WHEN ds.date_mb_prevue IS NOT NULL AND ds.date_mb_prevue >= current_date
         AND ds.resultat_diag IN ('positif','en_attente') THEN 'gestante'
    WHEN ds.date_saillie IS NOT NULL AND (current_date - ds.date_saillie) < 28 THEN 'saillie_recente'
    WHEN ds.date_saillie IS NULL OR ds.resultat_diag IN ('retour','negatif','avorte') THEN 'vide'
    ELSE 'a_verifier'
  END AS statut_reproductif,
  COALESCE(
    ds.date_mb_prevue,
    pa.date_sevrage_prevue + 5,
    ds.date_saillie + 28
  ) AS prochaine_action_due,
  COALESCE(
    ds.date_mb_prevue,
    pa.date_sevrage_prevue + 5,
    ds.date_saillie + 28
  ) - current_date AS jours_jusqu_action
FROM public.animaux a
LEFT JOIN derniere_saillie ds ON ds.truie_id = a.id
LEFT JOIN derniere_mb     dmb ON dmb.truie_id = a.id
LEFT JOIN portee_active   pa  ON pa.truie_id  = a.id
WHERE a.deleted_at IS NULL
  AND a.statut = 'actif'
  AND a.sexe = 'F'
  AND a.categorie IN ('truie','cochette');

-- =============================================================================
-- 29. RLS — Activation
-- =============================================================================
ALTER TABLE public.fermes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateurs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_farms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.races                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batiments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animaux                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saillies               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mises_bas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portees                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesees                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mouvements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matieres_premieres     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertes_loge           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenements_prevus      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenements_sante       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracabilite_decisions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donnees_metier         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbooks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log              ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 30. RLS — fermes
-- =============================================================================
DROP POLICY IF EXISTS "fermes_select" ON public.fermes;
CREATE POLICY "fermes_select" ON public.fermes
  FOR SELECT USING (
    id IN (SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "fermes_insert" ON public.fermes;
CREATE POLICY "fermes_insert" ON public.fermes
  FOR INSERT WITH CHECK (createur_user_id = auth.uid());

DROP POLICY IF EXISTS "fermes_update" ON public.fermes;
CREATE POLICY "fermes_update" ON public.fermes
  FOR UPDATE USING (
    id IN (SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "fermes_delete" ON public.fermes;
CREATE POLICY "fermes_delete" ON public.fermes
  FOR DELETE USING (createur_user_id = auth.uid());

-- =============================================================================
-- 31. RLS — utilisateurs
-- =============================================================================
DROP POLICY IF EXISTS "utilisateurs_select" ON public.utilisateurs;
CREATE POLICY "utilisateurs_select" ON public.utilisateurs
  FOR SELECT USING (auth_id = auth.uid());

DROP POLICY IF EXISTS "utilisateurs_update" ON public.utilisateurs;
CREATE POLICY "utilisateurs_update" ON public.utilisateurs
  FOR UPDATE USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

DROP POLICY IF EXISTS "utilisateurs_insert" ON public.utilisateurs;
CREATE POLICY "utilisateurs_insert" ON public.utilisateurs
  FOR INSERT WITH CHECK (auth_id = auth.uid());

-- =============================================================================
-- 32. RLS — user_farms
-- =============================================================================
DROP POLICY IF EXISTS "user_farms_select" ON public.user_farms;
CREATE POLICY "user_farms_select" ON public.user_farms
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_farms_all" ON public.user_farms;
CREATE POLICY "user_farms_all" ON public.user_farms
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 33. RLS — tables avec ferme_id (isolation stricte)
-- =============================================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'races','batiments','animaux','saillies','mises_bas','portees','pesees',
    'mouvements','matieres_premieres','rations','alertes_loge','evenements_prevus',
    'evenements_sante','tracabilite_decisions'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_select" ON public.%I FOR SELECT USING (
         ferme_id IN (SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid())
       );', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_modify" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_modify" ON public.%I FOR ALL
         USING (ferme_id IN (SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()))
         WITH CHECK (ferme_id IN (SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid()));',
      t, t);
  END LOOP;
END$$;

-- =============================================================================
-- 33bis. RLS — donnees_metier et playbooks (référentiel partagé)
-- SELECT pour tout authenticated ; UPDATE/INSERT/DELETE réservé service_role
-- =============================================================================
DROP POLICY IF EXISTS "donnees_metier_select" ON public.donnees_metier;
CREATE POLICY "donnees_metier_select" ON public.donnees_metier
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "playbooks_select" ON public.playbooks;
CREATE POLICY "playbooks_select" ON public.playbooks
  FOR SELECT TO authenticated USING (actif = true);

-- =============================================================================
-- 34. RLS — audit_log
-- =============================================================================
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT USING (
    ferme_id IS NULL OR ferme_id IN (SELECT ferme_id FROM public.user_farms WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 35. GRANTS
-- =============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fermes                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utilisateurs          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_farms            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.races                 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batiments             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.animaux               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saillies              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mises_bas             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portees               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pesees                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mouvements            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matieres_premieres    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rations               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertes_loge          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evenements_prevus     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evenements_sante      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracabilite_decisions TO authenticated;
GRANT SELECT                          ON public.donnees_metier       TO authenticated;
GRANT SELECT                          ON public.playbooks            TO authenticated;
GRANT SELECT                          ON public.audit_log            TO authenticated;

GRANT USAGE ON SEQUENCE seq_numero_client TO authenticated;
GRANT USAGE ON SEQUENCE seq_code_ferme    TO authenticated;

GRANT SELECT ON public.v_dashboard_kpi                  TO authenticated;
GRANT SELECT ON public.v_fertilite_truies               TO authenticated;
GRANT SELECT ON public.v_fertilite_verrats              TO authenticated;
GRANT SELECT ON public.v_alertes_actives                TO authenticated;
GRANT SELECT ON public.v_inventaire_batiment            TO authenticated;
GRANT SELECT ON public.v_cycle_vie_portee               TO authenticated;
GRANT SELECT ON public.v_gmq_par_phase                  TO authenticated;
GRANT SELECT ON public.v_gmq_corrige_thermique          TO authenticated;
GRANT SELECT ON public.v_score_progression_porc         TO authenticated;
GRANT SELECT ON public.v_priorisation_alertes           TO authenticated;
GRANT SELECT ON public.v_courbe_croissance_referentielle TO authenticated;
GRANT SELECT ON public.v_calendrier_reproductif         TO authenticated;

-- =============================================================================
-- 36. SANITY CHECK FINAL
-- =============================================================================
SELECT 'GENESIS V2 OK' AS status,
       count(*)        AS tables_created
FROM pg_tables
WHERE schemaname = 'public';
