# Brief AUDIT-B1-EXT — Cartographie queries animaux

## TOI
Auditeur senior. Read-only. Caveman. 10 min.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (rapidement)
2. `/root/projects/smartfarm/agents/sprint-s2-audit/RAPPORT_AUDIT.md` §B1

## CONTEXTE
B1 fixé sur `cheptel/page.tsx` : ajout `.eq('statut','actif').is('deleted_at',null)` sur queries SELECT animaux.
**Mission étendue** : auditer les 17 AUTRES fichiers qui font `from('animaux')` pour classer chaque query :
- 🟢 **SELECT à filtrer** = list/count pour affichage cheptel actif → DOIT avoir `statut='actif'` + `deleted_at IS NULL`
- 🟡 **SELECT contextuel** = lookup par ID/tag précis pour fiche détail, historique, généalogie → garder TOUTES données (un animal réformé reste consultable)
- 🔴 **UPDATE/DELETE/INSERT** = mutation → NE PAS toucher
- ⚪ **Mutation soft-delete** = on supprime, on veut accéder à l'animal même non-actif → NE PAS toucher

## PÉRIMÈTRE
✅ READ-ONLY sur les 17 fichiers listés ci-dessous
❌ NE PAS modifier de fichier source
❌ NE PAS `npm run build`, `git commit`

## FICHIERS À AUDITER
```
app/(app)/alertes/page.tsx
app/(app)/batiments/[id]/page.tsx
app/(app)/batiments/page.tsx
app/(app)/cheptel/[id]/_actions.ts
app/(app)/cheptel/[id]/_historique-poids.tsx
app/(app)/cheptel/[id]/genealogie/page.tsx
app/(app)/cheptel/[id]/page.tsx
app/(app)/cheptel/_actions.tsx
app/(app)/cheptel/_server-actions.ts
app/(app)/dashboard/page.tsx
app/(app)/pesees/page.tsx
app/(app)/reproduction/page.tsx
app/(app)/sanitaire/calendrier/_queries.ts
app/api/registre/mensuel/_helpers.ts
app/api/registre/route.ts
lib/chatbot/rag.ts
lib/chatbot/tools/get-animal-by-tag.ts
```
(Préfixe : `/root/projects/smartfarm/app/src/`)

## MÉTHODE
1. Pour chaque fichier : `grep -n "from('animaux')" <file>`
2. Pour chaque match : lire 5-10 lignes autour pour comprendre le contexte (count? list? lookup id? update?)
3. Classer dans la catégorie 🟢/🟡/🔴/⚪
4. Pour les 🟢, donner la modif EXACTE à appliquer (ligne + filtre à ajouter)

## LIVRABLE
1 fichier : `/root/projects/smartfarm/agents/sprint-s2-b1-ext/RAPPORT_CARTO.md` (≤6 KB)

Format strict :
```md
# CARTO B1-EXT

## Synthèse
| Fichier | 🟢 SELECT-filtrer | 🟡 SELECT-contextuel | 🔴 Mutation | Total queries |

## Détails 🟢 (à patcher)
### app/(app)/dashboard/page.tsx
- L42 : `sb.from('animaux').select('*', {count:'exact', head:true})` → AJOUTER `.eq('statut','actif').is('deleted_at',null)`
- L78 : ...

### app/(app)/pesees/page.tsx
...

## Détails 🟡 (à laisser intact, justifié)
- cheptel/[id]/page.tsx : lookup par id pour fiche → garder accès animaux réformés (rapport éleveur)

## Détails 🔴 (mutations, intactes)
- cheptel/_server-actions.ts : INSERT/UPDATE
```

## INTERDICTIONS
- ❌ Modifier le moindre fichier source (audit pur)
- ❌ Inventer des queries qui n'existent pas
- ❌ Classer en 🟢 par défaut si pas sûr → préfère 🟡 + note "À CONFIRMER orchestrateur"
- ❌ Rapport >6 KB
- ❌ vision_analyze (text only)

## CRITÈRE SUCCÈS
- 17 fichiers analysés
- Chaque query classée
- Patches 🟢 prêts à copier-coller pour les sous-agents producteurs

Go.
