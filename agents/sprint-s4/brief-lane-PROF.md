# Brief PROF S4 — Vérification triple lane

## TOI
Reviewer NSA-level. Contexte vierge. Read-only sauf rapport.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md`
2. `/root/projects/smartfarm/agents/sprint-s4/RAPPORT_S4_AUDIT.md` §5 (lanes prévues)
3. Les 3 briefs producteurs :
   - `agents/sprint-s4/brief-lane-A-nav.md`
   - `agents/sprint-s4/brief-lane-B-sevrage.md`
   - `agents/sprint-s4/brief-lane-C-search.md`
4. `cd /root/projects/smartfarm && git diff` (modifs non encore commitées)

## MISSION

### Lane A — Navigation cleanup (~5 min)
- `git diff -- src/components/sidebar.tsx src/components/mobile-drawer.tsx`
- Vérifier : 2 lignes retirées dans chaque (Bandes + PPA)
- `grep -c "/bandes\|Bandes" src/components/sidebar.tsx` → 0
- `grep -c "/sanitaire/ppa\|'PPA'" src/components/sidebar.tsx` → 0
- Pareil mobile-drawer
- Cleanup imports : si `Layers` n'est plus dans le fichier, l'import doit être retiré aussi

### Lane B — Sevrage cascade (~15 min)
- `git diff -- app/src/app/\(app\)/mises-bas/`
- Vérifier :
  - `_dialog-sevrage.tsx` : wizard 2 étapes (Précédent/Suivant)
  - `_schemas.ts` : champ `batiment_destination_id` ajouté à zod schema
  - `_server-actions.ts` : `creerSevrage()` étend avec :
    - SELECT mises_bas pour ferme_id/date_mb
    - INSERT animaux batch (N porcelets)
    - ROLLBACK : DELETE sevrage si INSERT porcelets échoue
    - revalidatePath(/cheptel, /batiments/...)
  - `page.tsx` : passe `batiments_disponibles` prop au dialog
- **Lecture critique INSERT animaux** : vérifier colonnes vs schéma réel
  - `curl service-role /rest/v1/animaux?select=*&limit=1` pour confirmer colonnes
  - Vérifier que `categorie`, `stade`, `sexe` ont les bonnes valeurs enum
  - Pas de NOT NULL non couvert

### Lane C — Recherche globale (~10 min)
- `git status` : confirme création `global-search.tsx` + migration SQL
- Lire migration `supabase/migrations/20260525140753_rpc_search_animaux_by_tag.sql` :
  - `SECURITY INVOKER` (pas DEFINER)
  - `GRANT EXECUTE ... TO authenticated`
  - Filtres `statut IN ('actif','malade')` + `deleted_at IS NULL` (règle brain #9)
- Lire `global-search.tsx` :
  - `'use client'` ligne 1
  - Cleanup `useEffect` listener keydown
  - Debounce sur recherche
  - Appel `sb.rpc('search_animaux_by_tag', ...)`
  - Navigation `router.push('/cheptel/' + id)` au clic
- Lire `app-shell.tsx` + `sidebar.tsx` (intégration `<GlobalSearch />`)

### Tests déterministes
1. `cd /root/projects/smartfarm/app && npx tsc --noEmit` → 0 erreur
2. `cd /root/projects/smartfarm/app && npm run build 2>&1 | tail -20` → exit 0
3. Si tsc/build FAIL → identifier précisément la lane responsable + ligne

### Application migration SQL (BDD prod)
**TU NE FAIS PAS** cette application. Tu vérifies juste que la migration est valide SQL syntactiquement (lecture manuelle suffit).
L'orchestrateur applique post-validation.

## LIVRABLE
`/root/projects/smartfarm/agents/sprint-s4/RAPPORT_PROF_S4.md` ≤ 5 KB

Format :
```md
# RAPPORT PROF S4

## Verdicts par lane
| Lane | Conforme brief | Régression | Verdict |
| A | … | … | ✅/❌ |
| B | … | … | ✅/❌ |
| C | … | … | ✅/❌ |

## Build
tsc : OK/FAIL
build : OK/FAIL (durée)

## Anti-régression
- Bandes/PPA bottom-nav intact ? OUI/NON
- Dialog mise-bas existant pas cassé ? OUI/NON
- app-shell pas brisé sur autres pages ? OUI/NON

## Issues détectées
(si applicable, copier-coller la ligne et le diff)

## Recommandations orchestrateur
1. Appliquer migration SQL : curl OK / instructions
2. Smoke prod après push : pages à tester

## Verdict global
READY TO COMMIT / À CORRIGER

## Message commit suggéré
```

## PÉRIMÈTRE
✅ READ-ONLY (sauf rapport prof)
❌ Pas modifier source, pas commit, pas push, pas migration BDD
❌ Pas Playwright (orchestrateur fait smoke prod après commit)

## ANTI-PIÈGES
- Build Next 16 ~40-60s, patience
- Si tsc OK mais build FAIL → cherche erreur runtime spécifique
- Si Lane B a INSERT animaux avec colonnes invalides → c'est un P0 (à corriger AVANT commit)
- Le composant `<GlobalSearch>` doit être 'use client' (Cmd+K = window listener)
- Ne PAS recommander de retirer la migration SQL — elle DOIT être appliquée séparément

Go.
