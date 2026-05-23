-- ============================================================================
-- SMARTFARM — Upgrade aux standards architecte senior
-- Migration : 20260520120001_normes_senior
-- Auteur    : Hermes pour Christophe Liegeois
-- ----------------------------------------------------------------------------
-- Contenu :
--   1. Soft-delete (colonne deleted_at) sur les tables métier sensibles
--   2. Hiérarchie spatiale : table salles + colonne salle_id sur cases
--   3. Audit logs (table + fonction trigger générique + triggers)
--   4. Check constraints biologiques (+ triggers pour les checks avec subquery)
--   5. Index partiels performance
--   6. Triggers updated_at additionnels (idempotent)
--   7. Fonction utilitaire set_deleted_at() — NON attachée par défaut
--
-- USAGE de set_deleted_at() :
--   Cette fonction est fournie comme HELPER applicatif. Elle convertit un
--   DELETE en UPDATE deleted_at = now(). NE PAS l'attacher en trigger
--   automatique (sinon les ON DELETE CASCADE des FK sont cassés).
--
--   Pour soft-delete depuis le code applicatif :
--     UPDATE animaux SET deleted_at = now() WHERE id = $1;
--   Toutes les requêtes de lecture doivent filtrer : WHERE deleted_at IS NULL.
--
--   Pour attacher la fonction à une table spécifique (cas exceptionnel) :
--     CREATE TRIGGER soft_delete_xxx BEFORE DELETE ON xxx
--       FOR EACH ROW EXECUTE FUNCTION set_deleted_at();
-- ============================================================================

-- ============================================================================
-- 1. SOFT-DELETE
-- ============================================================================

alter table fermes              add column if not exists deleted_at timestamptz;
alter table batiments           add column if not exists deleted_at timestamptz;
alter table cases               add column if not exists deleted_at timestamptz;
alter table animaux             add column if not exists deleted_at timestamptz;
alter table bandes              add column if not exists deleted_at timestamptz;
alter table saillies            add column if not exists deleted_at timestamptz;
alter table mises_bas           add column if not exists deleted_at timestamptz;
alter table sevrages            add column if not exists deleted_at timestamptz;
alter table pesees              add column if not exists deleted_at timestamptz;
alter table vaccinations        add column if not exists deleted_at timestamptz;
alter table traitements         add column if not exists deleted_at timestamptz;
alter table mortalites          add column if not exists deleted_at timestamptz;
alter table matieres_premieres  add column if not exists deleted_at timestamptz;
alter table mouvements_stock    add column if not exists deleted_at timestamptz;
alter table fournisseurs        add column if not exists deleted_at timestamptz;
alter table commandes           add column if not exists deleted_at timestamptz;
alter table departs             add column if not exists deleted_at timestamptz;
alter table utilisateurs        add column if not exists deleted_at timestamptz;

-- ============================================================================
-- 2. HIÉRARCHIE SPATIALE : table salles + cases.salle_id
-- ============================================================================

create table if not exists salles (
  id          uuid primary key default uuid_generate_v4(),
  batiment_id uuid not null references batiments(id) on delete cascade,
  nom         text not null,
  capacite    int,
  created_at  timestamptz default now(),
  deleted_at  timestamptz,
  unique (batiment_id, nom)
);

create index if not exists idx_salles_batiment on salles(batiment_id);

alter table cases add column if not exists salle_id uuid references salles(id) on delete set null;

create index if not exists idx_cases_salle on cases(salle_id);

-- ============================================================================
-- 3. AUDIT LOGS
-- ============================================================================

create table if not exists audit_logs (
  id              uuid primary key default gen_random_uuid(),
  table_nom       text not null,
  record_id       uuid not null,
  action          text not null check (action in ('INSERT','UPDATE','DELETE')),
  ancienne_valeur jsonb,
  nouvelle_valeur jsonb,
  user_id         uuid,
  created_at      timestamptz default now()
);

create index if not exists idx_audit_table_record on audit_logs(table_nom, record_id);
create index if not exists idx_audit_created_at on audit_logs(created_at desc);
create index if not exists idx_audit_user on audit_logs(user_id) where user_id is not null;

create or replace function trigger_audit_log()
returns trigger as $$
declare
  v_record_id uuid;
  v_user_id   uuid;
begin
  -- Tentative de récupérer l'utilisateur courant via GUC applicatif
  begin
    v_user_id := nullif(current_setting('app.current_user_id', true), '')::uuid;
  exception when others then
    v_user_id := null;
  end;

  if (tg_op = 'DELETE') then
    v_record_id := (row_to_json(old)->>'id')::uuid;
    insert into audit_logs (table_nom, record_id, action, ancienne_valeur, nouvelle_valeur, user_id)
    values (tg_table_name, v_record_id, 'DELETE', to_jsonb(old), null, v_user_id);
    return old;
  elsif (tg_op = 'UPDATE') then
    v_record_id := (row_to_json(new)->>'id')::uuid;
    insert into audit_logs (table_nom, record_id, action, ancienne_valeur, nouvelle_valeur, user_id)
    values (tg_table_name, v_record_id, 'UPDATE', to_jsonb(old), to_jsonb(new), v_user_id);
    return new;
  elsif (tg_op = 'INSERT') then
    v_record_id := (row_to_json(new)->>'id')::uuid;
    insert into audit_logs (table_nom, record_id, action, ancienne_valeur, nouvelle_valeur, user_id)
    values (tg_table_name, v_record_id, 'INSERT', null, to_jsonb(new), v_user_id);
    return new;
  end if;
  return null;
end;
$$ language plpgsql;

-- Attachement des triggers AFTER (idempotent : drop si existe puis create)
do $$
declare
  t text;
  audit_tables text[] := array[
    'animaux','bandes','saillies','mises_bas','sevrages',
    'traitements','mortalites','mouvements_stock','departs'
  ];
begin
  foreach t in array audit_tables loop
    execute format('drop trigger if exists audit_%1$s on %1$s', t);
    execute format(
      'create trigger audit_%1$s after insert or update or delete on %1$s
       for each row execute function trigger_audit_log()',
      t
    );
  end loop;
end$$;

-- ============================================================================
-- 4. CHECK CONSTRAINTS BIOLOGIQUES
-- ============================================================================

-- mises_bas : checks simples (sans subquery)
alter table mises_bas drop constraint if exists chk_mb_vivants_le_totaux;
alter table mises_bas add constraint chk_mb_vivants_le_totaux
  check (nes_vivants <= nes_totaux);

alter table mises_bas drop constraint if exists chk_mb_somme_naissances;
alter table mises_bas add constraint chk_mb_somme_naissances
  check (nes_vivants + coalesce(nes_morts, 0) + coalesce(momifies, 0) = nes_totaux);

-- mises_bas : check date >= date_saillie + 100 jours -> via trigger (subquery interdit en CHECK)
create or replace function trigger_check_mise_bas_delai()
returns trigger as $$
declare
  v_date_saillie date;
begin
  select date_saillie into v_date_saillie from saillies where id = new.saillie_id;
  if v_date_saillie is null then
    raise exception 'Saillie % introuvable pour la mise-bas', new.saillie_id;
  end if;
  if new.date_mise_bas < v_date_saillie + interval '100 days' then
    raise exception 'Date mise-bas (%) trop proche de la saillie (%) — minimum 100 jours',
      new.date_mise_bas, v_date_saillie;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists check_mise_bas_delai on mises_bas;
create trigger check_mise_bas_delai
  before insert or update of date_mise_bas, saillie_id on mises_bas
  for each row execute function trigger_check_mise_bas_delai();

-- sevrages : date_sevrage > date_mise_bas -> via trigger
create or replace function trigger_check_sevrage_delai()
returns trigger as $$
declare
  v_date_mb date;
begin
  select date_mise_bas into v_date_mb from mises_bas where id = new.mise_bas_id;
  if v_date_mb is null then
    raise exception 'Mise-bas % introuvable pour le sevrage', new.mise_bas_id;
  end if;
  if new.date_sevrage <= v_date_mb then
    raise exception 'Date sevrage (%) doit être strictement supérieure à la mise-bas (%)',
      new.date_sevrage, v_date_mb;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists check_sevrage_delai on sevrages;
create trigger check_sevrage_delai
  before insert or update of date_sevrage, mise_bas_id on sevrages
  for each row execute function trigger_check_sevrage_delai();

-- pesees : poids strictement positif et < 500 kg
alter table pesees drop constraint if exists chk_pesees_poids_bornes;
alter table pesees add constraint chk_pesees_poids_bornes
  check (poids_kg > 0 and poids_kg < 500);

-- animaux : date de naissance non future
alter table animaux drop constraint if exists chk_animaux_naissance_passee;
alter table animaux add constraint chk_animaux_naissance_passee
  check (date_naissance is null or date_naissance <= current_date);

-- mouvements_stock : quantité non nulle
alter table mouvements_stock drop constraint if exists chk_mvt_quantite_non_nulle;
alter table mouvements_stock add constraint chk_mvt_quantite_non_nulle
  check (quantite <> 0);

-- ============================================================================
-- 5. INDEX PARTIELS PERFORMANCE
-- ============================================================================

create index if not exists idx_animaux_vivants
  on animaux(ferme_id, categorie)
  where statut = 'actif' and deleted_at is null;

create index if not exists idx_bandes_actives
  on bandes(ferme_id)
  where statut in ('preparation','active','sevree') and deleted_at is null;

create index if not exists idx_stocks_alerte
  on matieres_premieres(ferme_id)
  where stock_actuel < seuil_alerte and deleted_at is null;

create index if not exists idx_saillies_recentes
  on saillies(truie_id, date_saillie desc)
  where deleted_at is null;

-- ============================================================================
-- 6. TRIGGERS updated_at — idempotent
-- ============================================================================
-- La fonction trigger_set_updated_at() existe déjà depuis la migration init.
-- Les triggers sur fermes et animaux existent déjà ; on les laisse.
-- On ajoute ici un garde-fou : si jamais la fonction n'existe pas, on la crée.

create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Pour toute table ayant une colonne updated_at, créer le trigger si absent.
do $$
declare
  r record;
begin
  for r in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'updated_at'
  loop
    if not exists (
      select 1 from pg_trigger
      where tgname = format('set_updated_at_%s', r.table_name)
        and not tgisinternal
    ) then
      execute format(
        'create trigger set_updated_at_%1$s before update on %1$s
         for each row execute function trigger_set_updated_at()',
        r.table_name
      );
    end if;
  end loop;
end$$;

-- ============================================================================
-- 7. FONCTION UTILITAIRE set_deleted_at() — NON attachée automatiquement
-- ============================================================================
-- Voir documentation en tête de fichier pour l'usage.

create or replace function set_deleted_at()
returns trigger as $$
begin
  -- Transforme un DELETE physique en UPDATE deleted_at = now()
  execute format(
    'update %I.%I set deleted_at = now() where id = $1',
    tg_table_schema, tg_table_name
  ) using old.id;
  -- En retournant null on annule le DELETE physique
  return null;
end;
$$ language plpgsql;

comment on function set_deleted_at() is
  'Helper soft-delete. NE PAS attacher en trigger automatique global (casse les ON DELETE CASCADE). Préférer UPDATE deleted_at depuis l''applicatif.';

comment on table audit_logs is
  'Journal d''audit centralisé. Alimenté automatiquement par trigger_audit_log() sur les tables critiques.';

comment on function trigger_audit_log() is
  'Trigger générique d''audit. Lit l''utilisateur courant via current_setting(''app.current_user_id'', true).';
