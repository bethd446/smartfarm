# Brief Lane C — A11y + touch targets (B3+B4+B6)

## TOI
Dev senior Tailwind/a11y. 2 fichiers. 15 min. Caveman.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (rapidement)
2. `/root/projects/smartfarm/agents/sprint-s2-audit/RAPPORT_AUDIT.md` §B3 §B4 §B6

## PÉRIMÈTRE
✅ Touche UNIQUEMENT :
- `/root/projects/smartfarm/app/src/app/(app)/cheptel/page.tsx` (B4)
- `/root/projects/smartfarm/app/src/app/(app)/sanitaire/maladies/_search.tsx` (B3 + B6)
❌ Pas d'autre fichier
❌ Pas `npm run build`, pas restart serveur, pas git commit

## FIX B4 — Input recherche cheptel 40px → 44px
Dans `cheptel/page.tsx`, l'input `type="search" name="q"` ligne ~192-200 utilise `h-10` (40px).
Remplacer `h-10` par `h-11` (44px touch target conforme).

## FIX B3 — Form sans label /sanitaire/maladies
Dans `_search.tsx` : l'input `type="search"` "Rechercher par nom, symptôme…" n'a pas de label associé.
Solutions au choix (la plus simple suffit) :
- Ajouter attribut `aria-label="Rechercher maladie"` sur l'input

## FIX B6 — Lien "Retour Soins" 20px hauteur
Dans `_search.tsx` (ou peut-être dans la page parent, à investiguer), le `<a>` qui contient "Retour Soins" a height=20px.
Ajouter classes pour touch min 44px : `inline-flex items-center min-h-11 py-2`.
**Note** : Si "Retour Soins" est dans `app/(app)/sanitaire/maladies/page.tsx` plutôt que `_search.tsx`, modifier là.

## INVESTIGATION rapide pré-fix
```bash
grep -rn "Retour Soins\|Retour vers\|retour.*soin" /root/projects/smartfarm/app/src/app/\\(app\\)/sanitaire/
```
Trouver le fichier exact et le patcher.

## VÉRIFICATIONS OBLIGATOIRES
1. `cd /root/projects/smartfarm/app && npx tsc --noEmit` → 0 erreur
2. `grep -c "h-11\|h-10" /root/projects/smartfarm/app/src/app/\\(app\\)/cheptel/page.tsx` → confirmer h-11 présent sur input search
3. `grep -c "aria-label.*[Rr]echerch" /root/projects/smartfarm/app/src/app/\\(app\\)/sanitaire/maladies/_search.tsx` → ≥1

## LIVRABLE
1. 2 (ou 3) fichiers patchés
2. Rapport stdout 6 lignes max :
   - B4 : fichier:ligne modif
   - B3 : fichier:ligne ajout aria-label
   - B6 : fichier:ligne fix Retour Soins
   - tsc : OK / FAIL

## ANTI-PIÈGES
- ❌ NE PAS modifier d'autres `h-10` que celui de l'input search cheptel (il y en a peut-être d'autres dans le projet, on ne touche QUE ces 3 bugs)
- ❌ NE PAS ajouter de `<label>` flottant qui casse le layout — utiliser `aria-label` ou `sr-only` uniquement
- ❌ Pas de refactor

Go.
