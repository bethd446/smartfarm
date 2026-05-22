-- =====================================================================
-- C2-SCHEMA : Table `tips_conseiller` (~300 tips agritech)
-- ---------------------------------------------------------------------
-- Stack : Smart Farm (élevage porcin) — Postgres 15 / Supabase Docker.
-- V1 : pas de RLS (single-tenant). Données statiques, seedées par les 5
-- agents parallèles (REPRO / SANITAIRE / NUTRI / CONDUITE / ECO).
-- Cette migration crée juste la STRUCTURE + index + grants. Pas de seed.
-- =====================================================================

create table if not exists public.tips_conseiller (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  titre       text not null,
  categorie   text not null check (categorie in (
    'reproduction','sanitaire','nutrition','conduite','economique','installation'
  )),
  niveau      text not null check (niveau in ('debutant','intermediaire','expert')),
  resume      text not null,
  contenu     text not null,
  tags        text[] not null default '{}',
  source      text,
  created_at  timestamptz not null default now()
);

-- Index pour les filtres principaux
create index if not exists tips_conseiller_cat_idx
  on public.tips_conseiller(categorie);

create index if not exists tips_conseiller_niveau_idx
  on public.tips_conseiller(niveau);

-- Index GIN pour recherche par tag (array contains)
create index if not exists tips_conseiller_tags_idx
  on public.tips_conseiller using gin(tags);

-- Pas de RLS V1 (single-tenant). Grants ouverts comme les autres tables
-- de catalogue (cf. maladies, protocoles).
grant select on public.tips_conseiller to anon, authenticated, service_role;
