-- ============================================================================
-- 20260520160001_fix_ic_formule.sql
-- FIX bugs métier critiques détectés par l'audit adversaire :
--   1. Formule IC (Indice de Consommation) : la version précédente utilisait
--      la BIOMASSE (poids_moyen × effectif) comme dénominateur, ce qui est
--      faux zootechniquement. La bonne formule est :
--          IC = conso_kg_total / (poids_max_bande - poids_min_bande)
--      c.-à-d. conso totale divisée par le POIDS GAGNÉ entre la première
--      et la dernière pesée de la bande. Pareil pour cout_alim_par_kg_gagne.
--   2. GMQ : ajouter protection si < 2 pesées (déjà présent mais renforcé).
--   3. Grant trop large sur refresh_kpi_views() : `anon` ne doit PAS pouvoir
--      déclencher un refresh (coûteux). Garder seulement authenticated +
--      service_role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Drop de mv_kpi_bande et de ses dépendances (CASCADE drop v_kpi_bande)
-- ----------------------------------------------------------------------------
drop materialized view if exists mv_kpi_bande cascade;

-- ----------------------------------------------------------------------------
-- 2. Recréation de mv_kpi_bande avec la formule IC corrigée
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
  -- IC corrigé : conso_kg_total / (poids_max - poids_min) (poids GAGNÉ, pas biomasse).
  select
    bande_id,
    count(*)                                as nb_pesees,
    min(date_pesee)                         as date_min,
    max(date_pesee)                         as date_max,
    min(poids_kg)                           as poids_min,
    max(poids_kg)                           as poids_max,
    avg(poids_kg)                           as poids_moyen_kg,
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
  -- GMQ moyen (g/j) — null si < 2 pesées ou écart de date nul (protection renforcée)
  case
    when pa.nb_pesees is null or pa.nb_pesees < 2 then null
    when (pa.date_max - pa.date_min) <= 0 then null
    else round(
      (pa.poids_max - pa.poids_min)::numeric / (pa.date_max - pa.date_min)::numeric * 1000.0,
      1
    )
  end as gmq_g_par_jour,
  -- IC corrigé : conso totale / POIDS GAGNÉ (poids_max - poids_min).
  -- Renvoie null si pas de pesées exploitables ou pas de gain de poids mesuré.
  case
    when coalesce(c.conso_kg_total, 0) = 0 then null
    when pa.poids_max is null or pa.poids_min is null then null
    when (pa.poids_max - pa.poids_min) <= 0 then null
    else round(
      c.conso_kg_total::numeric
      / nullif((pa.poids_max - pa.poids_min)::numeric, 0),
      2
    )
  end as ic,
  -- Coût alimentaire par kg GAGNÉ (poids_max - poids_min).
  case
    when coalesce(c.cout_alim_total, 0) = 0 then null
    when pa.poids_max is null or pa.poids_min is null then null
    when (pa.poids_max - pa.poids_min) <= 0 then null
    else round(
      c.cout_alim_total::numeric
      / nullif((pa.poids_max - pa.poids_min)::numeric, 0),
      2
    )
  end as cout_alim_par_kg_gagne,
  -- Alias legacy pour rétrocompat (anciennement cout_alim_par_kg basé sur biomasse,
  -- maintenant on retourne la même valeur que cout_alim_par_kg_gagne).
  case
    when coalesce(c.cout_alim_total, 0) = 0 then null
    when pa.poids_max is null or pa.poids_min is null then null
    when (pa.poids_max - pa.poids_min) <= 0 then null
    else round(
      c.cout_alim_total::numeric
      / nullif((pa.poids_max - pa.poids_min)::numeric, 0),
      2
    )
  end as cout_alim_par_kg
from bandes b
left join conso      c  on c.bande_id  = b.id
left join effectif   e  on e.bande_id  = b.id
left join pesees_agg pa on pa.bande_id = b.id
left join morts      m  on m.bande_id  = b.id
where b.deleted_at is null;

-- ----------------------------------------------------------------------------
-- 3. Recréation de l'index unique et de l'index ferme
-- ----------------------------------------------------------------------------
create unique index mv_kpi_bande_pk on mv_kpi_bande (bande_id);
create index mv_kpi_bande_ferme on mv_kpi_bande (ferme_id);

comment on materialized view mv_kpi_bande is
  'KPIs zootechniques par bande : GMQ, IC (conso/poids gagné), coût alim par kg gagné, effectif actuel, mortalités. Refresh via refresh_kpi_views(). Fix 20260520160001.';

-- ----------------------------------------------------------------------------
-- 4. Recréation de v_kpi_bande passthrough
-- ----------------------------------------------------------------------------
create view v_kpi_bande as select * from mv_kpi_bande;

grant select on mv_kpi_bande to anon, authenticated, service_role;
grant select on v_kpi_bande  to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. Refresh initial
-- ----------------------------------------------------------------------------
refresh materialized view mv_kpi_bande;

-- mv_kpi_ferme dépend (en SELECT) de mv_kpi_bande pour ic_moyen. Comme les MV
-- sont matérialisées (pas live), Postgres ne propage pas de CASCADE, mais on
-- la rafraîchit explicitement pour propager les nouveaux IC.
do $$
begin
  if exists (select 1 from pg_matviews where matviewname = 'mv_kpi_ferme') then
    refresh materialized view mv_kpi_ferme;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 6. FIX grant trop large sur refresh_kpi_views() : retirer execute à `anon`
--    ET à `PUBLIC` (par défaut Postgres grant execute à PUBLIC sur create function).
-- ----------------------------------------------------------------------------
revoke execute on function refresh_kpi_views() from public;
revoke execute on function refresh_kpi_views() from anon;
-- On garde authenticated + service_role (déjà accordés par la migration précédente).
grant execute on function refresh_kpi_views() to authenticated, service_role;

comment on function refresh_kpi_views() is
  'Rafraîchit les 3 vues matérialisées KPI (truie, bande, ferme) en mode CONCURRENTLY. Réservé à authenticated + service_role (revoke anon/public depuis 20260520160001).';
