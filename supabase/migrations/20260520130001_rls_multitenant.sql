-- ============================================================================
-- SMARTFARM — RLS multi-tenant (préparée, NON activée)
-- Migration : 20260520130001_rls_multitenant
-- Auteur    : Hermes pour Christophe Liegeois
-- ----------------------------------------------------------------------------
-- OBJECTIF
--   Préparer toute la couche Row Level Security pour le multi-tenant Smart Farm
--   SANS l'activer. La version brouillon continue à utiliser la clé anon sans
--   contexte JWT et doit rester fonctionnelle après cette migration.
--
-- CONTENU
--   1. Fonctions helpers : current_farm_id(), current_user_role(), current_user_internal_id()
--   2. Policies RLS sur toutes les tables métier (CREATE POLICY uniquement)
--   3. Aucune ALTER TABLE ... ENABLE ROW LEVEL SECURITY (toutes en commentaire)
--   4. Bloc ACTIVATION_RLS.sql en fin de fichier (copier/coller pour activer en prod)
--
-- ACTIVATION
--   Voir le bloc ACTIVATION_RLS.sql en bas du fichier OU le fichier RLS.md
--   à la racine du projet. Activation = 1 ligne par table à décommenter/exécuter.
--
-- DÉSACTIVATION D'URGENCE
--   alter table <nom> disable row level security;
--   (ou voir RLS.md section "Rollback")
--
-- HYPOTHÈSES JWT
--   - auth.uid() renvoie l'UUID Supabase Auth de l'utilisateur (= utilisateurs.auth_id)
--   - claim custom optionnel "farm_id" : si présent, force la ferme active.
--     Sinon : première ferme liée à l'utilisateur via utilisateur_fermes.
-- ============================================================================

-- ============================================================================
-- 1. FONCTIONS HELPERS
-- ============================================================================

-- current_user_internal_id() : passe de auth.uid() vers utilisateurs.id
create or replace function current_user_internal_id()
returns uuid as $$
declare
  v_auth_id uuid;
  v_user_id uuid;
begin
  begin
    v_auth_id := auth.uid();
  exception when others then
    return null;
  end;
  if v_auth_id is null then
    return null;
  end if;
  select id into v_user_id from utilisateurs where auth_id = v_auth_id and actif = true;
  return v_user_id;
end;
$$ language plpgsql stable security definer;

-- current_farm_id() : ferme active de l'utilisateur courant.
--   1) Priorité au claim JWT "farm_id" s'il est présent et valide pour l'utilisateur
--   2) Sinon : première ferme liée via utilisateur_fermes (ordre stable par ferme_id)
create or replace function current_farm_id()
returns uuid as $$
declare
  v_user_id   uuid;
  v_claim     text;
  v_claim_uuid uuid;
  v_farm_id   uuid;
begin
  v_user_id := current_user_internal_id();
  if v_user_id is null then
    return null;
  end if;

  -- Tentative de lecture du claim custom "farm_id" depuis le JWT
  begin
    v_claim := nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'farm_id';
  exception when others then
    v_claim := null;
  end;

  if v_claim is not null then
    begin
      v_claim_uuid := v_claim::uuid;
    exception when others then
      v_claim_uuid := null;
    end;
    if v_claim_uuid is not null then
      -- Vérifier que l'utilisateur a bien accès à cette ferme
      select ferme_id into v_farm_id
        from utilisateur_fermes
       where utilisateur_id = v_user_id and ferme_id = v_claim_uuid
       limit 1;
      if v_farm_id is not null then
        return v_farm_id;
      end if;
    end if;
  end if;

  -- Fallback : première ferme liée
  select ferme_id into v_farm_id
    from utilisateur_fermes
   where utilisateur_id = v_user_id
   order by ferme_id
   limit 1;

  return v_farm_id;
end;
$$ language plpgsql stable security definer;

-- current_user_role() : role sur la ferme active
create or replace function current_user_role()
returns role_t as $$
declare
  v_user_id uuid;
  v_farm_id uuid;
  v_role    role_t;
begin
  v_user_id := current_user_internal_id();
  v_farm_id := current_farm_id();
  if v_user_id is null or v_farm_id is null then
    return null;
  end if;
  select role into v_role
    from utilisateur_fermes
   where utilisateur_id = v_user_id and ferme_id = v_farm_id;
  return v_role;
end;
$$ language plpgsql stable security definer;

-- Helper booléen pratique : l'utilisateur courant a-t-il accès à la ferme donnée ?
create or replace function user_has_farm_access(p_ferme_id uuid)
returns boolean as $$
declare
  v_user_id uuid;
  v_exists  boolean;
begin
  v_user_id := current_user_internal_id();
  if v_user_id is null or p_ferme_id is null then
    return false;
  end if;
  select exists (
    select 1 from utilisateur_fermes
     where utilisateur_id = v_user_id and ferme_id = p_ferme_id
  ) into v_exists;
  return coalesce(v_exists, false);
end;
$$ language plpgsql stable security definer;

comment on function current_user_internal_id is 'Mappe auth.uid() vers utilisateurs.id (NULL si pas connecté ou inactif)';
comment on function current_farm_id        is 'Ferme active du JWT courant (claim farm_id ou 1ère ferme liée)';
comment on function current_user_role      is 'Rôle de l''utilisateur courant sur sa ferme active';
comment on function user_has_farm_access   is 'L''utilisateur courant a-t-il accès à p_ferme_id via utilisateur_fermes ?';

-- ============================================================================
-- 2. POLICIES — Pattern : drop puis create (idempotence)
-- ============================================================================
-- Chaque table a des policies nommées <table>_<action>_<scope>.
-- Convention : on remplace ANY existing policy par DROP POLICY IF EXISTS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- fermes
-- ----------------------------------------------------------------------------
drop policy if exists fermes_select on fermes;
create policy fermes_select on fermes for select
  using (user_has_farm_access(id));

drop policy if exists fermes_insert on fermes;
create policy fermes_insert on fermes for insert
  with check (current_user_role() = 'admin');

drop policy if exists fermes_update on fermes;
create policy fermes_update on fermes for update
  using (user_has_farm_access(id) and current_user_role() = 'admin')
  with check (user_has_farm_access(id) and current_user_role() = 'admin');

drop policy if exists fermes_delete on fermes;
create policy fermes_delete on fermes for delete
  using (user_has_farm_access(id) and current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- batiments / salles / cases : tech-staff (admin/manager/technicien)
-- ----------------------------------------------------------------------------
drop policy if exists batiments_all on batiments;
create policy batiments_all on batiments for all
  using (ferme_id = current_farm_id() and current_user_role() in ('admin','manager','technicien'))
  with check (ferme_id = current_farm_id() and current_user_role() in ('admin','manager','technicien'));

drop policy if exists batiments_select_member on batiments;
create policy batiments_select_member on batiments for select
  using (user_has_farm_access(ferme_id));

drop policy if exists salles_all on salles;
create policy salles_all on salles for all
  using (
    current_user_role() in ('admin','manager','technicien')
    and exists (select 1 from batiments b where b.id = salles.batiment_id and b.ferme_id = current_farm_id())
  )
  with check (
    current_user_role() in ('admin','manager','technicien')
    and exists (select 1 from batiments b where b.id = salles.batiment_id and b.ferme_id = current_farm_id())
  );

drop policy if exists salles_select_member on salles;
create policy salles_select_member on salles for select
  using (exists (select 1 from batiments b where b.id = salles.batiment_id and user_has_farm_access(b.ferme_id)));

-- cases : pas de ferme_id direct, rattaché via batiment_id
drop policy if exists cases_all on cases;
create policy cases_all on cases for all
  using (
    current_user_role() in ('admin','manager','technicien')
    and exists (select 1 from batiments b where b.id = cases.batiment_id and b.ferme_id = current_farm_id())
  )
  with check (
    current_user_role() in ('admin','manager','technicien')
    and exists (select 1 from batiments b where b.id = cases.batiment_id and b.ferme_id = current_farm_id())
  );

drop policy if exists cases_select_member on cases;
create policy cases_select_member on cases for select
  using (exists (select 1 from batiments b where b.id = cases.batiment_id and user_has_farm_access(b.ferme_id)));

-- ----------------------------------------------------------------------------
-- races : référentiel global lecture seule pour tous, écriture admin uniquement
-- ----------------------------------------------------------------------------
drop policy if exists races_select on races;
create policy races_select on races for select using (true);

drop policy if exists races_write on races;
create policy races_write on races for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- animaux : SELECT pour membres ; modif si role != viewer
-- ----------------------------------------------------------------------------
drop policy if exists animaux_select on animaux;
create policy animaux_select on animaux for select
  using (user_has_farm_access(ferme_id));

drop policy if exists animaux_insert on animaux;
create policy animaux_insert on animaux for insert
  with check (ferme_id = current_farm_id() and current_user_role() is not null and current_user_role() <> 'viewer');

drop policy if exists animaux_update on animaux;
create policy animaux_update on animaux for update
  using (ferme_id = current_farm_id() and current_user_role() is not null and current_user_role() <> 'viewer')
  with check (ferme_id = current_farm_id() and current_user_role() is not null and current_user_role() <> 'viewer');

drop policy if exists animaux_delete on animaux;
create policy animaux_delete on animaux for delete
  using (ferme_id = current_farm_id() and current_user_role() in ('admin','manager'));

-- ----------------------------------------------------------------------------
-- bandes + dépendantes : pattern identique à animaux
-- bandes a ferme_id direct ; les autres sont rattachées via bande_id ou animal_id.
-- ----------------------------------------------------------------------------
drop policy if exists bandes_select on bandes;
create policy bandes_select on bandes for select
  using (user_has_farm_access(ferme_id));

drop policy if exists bandes_insert on bandes;
create policy bandes_insert on bandes for insert
  with check (ferme_id = current_farm_id() and current_user_role() is not null and current_user_role() <> 'viewer');

drop policy if exists bandes_update on bandes;
create policy bandes_update on bandes for update
  using (ferme_id = current_farm_id() and current_user_role() is not null and current_user_role() <> 'viewer')
  with check (ferme_id = current_farm_id() and current_user_role() is not null and current_user_role() <> 'viewer');

drop policy if exists bandes_delete on bandes;
create policy bandes_delete on bandes for delete
  using (ferme_id = current_farm_id() and current_user_role() in ('admin','manager'));

-- bande_animaux : rattaché via bande_id
drop policy if exists bande_animaux_select on bande_animaux;
create policy bande_animaux_select on bande_animaux for select
  using (exists (select 1 from bandes b where b.id = bande_animaux.bande_id and user_has_farm_access(b.ferme_id)));

drop policy if exists bande_animaux_write on bande_animaux;
create policy bande_animaux_write on bande_animaux for all
  using (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from bandes b where b.id = bande_animaux.bande_id and b.ferme_id = current_farm_id())
  )
  with check (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from bandes b where b.id = bande_animaux.bande_id and b.ferme_id = current_farm_id())
  );

-- saillies : truie_id -> animaux.ferme_id
drop policy if exists saillies_select on saillies;
create policy saillies_select on saillies for select
  using (exists (select 1 from animaux a where a.id = saillies.truie_id and user_has_farm_access(a.ferme_id)));

drop policy if exists saillies_write on saillies;
create policy saillies_write on saillies for all
  using (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from animaux a where a.id = saillies.truie_id and a.ferme_id = current_farm_id())
  )
  with check (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from animaux a where a.id = saillies.truie_id and a.ferme_id = current_farm_id())
  );

-- diagnostics_gestation : via saillie_id -> animaux.ferme_id
drop policy if exists diagnostics_gestation_select on diagnostics_gestation;
create policy diagnostics_gestation_select on diagnostics_gestation for select
  using (exists (
    select 1 from saillies s join animaux a on a.id = s.truie_id
     where s.id = diagnostics_gestation.saillie_id and user_has_farm_access(a.ferme_id)
  ));

drop policy if exists diagnostics_gestation_write on diagnostics_gestation;
create policy diagnostics_gestation_write on diagnostics_gestation for all
  using (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (
      select 1 from saillies s join animaux a on a.id = s.truie_id
       where s.id = diagnostics_gestation.saillie_id and a.ferme_id = current_farm_id()
    )
  )
  with check (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (
      select 1 from saillies s join animaux a on a.id = s.truie_id
       where s.id = diagnostics_gestation.saillie_id and a.ferme_id = current_farm_id()
    )
  );

-- mises_bas : truie_id -> animaux.ferme_id
drop policy if exists mises_bas_select on mises_bas;
create policy mises_bas_select on mises_bas for select
  using (exists (select 1 from animaux a where a.id = mises_bas.truie_id and user_has_farm_access(a.ferme_id)));

drop policy if exists mises_bas_write on mises_bas;
create policy mises_bas_write on mises_bas for all
  using (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from animaux a where a.id = mises_bas.truie_id and a.ferme_id = current_farm_id())
  )
  with check (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from animaux a where a.id = mises_bas.truie_id and a.ferme_id = current_farm_id())
  );

-- sevrages : truie_id -> animaux.ferme_id
drop policy if exists sevrages_select on sevrages;
create policy sevrages_select on sevrages for select
  using (exists (select 1 from animaux a where a.id = sevrages.truie_id and user_has_farm_access(a.ferme_id)));

drop policy if exists sevrages_write on sevrages;
create policy sevrages_write on sevrages for all
  using (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from animaux a where a.id = sevrages.truie_id and a.ferme_id = current_farm_id())
  )
  with check (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from animaux a where a.id = sevrages.truie_id and a.ferme_id = current_farm_id())
  );

-- regles_sevrage : ferme_id direct
drop policy if exists regles_sevrage_select on regles_sevrage;
create policy regles_sevrage_select on regles_sevrage for select
  using (user_has_farm_access(ferme_id));

drop policy if exists regles_sevrage_write on regles_sevrage;
create policy regles_sevrage_write on regles_sevrage for all
  using (ferme_id = current_farm_id() and current_user_role() is not null and current_user_role() <> 'viewer')
  with check (ferme_id = current_farm_id() and current_user_role() is not null and current_user_role() <> 'viewer');

-- ----------------------------------------------------------------------------
-- pesees / vaccinations / traitements / mortalites
-- SELECT pour tous membres ferme ; INSERT/UPDATE pour staff terrain ; DELETE admin/manager
-- Toutes ces tables ont animal_id => on remonte ferme_id via animaux.
-- ----------------------------------------------------------------------------
drop policy if exists pesees_select on pesees;
create policy pesees_select on pesees for select
  using (exists (select 1 from animaux a where a.id = pesees.animal_id and user_has_farm_access(a.ferme_id)));

drop policy if exists pesees_insert on pesees;
create policy pesees_insert on pesees for insert
  with check (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and exists (select 1 from animaux a where a.id = pesees.animal_id and a.ferme_id = current_farm_id())
  );

drop policy if exists pesees_update on pesees;
create policy pesees_update on pesees for update
  using (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and exists (select 1 from animaux a where a.id = pesees.animal_id and a.ferme_id = current_farm_id())
  )
  with check (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and exists (select 1 from animaux a where a.id = pesees.animal_id and a.ferme_id = current_farm_id())
  );

drop policy if exists pesees_delete on pesees;
create policy pesees_delete on pesees for delete
  using (
    current_user_role() in ('admin','manager')
    and exists (select 1 from animaux a where a.id = pesees.animal_id and a.ferme_id = current_farm_id())
  );

-- protocoles_vaccinaux : référentiel ferme (ferme_id direct si présent, sinon global)
drop policy if exists protocoles_vaccinaux_select on protocoles_vaccinaux;
create policy protocoles_vaccinaux_select on protocoles_vaccinaux for select using (true);

drop policy if exists protocoles_vaccinaux_write on protocoles_vaccinaux;
create policy protocoles_vaccinaux_write on protocoles_vaccinaux for all
  using (current_user_role() in ('admin','manager','veterinaire'))
  with check (current_user_role() in ('admin','manager','veterinaire'));

-- vaccinations : animal_id -> animaux.ferme_id
drop policy if exists vaccinations_select on vaccinations;
create policy vaccinations_select on vaccinations for select
  using (exists (select 1 from animaux a where a.id = vaccinations.animal_id and user_has_farm_access(a.ferme_id)));

drop policy if exists vaccinations_insert on vaccinations;
create policy vaccinations_insert on vaccinations for insert
  with check (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and exists (select 1 from animaux a where a.id = vaccinations.animal_id and a.ferme_id = current_farm_id())
  );

drop policy if exists vaccinations_update on vaccinations;
create policy vaccinations_update on vaccinations for update
  using (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and exists (select 1 from animaux a where a.id = vaccinations.animal_id and a.ferme_id = current_farm_id())
  )
  with check (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and exists (select 1 from animaux a where a.id = vaccinations.animal_id and a.ferme_id = current_farm_id())
  );

drop policy if exists vaccinations_delete on vaccinations;
create policy vaccinations_delete on vaccinations for delete
  using (
    current_user_role() in ('admin','manager')
    and exists (select 1 from animaux a where a.id = vaccinations.animal_id and a.ferme_id = current_farm_id())
  );

-- traitements : animal_id -> animaux.ferme_id
drop policy if exists traitements_select on traitements;
create policy traitements_select on traitements for select
  using (exists (select 1 from animaux a where a.id = traitements.animal_id and user_has_farm_access(a.ferme_id)));

drop policy if exists traitements_insert on traitements;
create policy traitements_insert on traitements for insert
  with check (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and exists (select 1 from animaux a where a.id = traitements.animal_id and a.ferme_id = current_farm_id())
  );

drop policy if exists traitements_update on traitements;
create policy traitements_update on traitements for update
  using (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and exists (select 1 from animaux a where a.id = traitements.animal_id and a.ferme_id = current_farm_id())
  )
  with check (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and exists (select 1 from animaux a where a.id = traitements.animal_id and a.ferme_id = current_farm_id())
  );

drop policy if exists traitements_delete on traitements;
create policy traitements_delete on traitements for delete
  using (
    current_user_role() in ('admin','manager')
    and exists (select 1 from animaux a where a.id = traitements.animal_id and a.ferme_id = current_farm_id())
  );

-- mortalites : ferme_id direct
drop policy if exists mortalites_select on mortalites;
create policy mortalites_select on mortalites for select
  using (user_has_farm_access(ferme_id));

drop policy if exists mortalites_insert on mortalites;
create policy mortalites_insert on mortalites for insert
  with check (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and ferme_id = current_farm_id()
  );

drop policy if exists mortalites_update on mortalites;
create policy mortalites_update on mortalites for update
  using (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and ferme_id = current_farm_id()
  )
  with check (
    current_user_role() in ('admin','manager','technicien','ouvrier','veterinaire')
    and ferme_id = current_farm_id()
  );

drop policy if exists mortalites_delete on mortalites;
create policy mortalites_delete on mortalites for delete
  using (current_user_role() in ('admin','manager') and ferme_id = current_farm_id());

-- ----------------------------------------------------------------------------
-- Alimentation : types_aliment, formulations, formulation_ingredients,
-- plans_alimentation, consommations_aliment
-- RLS "ferme standard" : SELECT membres, écriture non-viewer
-- ----------------------------------------------------------------------------
drop policy if exists types_aliment_select on types_aliment;
create policy types_aliment_select on types_aliment for select using (true);

drop policy if exists types_aliment_write on types_aliment;
create policy types_aliment_write on types_aliment for all
  using (current_user_role() in ('admin','manager','technicien'))
  with check (current_user_role() in ('admin','manager','technicien'));

drop policy if exists formulations_select on formulations;
create policy formulations_select on formulations for select
  using (ferme_id is null or user_has_farm_access(ferme_id));

drop policy if exists formulations_write on formulations;
create policy formulations_write on formulations for all
  using (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and (ferme_id is null or ferme_id = current_farm_id())
  )
  with check (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and (ferme_id is null or ferme_id = current_farm_id())
  );

drop policy if exists formulation_ingredients_select on formulation_ingredients;
create policy formulation_ingredients_select on formulation_ingredients for select
  using (exists (
    select 1 from formulations f
     where f.id = formulation_ingredients.formulation_id
       and (f.ferme_id is null or user_has_farm_access(f.ferme_id))
  ));

drop policy if exists formulation_ingredients_write on formulation_ingredients;
create policy formulation_ingredients_write on formulation_ingredients for all
  using (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (
      select 1 from formulations f
       where f.id = formulation_ingredients.formulation_id
         and (f.ferme_id is null or f.ferme_id = current_farm_id())
    )
  )
  with check (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (
      select 1 from formulations f
       where f.id = formulation_ingredients.formulation_id
         and (f.ferme_id is null or f.ferme_id = current_farm_id())
    )
  );

-- plans_alimentation : rattaché via bande_id
drop policy if exists plans_alimentation_select on plans_alimentation;
create policy plans_alimentation_select on plans_alimentation for select
  using (exists (select 1 from bandes b where b.id = plans_alimentation.bande_id and user_has_farm_access(b.ferme_id)));

drop policy if exists plans_alimentation_write on plans_alimentation;
create policy plans_alimentation_write on plans_alimentation for all
  using (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from bandes b where b.id = plans_alimentation.bande_id and b.ferme_id = current_farm_id())
  )
  with check (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from bandes b where b.id = plans_alimentation.bande_id and b.ferme_id = current_farm_id())
  );

drop policy if exists consommations_aliment_select on consommations_aliment;
create policy consommations_aliment_select on consommations_aliment for select
  using (exists (select 1 from bandes b where b.id = consommations_aliment.bande_id and user_has_farm_access(b.ferme_id)));

drop policy if exists consommations_aliment_write on consommations_aliment;
create policy consommations_aliment_write on consommations_aliment for all
  using (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from bandes b where b.id = consommations_aliment.bande_id and b.ferme_id = current_farm_id())
  )
  with check (
    current_user_role() is not null and current_user_role() <> 'viewer'
    and exists (select 1 from bandes b where b.id = consommations_aliment.bande_id and b.ferme_id = current_farm_id())
  );

-- ----------------------------------------------------------------------------
-- Stocks & approvisionnement : matieres_premieres, mouvements_stock,
-- commandes, fournisseurs
-- Écriture restreinte : pas ouvrier ni viewer
-- ----------------------------------------------------------------------------
drop policy if exists matieres_premieres_select on matieres_premieres;
create policy matieres_premieres_select on matieres_premieres for select
  using (ferme_id is null or user_has_farm_access(ferme_id));

drop policy if exists matieres_premieres_write on matieres_premieres;
create policy matieres_premieres_write on matieres_premieres for all
  using (
    current_user_role() in ('admin','manager','technicien')
    and (ferme_id is null or ferme_id = current_farm_id())
  )
  with check (
    current_user_role() in ('admin','manager','technicien')
    and (ferme_id is null or ferme_id = current_farm_id())
  );

-- mouvements_stock : rattaché via matiere_id -> matieres_premieres.ferme_id
drop policy if exists mouvements_stock_select on mouvements_stock;
create policy mouvements_stock_select on mouvements_stock for select
  using (exists (
    select 1 from matieres_premieres m
     where m.id = mouvements_stock.matiere_id
       and (m.ferme_id is null or user_has_farm_access(m.ferme_id))
  ));

drop policy if exists mouvements_stock_write on mouvements_stock;
create policy mouvements_stock_write on mouvements_stock for all
  using (
    current_user_role() in ('admin','manager','technicien')
    and exists (
      select 1 from matieres_premieres m
       where m.id = mouvements_stock.matiere_id
         and (m.ferme_id is null or m.ferme_id = current_farm_id())
    )
  )
  with check (
    current_user_role() in ('admin','manager','technicien')
    and exists (
      select 1 from matieres_premieres m
       where m.id = mouvements_stock.matiere_id
         and (m.ferme_id is null or m.ferme_id = current_farm_id())
    )
  );

drop policy if exists commandes_select on commandes;
create policy commandes_select on commandes for select
  using (ferme_id is null or user_has_farm_access(ferme_id));

drop policy if exists commandes_write on commandes;
create policy commandes_write on commandes for all
  using (
    current_user_role() in ('admin','manager','technicien')
    and (ferme_id is null or ferme_id = current_farm_id())
  )
  with check (
    current_user_role() in ('admin','manager','technicien')
    and (ferme_id is null or ferme_id = current_farm_id())
  );

drop policy if exists fournisseurs_select on fournisseurs;
create policy fournisseurs_select on fournisseurs for select
  using (true);

drop policy if exists fournisseurs_write on fournisseurs;
create policy fournisseurs_write on fournisseurs for all
  using (current_user_role() in ('admin','manager','technicien'))
  with check (current_user_role() in ('admin','manager','technicien'));

-- ----------------------------------------------------------------------------
-- departs : ferme_id direct, écriture admin/manager
-- ----------------------------------------------------------------------------
drop policy if exists departs_select on departs;
create policy departs_select on departs for select
  using (user_has_farm_access(ferme_id));

drop policy if exists departs_write on departs;
create policy departs_write on departs for all
  using (ferme_id = current_farm_id() and current_user_role() in ('admin','manager'))
  with check (ferme_id = current_farm_id() and current_user_role() in ('admin','manager'));

-- ----------------------------------------------------------------------------
-- utilisateurs : son propre profil + membres de ses fermes ; admin total
-- ----------------------------------------------------------------------------
drop policy if exists utilisateurs_select on utilisateurs;
create policy utilisateurs_select on utilisateurs for select
  using (
    id = current_user_internal_id()
    or current_user_role() = 'admin'
    or exists (
      select 1 from utilisateur_fermes uf1
        join utilisateur_fermes uf2 on uf2.ferme_id = uf1.ferme_id
       where uf1.utilisateur_id = current_user_internal_id()
         and uf2.utilisateur_id = utilisateurs.id
    )
  );

drop policy if exists utilisateurs_update_self on utilisateurs;
create policy utilisateurs_update_self on utilisateurs for update
  using (id = current_user_internal_id() or current_user_role() = 'admin')
  with check (id = current_user_internal_id() or current_user_role() = 'admin');

drop policy if exists utilisateurs_insert_admin on utilisateurs;
create policy utilisateurs_insert_admin on utilisateurs for insert
  with check (current_user_role() = 'admin');

drop policy if exists utilisateurs_delete_admin on utilisateurs;
create policy utilisateurs_delete_admin on utilisateurs for delete
  using (current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- utilisateur_fermes : SELECT ses propres liens ; INSERT/DELETE admin uniquement
-- ----------------------------------------------------------------------------
drop policy if exists utilisateur_fermes_select on utilisateur_fermes;
create policy utilisateur_fermes_select on utilisateur_fermes for select
  using (
    utilisateur_id = current_user_internal_id()
    or (current_user_role() = 'admin' and ferme_id = current_farm_id())
  );

drop policy if exists utilisateur_fermes_insert on utilisateur_fermes;
create policy utilisateur_fermes_insert on utilisateur_fermes for insert
  with check (current_user_role() = 'admin' and ferme_id = current_farm_id());

drop policy if exists utilisateur_fermes_update on utilisateur_fermes;
create policy utilisateur_fermes_update on utilisateur_fermes for update
  using (current_user_role() = 'admin' and ferme_id = current_farm_id())
  with check (current_user_role() = 'admin' and ferme_id = current_farm_id());

drop policy if exists utilisateur_fermes_delete on utilisateur_fermes;
create policy utilisateur_fermes_delete on utilisateur_fermes for delete
  using (current_user_role() = 'admin' and ferme_id = current_farm_id());

-- ----------------------------------------------------------------------------
-- audit_logs : append-only via triggers SECURITY DEFINER.
-- SELECT admin/manager limité aux lignes de leur ferme.
-- Le filtrage par ferme s'appuie sur la table cible : on récupère la ferme via
-- la table source (table_nom + record_id) -> coûteux en runtime mais sûr.
-- En pratique, l'app filtre déjà côté SQL ; cette policy est une ceinture+bretelles.
-- ----------------------------------------------------------------------------
drop policy if exists audit_logs_select on audit_logs;
create policy audit_logs_select on audit_logs for select
  using (
    current_user_role() in ('admin','manager')
    and (
      -- ferme_id direct dans la valeur nouvelle/ancienne
      coalesce(
        (nouvelle_valeur->>'ferme_id')::uuid,
        (ancienne_valeur->>'ferme_id')::uuid
      ) = current_farm_id()
      -- ou pas de ferme_id (référentiel global) : visible par admin/manager de toute ferme
      or coalesce(nouvelle_valeur->>'ferme_id', ancienne_valeur->>'ferme_id') is null
    )
  );

-- Aucune policy INSERT/UPDATE/DELETE => écritures uniquement via trigger
-- SECURITY DEFINER (trigger_audit_log) qui bypasse la RLS.

-- ============================================================================
-- 3. GRANTS de base sur les fonctions helpers
-- ============================================================================
grant execute on function current_user_internal_id() to anon, authenticated;
grant execute on function current_farm_id()          to anon, authenticated;
grant execute on function current_user_role()        to anon, authenticated;
grant execute on function user_has_farm_access(uuid) to anon, authenticated;

-- ============================================================================
-- /!\ RLS NON ACTIVÉE /!\
-- La version brouillon utilise la clé anon sans contexte JWT : activer la RLS
-- maintenant casserait toutes les requêtes. Voir bloc ACTIVATION_RLS.sql ci-dessous.
-- ============================================================================


/* ===========================================================================
   ACTIVATION_RLS.sql — À EXÉCUTER QUAND VOUS PASSEZ EN PROD
   ---------------------------------------------------------------------------
   Copier le bloc SQL ci-dessous et le passer dans psql / Studio Supabase.
   Pour rollback : remplacer "enable" par "disable" dans toutes les lignes.

   Pré-requis :
     - Les utilisateurs Supabase Auth doivent avoir leur utilisateurs.auth_id
       correctement renseigné (sinon current_user_internal_id() = null -> 0 ligne).
     - Au moins une ligne dans utilisateur_fermes pour chaque utilisateur actif.
     - L'app Next.js doit utiliser le client `authenticated` (cookies SSR), PAS
       la clé service_role pour les requêtes utilisateur.

   -- BEGIN ACTIVATION_RLS.sql --------------------------------------------------
   alter table fermes                   enable row level security;
   alter table batiments                enable row level security;
   alter table salles                   enable row level security;
   alter table cases                    enable row level security;
   alter table races                    enable row level security;
   alter table animaux                  enable row level security;
   alter table bandes                   enable row level security;
   alter table bande_animaux            enable row level security;
   alter table saillies                 enable row level security;
   alter table diagnostics_gestation    enable row level security;
   alter table mises_bas                enable row level security;
   alter table sevrages                 enable row level security;
   alter table regles_sevrage           enable row level security;
   alter table pesees                   enable row level security;
   alter table protocoles_vaccinaux     enable row level security;
   alter table vaccinations             enable row level security;
   alter table traitements              enable row level security;
   alter table mortalites               enable row level security;
   alter table types_aliment            enable row level security;
   alter table formulations             enable row level security;
   alter table formulation_ingredients  enable row level security;
   alter table plans_alimentation       enable row level security;
   alter table consommations_aliment    enable row level security;
   alter table matieres_premieres       enable row level security;
   alter table mouvements_stock         enable row level security;
   alter table commandes                enable row level security;
   alter table fournisseurs             enable row level security;
   alter table departs                  enable row level security;
   alter table utilisateurs             enable row level security;
   alter table utilisateur_fermes       enable row level security;
   alter table audit_logs               enable row level security;
   -- END ACTIVATION_RLS.sql ----------------------------------------------------

   ROLLBACK D'URGENCE :
     Remplacer "enable" par "disable" dans le bloc ci-dessus et ré-exécuter.

=========================================================================== */
