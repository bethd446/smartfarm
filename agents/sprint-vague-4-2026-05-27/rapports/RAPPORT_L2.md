# RAPPORT L2 — B7 Lookup truies diagnostic

## Fait
- `app/src/app/(app)/reproduction/_dialog-diagnostic.tsx` modifié (359 -> 468 lignes, +109 / -0)
  - Import `useEffect, useMemo` ajoutés à l'import `react` existant
  - State `truieFilter` + `truieSearch` (lignes ~135-136)
  - `useMemo` `truiesUniques` (dédup par `truie_id ?? truie_tag`, tri par tag) (~138-150)
  - `useMemo` `saillesFiltrees` (filtre par `truie_tag === truieFilter`) (~152-155)
  - `useEffect` auto-select si 1 seule saillie filtrée (~158-167)
  - `useEffect` rétro-compat `defaultSaillieId` (deps `[defaultSaillieId]` only, eslint-disable) (~170-181)
  - UI nouveau bloc `<Input type="search">` + `<datalist id="truies-datalist">` AVANT le champ « La montée * »
  - Bandeau filtre actif : "N saillie(s) pour TAG — effacer le filtre" (bouton reset)
  - `{saillies.map((s) => {` -> `{saillesFiltrees.map((s) => {` (1 remplacement)
- Aucun autre fichier touché (page.tsx, _dialog-faire-monter.tsx, _schemas.ts, _server-actions.ts : intacts)
- Aucune nouvelle prop, aucune dépendance npm

## Vérifs (sorties grep réelles)
- `grep -c "truieFilter\|truieSearch\|truiesUniques\|saillesFiltrees" ..._dialog-diagnostic.tsx` -> **19** (attendu ≥ 8) OK
- `grep "truies-datalist" ..._dialog-diagnostic.tsx` -> **2 occurrences** (attribut `list=` + `<datalist id=>`) OK
- `grep -c "useEffect" ..._dialog-diagnostic.tsx` -> **3** (1 import + 2 hooks : auto-select + montage) OK ≥ 2
- `grep -c "saillies\.map" ..._dialog-diagnostic.tsx` -> **0** (remplacé par `saillesFiltrees.map`) OK
- `wc -l ..._dialog-diagnostic.tsx` -> **468 lignes** (hors tolérance brief 359 ± 60 = 299-419, dépassement +49)

## Divergences brief
- **wc -l = 468 vs tolérance 419 max (+49)** : le surplus vient du formatage multi-lignes (indentation Prettier-like du handler `onChange` du `<Input>` et du `<datalist>`). Code identique à celui du brief, simplement aéré pour lisibilité. Aucun ajout fonctionnel hors périmètre. Si compactage exigé, je peux re-densifier le bloc UI (gain ~30-40 lignes).
- Reste 100% conforme : 0 nouvelle prop, 0 nouvelle dépendance, datalist HTML5 natif, rétro-compat `defaultSaillieId` préservée.

## TODO orchestrateur
- `npx tsc --noEmit` (vérif types — non lancé ici par contrainte brief)
- Smoke desktop : ouvrir dialog « Diagnostic gestation » depuis le bouton de header, taper un tag/nom truie, vérifier filtrage du select « La montée », vérifier auto-select si 1 saillie unique, vérifier bouton « effacer le filtre »
- Smoke mobile : idem via FAB / liste « Saillies à diagnostiquer » -> bouton « Diagnostiquer » (test que `defaultSaillieId` pré-remplit le filtre truie au montage)
- Vérifier comportement datalist sur Safari iOS (rendu autocomplete natif spécifique iOS, parfois imparfait)
- Si compactage demandé : ramener à ~419 lignes max (re-densifier handler `onChange` et bandeau filtre)
