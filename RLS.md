# RLS Multi-tenant — Smart Farm

Guide opérationnel pour la couche **Row Level Security** de Smart Farm.

## TL;DR

- Migration `20260520130001_rls_multitenant.sql` crée **79 policies** sur **31 tables**.
- **La RLS n'est PAS activée** en brouillon. Toutes les `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` sont en commentaire.
- Activation = 1 bloc SQL à copier-coller (voir [Activation](#activation-en-prod)).
- Rollback = même bloc avec `disable` à la place de `enable`.

---

## Architecture

### Fonctions helpers

| Fonction | Retour | Description |
|---|---|---|
| `current_user_internal_id()` | uuid | Mappe `auth.uid()` (Supabase Auth) → `utilisateurs.id`. NULL si non connecté ou inactif. |
| `current_farm_id()` | uuid | Ferme active : claim JWT `farm_id` si présent et autorisé, sinon 1ère ferme liée via `utilisateur_fermes`. NULL gracieux. |
| `current_user_role()` | `role_t` | Rôle de l'utilisateur sur sa ferme active. NULL si pas connecté. |
| `user_has_farm_access(uuid)` | bool | Helper : l'utilisateur courant a-t-il accès à la ferme `p_ferme_id` ? |

Toutes en `language plpgsql stable security definer`.

### Modèle de rôles

```
role_t = admin | manager | technicien | ouvrier | veterinaire | viewer
```

| Rôle | Lecture | Écriture animaux | Écriture santé | Écriture stocks | Admin (users, etc.) |
|---|---|---|---|---|---|
| admin       | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager     | ✅ | ✅ | ✅ | ✅ | partielle |
| technicien  | ✅ | ✅ | ✅ | ✅ | ❌ |
| ouvrier     | ✅ | ✅ | ✅ pesées/santé | ❌ | ❌ |
| veterinaire | ✅ | ✅ | ✅ | ❌ | ❌ |
| viewer      | ✅ | ❌ | ❌ | ❌ | ❌ |

### Tables protégées (par catégorie)

- **Référentiels globaux** (SELECT pour tous, écriture admin/manager) : `races`, `protocoles_vaccinaux`, `types_aliment`, `fournisseurs`
- **Ferme directe** (`ferme_id`) : `fermes`, `batiments`, `animaux`, `bandes`, `saillies`, `mortalites`, `regles_sevrage`, `departs`, `commandes`, `matieres_premieres`, `formulations`
- **Ferme indirecte** (via FK) : `salles`/`cases` (via `batiment_id`), `bande_animaux`/`plans_alimentation`/`consommations_aliment` (via `bande_id`), `diagnostics_gestation`/`mises_bas`/`sevrages`/`pesees`/`vaccinations`/`traitements` (via `animal_id` ou `saillie_id`), `mouvements_stock` (via `matiere_id`), `formulation_ingredients` (via `formulation_id`)
- **Spéciaux** : `utilisateurs` (self + membres ferme), `utilisateur_fermes` (self + admin), `audit_logs` (SELECT admin/manager, append-only via trigger)

---

## Activation en prod

### Pré-requis impératifs

1. Chaque utilisateur Supabase Auth doit avoir une ligne dans `public.utilisateurs` avec `auth_id` = `auth.users.id` et `actif = true`.
2. Chaque utilisateur actif doit avoir **au moins une ligne** dans `utilisateur_fermes` (sinon `current_farm_id()` = NULL → policies retournent 0 ligne).
3. L'app Next.js doit appeler la DB avec le client `authenticated` (cookies SSR Supabase), pas `service_role` pour les requêtes utilisateur.
4. Optionnel : injecter un claim custom `farm_id` dans le JWT pour forcer une ferme spécifique (utile multi-ferme).

### Commande d'activation

Copier-coller dans `psql` ou Studio Supabase :

```sql
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
```

Le même bloc est disponible **en commentaire à la fin de la migration** `20260520130001_rls_multitenant.sql` (section `ACTIVATION_RLS.sql`).

---

## Tests locaux avec JWT custom

### Méthode rapide (SET de GUC)

`auth.uid()` lit `request.jwt.claims->>sub`. On peut simuler côté psql :

```sql
-- Simuler un utilisateur connecté (exemple)
select set_config(
  'request.jwt.claims',
  '{"sub":"<auth_uuid_de_l_utilisateur>","role":"authenticated"}',
  true
);

-- Avec ferme forcée :
select set_config(
  'request.jwt.claims',
  '{"sub":"<auth_uuid>","role":"authenticated","farm_id":"<ferme_uuid>"}',
  true
);

-- Vérifier le contexte
select current_user_internal_id(), current_farm_id(), current_user_role();
```

### Procédure de test complète

```sql
-- 1. Créer un utilisateur de test lié à la ferme Yamoussoukro
insert into utilisateurs (id, auth_id, email, role, actif)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'test@smartfarm.local', 'manager', true);

insert into utilisateur_fermes (utilisateur_id, ferme_id, role)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, 'manager' from fermes limit 1;

-- 2. Activer la RLS sur une table cible (test isolé)
alter table animaux enable row level security;

-- 3. Simuler le contexte JWT
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
set role authenticated;

-- 4. Lire : doit voir uniquement les animaux de la ferme liée
select count(*) from animaux;

-- 5. Cleanup
reset role;
alter table animaux disable row level security;
delete from utilisateur_fermes where utilisateur_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from utilisateurs where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
```

### Tests recommandés par rôle

| Scénario | Attendu |
|---|---|
| `viewer` lit `animaux` de sa ferme | ✅ N rows |
| `viewer` insert dans `animaux` | ❌ 0 rows affected (policy refuse) |
| `manager` delete `mortalites` | ✅ OK |
| `ouvrier` delete `pesees` | ❌ (delete réservé admin/manager) |
| `manager` ferme A lit `animaux` ferme B | ❌ 0 rows (cross-tenant bloqué) |
| `admin` lit `utilisateurs` (toutes fermes) | ✅ visibles via policy admin |
| Pas de JWT → `select * from animaux` | ❌ 0 rows |

---

## Rollback d'urgence

Si la RLS casse l'app en prod :

```sql
-- Désactiver TOUT en une commande
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public' and rowsecurity=true loop
    execute format('alter table public.%I disable row level security', r.tablename);
  end loop;
end $$;
```

Ou, équivalent ligne à ligne (reprendre le bloc d'activation, remplacer `enable` par `disable`).

Les **policies restent en place** après `disable` — elles sont simplement ignorées par le moteur. Réactivation = `enable` (instantané, pas de migration nécessaire).

---

## Bypass administratif

- **service_role key** : bypass intégral de la RLS (à utiliser uniquement côté serveur Next.js pour les jobs admin, jamais en client browser).
- **postgres superuser** : bypass intégral (accès direct DB).
- **BYPASSRLS attribute** : on peut donner `alter role <r> bypassrls` à un rôle dédié (ex. job d'export).

---

## Points d'attention

1. **Performance** : les policies à `EXISTS (subselect)` (cases, salles, mises_bas, etc.) ajoutent un coût. Les FK sont indexées, donc impact négligeable sauf très gros volumes. Vérifier via `EXPLAIN` après activation.
2. **Audit logs** : la table est append-only via trigger `SECURITY DEFINER`. Aucune policy INSERT/UPDATE/DELETE (= refus par défaut côté authenticated).
3. **Vues** (`v_kpi_bande`, `v_kpi_truie`, etc.) : héritent du contexte RLS de l'utilisateur appelant — pas besoin de policies dédiées.
4. **Vues matérialisées** (`mv_kpi_ferme` s'il existe) : RLS **non héritée**, attention au refresh côté service_role et restreindre les grants en lecture.
5. **Multi-ferme par utilisateur** : sans claim `farm_id` dans le JWT, on prend la 1ère ferme. L'UI doit gérer le switch de ferme et injecter le claim.
