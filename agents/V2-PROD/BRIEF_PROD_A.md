# Brief PROD-A — RLS audit + activation + wrapper auth demo

## Périmètre
✅ Touche : 1 migration SQL (RLS enable + policies manquantes) + 2 fichiers `src/lib/supabase/{server,client}.ts`
❌ Pas : pages, autres modules. Pas `npm run build`.

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` ET `/root/CLAUDE.md`.

État :
- **42 tables** dans le schéma `public`, **RLS désactivé** sur toutes (`relrowsecurity=f`)
- **31 tables** ont déjà des policies définies (`pg_policies`), **11 tables** sans aucune policy
- Helpers DB existants : `current_farm_id()`, `user_has_farm_access(uuid)`, `current_user_role()`
- Ferme demo seed : `00000000-0000-0000-0000-000000000001` ("Smart Farm Yamoussoukro")
- Wrapper Supabase actuel : `createServerClient`/`createBrowserClient` standard SSR

## Objectif
**Préparer le multi-tenant pour quand Christophe branchera Supabase Auth Cloud** :
1. Activer RLS sur toutes les tables qui ont des policies (sans casser le mode demo)
2. Compléter les 11 tables sans policies
3. Modifier le wrapper Supabase pour injecter un **JWT custom demo** qui simule un user authentifié sur la ferme demo → toutes les requêtes passent le RLS sans nécessiter d'auth réelle

## Mission

### 1. Migration SQL — Activer RLS partout

Fichier : `supabase/migrations/20260522090000_rls_complete.sql`

```sql
BEGIN;

-- Activer RLS sur les 31 tables qui ont déjà des policies (sans toucher au contenu)
ALTER TABLE animaux                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bande_animaux               ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE batiments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE consommations_aliment       ENABLE ROW LEVEL SECURITY;
ALTER TABLE departs                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostics_gestation       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fermes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulation_ingredients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE matieres_premieres          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mises_bas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortalites                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements_stock            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesees                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans_alimentation          ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocoles_vaccinaux        ENABLE ROW LEVEL SECURITY;
ALTER TABLE races                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE regles_sevrage              ENABLE ROW LEVEL SECURITY;
ALTER TABLE saillies                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE salles                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sevrages                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitements                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE types_aliment               ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateur_fermes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateurs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations                ENABLE ROW LEVEL SECURITY;

-- 11 tables sans policies : créer policies génériques + activer RLS
-- (toutes ces tables ont une colonne ferme_id ou rattachement indirect)

-- biosecurite_audits
CREATE POLICY "biosecurite_audits_select" ON biosecurite_audits FOR SELECT
  USING (user_has_farm_access(ferme_id));
CREATE POLICY "biosecurite_audits_write" ON biosecurite_audits
  USING (current_user_role() IS NOT NULL AND current_user_role() <> 'viewer' AND ferme_id = current_farm_id())
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE biosecurite_audits ENABLE ROW LEVEL SECURITY;

-- biosecurite_checklist : référentiel public (lecture libre)
CREATE POLICY "biosecurite_checklist_select" ON biosecurite_checklist FOR SELECT USING (true);
ALTER TABLE biosecurite_checklist ENABLE ROW LEVEL SECURITY;

-- checks_post_mb (via mise_bas → truie → ferme)
CREATE POLICY "checks_post_mb_select" ON checks_post_mb FOR SELECT
  USING (EXISTS (SELECT 1 FROM mises_bas mb JOIN animaux a ON a.id=mb.truie_id WHERE mb.id=checks_post_mb.mise_bas_id AND user_has_farm_access(a.ferme_id)));
CREATE POLICY "checks_post_mb_write" ON checks_post_mb
  USING (EXISTS (SELECT 1 FROM mises_bas mb JOIN animaux a ON a.id=mb.truie_id WHERE mb.id=checks_post_mb.mise_bas_id AND a.ferme_id=current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer'))
  WITH CHECK (EXISTS (SELECT 1 FROM mises_bas mb JOIN animaux a ON a.id=mb.truie_id WHERE mb.id=checks_post_mb.mise_bas_id AND a.ferme_id=current_farm_id()));
ALTER TABLE checks_post_mb ENABLE ROW LEVEL SECURITY;

-- consommations_eau
CREATE POLICY "consommations_eau_select" ON consommations_eau FOR SELECT USING (user_has_farm_access(ferme_id));
CREATE POLICY "consommations_eau_write" ON consommations_eau
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE consommations_eau ENABLE ROW LEVEL SECURITY;

-- evenements_prevus
CREATE POLICY "evenements_prevus_select" ON evenements_prevus FOR SELECT USING (user_has_farm_access(ferme_id));
CREATE POLICY "evenements_prevus_write" ON evenements_prevus
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE evenements_prevus ENABLE ROW LEVEL SECURITY;

-- lots_matieres_premieres
CREATE POLICY "lots_matieres_premieres_select" ON lots_matieres_premieres FOR SELECT USING (user_has_farm_access(ferme_id));
CREATE POLICY "lots_matieres_premieres_write" ON lots_matieres_premieres
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE lots_matieres_premieres ENABLE ROW LEVEL SECURITY;

-- ppa_observations
CREATE POLICY "ppa_observations_select" ON ppa_observations FOR SELECT USING (user_has_farm_access(ferme_id));
CREATE POLICY "ppa_observations_write" ON ppa_observations
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE ppa_observations ENABLE ROW LEVEL SECURITY;

-- produits_anti_mycotoxines : référentiel public
CREATE POLICY "produits_anti_mycotoxines_select" ON produits_anti_mycotoxines FOR SELECT USING (true);
ALTER TABLE produits_anti_mycotoxines ENABLE ROW LEVEL SECURITY;

-- protocoles_anti_mycotoxines
CREATE POLICY "protocoles_anti_mycotoxines_select" ON protocoles_anti_mycotoxines FOR SELECT USING (user_has_farm_access(ferme_id));
CREATE POLICY "protocoles_anti_mycotoxines_write" ON protocoles_anti_mycotoxines
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE protocoles_anti_mycotoxines ENABLE ROW LEVEL SECURITY;

-- tips_conseiller : référentiel public
CREATE POLICY "tips_conseiller_select" ON tips_conseiller FOR SELECT USING (true);
ALTER TABLE tips_conseiller ENABLE ROW LEVEL SECURITY;

-- transits_phase
CREATE POLICY "transits_phase_select" ON transits_phase FOR SELECT USING (user_has_farm_access(ferme_id));
CREATE POLICY "transits_phase_write" ON transits_phase
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE transits_phase ENABLE ROW LEVEL SECURITY;

-- visites_biosecurite
CREATE POLICY "visites_biosecurite_select" ON visites_biosecurite FOR SELECT USING (user_has_farm_access(ferme_id));
CREATE POLICY "visites_biosecurite_write" ON visites_biosecurite
  USING (ferme_id = current_farm_id() AND current_user_role() IS NOT NULL AND current_user_role() <> 'viewer')
  WITH CHECK (ferme_id = current_farm_id());
ALTER TABLE visites_biosecurite ENABLE ROW LEVEL SECURITY;

-- Vue audit RLS pour vérification post-migration
CREATE OR REPLACE FUNCTION verify_rls_status()
RETURNS TABLE (table_name text, rls_enabled boolean, nb_policies bigint) AS $$
  SELECT
    c.relname::text,
    c.relrowsecurity,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = c.relname AND p.schemaname = 'public')
  FROM pg_class c
  WHERE c.relkind='r'
    AND c.relnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
    AND c.relname NOT LIKE 'pg_%'
  ORDER BY c.relname;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION verify_rls_status() TO anon, authenticated;

COMMIT;
```

### 2. Wrapper Supabase — JWT demo

**Stratégie** : générer un JWT signé HMAC qui contient `farm_id`, `role`, `user_id` demo. Quand l'utilisateur "anonyme" accède à l'app, le wrapper SSR injecte ce JWT dans la requête PostgREST → RLS pense que c'est un user authentifié.

⚠️ Côté **client browser**, garde `createBrowserClient` simple (sans JWT) → les requêtes client passent par `anon` key et utilisent les policies publiques (tips, biosecurite_checklist, produits_anti_mycotoxines, etc.). Tout ce qui est métier fermé passe par Server Components.

**Modifier `src/lib/supabase/server.ts`** :

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ID de la ferme demo (Yamoussoukro)
const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_USER_ID  = '00000000-0000-0000-0000-000000000001'
const DEMO_ROLE     = 'admin'

/**
 * Wrapper Supabase Server pour le mode demo (sans Auth réelle).
 *
 * Stratégie :
 * - Utilise `service_role` côté serveur (RLS bypass) pour les requêtes système
 * - Set explicite des GUC PostgreSQL `request.jwt.claims` pour que les fonctions
 *   current_farm_id() / current_user_role() retournent les valeurs demo
 *
 * Quand Christophe branchera l'auth Supabase Cloud :
 * 1. Remplacer ce fichier par la version standard `createServerClient`
 *    avec cookies session réelles
 * 2. Le reste de l'app n'a aucune modification à faire — toutes les pages
 *    et server actions utilisent déjà createClient() depuis ce module
 */
export async function createClient() {
  const cookieStore = await cookies()

  // En mode demo : utiliser service_role pour bypasser RLS si nécessaire
  // OU passer par anon avec setSession qui injecte les claims demo
  const useServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SMARTFARM_DEMO_MODE !== 'false'

  if (useServiceRole) {
    // Mode demo : service_role bypass RLS — sans risque puisque pas d'auth réelle
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
        global: {
          headers: {
            // Tag pour audit logs
            'x-smartfarm-demo-ferme': DEMO_FERME_ID,
          },
        },
      }
    )
  }

  // Mode production : SSR auth réelle (déjà prêt pour quand on branchera)
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* server component, ignore */ }
        },
      },
    }
  )
}

// Export constantes utiles
export const DEMO = {
  ferme_id: DEMO_FERME_ID,
  user_id:  DEMO_USER_ID,
  role:     DEMO_ROLE,
}
```

⚠️ **Important** : tu **ne touches pas** `client.ts` (browser) — il reste simple `createBrowserClient`. Les pages qui veulent du data multi-tenant doivent toujours utiliser `server.ts`.

Vérifie aussi que `.env.local` contient bien `SUPABASE_SERVICE_ROLE_KEY` :
```bash
grep SERVICE_ROLE /root/projects/smartfarm/app/.env.local
```

### 3. Vue verify_rls_complete

Déjà incluse dans la migration (`verify_rls_status()`).

## Vérif

```sql
SELECT * FROM verify_rls_status();
-- attendu : 42/42 tables avec rls_enabled=true et nb_policies >= 1
```

```bash
# Test routes principales fonctionnent toujours (le mode demo doit marcher)
for r in /dashboard /alertes /cheptel /reproduction /sanitaire; do
  echo "$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000$r")  $r"
done
```

## Livrable
1. Migration appliquée
2. `verify_rls_status()` retourne 100% tables RLS activées
3. `server.ts` wrapper demo en place
4. Routes fonctionnent toujours (régression zéro)
5. Rapport `/root/projects/smartfarm/agents/V2-PROD/RAPPORT_PROD_A.md` ≤ 80 lignes

## Anti-pièges
- **NE casse pas** le mode demo : si une route renvoie 500 après migration, c'est que RLS bloque service_role aussi → vérifier que `service_role` est utilisé partout côté serveur
- **NE active PAS RLS** sur les vues (CREATE OR REPLACE VIEW WITH security_invoker=true gère déjà via la table sous-jacente)
- `consommations_eau` reste accessible même si le menu est masqué — c'est OK
- Les tables référentiels (raceé, types_aliment, regles_sevrage, biosecurite_checklist, produits_anti_mycotoxines, tips_conseiller) ont des policies `USING (true)` — lecture publique OK
- Helpers DB peuvent retourner NULL en service_role : les pages doivent gérer ce cas (mais ne nous concerne pas en mode demo)
