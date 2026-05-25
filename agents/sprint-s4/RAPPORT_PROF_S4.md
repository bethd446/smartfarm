# RAPPORT PROF S4

**Date** : 2026-05-25 14:10 UTC | **Durée** : 18 min | **Build** : 25s OK

---

## Verdicts par lane

| Lane | Conforme | Régression | Verdict |
|------|----------|------------|---------|
| **A — Nav cleanup** | ✅ 2 lignes retirées sidebar + 2 mobile-drawer. Import Layers retiré. grep Bandes/PPA → 0 | ❌ 0 | ✅ **COMMIT** |
| **B — Sevrage cascade** | ✅ Wizard 2 étapes. Schema `batiment_destination_id` uuid. INSERT N porcelets batch + rollback. Revalidate 5 paths | ❌ 0 | ✅ **COMMIT** |
| **C — Search globale** | ✅ Migration SECURITY INVOKER + GRANT. Filtres statut actif/malade + deleted_at NULL. 'use client', cleanup, debounce 200ms | ❌ 0 | ✅ **COMMIT** |

---

## Build

**tsc** : ✅ 0 erreur  
**build** : ✅ exit 0, 25s  
**Warning** : `multiple lockfiles` cosmétique (cf CONTEXT.md §382, laisser)

---

## Anti-régression

| Item | Status |
|------|--------|
| Bandes/PPA bottom-nav intact | ✅ `git diff bottom-nav.tsx` → vide |
| Dialog mise-bas intact | ✅ `git diff _dialog-mise-bas.tsx` → vide |
| app-shell pas brisé | ✅ Ajout `<GlobalSearch />` + `flex-1`, layout OK |
| Sidebar 12 entrées | ✅ grep Bandes/PPA → 0 (14→12) |

---

## Issues détectées

**Aucune** ❌

---

## Lane A — Détails

**Modifiés** : sidebar.tsx (-4 lignes), mobile-drawer.tsx (-2 lignes)  
**Vérif** :
```bash
grep -c "Bandes\|/bandes" sidebar.tsx       → 0 ✅
grep -c "PPA\|/sanitaire/ppa" sidebar.tsx   → 0 ✅
grep "Layers" sidebar.tsx                    → absent ✅
```
`AlertTriangle` conservé (utilisé ailleurs).

---

## Lane B — Détails

**Modifiés** : _dialog-sevrage.tsx (+456/-168), _schemas.ts (+2), _server-actions.ts (+71), page.tsx (+17)

**Colonnes INSERT animaux** (vérif curl BDD prod) :
```ts
ferme_id, tag, nom, sexe, categorie, stade, statut,
batiment_id, date_naissance, portee_id, date_entree, observations
```
✅ Toutes valides. Tag `P-{sevrage_id}-{i}` unique. Sexe F/M 50/50.

**Cascade** :
1. INSERT `sevrages` → `sevrage.id` ✅
2. SELECT `mises_bas` → `ferme_id` + `date_mb` ✅
3. INSERT N `animaux` (categorie='porcelet', stade='demarrage_1') ✅
4. **ROLLBACK** si e2 : `DELETE sevrages WHERE id=sevrage.id` ✅
5. revalidatePath : 5 routes ✅

**Filtres bâtiments** : `.in('type', ['demarrage','croissance','porcin'])` → curl confirme 3+1+4 ✅

**Wizard** : step 1 (sevrage), step 2 (bâtiment + capacité), Précédent/Suivant ✅

---

## Lane C — Détails

**Créés** : global-search.tsx (138 lignes), 20260525140753_rpc_search_animaux_by_tag.sql (51 lignes)  
**Modifiés** : app-shell.tsx (+3 lignes import + insertion)

**Migration SQL** :
```sql
CREATE OR REPLACE FUNCTION search_animaux_by_tag(query TEXT)
RETURNS TABLE (id, tag, nom, categorie, stade, batiment_nom)
LANGUAGE sql SECURITY INVOKER STABLE  ✅
WHERE statut IN ('actif','malade') AND deleted_at IS NULL ✅ (règle brain #9)
GRANT EXECUTE TO authenticated ✅
```

**Composant** :
- `'use client'` L1 ✅
- useEffect cleanup keydown L35 ✅
- Debounce 200ms L51 ✅
- `router.push(/cheptel/{id})` L55 ✅
- Desktop input sticky + dropdown, mobile overlay ✅

**Intégration** : app-shell.tsx header, `flex-1` expansion ✅

---

## Recommandations orchestrateur

### 1. Appliquer migration SQL
```bash
# Studio SQL Editor ou Management API
cat supabase/migrations/20260525140753_rpc_search_animaux_by_tag.sql
```
**Vérif** : `SELECT proname FROM pg_proc WHERE proname='search_animaux_by_tag'` → 1 row

### 2. Smoke prod (8 routes)
- `/dashboard` : nav 12 entrées, GlobalSearch visible
- `/cheptel` : Cmd+K → taper "B.12" → résultats
- `/mises-bas` : dialog sevrage step 2 sélection bâtiment
- `/sanitaire/ppa` : page accessible (sous-menu)
- `/batiments` : occupation +N après sevrage
- Mobile header : icône loupe → overlay

**Tests** : `npm run test:e2e` ou manuel incognito https://smartfarm.group

### 3. Monitoring 24h
- RPC `search_animaux_by_tag` : temps < 200ms
- Dialog sevrage : rollback = 0
- Capacité bâtiments cohérente

---

## Verdict global

**✅ READY TO COMMIT**

---

## Message commit

```
feat(S4): navigation cleanup + cascade sevrage + recherche globale

Lane A — Retrait Bandes+PPA top-level (14→12 entrées)
Lane B — Wizard 2 étapes sevrage + INSERT N porcelets batch + rollback
Lane C — RPC search_animaux_by_tag + GlobalSearch Cmd+K

Tests : tsc OK, build 25s OK, 0 régression
Migration SQL : À APPLIQUER via Studio avant smoke prod

Closes #S4-sprint
```

---

**Taille** : 4.1 KB ✅ | **Fin audit prof S4**
