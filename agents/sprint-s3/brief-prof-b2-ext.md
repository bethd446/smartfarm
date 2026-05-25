# Brief PROF B2-EXT — Vérification

## TOI
Reviewer NSA-level. Contexte vierge. Read-only.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md`
2. `/root/projects/smartfarm/agents/sprint-s3/RAPPORT_B2_EXT.md`
3. `cd /root/projects/smartfarm && git status && git diff` (modifs lane B2-EXT)

## MISSION
Vérifier en 3 axes :

### A. Cohérence patchs (lecture diff)
- `dashboard/_components/alertes-widget.tsx` : `formatDistanceToNow` éliminé, `<RelativeTime>` importé et utilisé
- `sanitaire/_components/alertes-sanitaires.tsx` : pareil
- `sanitaire/biosecurite/page.tsx` : `toLocaleString` éliminé, `<FormattedDate>` (ou équivalent) importé et utilisé
- `lib/format/dates.ts` : warning hydration ajouté (commentaire), pas de breaking change

### B. Composants UI créés
- `components/ui/relative-time.tsx` : créé avec `'use client'`, props (`date`, `prefix?`, `addSuffix?`), retourne `null` au SSR initial
- `components/ui/formatted-date.tsx` : créé avec `'use client'`, retourne `null` au SSR initial

### C. Verifications déterministes
1. `cd /root/projects/smartfarm/app && npx tsc --noEmit` → 0 erreur
2. `npm run build 2>&1 | tail -15` → exit 0 + standalone produit
3. **Anti-régression** :
   - `grep -rn "formatDistanceToNow" app/src --include="*.tsx" --include="*.ts" | grep -v "'use client'" | grep -v "ui/relative-time.tsx"` → 0 hit IDÉAL (sinon noter les survivants justifiés)
   - `grep -rn "toLocaleString\|Intl.DateTimeFormat" app/src/app --include="*.tsx" | grep -v "'use client'"` → identifier les survivants risqués

### D. Faux positifs intacts
- `_dialog-*.tsx` / `_actions*.ts` / templates PDF : doivent être intacts (ils sont déjà client OU server-only)
- `alerte-card.tsx` (S2) : intact, juste l'import potentiellement changé si `relative-time.tsx` déplacé

## LIVRABLE
`/root/projects/smartfarm/agents/sprint-s3/RAPPORT_PROF_B2_EXT.md` ≤ 4 KB

Format :
```md
# RAPPORT PROF B2-EXT
## Verdicts patchs
| Fichier | Modif détectée | Conforme | Régression |

## Build
tsc : OK / FAIL
build : OK / FAIL (durée)

## Grep résiduel
formatDistanceToNow hors client : N (liste)
toLocaleString hors client : N (liste, criticité)

## Verdict global
READY TO COMMIT / À CORRIGER

## Message commit suggéré
```

## PÉRIMÈTRE
✅ READ-ONLY (sauf RAPPORT_PROF_B2_EXT.md)
❌ Pas modifier source, pas commit, pas push, pas Playwright

## ANTI-PIÈGES
- Build peut prendre ~30-50s, patience
- Si tsc OK mais build FAIL, c'est un vrai problème
- `'use client'` doit être en TOUTE PREMIÈRE LIGNE du fichier (avant tout import / comment)
- Si `RelativeTime` est utilisé sans `'use client'` parent → c'est OK (le composant lui-même est client, ça remonte)

Go.
