-- Migration : Activation RLS complète + policies pour tables manquantes
-- PROD-A V2 : préparer le multi-tenant pour quand Christophe branchera Supabase Auth Cloud
-- En mode demo : le wrapper server.ts utilise service_role → bypass RLS sans casser l'app
-- Quand l'auth réelle sera branchée : RLS protège déjà toutes les tables

BEGIN;

-- ============================================================================
-- 1. Activer RLS sur les 31 tables qui ont déjà des policies
-- ============================================================================
ALTER TABLE animaux                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bande_animaux               ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE consommations_aliment       ENABLE ROW LEVEL SECURITY;
ALTER TABLE departs                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostics_gestation       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fermes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulation_ingredients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE matieres_premieres          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mises_bas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortalites                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements_stock            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesees                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans_alimentation          ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocoles_vaccinaux        ENABLE ROW LEVEL SECURITY;
ALTER TABLE races                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE regles_sevrage              ENABLE ROW LEVEL SECURITY;
ALTER TABLE saillies                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE salles                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sevrages                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitements                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE types_aliment               ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateur_fermes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateurs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations                ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Créer policies + activer RLS sur les 12 tables sans policies
-- ============================================================================

-- biosecurite_audits (ferme_id direct)
DROP POLICY IF EXISTS "biosecurite_audits_select" ON biosecurite_audits;
CREATE POLICY "biosecurite_audits_select" ON biosecurite_audits FOR SELECT
  USING (user_has_farm_access(ferme_id));
DROP POLICY IF EXISTS "biosecurite_audits_write" ON biosecurite_audits;
CREATE POLICY "biosecurite_audits_write" ON biosecurite_audits
  USING (current_user_role() IS NOT NULL AND current_user_role() <> 'viewer' AND ferme_id = current_farm_id())
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE biosecurite_audits ENABLE ROW LEVEL SECURITY;

-- biosecurite_checklist : référentiel public (lecture libre)
DROP POLICY IF EXISTS "biosecurite_checklist_select" ON biosecurite_checklist;
CREATE POLICY "biosecurite_checklist_select" ON biosecurite_checklist FOR SELECT USING (true);
ALTER TABLE biosecurite_checklist ENABLE ROW LEVEL SECURITY;

-- checks_post_mb (via mise_bas → truie → ferme)
DROP POLICY IF EXISTS "checks_post_mb_select" ON checks_post_mb;
CREATE POLICY "checks_post_mb_select" ON checks_post_mb FOR SELECT
  USING (EXISTS (SELECT 1 FROM mises_bas mb JOIN animaux a ON a.id=mb.truie_id WHERE mb.id=checks_post_mb.mise_bas_id AND user_has_farm_access(a.ferme_id)));
DROP POLICY IF EXISTS "checks_post_mb_write" ON checks_post_mb;
CREATE POLICY "checks_post_mb_write" ON checks_post_mb
  USING (EXISTS (SELECT 1 FROM mises_bas mb JOIN animaux a ON a.id=mb.truie_id WHERE mb.id=checks_post_mb.mise_bas_id AND a.ferme_id=current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer'))
  WITH CHECK (EXISTS (SELECT 1 FROM mises_bas mb JOIN animaux a ON a.id=mb.truie_id WHERE mb.id=checks_post_mb.mise_bas_id AND a.ferme_id=current_farm_id()));
ALTER TABLE checks_post_mb ENABLE ROW LEVEL SECURITY;

-- consommations_eau (ferme_id direct)
DROP POLICY IF EXISTS "consommations_eau_select" ON consommations_eau;
CREATE POLICY "consommations_eau_select" ON consommations_eau FOR SELECT
  USING (user_has_farm_access(ferme_id));
DROP POLICY IF EXISTS "consommations_eau_write" ON consommations_eau;
CREATE POLICY "consommations_eau_write" ON consommations_eau
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE consommations_eau ENABLE ROW LEVEL SECURITY;

-- evenements_prevus
DROP POLICY IF EXISTS "evenements_prevus_select" ON evenements_prevus;
CREATE POLICY "evenements_prevus_select" ON evenements_prevus FOR SELECT
  USING (user_has_farm_access(ferme_id));
DROP POLICY IF EXISTS "evenements_prevus_write" ON evenements_prevus;
CREATE POLICY "evenements_prevus_write" ON evenements_prevus
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE evenements_prevus ENABLE ROW LEVEL SECURITY;

-- lots_matieres_premieres
DROP POLICY IF EXISTS "lots_matieres_premieres_select" ON lots_matieres_premieres;
CREATE POLICY "lots_matieres_premieres_select" ON lots_matieres_premieres FOR SELECT
  USING (user_has_farm_access(ferme_id));
DROP POLICY IF EXISTS "lots_matieres_premieres_write" ON lots_matieres_premieres;
CREATE POLICY "lots_matieres_premieres_write" ON lots_matieres_premieres
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE lots_matieres_premieres ENABLE ROW LEVEL SECURITY;

-- ppa_observations
DROP POLICY IF EXISTS "ppa_observations_select" ON ppa_observations;
CREATE POLICY "ppa_observations_select" ON ppa_observations FOR SELECT
  USING (user_has_farm_access(ferme_id));
DROP POLICY IF EXISTS "ppa_observations_write" ON ppa_observations;
CREATE POLICY "ppa_observations_write" ON ppa_observations
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE ppa_observations ENABLE ROW LEVEL SECURITY;

-- produits_anti_mycotoxines : référentiel public (lecture libre)
DROP POLICY IF EXISTS "produits_anti_mycotoxines_select" ON produits_anti_mycotoxines;
CREATE POLICY "produits_anti_mycotoxines_select" ON produits_anti_mycotoxines FOR SELECT USING (true);
ALTER TABLE produits_anti_mycotoxines ENABLE ROW LEVEL SECURITY;

-- protocoles_anti_mycotoxines
DROP POLICY IF EXISTS "protocoles_anti_mycotoxines_select" ON protocoles_anti_mycotoxines;
CREATE POLICY "protocoles_anti_mycotoxines_select" ON protocoles_anti_mycotoxines FOR SELECT
  USING (user_has_farm_access(ferme_id));
DROP POLICY IF EXISTS "protocoles_anti_mycotoxines_write" ON protocoles_anti_mycotoxines;
CREATE POLICY "protocoles_anti_mycotoxines_write" ON protocoles_anti_mycotoxines
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE protocoles_anti_mycotoxines ENABLE ROW LEVEL SECURITY;

-- tips_conseiller : référentiel public (lecture libre)
DROP POLICY IF EXISTS "tips_conseiller_select" ON tips_conseiller;
CREATE POLICY "tips_conseiller_select" ON tips_conseiller FOR SELECT USING (true);
ALTER TABLE tips_conseiller ENABLE ROW LEVEL SECURITY;

-- transits_phase
DROP POLICY IF EXISTS "transits_phase_select" ON transits_phase;
CREATE POLICY "transits_phase_select" ON transits_phase FOR SELECT
  USING (user_has_farm_access(ferme_id));
DROP POLICY IF EXISTS "transits_phase_write" ON transits_phase;
CREATE POLICY "transits_phase_write" ON transits_phase
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE transits_phase ENABLE ROW LEVEL SECURITY;

-- visites_biosecurite
DROP POLICY IF EXISTS "visites_biosecurite_select" ON visites_biosecurite;
CREATE POLICY "visites_biosecurite_select" ON visites_biosecurite FOR SELECT
  USING (user_has_farm_access(ferme_id));
DROP POLICY IF EXISTS "visites_biosecurite_write" ON visites_biosecurite;
CREATE POLICY "visites_biosecurite_write" ON visites_biosecurite
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE visites_biosecurite ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Fonction d'audit RLS (vérif post-migration et monitoring)
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_rls_status()
RETURNS TABLE (table_name text, rls_enabled boolean, nb_policies bigint) AS $$
  SELECT
    c.relname::text,
    c.relrowsecurity,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = c.relname AND p.schemaname = 'public')
  FROM pg_class c
  WHERE c.relkind='r'
    AND c.relnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
    AND c.relname NOT LIKE 'pg_%'
  ORDER BY c.relname;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION verify_rls_status() TO anon, authenticated;

COMMIT;
