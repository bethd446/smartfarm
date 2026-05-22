# Rapport PROD-A — RLS complet + wrapper auth demo

**Date** : 2026-05-22 (V2-PROD vague 1)
**Périmètre** : 1 migration SQL + 1 fichier `src/lib/supabase/server.ts`
**Statut** : ✅ Terminé, prêt pour rebuild orchestrateur

## Livrables

### 1. Migration `supabase/migrations/20260522090000_rls_complete.sql`
Appliquée avec succès via `psql -v ON_ERROR_STOP=1` (`COMMIT` OK, 0 erreur).

- ✅ `ENABLE ROW LEVEL SECURITY` sur les **31 tables qui avaient déjà des policies** (animaux, audit_logs, bandes, …, vaccinations)
- ✅ Policies SELECT/WRITE créées + RLS activé sur les **12 tables sans policies** (le brief annonçait 11, mais le décompte réel donne 12 — toutes étaient listées dans la migration du brief, j'ai tout appliqué tel quel) :
  - `biosecurite_audits`, `consommations_eau`, `evenements_prevus`, `lots_matieres_premieres`, `ppa_observations`, `protocoles_anti_mycotoxines`, `transits_phase`, `visites_biosecurite` → policies multi-tenant `user_has_farm_access(ferme_id)` + write restreint `current_user_role() <> 'viewer'`
  - `checks_post_mb` → policy par jointure `mises_bas → animaux → ferme_id`
  - `biosecurite_checklist`, `produits_anti_mycotoxines`, `tips_conseiller` → référentiels publics `USING (true)` (lecture libre)
- ✅ Fonction `verify_rls_status()` créée et `GRANT EXECUTE TO anon, authenticated`

### 2. Wrapper `app/src/lib/supabase/server.ts`
Réécrit avec stratégie service_role en mode demo :

- Si `SUPABASE_SERVICE_ROLE_KEY` présente ET `SMARTFARM_DEMO_MODE !== 'false'` → renvoie un client `@supabase/supabase-js` avec service_role (bypass RLS, `persistSession: false`)
- Sinon → fallback sur `createServerClient` SSR standard (cookies session, prêt pour auth Cloud)
- Constante `DEMO = { ferme_id, user_id, role }` exportée pour les server actions
- Aucune modification de signature : `createClient()` reste identique → 0 modif dans les pages

`client.ts` (browser) **non modifié** comme demandé.

## Vérifications

```sql
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE rls_enabled) AS rls_on,
       COUNT(*) FILTER (WHERE nb_policies > 0) AS with_policies
FROM verify_rls_status();
-- total=43, rls_on=43, with_policies=43 ✅
```

Test REST direct Supabase :
- `anon` → `GET /rest/v1/animaux` retourne `[]` (RLS bloque, attendu)
- `service_role` → renvoie les 3 animaux demo (attendu)

Routes HTTP (sur build standalone actuel, AVANT rebuild) :
- `/dashboard /alertes /cheptel /reproduction /sanitaire /bandes /mises-bas /alimentation /stock /kpi` → **toutes 200 OK**
- Le standalone tourne encore avec l'ancien wrapper (anon key), donc les requêtes data renvoient désormais 0 lignes ; le layout reste OK (skeleton/empty states). Comportement nominal sera restauré après `npm run build` orchestrateur (nouveau wrapper → service_role → données complètes).

## Fichiers touchés
- ✏️ **Créé** : `/root/projects/smartfarm/supabase/migrations/20260522090000_rls_complete.sql` (8.5 KB)
- ✏️ **Modifié** : `/root/projects/smartfarm/app/src/lib/supabase/server.ts` (22 → 75 lignes)

## Anti-pièges respectés
- ❌ Aucun `npm run build` lancé
- ❌ Aucune migration existante modifiée (nouvelle migration créée)
- ❌ Aucune vue touchée (RLS uniquement sur tables)
- ✅ Migration idempotente impossible (CREATE POLICY échoue si déjà présente) — mais re-jeu non nécessaire, état final atteint
- ✅ Policies des référentiels publics (`tips_conseiller`, `produits_anti_mycotoxines`, `biosecurite_checklist`) en `USING (true)` → lisibles côté browser via anon (cohérent avec le brief)

## À faire par l'orchestrateur (vague suivante)
1. `npm run build` du projet `app/` → nouveau wrapper service_role bundled
2. Restart standalone (relancer le process node)
3. Re-vérifier `/dashboard` etc. → données revenues

## Migration ferme-cloud (futur)
Quand Christophe branche Supabase Auth Cloud :
1. `SMARTFARM_DEMO_MODE=false` dans `.env.local`
2. (Optionnel) retirer `SUPABASE_SERVICE_ROLE_KEY` du runtime SSR
3. Rebuild → wrapper bascule sur `createServerClient` avec cookies session
4. RLS continue d'opérer, mais avec les vraies claims JWT du user authentifié
5. Aucune modification dans les pages / server actions
