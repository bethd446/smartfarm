# RAPPORT PROF B1-EXT

**Date** : 2026-05-25  
**Reviewer** : PROF (contexte vierge NSA-level)  
**Mission** : Vérification croisée patches lane EXT (8 queries animaux)

---

## Verdicts

| Fichier | Query attendue | Modif détectée | Conforme | Régression |
|---------|---------------|----------------|----------|------------|
| dashboard/page.tsx L92 | in [actif,malade] + deleted_at | `.in('statut', ['actif','malade']).is('deleted_at', null)` | ✅ | ✅ |
| dashboard/page.tsx L93 | in [actif,malade] + deleted_at | `.eq('categorie','truie').in('statut', ['actif','malade']).is('deleted_at', null)` | ✅ | ✅ |
| dashboard/page.tsx L94 | in [actif,malade] + deleted_at | `.eq('categorie','verrat').in('statut', ['actif','malade']).is('deleted_at', null)` | ✅ | ✅ |
| pesees/page.tsx L17 | in [actif,malade] + deleted_at | `.in('statut', ['actif','malade']).is('deleted_at', null).order('tag')` | ✅ | ✅ |
| reproduction/page.tsx L64 | eq(actif) + deleted_at | `.eq('statut','actif').is('deleted_at', null).order(...)` | ✅ | ✅ |
| reproduction/page.tsx L74 | eq(actif) + deleted_at | `.eq('statut','actif').is('deleted_at', null).order(...)` | ✅ | ✅ |
| calendrier/_queries.ts L117-118 | in [actif,malade] + deleted_at | `.in('statut', ['actif','malade']).is('deleted_at', null)` | ✅ | ✅ |
| calendrier/_queries.ts L412-413 | in [actif,malade] + deleted_at | `.in('statut', ['actif','malade']).is('deleted_at', null)` | ✅ | ✅ |

**Détail technique** :
- F1 (dashboard) : 3 queries count → inclut malades (animal vivant)
- F2 (pesees) : dropdown pesée → inclut malades
- F3 (reproduction) : dropdowns saillie → **STRICT actif** (pas saillir malade), conforme
- F4 (calendrier) : actes sanitaires + KPI → inclut malades, `.neq('mort')` bien supprimé

**Filtres métier** :
- ✅ Tous `.eq('categorie',...)` / `.eq('sexe',...)` préservés
- ✅ Ordre chaînes Supabase cohérent (filtres avant `.order`)
- ✅ F3 reproduction utilise bien `.eq('statut','actif')` strict (pas in array)

---

## Build

- **tsc** : ✅ OK (0 erreur)
- **build** : ✅ OK (~50s, standalone patché + deploy-static-copy.sh)
- **Warning Turbopack** : lockfile multiple (cosmétique, ignoré selon CONTEXT.md)

---

## Faux positifs (à NE PAS patcher, vérifier intacts)

- ✅ cheptel/[id]/page.tsx L51 : **intact** (git diff vide)
- ✅ lib/chatbot/rag.ts : **intact** (git diff vide)
- ✅ api/registre/route.ts : **intact** (git diff vide)
- ✅ cheptel/[id]/genealogie/page.tsx : **intact** (git diff vide)

**Note** : Aucun fichier hors périmètre modifié (git status = 4 fichiers attendus seulement).

---

## Verdict global

**✅ READY TO COMMIT**

Aucune régression détectée. 8 queries patchées conformes brief. TypeScript OK. Build OK. Faux positifs intacts.

---

## Message de commit suggéré

```
fix(animaux): filtre deleted_at + statut malade sur 8 queries

Contexte: Sprint S2-B1-EXT (audit NSA-level queries animaux)

Modifs:
- dashboard: count total/truies/verrats inclut malades (.in actif/malade + deleted_at)
- pesees: dropdown animaux inclut malades
- reproduction: dropdowns saillie STRICT actif + deleted_at
- calendrier sanitaire: actes + KPI inclut malades (remplace .neq mort)

Résultat: animaux vivants (actif+malade) correctement filtrés, soft-delete respecté

Ref: /agents/sprint-s2-b1-ext/RAPPORT_CARTO.md
Test: tsc OK + build OK + Playwright smoke à lancer
```

---

**Prêt pour commit + Playwright smoke prod**
