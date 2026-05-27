# RAPPORT LANE CHEPTEL — Phase A item A10

**Date** : 2026-05-27
**Branche** : `feat/phase-a-quick-wins`
**Auteur** : Claude Code Opus 4.7 (lane cheptel)
**Item** : A10 — Séparation tab COCHETTES / TRUIES dans `/cheptel`

---

## Problème (rappel audit)

- Tab `TRUIES (25)` mélangeait 22 truies adultes + 3 cochettes (Wanda C01, Xenia C02, Yara C03)
- Compteur menteur : la catégorie zootechnique `cochette` (jeune femelle nullipare) ≠ statut métier `truie`
- Aucun moyen de filtrer/lister les cochettes seules pour suivi pré-saillie

## Solution livrée

5 onglets au lieu de 4 dans `cheptel/page.tsx` :

| Onglet | Filtre Supabase | Compteur attendu (démo) |
|---|---|---|
| TRUIES | `categorie='truie'` + `sexe='F'` | 22 |
| COCHETTES | `categorie='cochette'` + `sexe='F'` | 3 |
| VERRATS | `categorie='verrat'` | 3 |
| PORCELETS | `categorie IN (lait, sevre, croissance, engraissement)` | 33 |
| PORTÉES | `portees.*` | inchangé |

## Modifications

**Fichier unique** : `app/src/app/(app)/cheptel/page.tsx`

1. **Type `TabKey`** : ajout `'cochettes'`
2. **`TABS[]`** : 5e entrée `cochettes` (icône PiggyBank, même atome visuel que truies)
3. **Constantes catégories** :
   - `CAT_TRUIES = ['truie']` (avant : `['truie', 'cochette']`)
   - `CAT_COCHETTES = ['cochette']` (nouveau)
4. **`isTab()`** : ajout branche `'cochettes'`
5. **`Promise.allSettled` compteurs** : 5 requêtes (truies/cochettes/verrats/porcelets/portees) au lieu de 4 — réindexation des `countsSettled[i]`
6. **Branche query principale** : `else if (tab === 'cochettes')` avec filtre catégorie + sexe='F'
7. **Enrichissement stade reproducteur** : étendu à cochettes (`tab === 'truies' || tab === 'cochettes'`) — cochette pré-saillie a besoin du même badge VIDE/PRÉ-SAILLIE
8. **Sub-counter header** : passe de `"X reproducteurs · Y porcelets · Z portées"` à `"22 truies · 3 cochettes · 3 verrats · 33 porcelets · 33 portées"` (5 segments, plus lisible)
9. **`AnimauxTable`** :
   - empty state titre : ajout cas `'Aucune cochette'`
   - colonne label `STADE REPRO` : étendu à cochettes
   - rendering badge stade repro : étendu à cochettes
   - emptyMessage ResponsiveTable : ajout cas cochettes

## Hors scope (respecté)

- ❌ Dashboard KPI "TRUIES ACTIVES" non modifié (cf brief : audit constate le mensonge en cheptel uniquement)
- ❌ Fiche `cheptel/[id]/` non touchée
- ❌ Pas de changement composants UI globaux ni autres routes

## Vérifications

- ✅ TypeScript : édition propre, aucun `any` introduit, `TabKey` superset cohérent
- ⚠️  `npx tsc --noEmit` : Bash bloqué dans l'env sub-agent (sandbox), validation à faire côté orchestrateur
- ✅ Pattern shadcn/ui Tabs préservé (nav Link-based server-friendly intact)
- ✅ Classes Tailwind + variables `--sf-*` conservées
- ✅ Aucun nouveau composant créé, aucun import nouveau

## Reste à valider côté orchestrateur

1. `cd app && npx tsc --noEmit -p tsconfig.json` → attendu 0 erreur
2. `npm run build` → attendu exit 0
3. Visuel local : `npm run dev` puis ouvrir `/cheptel?tab=cochettes` (compte démo) → vérifier 3 cochettes Wanda/Xenia/Yara
4. Smoke desktop + mobile : `/cheptel` tabs cliquables, compteurs cohérents

## Diff résumé

```
 app/src/app/(app)/cheptel/page.tsx | ~35 lignes modifiées
```

Aucun autre fichier touché.
