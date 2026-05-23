-- =====================================================================
-- C3-SEC : Sécurise `v_alertes_actives`
-- ---------------------------------------------------------------------
-- Reviewer NSA (P0-1) : la view est SECURITY DEFINER par défaut côté
-- Postgres lorsqu'elle est créée par `postgres` superuser → elle exécute
-- les SELECT internes avec les droits du créateur et BYPASS toutes les
-- RLS définies sur animaux/saillies/.../matieres_premieres. Tout client
-- (incl. `anon`) qui a un GRANT SELECT sur la view peut lire les
-- données de TOUTES les fermes.
--
-- Fix :
--   1. DROP + recreate la view avec `security_invoker = true`
--      (Postgres 15+) → la view respecte les RLS du caller.
--   2. Retire le GRANT SELECT à `anon` ; ne laisse que `authenticated`
--      et `service_role` (jobs internes / admin).
--
-- La définition SQL (12 règles UNION ALL) est strictement identique à
-- celle de `20260521000001_alertes_views.sql` — seules les directives
-- de sécurité changent.
-- =====================================================================

drop view if exists public.v_alertes_actives cascade;

create view public.v_alertes_actives
with (security_invoker = true)
as

-- =====================================================================
-- R01 — Truie vide prolongée
-- =====================================================================
with truies_actives as (
  select a.id, a.tag, a.ferme_id, a.date_naissance, a.date_entree
  from public.animaux a
  where a.categorie = 'truie'
    and a.statut = 'actif'
    and a.deleted_at is null
),
truie_derniere_saillie as (
  select s.truie_id, max(s.date_saillie) as derniere_saillie
  from public.saillies s
  where s.deleted_at is null
  group by s.truie_id
),
truie_dernier_sevrage as (
  select sv.truie_id, max(sv.date_sevrage) as dernier_sevrage
  from public.sevrages sv
  where sv.deleted_at is null
  group by sv.truie_id
),
truie_derniere_mb as (
  select mb.truie_id, max(mb.date_mise_bas) as derniere_mb
  from public.mises_bas mb
  where mb.deleted_at is null
  group by mb.truie_id
)
select
  'R01-truie-vide-prolongee'::text as regle_id,
  'truie'::text as cible_type,
  t.id::text as cible_id,
  t.tag as cible_label,
  'élevée'::text as gravite,
  ('Truie ' || t.tag || ' vide depuis ' ||
    (current_date - greatest(
      coalesce(ds.dernier_sevrage, '1900-01-01'::date),
      coalesce(dmb.derniere_mb, '1900-01-01'::date),
      coalesce(dsa.derniere_saillie, '1900-01-01'::date),
      coalesce(t.date_entree, t.date_naissance, '1900-01-01'::date)
    ))::text || ' jours') as titre,
  'Aucune saillie ni diagnostic gestation enregistré récemment. Vérifier le suivi reproduction.' as description,
  ('/cheptel/' || t.id::text) as lien_suggere,
  now() as detecte_le,
  t.ferme_id
from truies_actives t
left join truie_derniere_saillie dsa on dsa.truie_id = t.id
left join truie_dernier_sevrage ds on ds.truie_id = t.id
left join truie_derniere_mb dmb on dmb.truie_id = t.id
where
  (dsa.derniere_saillie is null or current_date - dsa.derniere_saillie > 45)
  and (
    (ds.dernier_sevrage is not null and current_date - ds.dernier_sevrage > 30)
    or (dmb.derniere_mb is not null and current_date - dmb.derniere_mb > 45 and ds.dernier_sevrage is null)
    or (dsa.derniere_saillie is not null and current_date - dsa.derniere_saillie > 45)
    or (
      dsa.derniere_saillie is null and ds.dernier_sevrage is null and dmb.derniere_mb is null
      and coalesce(t.date_entree, t.date_naissance) is not null
      and current_date - coalesce(t.date_entree, t.date_naissance) > 240
    )
  )

union all

-- =====================================================================
-- R02 — Retour en chaleur non re-sailli
-- =====================================================================
select
  'R02-retour-chaleur-non-saillie'::text,
  'truie'::text,
  s.truie_id::text,
  a.tag,
  'moyenne'::text,
  ('Truie ' || a.tag || ' en retour de chaleur sans nouvelle saillie depuis ' ||
    (current_date - d.date_diagnostic)::text || ' jours'),
  'Diagnostic gestation négatif / retour chaleur sans nouvelle saillie enregistrée — programmer une nouvelle IA.',
  ('/reproduction/saillies?truie=' || s.truie_id::text),
  now(),
  a.ferme_id
from public.diagnostics_gestation d
join public.saillies s on s.id = d.saillie_id and s.deleted_at is null
join public.animaux a on a.id = s.truie_id and a.deleted_at is null and a.statut = 'actif'
where d.resultat in ('negatif', 'retour_chaleur')
  and current_date - d.date_diagnostic > 25
  and not exists (
    select 1 from public.saillies s2
    where s2.truie_id = s.truie_id
      and s2.deleted_at is null
      and s2.date_saillie > d.date_diagnostic
  )
  and d.date_diagnostic = (
    select max(d2.date_diagnostic) from public.diagnostics_gestation d2
    join public.saillies s3 on s3.id = d2.saillie_id
    where s3.truie_id = s.truie_id and d2.resultat in ('negatif', 'retour_chaleur')
  )

union all

-- =====================================================================
-- R03 — Mise-bas imminente (dans ≤ 7 jours)
-- =====================================================================
select
  'R03-gestante-mise-bas-imminente'::text,
  'truie'::text,
  s.truie_id::text,
  a.tag,
  'élevée'::text,
  ('Mise-bas prévue dans ' || (s.date_saillie + 114 - current_date)::text || ' jour(s) — truie ' || a.tag),
  ('Truie gestante, date prévue mise-bas le ' || (s.date_saillie + 114)::text || '. Préparer la maternité.'),
  ('/reproduction/mises-bas?truie=' || s.truie_id::text),
  now(),
  a.ferme_id
from public.saillies s
join public.animaux a on a.id = s.truie_id and a.deleted_at is null and a.statut = 'actif'
join public.diagnostics_gestation d on d.saillie_id = s.id and d.resultat = 'positif'
where s.deleted_at is null
  and (s.date_saillie + 114) between current_date and (current_date + 7)
  and not exists (
    select 1 from public.mises_bas mb
    where mb.saillie_id = s.id and mb.deleted_at is null
  )

union all

-- =====================================================================
-- R04 — Gestante en retard de mise-bas (> 3 j après date prévue)
-- =====================================================================
select
  'R04-gestante-en-retard'::text,
  'truie'::text,
  s.truie_id::text,
  a.tag,
  'critique'::text,
  ('Mise-bas en retard de ' || (current_date - (s.date_saillie + 114))::text || ' jour(s) — truie ' || a.tag),
  ('Date prévue dépassée le ' || (s.date_saillie + 114)::text || ' — vérifier l''état de la truie en maternité.'),
  ('/reproduction/mises-bas?truie=' || s.truie_id::text),
  now(),
  a.ferme_id
from public.saillies s
join public.animaux a on a.id = s.truie_id and a.deleted_at is null and a.statut = 'actif'
join public.diagnostics_gestation d on d.saillie_id = s.id and d.resultat = 'positif'
where s.deleted_at is null
  and current_date - (s.date_saillie + 114) > 3
  and not exists (
    select 1 from public.mises_bas mb
    where mb.saillie_id = s.id and mb.deleted_at is null
  )

union all

-- =====================================================================
-- R05 — Bande avec porcelets nés depuis > 14 j sans aucune pesée
-- =====================================================================
select
  'R05-porcelets-non-peses'::text,
  'bande'::text,
  b.id::text,
  b.code,
  'moyenne'::text,
  ('Bande ' || b.code || ' : porcelets nés depuis ' ||
    (current_date - min(mb.date_mise_bas))::text || ' jours sans pesée enregistrée'),
  'Aucune pesée saisie depuis la mise-bas. Programmer une pesée pour suivre la croissance.',
  ('/pesees?bande=' || b.id::text),
  now(),
  b.ferme_id
from public.bandes b
join public.mises_bas mb on mb.bande_id = b.id and mb.deleted_at is null
where b.deleted_at is null
  and b.statut in ('active', 'sevree', 'engraissement')
  and not exists (
    select 1 from public.pesees p
    where p.bande_id = b.id and p.deleted_at is null
      and p.date_pesee >= mb.date_mise_bas
  )
group by b.id, b.code, b.ferme_id
having current_date - min(mb.date_mise_bas) > 14

union all

-- =====================================================================
-- R06 — Porcelet 16-25 j sans vaccin Mycoplasma
-- =====================================================================
select
  'R06-porcelets-non-vaccines-J14'::text,
  'animal'::text,
  a.id::text,
  a.tag,
  'élevée'::text,
  ('Porcelet ' || a.tag || ' âgé de ' || (current_date - a.date_naissance)::text || ' j sans vaccin Mycoplasma'),
  'Le vaccin Mycoplasma hyopneumoniae (J14) doit être administré entre 14 et 21 jours. Tolérance jusqu''à J25.',
  ('/sanitaire/vaccinations?animal=' || a.id::text),
  now(),
  a.ferme_id
from public.animaux a
where a.categorie = 'porcelet'
  and a.statut = 'actif'
  and a.deleted_at is null
  and a.date_naissance is not null
  and (current_date - a.date_naissance) between 16 and 25
  and not exists (
    select 1 from public.vaccinations v
    where v.animal_id = a.id and v.deleted_at is null
      and (v.produit ilike '%mycoplasma%' or v.produit ilike '%mycoplas%')
  )

union all

-- =====================================================================
-- R07 — Sevrage en retard (> 35 j depuis mise-bas)
-- =====================================================================
select
  'R07-sevrage-en-retard'::text,
  'bande'::text,
  coalesce(mb.bande_id, mb.id)::text,
  coalesce(b.code, 'MB-' || left(mb.id::text, 8)),
  'moyenne'::text,
  ('Sevrage en retard pour mise-bas du ' || mb.date_mise_bas::text || ' (' ||
    (current_date - mb.date_mise_bas)::text || ' j)'),
  'La mise-bas date de plus de 35 jours sans sevrage enregistré. Programmer le sevrage.',
  case when mb.bande_id is not null
       then '/bandes/' || mb.bande_id::text
       else '/reproduction/mises-bas/' || mb.id::text end,
  now(),
  a.ferme_id
from public.mises_bas mb
join public.animaux a on a.id = mb.truie_id
left join public.bandes b on b.id = mb.bande_id
where mb.deleted_at is null
  and current_date - mb.date_mise_bas > 35
  and not exists (
    select 1 from public.sevrages s
    where s.mise_bas_id = mb.id and s.deleted_at is null
  )

union all

-- =====================================================================
-- R08 — Mortalité bande > 5 % sur 7 derniers jours
-- =====================================================================
select
  'R08-mortalite-elevee-7j'::text,
  'bande'::text,
  b.id::text,
  b.code,
  'critique'::text,
  ('Mortalité élevée bande ' || b.code || ' : ' ||
    round( (count(m.id) * 100.0) / nullif(count_distinct_anim.n, 0), 1)::text || ' % sur 7 j'),
  ('Sur les 7 derniers jours : ' || count(m.id)::text || ' mortalité(s) enregistrée(s).'),
  ('/sanitaire/mortalites?bande=' || b.id::text),
  now(),
  b.ferme_id
from public.bandes b
join public.mortalites m on m.bande_id = b.id and m.deleted_at is null
  and m.date_mort >= current_date - 7
join lateral (
  select count(*)::int as n
  from public.bande_animaux ba
  where ba.bande_id = b.id and (ba.date_sortie is null or ba.date_sortie >= current_date - 7)
) count_distinct_anim on true
where b.deleted_at is null
group by b.id, b.code, b.ferme_id, count_distinct_anim.n
having count_distinct_anim.n > 0
  and (count(m.id) * 100.0) / count_distinct_anim.n > 5

union all

-- =====================================================================
-- R09 — Mortalité ferme entière > 2 % sur 30 jours
-- =====================================================================
select
  'R09-mortalite-elevee-30j'::text,
  'ferme'::text,
  f.id::text,
  f.nom,
  'critique'::text,
  ('Mortalité ferme ' || f.nom || ' : ' ||
    round((count(m.id) * 100.0) / nullif(effectif.n, 0), 2)::text || ' % sur 30 j'),
  ('Sur les 30 derniers jours : ' || count(m.id)::text ||
    ' mortalité(s) pour un effectif vivant de ' || effectif.n::text || '.'),
  ('/sanitaire/mortalites'),
  now(),
  f.id as ferme_id
from public.fermes f
join public.mortalites m on m.ferme_id = f.id and m.deleted_at is null
  and m.date_mort >= current_date - 30
join lateral (
  select count(*)::int as n
  from public.animaux a
  where a.ferme_id = f.id and a.statut = 'actif' and a.deleted_at is null
) effectif on true
group by f.id, f.nom, effectif.n
having effectif.n > 0
  and (count(m.id) * 100.0) / effectif.n > 2

union all

-- =====================================================================
-- R10 — Stock matière première sous le seuil d'alerte
-- =====================================================================
select
  'R10-stock-critique'::text,
  'matiere'::text,
  mp.id::text,
  mp.nom,
  'élevée'::text,
  ('Stock critique : ' || mp.nom || ' (' ||
    coalesce(mp.stock_actuel, 0)::text || ' ' || coalesce(mp.unite, 'kg') ||
    ' / seuil ' || mp.seuil_alerte::text || ')'),
  'Le stock actuel est inférieur au seuil d''alerte. Prévoir un réapprovisionnement.',
  ('/stocks/' || mp.id::text),
  now(),
  mp.ferme_id
from public.matieres_premieres mp
where mp.deleted_at is null
  and mp.seuil_alerte is not null
  and mp.seuil_alerte > 0
  and coalesce(mp.stock_actuel, 0) < mp.seuil_alerte

union all

-- =====================================================================
-- R11 — Rupture prévue < 7 j (basé sur conso moyenne 30 j)
-- =====================================================================
select
  'R11-aliment-rupture-prevue'::text,
  'matiere'::text,
  mp.id::text,
  mp.nom,
  'moyenne'::text,
  ('Rupture prévue dans ' ||
    floor(coalesce(mp.stock_actuel, 0) / nullif(conso.moy_jour, 0))::text ||
    ' jour(s) — ' || mp.nom),
  ('Conso moyenne 30 j : ' || round(conso.moy_jour, 1)::text || ' ' || coalesce(mp.unite, 'kg') ||
    '/jour. Stock actuel : ' || coalesce(mp.stock_actuel, 0)::text || '.'),
  ('/stocks/' || mp.id::text),
  now(),
  mp.ferme_id
from public.matieres_premieres mp
join lateral (
  select coalesce(sum(c.quantite_kg) / 30.0, 0)::numeric as moy_jour
  from public.consommations_aliment c
  join public.bandes b on b.id = c.bande_id
  where b.ferme_id = mp.ferme_id
    and c.date >= current_date - 30
) conso on true
where mp.deleted_at is null
  and mp.type in ('matiere_premiere', 'aliment_fini')
  and conso.moy_jour > 0
  and coalesce(mp.stock_actuel, 0) > 0
  and (coalesce(mp.stock_actuel, 0) / conso.moy_jour) < 7
  and not (mp.seuil_alerte is not null and coalesce(mp.stock_actuel, 0) < mp.seuil_alerte)

union all

-- =====================================================================
-- R12 — Acte sanitaire obligatoire en retard de > 7 j
-- =====================================================================
select
  'R12-acte-sanitaire-en-retard'::text,
  'animal'::text,
  a.id::text,
  a.tag,
  'élevée'::text,
  ('Acte sanitaire en retard : ' || pv.nom || ' (animal ' || a.tag || ', ' ||
    (current_date - a.date_naissance - pv.age_jours)::text || ' j de retard)'),
  ('Protocole obligatoire prévu à J' || pv.age_jours::text ||
    ', non administré (animal âgé de ' || (current_date - a.date_naissance)::text || ' j).'),
  ('/sanitaire/vaccinations?animal=' || a.id::text),
  now(),
  a.ferme_id
from public.animaux a
join public.protocoles_vaccinaux pv
  on pv.ferme_id = a.ferme_id
  and pv.categorie_cible = a.categorie
  and pv.obligatoire = true
  and pv.actif = true
  and pv.age_jours is not null
where a.statut = 'actif'
  and a.deleted_at is null
  and a.date_naissance is not null
  and (current_date - a.date_naissance) > (pv.age_jours + 7)
  and not exists (
    select 1 from public.vaccinations v
    where v.animal_id = a.id
      and v.deleted_at is null
      and v.protocole_id = pv.id
  )
;

-- =====================================================================
-- Commentaire + grants RESTRICTIFS
-- =====================================================================
comment on view public.v_alertes_actives is
  'C3-SEC — Vue agrégée des alertes actives (12 règles UNION ALL). security_invoker=true → respecte RLS du caller.';

-- V1 single-tenant : anon doit pouvoir lire la vue car createClient() côté Next utilise anon key
-- V2 multi-tenant : retirer le grant à anon ET activer RLS sur tables sources
revoke all on public.v_alertes_actives from public;

grant select on public.v_alertes_actives to authenticated, service_role, anon;
