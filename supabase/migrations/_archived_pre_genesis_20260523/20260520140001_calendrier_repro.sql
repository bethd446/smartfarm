-- ============================================================================
-- PATCH 3 — Moteur métier : automatisation du calendrier de reproduction
-- Génère, met à jour et clôt automatiquement les événements liés au cycle
-- repro (saillie → diag → mise-bas → sevrage) via triggers.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table evenements_prevus
-- ----------------------------------------------------------------------------
create table evenements_prevus (
  id              uuid primary key default gen_random_uuid(),
  ferme_id        uuid not null references fermes(id) on delete cascade,
  type_evenement  text not null check (type_evenement in (
    'mise_bas_prevue', 'transfert_maternite', 'sevrage_prevu',
    'diagnostic_gestation_15j', 'diagnostic_gestation_28j',
    'tarissement', 'rappel_vaccinal', 'depart_engraissement'
  )),
  date_prevue     date not null,
  animal_id       uuid references animaux(id) on delete cascade,
  bande_id        uuid references bandes(id) on delete cascade,
  saillie_id      uuid references saillies(id) on delete cascade,
  mise_bas_id     uuid references mises_bas(id) on delete cascade,
  statut          text default 'planifie' check (statut in ('planifie','realise','annule','retard')),
  date_realisation date,
  priorite        int default 2 check (priorite between 1 and 5),
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_evp_date_statut    on evenements_prevus(date_prevue, statut);
create index idx_evp_animal         on evenements_prevus(animal_id);
create index idx_evp_ferme_statut_d on evenements_prevus(ferme_id, statut, date_prevue);
create index idx_evp_saillie        on evenements_prevus(saillie_id);
create index idx_evp_mise_bas       on evenements_prevus(mise_bas_id);

-- updated_at auto
create or replace function trg_evp_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

create trigger evp_touch_updated_at
  before update on evenements_prevus
  for each row execute function trg_evp_touch_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Trigger INSERT saillies → diagnostics J+15 et J+28
-- ----------------------------------------------------------------------------
create or replace function trg_saillie_planifier_diagnostics() returns trigger
language plpgsql as $$
begin
  insert into evenements_prevus
    (ferme_id, type_evenement, date_prevue, animal_id, bande_id, saillie_id, priorite, notes)
  values
    (new.ferme_id, 'diagnostic_gestation_15j', new.date_saillie + 15,
     new.truie_id, new.bande_id, new.id, 2,
     'Diagnostic gestation précoce (palpation/retour chaleur)'),
    (new.ferme_id, 'diagnostic_gestation_28j', new.date_saillie + 28,
     new.truie_id, new.bande_id, new.id, 2,
     'Échographie de confirmation gestation');
  return new;
end$$;

create trigger saillie_planifier_diagnostics
  after insert on saillies
  for each row execute function trg_saillie_planifier_diagnostics();

-- ----------------------------------------------------------------------------
-- 3. Trigger INSERT diagnostics_gestation
--    positif → mise-bas / transfert maternité / sevrage
--    négatif|retour_chaleur → annule diagnostics planifiés
-- ----------------------------------------------------------------------------
create or replace function trg_diagnostic_planifier_suite() returns trigger
language plpgsql as $$
declare
  s            saillies%rowtype;
  v_age_sevr   int;
  v_mise_bas_d date;
  v_sevrage_d  date;
begin
  select * into s from saillies where id = new.saillie_id;

  if new.resultat = 'positif' then
    -- âge sevrage configurable (fallback 28j)
    select age_max_jours into v_age_sevr
      from regles_sevrage
     where ferme_id = s.ferme_id and actif = true
     order by created_at desc
     limit 1;
    v_age_sevr   := coalesce(v_age_sevr, 28);
    v_mise_bas_d := s.date_saillie + 114;
    v_sevrage_d  := v_mise_bas_d + v_age_sevr;

    insert into evenements_prevus
      (ferme_id, type_evenement, date_prevue, animal_id, bande_id, saillie_id, priorite, notes)
    values
      (s.ferme_id, 'transfert_maternite', s.date_saillie + 107,
       s.truie_id, s.bande_id, s.id, 3,
       'Transfert truie en case maternité (J-7 mise-bas)'),
      (s.ferme_id, 'mise_bas_prevue', v_mise_bas_d,
       s.truie_id, s.bande_id, s.id, 1,
       'Mise-bas prévue (gestation 114j)'),
      (s.ferme_id, 'sevrage_prevu', v_sevrage_d,
       s.truie_id, s.bande_id, s.id, 2,
       format('Sevrage prévu à %s jours post mise-bas', v_age_sevr));

  elsif new.resultat in ('negatif','retour_chaleur') then
    update evenements_prevus
       set statut = 'annule',
           notes  = coalesce(notes,'') || ' [annulé: diagnostic ' || new.resultat || ']'
     where saillie_id = new.saillie_id
       and type_evenement in ('diagnostic_gestation_15j','diagnostic_gestation_28j')
       and statut = 'planifie';
  end if;

  return new;
end$$;

create trigger diagnostic_planifier_suite
  after insert on diagnostics_gestation
  for each row execute function trg_diagnostic_planifier_suite();

-- ----------------------------------------------------------------------------
-- 4. Trigger INSERT mises_bas
--    - clôt l'évt mise_bas_prevue lié
--    - corrige date sevrage_prevu si déjà planifiée
--    - planifie tarissement (rappel oestrus post-sevrage)
-- ----------------------------------------------------------------------------
create or replace function trg_mise_bas_synchroniser_calendrier() returns trigger
language plpgsql as $$
declare
  v_age_sevr int;
  v_ferme_id uuid;
begin
  -- ferme_id via la truie (mises_bas n'a pas de colonne ferme_id directe)
  select ferme_id into v_ferme_id from animaux where id = new.truie_id;

  -- clôture mise_bas_prevue
  update evenements_prevus
     set statut = 'realise',
         date_realisation = new.date_mise_bas,
         mise_bas_id = new.id
   where saillie_id = new.saillie_id
     and type_evenement = 'mise_bas_prevue'
     and statut = 'planifie';

  -- recalcul date sevrage (peut différer de la prévision saillie+114+X)
  select age_max_jours into v_age_sevr
    from regles_sevrage
   where ferme_id = v_ferme_id and actif = true
   order by created_at desc
   limit 1;
  v_age_sevr := coalesce(v_age_sevr, 28);

  update evenements_prevus
     set date_prevue = new.date_mise_bas + v_age_sevr,
         mise_bas_id = new.id,
         notes = format('Sevrage prévu %s jours après mise-bas réelle (%s)', v_age_sevr, new.date_mise_bas)
   where saillie_id = new.saillie_id
     and type_evenement = 'sevrage_prevu'
     and statut = 'planifie';

  -- tarissement (rappel oestrus post-sevrage : ~21j après mise-bas en pratique
  -- c'est plutôt l'oestrus post-sevrage, mais on garde la nomenclature demandée)
  insert into evenements_prevus
    (ferme_id, type_evenement, date_prevue, animal_id, bande_id, saillie_id, mise_bas_id, priorite, notes)
  values
    (v_ferme_id, 'tarissement', new.date_mise_bas + 21,
     new.truie_id, new.bande_id, new.saillie_id, new.id, 3,
     'Rappel surveillance oestrus / tarissement post-sevrage');

  return new;
end$$;

create trigger mise_bas_synchroniser_calendrier
  after insert on mises_bas
  for each row execute function trg_mise_bas_synchroniser_calendrier();

-- ----------------------------------------------------------------------------
-- 5. Trigger INSERT sevrages → clôt sevrage_prevu et tarissement
-- ----------------------------------------------------------------------------
create or replace function trg_sevrage_cloturer_evenements() returns trigger
language plpgsql as $$
begin
  update evenements_prevus
     set statut = 'realise',
         date_realisation = new.date_sevrage
   where mise_bas_id = new.mise_bas_id
     and type_evenement in ('sevrage_prevu','tarissement')
     and statut = 'planifie';
  return new;
end$$;

create trigger sevrage_cloturer_evenements
  after insert on sevrages
  for each row execute function trg_sevrage_cloturer_evenements();

-- ----------------------------------------------------------------------------
-- 6. Fonction marquer_retards()
--    À programmer en pg_cron (1×/jour, e.g. '0 6 * * *').
--    Passe en 'retard' tout évt 'planifie' dont la date_prevue est en retard
--    de plus de 3 jours (tampon opérationnel).
-- ----------------------------------------------------------------------------
create or replace function marquer_retards() returns int
language plpgsql as $$
declare
  v_nb int;
begin
  update evenements_prevus
     set statut = 'retard'
   where statut = 'planifie'
     and date_prevue < current_date - 3;
  get diagnostics v_nb = row_count;
  return v_nb;
end$$;

comment on function marquer_retards() is
  'Bascule en statut=retard les événements planifiés dépassant date_prevue+3j. '
  'À appeler quotidiennement via pg_cron : select cron.schedule(''marquer_retards_daily'', ''0 6 * * *'', $$select marquer_retards()$$);';

-- ----------------------------------------------------------------------------
-- 7. Vue v_calendrier_repro (horizon 30 jours)
-- ----------------------------------------------------------------------------
create or replace view v_calendrier_repro as
select
  e.id,
  e.ferme_id,
  e.type_evenement,
  e.date_prevue,
  e.statut,
  e.priorite,
  e.notes,
  e.date_realisation,
  e.created_at,
  e.animal_id,
  a.tag           as animal_tag,
  a.nom           as animal_nom,
  a.categorie     as animal_categorie,
  e.bande_id,
  b.nom           as bande_nom,
  e.saillie_id,
  s.date_saillie,
  e.mise_bas_id,
  (e.date_prevue - current_date) as jours_restants
from evenements_prevus e
left join animaux  a on a.id = e.animal_id
left join bandes   b on b.id = e.bande_id
left join saillies s on s.id = e.saillie_id
where e.date_prevue between current_date - interval '7 days' and current_date + interval '30 days'
  and e.statut in ('planifie','retard')
order by e.priorite asc, e.date_prevue asc;

-- ----------------------------------------------------------------------------
-- 8. Backfill : reconstruit le calendrier pour les saillies existantes
--    avec un diagnostic positif (3 saillies du seed).
-- ----------------------------------------------------------------------------
do $$
declare
  r           record;
  v_age_sevr  int;
  v_mb_d      date;
  v_sevr_d    date;
begin
  for r in
    select s.*
      from saillies s
      join diagnostics_gestation d on d.saillie_id = s.id and d.resultat = 'positif'
     where not exists (
       select 1 from evenements_prevus e
        where e.saillie_id = s.id
          and e.type_evenement = 'mise_bas_prevue'
     )
  loop
    -- diagnostics (planifiés rétroactivement, marqués réalisés a posteriori)
    insert into evenements_prevus
      (ferme_id, type_evenement, date_prevue, animal_id, bande_id, saillie_id,
       priorite, statut, date_realisation, notes)
    values
      (r.ferme_id, 'diagnostic_gestation_15j', r.date_saillie + 15,
       r.truie_id, r.bande_id, r.id, 2, 'realise', r.date_saillie + 15,
       'Backfill — diagnostic précoce'),
      (r.ferme_id, 'diagnostic_gestation_28j', r.date_saillie + 28,
       r.truie_id, r.bande_id, r.id, 2, 'realise', r.date_saillie + 28,
       'Backfill — échographie confirmation');

    select age_max_jours into v_age_sevr
      from regles_sevrage
     where ferme_id = r.ferme_id and actif = true
     order by created_at desc
     limit 1;
    v_age_sevr := coalesce(v_age_sevr, 28);
    v_mb_d   := r.date_saillie + 114;
    v_sevr_d := v_mb_d + v_age_sevr;

    insert into evenements_prevus
      (ferme_id, type_evenement, date_prevue, animal_id, bande_id, saillie_id, priorite, notes)
    values
      (r.ferme_id, 'transfert_maternite', r.date_saillie + 107,
       r.truie_id, r.bande_id, r.id, 3, 'Backfill — transfert maternité'),
      (r.ferme_id, 'mise_bas_prevue', v_mb_d,
       r.truie_id, r.bande_id, r.id, 1, 'Backfill — mise-bas prévue J+114'),
      (r.ferme_id, 'sevrage_prevu', v_sevr_d,
       r.truie_id, r.bande_id, r.id, 2,
       format('Backfill — sevrage à %s jours post mise-bas', v_age_sevr));
  end loop;
end$$;

-- ============================================================================
-- FIN PATCH 3
-- ============================================================================
