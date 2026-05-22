-- ============================================================================
-- SMARTFARM — FIX RLS LEAKS (audit adversaire)
-- Migration : 20260520170001_fix_rls_leaks
-- Auteur    : Hermes pour Christophe Liegeois
-- ----------------------------------------------------------------------------
-- CONTEXTE
--   L'audit RLS a relevé 3 policies SELECT en `using (true)` :
--     * protocoles_vaccinaux
--     * types_aliment
--     * fournisseurs
--
--   Si on active RLS demain, ces 3 policies laissent fuiter des données
--   cross-tenant (chaque utilisateur authentifié voit TOUT, même les
--   fermes auxquelles il n'a pas accès).
--
-- RATIONALE DU FIX (après vérification du schéma réel) :
--
--   1) protocoles_vaccinaux : possède un `ferme_id NOT NULL` (FK fermes).
--      → C'est une donnée par-ferme, PAS un référentiel global. La policy
--        SELECT doit donc filtrer via `user_has_farm_access(ferme_id)`.
--      → On corrige aussi la policy WRITE pour qu'elle vérifie aussi
--        l'appartenance à la ferme (et pas juste le rôle).
--
--   2) types_aliment : PAS de ferme_id. C'est un référentiel partagé
--      (catalogue d'aliments, identique pour toutes les fermes).
--      → SELECT public (`using true`) est légitime et reste tel quel.
--      → WRITE doit être restreint au staff technique :
--        admin / manager / technicien (déjà en place — on confirme).
--
--   3) fournisseurs : PAS de ferme_id. Référentiel partagé également
--      (catalogue de fournisseurs national, plusieurs fermes peuvent
--      commander chez le même fournisseur).
--      → SELECT public légitime, reste tel quel.
--      → WRITE restreint à admin/manager/technicien (déjà en place).
--
-- NOTE
--   Cette migration est idempotente (DROP POLICY IF EXISTS avant CREATE)
--   et ne modifie PAS l'état d'activation RLS. Les tables restent en
--   `row security disabled` jusqu'à l'activation explicite via RLS.md.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. protocoles_vaccinaux : SELECT scoped par ferme_id, WRITE scoped aussi
-- ----------------------------------------------------------------------------
drop policy if exists protocoles_vaccinaux_select on protocoles_vaccinaux;
create policy protocoles_vaccinaux_select on protocoles_vaccinaux for select
  using (user_has_farm_access(ferme_id));

drop policy if exists protocoles_vaccinaux_write on protocoles_vaccinaux;
create policy protocoles_vaccinaux_write on protocoles_vaccinaux for all
  using (
    ferme_id = current_farm_id()
    and current_user_role() in ('admin','manager','veterinaire')
  )
  with check (
    ferme_id = current_farm_id()
    and current_user_role() in ('admin','manager','veterinaire')
  );

-- ----------------------------------------------------------------------------
-- 2. types_aliment : référentiel global — SELECT public OK, WRITE staff
-- ----------------------------------------------------------------------------
-- SELECT laissé en `using (true)` volontairement (référentiel partagé).
-- On le ré-écrit explicitement pour traçabilité de la décision.
drop policy if exists types_aliment_select on types_aliment;
create policy types_aliment_select on types_aliment for select
  using (true);
comment on policy types_aliment_select on types_aliment is
  'Référentiel global d''aliments — lecture autorisée à tout utilisateur authentifié (pas de ferme_id).';

drop policy if exists types_aliment_write on types_aliment;
create policy types_aliment_write on types_aliment for all
  using (current_user_role() in ('admin','manager','technicien'))
  with check (current_user_role() in ('admin','manager','technicien'));

-- ----------------------------------------------------------------------------
-- 3. fournisseurs : référentiel global — SELECT public OK, WRITE staff
-- ----------------------------------------------------------------------------
drop policy if exists fournisseurs_select on fournisseurs;
create policy fournisseurs_select on fournisseurs for select
  using (true);
comment on policy fournisseurs_select on fournisseurs is
  'Référentiel global de fournisseurs — lecture autorisée à tout utilisateur authentifié (pas de ferme_id).';

drop policy if exists fournisseurs_write on fournisseurs;
create policy fournisseurs_write on fournisseurs for all
  using (current_user_role() in ('admin','manager','technicien'))
  with check (current_user_role() in ('admin','manager','technicien'));
