-- ============================================================================
-- SMARTFARM — Schéma initial gestion élevage porcin
-- Migration : 20260520000001_init_smartfarm
-- Auteur    : Hermes pour Christophe Liegeois
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. ORGANISATION : Fermes & Bâtiments
-- ============================================================================

create table fermes (
  id          uuid primary key default uuid_generate_v4(),
  nom         text not null,
  code        text unique not null,
  localisation text,
  pays        text default 'CI',
  type        text default 'porcine',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table batiments (
  id          uuid primary key default uuid_generate_v4(),
  ferme_id    uuid not null references fermes(id) on delete cascade,
  nom         text not null,
  type        text check (type in ('maternité','gestation','verraterie','post-sevrage','engraissement','quarantaine','infirmerie')),
  capacite    int,
  surface_m2  numeric,
  created_at  timestamptz default now()
);

create table cases (
  id          uuid primary key default uuid_generate_v4(),
  batiment_id uuid not null references batiments(id) on delete cascade,
  numero      text not null,
  capacite    int,
  type        text,
  unique (batiment_id, numero)
);

-- ============================================================================
-- 2. CHEPTEL : Animaux
-- ============================================================================

create type sexe_t   as enum ('M','F');
create type statut_animal_t as enum ('actif','vendu','abattu','mort','reforme');
create type categorie_t as enum ('verrat','truie','cochette','porcelet','sevrage','engraissement');

create table races (
  id    uuid primary key default uuid_generate_v4(),
  nom   text unique not null
);

create table animaux (
  id            uuid primary key default uuid_generate_v4(),
  ferme_id      uuid not null references fermes(id) on delete cascade,
  case_id       uuid references cases(id) on delete set null,
  tag           text not null,
  nom           text,
  sexe          sexe_t not null,
  categorie     categorie_t not null,
  race_id       uuid references races(id),
  date_naissance date,
  date_entree   date default current_date,
  mere_id       uuid references animaux(id),
  pere_id       uuid references animaux(id),
  poids_naissance_kg numeric,
  statut        statut_animal_t default 'actif',
  observations  text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (ferme_id, tag)
);

create index idx_animaux_ferme on animaux(ferme_id);
create index idx_animaux_statut on animaux(statut);
create index idx_animaux_categorie on animaux(categorie);

-- ============================================================================
-- 3. BANDES (lots de production)
-- ============================================================================

create type statut_bande_t as enum ('preparation','active','sevree','engraissement','finie');

create table bandes (
  id          uuid primary key default uuid_generate_v4(),
  ferme_id    uuid not null references fermes(id) on delete cascade,
  nom         text not null,
  code        text not null,
  date_debut  date not null,
  date_fin_prevue date,
  date_fin_reelle date,
  statut      statut_bande_t default 'preparation',
  observations text,
  created_at  timestamptz default now(),
  unique (ferme_id, code)
);

create table bande_animaux (
  bande_id    uuid not null references bandes(id) on delete cascade,
  animal_id   uuid not null references animaux(id) on delete cascade,
  date_entree date default current_date,
  date_sortie date,
  primary key (bande_id, animal_id)
);

-- ============================================================================
-- 4. REPRODUCTION : Saillies, Gestation, Mises-bas, Sevrages
-- ============================================================================

create type methode_saillie_t as enum ('naturelle','IA','IA_double');
create type resultat_gestation_t as enum ('en_attente','positif','negatif','retour_chaleur');

create table saillies (
  id            uuid primary key default uuid_generate_v4(),
  ferme_id      uuid not null references fermes(id) on delete cascade,
  bande_id      uuid references bandes(id),
  truie_id      uuid not null references animaux(id),
  verrat_id     uuid references animaux(id),
  date_saillie  date not null,
  methode       methode_saillie_t default 'naturelle',
  rang_porte    int,
  observations  text,
  created_at    timestamptz default now()
);

create index idx_saillies_truie on saillies(truie_id);
create index idx_saillies_bande on saillies(bande_id);
create index idx_saillies_date on saillies(date_saillie);

create table diagnostics_gestation (
  id            uuid primary key default uuid_generate_v4(),
  saillie_id    uuid not null references saillies(id) on delete cascade,
  date_diagnostic date not null,
  resultat      resultat_gestation_t not null,
  methode       text,
  observations  text
);

create table mises_bas (
  id              uuid primary key default uuid_generate_v4(),
  saillie_id      uuid not null references saillies(id) on delete cascade,
  truie_id        uuid not null references animaux(id),
  bande_id        uuid references bandes(id),
  date_mise_bas   date not null,
  nes_totaux      int not null,
  nes_vivants     int not null,
  nes_morts       int default 0,
  momifies        int default 0,
  poids_portee_kg numeric,
  duree_minutes   int,
  assistance      boolean default false,
  observations    text,
  created_at      timestamptz default now()
);

create index idx_mb_truie on mises_bas(truie_id);
create index idx_mb_date on mises_bas(date_mise_bas);

create table sevrages (
  id              uuid primary key default uuid_generate_v4(),
  mise_bas_id     uuid not null references mises_bas(id) on delete cascade,
  truie_id        uuid not null references animaux(id),
  bande_id        uuid references bandes(id),
  date_sevrage    date not null,
  nb_sevres       int not null,
  poids_total_kg  numeric,
  age_jours       int,
  observations    text,
  created_at      timestamptz default now()
);

create table regles_sevrage (
  id              uuid primary key default uuid_generate_v4(),
  ferme_id        uuid not null references fermes(id) on delete cascade,
  nom             text not null,
  age_min_jours   int default 21,
  age_max_jours   int default 28,
  poids_min_kg    numeric default 6.0,
  actif           boolean default true,
  created_at      timestamptz default now()
);

-- ============================================================================
-- 5. PESÉES & CROISSANCE
-- ============================================================================

create table pesees (
  id          uuid primary key default uuid_generate_v4(),
  animal_id   uuid references animaux(id) on delete cascade,
  bande_id    uuid references bandes(id) on delete cascade,
  date_pesee  date not null,
  poids_kg    numeric not null,
  nb_animaux  int default 1,
  type        text check (type in ('individuelle','bande_moyenne','bande_totale')),
  observations text,
  created_at  timestamptz default now(),
  check (animal_id is not null or bande_id is not null)
);

create index idx_pesees_animal on pesees(animal_id);
create index idx_pesees_bande on pesees(bande_id);
create index idx_pesees_date on pesees(date_pesee);

-- ============================================================================
-- 6. SANITAIRE : Protocoles, vaccinations, traitements, mortalités
-- ============================================================================

create table protocoles_vaccinaux (
  id          uuid primary key default uuid_generate_v4(),
  ferme_id    uuid not null references fermes(id) on delete cascade,
  nom         text not null,
  categorie_cible categorie_t,
  age_jours   int,
  produit     text,
  voie        text,
  dose_ml     numeric,
  rappel_jours int,
  actif       boolean default true
);

create table vaccinations (
  id          uuid primary key default uuid_generate_v4(),
  protocole_id uuid references protocoles_vaccinaux(id),
  animal_id   uuid references animaux(id),
  bande_id    uuid references bandes(id),
  date_vaccination date not null,
  produit     text,
  lot         text,
  dose_ml     numeric,
  veterinaire text,
  observations text,
  created_at  timestamptz default now()
);

create table traitements (
  id          uuid primary key default uuid_generate_v4(),
  animal_id   uuid references animaux(id),
  bande_id    uuid references bandes(id),
  date_debut  date not null,
  date_fin    date,
  motif       text not null,
  produit     text,
  posologie   text,
  voie        text,
  veterinaire text,
  cout        numeric,
  observations text,
  created_at  timestamptz default now()
);

create table mortalites (
  id          uuid primary key default uuid_generate_v4(),
  animal_id   uuid references animaux(id),
  bande_id    uuid references bandes(id),
  ferme_id    uuid not null references fermes(id),
  date_mort   date not null,
  cause       text,
  diagnostic  text,
  autopsie    boolean default false,
  observations text,
  created_at  timestamptz default now()
);

create index idx_mortalites_date on mortalites(date_mort);

-- ============================================================================
-- 7. ALIMENTATION
-- ============================================================================

create table types_aliment (
  id          uuid primary key default uuid_generate_v4(),
  nom         text unique not null,
  categorie_cible categorie_t,
  proteine_pct numeric,
  energie_kcal_kg numeric,
  observations text
);

create table formulations (
  id          uuid primary key default uuid_generate_v4(),
  ferme_id    uuid not null references fermes(id) on delete cascade,
  type_aliment_id uuid references types_aliment(id),
  nom         text not null,
  date_creation date default current_date,
  cout_kg     numeric,
  actif       boolean default true
);

create table formulation_ingredients (
  formulation_id uuid not null references formulations(id) on delete cascade,
  matiere_premiere_id uuid not null,
  pourcentage numeric not null,
  primary key (formulation_id, matiere_premiere_id)
);

create table plans_alimentation (
  id          uuid primary key default uuid_generate_v4(),
  bande_id    uuid references bandes(id) on delete cascade,
  type_aliment_id uuid references types_aliment(id),
  date_debut  date not null,
  date_fin    date,
  ration_kg_jour numeric
);

create table consommations_aliment (
  id          uuid primary key default uuid_generate_v4(),
  bande_id    uuid references bandes(id) on delete cascade,
  type_aliment_id uuid references types_aliment(id),
  date        date not null,
  quantite_kg numeric not null,
  cout        numeric,
  observations text,
  created_at  timestamptz default now()
);

create index idx_conso_bande on consommations_aliment(bande_id);
create index idx_conso_date on consommations_aliment(date);

-- ============================================================================
-- 8. STOCK : Matières premières & Intrants
-- ============================================================================

create type type_stock_t as enum ('matiere_premiere','aliment_fini','vaccin','medicament','desinfectant','consommable','autre');
create type mvt_t as enum ('entree','sortie','perte','inventaire','transfert');

create table fournisseurs (
  id          uuid primary key default uuid_generate_v4(),
  nom         text not null,
  contact     text,
  telephone   text,
  email       text,
  adresse     text,
  created_at  timestamptz default now()
);

create table matieres_premieres (
  id          uuid primary key default uuid_generate_v4(),
  ferme_id    uuid not null references fermes(id) on delete cascade,
  nom         text not null,
  type        type_stock_t not null,
  unite       text default 'kg',
  seuil_alerte numeric,
  stock_actuel numeric default 0,
  cout_moyen_unite numeric,
  observations text,
  created_at  timestamptz default now()
);

create table mouvements_stock (
  id          uuid primary key default uuid_generate_v4(),
  matiere_id  uuid not null references matieres_premieres(id) on delete cascade,
  type        mvt_t not null,
  date_mvt    date not null default current_date,
  quantite    numeric not null,
  cout_unitaire numeric,
  cout_total  numeric,
  fournisseur_id uuid references fournisseurs(id),
  commande_id uuid,
  bande_id    uuid references bandes(id),
  reference   text,
  observations text,
  created_at  timestamptz default now(),
  created_by  uuid
);

create index idx_mvt_matiere on mouvements_stock(matiere_id);
create index idx_mvt_date on mouvements_stock(date_mvt);

create table commandes (
  id          uuid primary key default uuid_generate_v4(),
  ferme_id    uuid not null references fermes(id) on delete cascade,
  fournisseur_id uuid references fournisseurs(id),
  date_commande date default current_date,
  date_livraison_prevue date,
  date_livraison_reelle date,
  statut      text default 'en_cours',
  total_ht    numeric,
  total_ttc   numeric,
  observations text,
  created_at  timestamptz default now()
);

-- ============================================================================
-- 9. PRODUCTION / DÉPARTS
-- ============================================================================

create type motif_depart_t as enum ('vente','abattage','reforme','transfert','don');

create table departs (
  id          uuid primary key default uuid_generate_v4(),
  animal_id   uuid references animaux(id),
  bande_id    uuid references bandes(id),
  ferme_id    uuid not null references fermes(id),
  date_depart date not null,
  motif       motif_depart_t not null,
  nb_animaux  int default 1,
  poids_total_kg numeric,
  prix_kg     numeric,
  montant_total numeric,
  acheteur    text,
  observations text,
  created_at  timestamptz default now()
);

create index idx_departs_date on departs(date_depart);

-- ============================================================================
-- 10. UTILISATEURS & MULTI-TENANT
-- ============================================================================

create type role_t as enum ('admin','manager','technicien','ouvrier','veterinaire','viewer');

create table utilisateurs (
  id          uuid primary key default uuid_generate_v4(),
  auth_id     uuid unique,
  email       text unique not null,
  nom         text,
  prenom      text,
  telephone   text,
  role        role_t default 'viewer',
  actif       boolean default true,
  created_at  timestamptz default now()
);

create table utilisateur_fermes (
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  ferme_id    uuid not null references fermes(id) on delete cascade,
  role        role_t default 'viewer',
  primary key (utilisateur_id, ferme_id)
);

-- ============================================================================
-- 11. VUES KPI
-- ============================================================================

create or replace view v_kpi_bande as
select
  b.id as bande_id,
  b.ferme_id,
  b.nom as bande_nom,
  b.statut,
  count(distinct ba.animal_id) as effectif,
  coalesce(sum(ca.quantite_kg), 0) as conso_kg_total,
  coalesce(sum(ca.cout), 0) as cout_alim_total,
  (select count(*) from mortalites m where m.bande_id = b.id) as mortalites,
  (select avg(p.poids_kg) from pesees p where p.bande_id = b.id) as poids_moyen_kg
from bandes b
left join bande_animaux ba on ba.bande_id = b.id
left join consommations_aliment ca on ca.bande_id = b.id
group by b.id;

create or replace view v_kpi_truie as
select
  a.id as truie_id,
  a.ferme_id,
  a.tag,
  count(distinct s.id) as nb_saillies,
  count(distinct mb.id) as nb_portees,
  coalesce(sum(mb.nes_vivants), 0) as total_nes_vivants,
  coalesce(sum(sv.nb_sevres), 0) as total_sevres,
  case when count(distinct mb.id) > 0
       then coalesce(sum(mb.nes_vivants)::numeric / count(distinct mb.id), 0)
       else 0 end as prolificite_moyenne
from animaux a
left join saillies s on s.truie_id = a.id
left join mises_bas mb on mb.truie_id = a.id
left join sevrages sv on sv.truie_id = a.id
where a.categorie = 'truie'
group by a.id;

-- ============================================================================
-- 12. TRIGGERS updated_at
-- ============================================================================

create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_fermes   before update on fermes   for each row execute function trigger_set_updated_at();
create trigger set_updated_at_animaux  before update on animaux  for each row execute function trigger_set_updated_at();

-- ============================================================================
-- 13. RLS — multi-tenant prêt (désactivé en brouillon, activé en prod)
-- ============================================================================
-- En version brouillon : RLS désactivée, accès libre via clé anon
-- En production : à activer avec policies basées sur utilisateur_fermes

-- alter table fermes enable row level security;
-- alter table animaux enable row level security;
-- ... (à compléter quand on passe en prod)
