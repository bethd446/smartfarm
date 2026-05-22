-- ============================================================================
-- 20260520150001_kpi_zootechniques.sql
-- KPIs zootechniques officiels : PSTA, GMQ, IC, jours improductifs (NJI).
--
-- Les anciennes vues v_kpi_truie / v_kpi_bande sont converties en
-- MATERIALIZED VIEWS pour des perfs constantes sur dashboard, et enrichies
-- avec les indicateurs senior. Une vue "passthrough" v_kpi_bande est
-- recréée pour la rétrocompat du code Next.js qui select depuis v_kpi_*.
--
-- Rafraîchissement : NE PAS faire à chaque insert (trop coûteux).
--   - Appel manuel : select refresh_kpi_views();
--   - Cible : cron nocturne (pg_cron) ou bouton "Rafraîchir" UI.
--   - Endpoint API : POST /api/kpi/refresh
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Drop des vues legacy
-- ----------------------------------------------------------------------------
drop view if exists v_kpi_bande cascade;
drop view if exists v_kpi_truie cascade;
drop materialized view if exists mv_kpi_bande cascade;
drop materialized view if exists mv_kpi_truie cascade;
drop materialized view if exists mv_kpi_ferme cascade;

-- ----------------------------------------------------------------------------
-- 1. mv_kpi_truie — KPIs par truie (PSTA, NJI, rang, recommandation réforme)
-- ----------------------------------------------------------------------------
create materialized view mv_kpi_truie as
with base as (
  select
    a.id                                  as truie_id,
    a.ferme_id,
    a.tag,
    a.date_entree,
    a.statut,
    count(distinct s.id)                  as nb_saillies,
    count(distinct mb.id)                 as nb_portees,
    coalesce(sum(mb.nes_vivants), 0)      as total_nes_vivants,
    coalesce(sum(sv.nb_sevres), 0)        as total_sevres,
    min(s.date_saillie)                   as premiere_saillie,
    max(s.rang_porte)                     as rang_portee_actuel,
    case when count(distinct mb.id) > 0
         then coalesce(sum(mb.nes_vivants)::numeric / count(distinct mb.id), 0)
         else 0 end                       as prolificite_moyenne
  from animaux a
  left join saillies  s  on s.truie_id  = a.id and s.deleted_at  is null
  left join mises_bas mb on mb.truie_id = a.id and mb.deleted_at is null
  left join sevrages  sv on sv.truie_id = a.id and sv.deleted_at is null
  where a.categorie = 'truie' and a.deleted_at is null
  group by a.id
),
gestation_days as (
  -- Somme des jours en gestation : pour chaque saillie ayant une mise_bas,
  -- on compte (date_mise_bas - date_saillie). Pour les saillies sans mise_bas
  -- on ne compte rien (incertain).
  select
    s.truie_id,
    sum(greatest((mb.date_mise_bas - s.date_saillie), 0)) as jours_gestation
  from saillies s
  join mises_bas mb on mb.saillie_id = s.id and mb.deleted_at is null
  where s.deleted_at is null
  group by s.truie_id
),
lactation_days as (
  -- Jours en allaitement : pour chaque mise_bas ayant un sevrage,
  -- (date_sevrage - date_mise_bas).
  select
    mb.truie_id,
    sum(greatest((sv.date_sevrage - mb.date_mise_bas), 0)) as jours_allaitement
  from mises_bas mb
  join sevrages sv on sv.mise_bas_id = mb.id and sv.deleted_at is null
  where mb.deleted_at is null
  group by mb.truie_id
)
select
  b.truie_id,
  b.ferme_id,
  b.tag,
  b.statut,
  b.nb_saillies,
  b.nb_portees,
  b.total_nes_vivants,
  b.total_sevres,
  b.prolificite_moyenne,
  b.rang_portee_actuel,
  b.premiere_saillie,
  -- PSTA = porcelets sevrés × (365 / jours_depuis_premiere_saillie)
  case
    when b.premiere_saillie is null then null
    when (current_date - b.premiere_saillie) <= 0 then null
    else round(
      b.total_sevres::numeric * 365.0 / (current_date - b.premiere_saillie)::numeric,
      2
    )
  end as psta,
  -- NJI = jours présents - (jours gestation + jours allaitement)
  greatest(
    (current_date - coalesce(b.date_entree, b.premiere_saillie, current_date))
      - coalesce(gd.jours_gestation, 0)
      - coalesce(ld.jours_allaitement, 0),
    0
  ) as nji,
  coalesce(gd.jours_gestation, 0)   as jours_gestation_total,
  coalesce(ld.jours_allaitement, 0) as jours_allaitement_total,
  -- Recommandation réforme : NJI > 30 jours OU rang ≥ 8 OU prolificité < 8
  (
    greatest(
      (current_date - coalesce(b.date_entree, b.premiere_saillie, current_date))
        - coalesce(gd.jours_gestation, 0)
        - coalesce(ld.jours_allaitement, 0),
      0
    ) > 30
    or coalesce(b.rang_portee_actuel, 0) >= 8
    or (b.nb_portees > 0 and b.prolificite_moyenne < 8)
  ) as reforme_recommandee
from base b
left join gestation_days gd on gd.truie_id = b.truie_id
left join lactation_days ld on ld.truie_id = b.truie_id;

create unique index mv_kpi_truie_pk on mv_kpi_truie (truie_id);
create index mv_kpi_truie_ferme on mv_kpi_truie (ferme_id);

comment on materialized view mv_kpi_truie is
  'KPIs zootechniques par truie : PSTA, NJI, rang portée, prolificité, recommandation réforme. Refresh via refresh_kpi_views().';

-- ----------------------------------------------------------------------------
-- 2. mv_kpi_bande — KPIs par bande (GMQ, IC, coût/kg, effectif vivant)
-- ----------------------------------------------------------------------------
create materialized view mv_kpi_bande as
with conso as (
  select
    bande_id,
    sum(quantite_kg) as conso_kg_total,
    sum(cout)        as cout_alim_total
  from consommations_aliment
  group by bande_id
),
effectif as (
  select
    ba.bande_id,
    count(distinct ba.animal_id) filter (where a.deleted_at is null and a.statut = 'actif') as effectif_actuel,
    count(distinct ba.animal_id) as effectif_total
  from bande_animaux ba
  join animaux a on a.id = ba.animal_id
  group by ba.bande_id
),
pesees_agg as (
  -- GMQ moyen de la bande : (poids_max - poids_min) / (date_max - date_min) * 1000 (g/j)
  -- Approximation simple : suppose une croissance linéaire sur la fenêtre.
  select
    bande_id,
    count(*)                            as nb_pesees,
    min(date_pesee)                     as date_min,
    max(date_pesee)                     as date_max,
    min(poids_kg)                       as poids_min,
    max(poids_kg)                       as poids_max,
    avg(poids_kg)                       as poids_moyen_kg,
    -- Poids total estimé = somme(poids_kg * nb_animaux) sur la dernière pesée par lot
    sum(poids_kg * coalesce(nb_animaux, 1)) as poids_total_pesees
  from pesees
  where deleted_at is null
  group by bande_id
),
morts as (
  select bande_id, count(*) as mortalites
  from mortalites
  where deleted_at is null
  group by bande_id
)
select
  b.id                                              as bande_id,
  b.ferme_id,
  b.nom                                             as bande_nom,
  b.code                                            as bande_code,
  b.statut,
  b.date_debut,
  coalesce(e.effectif_actuel, 0)                    as effectif_actuel,
  coalesce(e.effectif_total, 0)                     as effectif,                  -- legacy alias
  coalesce(c.conso_kg_total, 0)                     as conso_kg_total,
  coalesce(c.cout_alim_total, 0)                    as cout_alim_total,
  coalesce(m.mortalites, 0)                         as mortalites,
  pa.poids_moyen_kg,
  pa.nb_pesees,
  -- GMQ moyen (g/j) — null si < 2 pesées ou écart de date nul
  case
    when pa.nb_pesees is null or pa.nb_pesees < 2 then null
    when (pa.date_max - pa.date_min) <= 0 then null
    else round(
      (pa.poids_max - pa.poids_min)::numeric / (pa.date_max - pa.date_min)::numeric * 1000.0,
      1
    )
  end as gmq_g_par_jour,
  -- Indice de consommation : conso totale / poids total estimé
  -- Poids total estimé = effectif_actuel * poids_moyen (fallback si pesees agrégées absentes)
  case
    when coalesce(c.conso_kg_total, 0) = 0 then null
    when coalesce(pa.poids_moyen_kg, 0) = 0 or coalesce(e.effectif_actuel, 0) = 0 then null
    else round(
      c.conso_kg_total::numeric
      / (pa.poids_moyen_kg * e.effectif_actuel)::numeric,
      2
    )
  end as ic,
  -- Coût alimentaire par kg vif produit
  case
    when coalesce(c.cout_alim_total, 0) = 0 then null
    when coalesce(pa.poids_moyen_kg, 0) = 0 or coalesce(e.effectif_actuel, 0) = 0 then null
    else round(
      c.cout_alim_total::numeric
      / (pa.poids_moyen_kg * e.effectif_actuel)::numeric,
      2
    )
  end as cout_alim_par_kg
from bandes b
left join conso      c  on c.bande_id  = b.id
left join effectif   e  on e.bande_id  = b.id
left join pesees_agg pa on pa.bande_id = b.id
left join morts      m  on m.bande_id  = b.id
where b.deleted_at is null;

create unique index mv_kpi_bande_pk on mv_kpi_bande (bande_id);
create index mv_kpi_bande_ferme on mv_kpi_bande (ferme_id);

comment on materialized view mv_kpi_bande is
  'KPIs zootechniques par bande : GMQ, IC, coût/kg, effectif actuel, mortalités. Refresh via refresh_kpi_views().';

-- Rétrocompatibilité : v_kpi_bande passthrough sur la MV.
create view v_kpi_bande as select * from mv_kpi_bande;
create view v_kpi_truie as select * from mv_kpi_truie;

-- ----------------------------------------------------------------------------
-- 3. mv_kpi_ferme — agrégation par ferme (header dashboard)
-- ----------------------------------------------------------------------------
create materialized view mv_kpi_ferme as
with effectifs as (
  select
    ferme_id,
    count(*) filter (where categorie = 'truie'         and statut = 'actif') as nb_truies_actives,
    count(*) filter (where categorie = 'verrat'        and statut = 'actif') as nb_verrats_actifs,
    count(*) filter (where categorie = 'engraissement' and statut = 'actif') as nb_engraissement
  from animaux
  where deleted_at is null
  group by ferme_id
),
bandes_act as (
  select ferme_id, count(*) as nb_bandes_actives
  from bandes
  where deleted_at is null and statut in ('preparation','active','engraissement')
  group by ferme_id
),
sevr_30j as (
  select a.ferme_id, coalesce(sum(sv.nb_sevres), 0) as total_sevres_30j
  from sevrages sv
  join animaux a on a.id = sv.truie_id
  where sv.deleted_at is null
    and sv.date_sevrage >= current_date - interval '30 days'
  group by a.ferme_id
),
morts_30j as (
  select
    ferme_id,
    count(*) as morts_30j
  from mortalites
  where deleted_at is null
    and date_mort >= current_date - interval '30 days'
  group by ferme_id
),
effectif_total as (
  select ferme_id, count(*) as total
  from animaux
  where deleted_at is null
  group by ferme_id
),
psta_agg as (
  select ferme_id, round(avg(psta), 2) as psta_moyen
  from mv_kpi_truie
  where psta is not null
  group by ferme_id
),
ic_agg as (
  select ferme_id, round(avg(ic), 2) as ic_moyen
  from mv_kpi_bande
  where ic is not null
  group by ferme_id
),
conso_30j as (
  select b.ferme_id, coalesce(sum(ca.cout), 0) as cout_alim_30j
  from consommations_aliment ca
  join bandes b on b.id = ca.bande_id
  where ca.date >= current_date - interval '30 days'
  group by b.ferme_id
),
stock as (
  select
    ferme_id,
    round(sum(coalesce(stock_actuel, 0) * coalesce(cout_moyen_unite, 0))::numeric, 2) as valeur_stock_total
  from matieres_premieres
  where deleted_at is null
  group by ferme_id
)
select
  f.id                                          as ferme_id,
  f.nom                                         as ferme_nom,
  coalesce(e.nb_truies_actives, 0)              as nb_truies_actives,
  coalesce(e.nb_verrats_actifs, 0)              as nb_verrats_actifs,
  coalesce(e.nb_engraissement, 0)               as nb_engraissement,
  coalesce(ba.nb_bandes_actives, 0)             as nb_bandes_actives,
  coalesce(s30.total_sevres_30j, 0)             as total_sevres_30j,
  case
    when coalesce(et.total, 0) = 0 then null
    else round(coalesce(m30.morts_30j, 0)::numeric * 100.0 / et.total::numeric, 2)
  end                                           as mortalite_taux_30j,
  pa.psta_moyen                                 as psta_moyen_ferme,
  ic.ic_moyen                                   as ic_moyen_ferme,
  coalesce(c30.cout_alim_30j, 0)                as cout_alim_30j,
  coalesce(st.valeur_stock_total, 0)            as valeur_stock_total
from fermes f
left join effectifs      e   on e.ferme_id   = f.id
left join bandes_act     ba  on ba.ferme_id  = f.id
left join sevr_30j       s30 on s30.ferme_id = f.id
left join morts_30j      m30 on m30.ferme_id = f.id
left join effectif_total et  on et.ferme_id  = f.id
left join psta_agg       pa  on pa.ferme_id  = f.id
left join ic_agg         ic  on ic.ferme_id  = f.id
left join conso_30j      c30 on c30.ferme_id = f.id
left join stock          st  on st.ferme_id  = f.id
where f.deleted_at is null;

create unique index mv_kpi_ferme_pk on mv_kpi_ferme (ferme_id);

comment on materialized view mv_kpi_ferme is
  'KPIs agrégés par ferme (header dashboard) : PSTA moyen, IC moyen, mortalité 30j, coût alim 30j, valeur stock. Refresh via refresh_kpi_views().';

-- ----------------------------------------------------------------------------
-- 4. Fonction de refresh — à appeler par cron nocturne (pg_cron)
-- ----------------------------------------------------------------------------
create or replace function refresh_kpi_views()
returns void
language plpgsql
security definer
as $$
begin
  -- L'ordre importe : mv_kpi_ferme dépend de mv_kpi_truie et mv_kpi_bande.
  refresh materialized view concurrently mv_kpi_truie;
  refresh materialized view concurrently mv_kpi_bande;
  refresh materialized view concurrently mv_kpi_ferme;
end;
$$;

comment on function refresh_kpi_views() is
  'Rafraîchit les 3 vues matérialisées KPI (truie, bande, ferme) en mode CONCURRENTLY. Appel : select refresh_kpi_views(); À planifier en cron nocturne.';

-- Exposition PostgREST (RPC) : accessible aux rôles authenticated et service_role.
grant execute on function refresh_kpi_views() to authenticated, service_role, anon;

-- Lecture des MV via PostgREST : grant select aux rôles anon/authenticated.
grant select on mv_kpi_truie, mv_kpi_bande, mv_kpi_ferme to anon, authenticated, service_role;
grant select on v_kpi_truie, v_kpi_bande               to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. Premier remplissage (sans CONCURRENTLY car vide à la création)
-- ----------------------------------------------------------------------------
refresh materialized view mv_kpi_truie;
refresh materialized view mv_kpi_bande;
refresh materialized view mv_kpi_ferme;
