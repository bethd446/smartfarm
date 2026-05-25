# Brief PROF B1-EXT — Vérification croisée

## TOI
Reviewer senior NSA-level. CONTEXTE VIERGE. Vérifie tout en lisant le diff réel.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (rapidement)
2. `/root/projects/smartfarm/agents/sprint-s2-b1-ext/RAPPORT_CARTO.md`
3. `/root/projects/smartfarm/agents/sprint-s2-b1-ext/brief-lane-EXT.md` (le brief lane EXT)
4. `cd /root/projects/smartfarm && git diff` (modifs lane EXT non encore commitées)

## MISSION
Pour chacune des 8 queries patchées :
1. Lire le diff réel : `cd /root/projects/smartfarm && git diff -- app/src/app/<chemin>`
2. Vérifier :
   - Filtre ajouté correspond au brief (in ['actif','malade'] pour F1/F2/F4, strict actif pour F3)
   - `.is('deleted_at', null)` présent partout
   - L'ordre des chaînes Supabase ne casse rien (pas de `.order` avant un filtre — Supabase tolère mais lisible)
   - Pas de filtre involontairement supprimé (`.eq('categorie',...)`, `.eq('sexe',...)`)
3. Vérifier qu'il n'y a PAS de queries TROP patchées (chatbot, registre, fiche détail, généalogie doivent rester intactes)
4. Tester : `cd /root/projects/smartfarm/app && npx tsc --noEmit && npm run build 2>&1 | tail -15`

## LIVRABLE
1 fichier : `/root/projects/smartfarm/agents/sprint-s2-b1-ext/RAPPORT_PROF.md` (≤4 KB)
Format :
```md
# RAPPORT PROF B1-EXT

## Verdicts
| Fichier | Query attendue | Modif détectée | Conforme | Régression |
|---|---|---|---|---|
| dashboard/page.tsx L92 | in [actif,malade] + deleted_at | ... | ✅/❌ | ✅/❌ |
| ... |

## Build
tsc : OK/FAIL
build : OK/FAIL (durée)

## Faux positifs (à NE PAS patcher, vérifier qu'ils sont intacts)
- cheptel/[id]/page.tsx L51 : intact ✅/❌
- lib/chatbot/rag.ts : intact ✅/❌
- api/registre/route.ts : intact ✅/❌
- cheptel/[id]/genealogie/page.tsx : intact ✅/❌

## Verdict global
READY TO COMMIT / À CORRIGER

## Message de commit suggéré
...
```

## PÉRIMÈTRE
✅ READ-ONLY (sauf RAPPORT_PROF.md)
❌ Ne PAS modifier source
❌ Ne PAS commit
❌ Ne PAS push
❌ Pas de Playwright (smoke prod = orchestrateur après commit)

## ANTI-PIÈGES
- Build Next 16 peut prendre 20-30s, patience
- Si erreur tsc sur un fichier hors périmètre = pré-existante, signaler mais ne pas bloquer
- F3 reproduction = `.eq('statut','actif')` STRICT (pas in array) — c'est volontaire, ne pas le considérer comme un bug

Go.
