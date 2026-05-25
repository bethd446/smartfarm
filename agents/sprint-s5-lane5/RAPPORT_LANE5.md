# LANE 5 — Helpers UI globaux Smart Farm — RAPPORT

Mode caveman. Sprint S5. Date : 2026-05-25.

## FAIT

4 fichiers touchés (3 créés, 1 patch micro, 1 patch micro layout).

| # | Fichier | Action |
|---|---|---|
| 1 | `app/src/lib/format/animal-label.ts` | CRÉÉ — utility pure (formatAnimalLabel + isNomRedundant + types) |
| 2 | `app/src/components/ui/animal-label.tsx` | CRÉÉ — composant `<AnimalLabel>` Server Component compatible |
| 3 | `app/src/app/globals.css` | PATCH 2 lignes — `--sf-subtle` light + dark (a11y AA) |
| 4 | `app/src/lib/seo/metadata.ts` | CRÉÉ — helper `buildMetadata(title, description?)` |
| 5 | `app/src/app/(app)/layout.tsx` | PATCH — ajout `export const metadata` avec template `%s — Smart Farm` |

## FIX #1 — `<AnimalLabel>` (élimine `B.10 (B.10)`)

**Root cause confirmée** :
- `app/src/app/api/registre/route.ts:374` fait `${a.nom} (${a.tag})` sans déduper.
- Quand `nom === tag` (seed/saisie défaut), tu obtiens `"B.10 (B.10)"`.

**Solution** : helper `isNomRedundant(animal)` qui retourne `true` si :
- `nom` est null/undefined/vide après trim, OU
- `nom.toLowerCase() === tag.toLowerCase()` après trim (insensible à casse + espaces).

**Composant `<AnimalLabel>`** :
- 3 formats : `full` (défaut, "Pirouette (B.26)"), `tag-only` ("B.26"), `inline` ("B.26 · Pirouette").
- Tag toujours en `font-mono font-bold tabular-nums` (lisibilité plein soleil + chiffres alignés).
- Server Component compatible (aucun hook, pas de `'use client'`).
- Re-export du formatter string pour usages non-JSX (exports PDF/CSV, logs, alt text).
- Export nommé + default export.

**Tests manuels logiques** :
- `{ tag: 'B.10', nom: 'B.10' }` → "B.10" ✅
- `{ tag: 'B.10', nom: ' b.10 ' }` → "B.10" (trim + lowercase match) ✅
- `{ tag: 'B.26', nom: 'Pirouette' }` → "Pirouette (B.26)" ✅
- `{ tag: 'B.26', nom: '' }` → "B.26" ✅
- `{ tag: 'B.26', nom: null }` → "B.26" ✅
- `format='tag-only'` → "B.26" toujours ✅

## FIX #2 — Contraste `--sf-subtle` (a11y AA)

**Mesures actuelles vs cibles (sur fond mil-50 `#FFFBEB`)** :

| Token | Avant | Ratio avant | Après | Ratio après | Statut |
|---|---|---|---|---|---|
| `--sf-ink` | `#1C1917` | ~16:1 | inchangé | — | ✅ AAA déjà |
| `--sf-ink-secondary` | `#44403C` | ~10.8:1 | inchangé | — | ✅ AAA déjà |
| `--sf-muted` | `#5C5346` | ~7.0:1 | inchangé | — | ✅ AAA déjà |
| **`--sf-subtle`** | `#8A7E6E` | **~3.4:1 FAIL** | `#6B6354` | **~5.4:1 PASS** | ✅ AA texte normal |

**Dark mode (sur fond `#14110F` / `#1C1917`)** :

| Token | Avant | Ratio avant | Après | Ratio après | Statut |
|---|---|---|---|---|---|
| `--sf-ink-secondary` | `#D6D3D1` | ~14:1 | inchangé | — | ✅ AAA |
| `--sf-muted` | `#B5A992` | ~9.3:1 | inchangé | — | ✅ AAA |
| **`--sf-subtle`** | `#847866` | **~4.2:1 borderline FAIL** | `#9A8E78` | **~5.5:1 PASS** | ✅ AA texte normal |

**Justification** : `--sf-subtle` est utilisé pour metadata, dates relatives, séparateurs textuels, disabled states. Souvent en `text-[10px]`/`text-xs` donc précisément le cas où WCAG AA `4.5:1` est nécessaire (pas le seuil large-text `3:1`). Le brain (CRITIQUE_V2 ligne 55) confirme : eyebrows ~12px en `text-[var(--sf-subtle)]` mesurés ~3.8:1 — donc fix au cœur du bug systémique.

**Modifs minimales** : 2 `Edit` ciblés sur les lignes 195 et 349 de `globals.css`, avec commentaire LANE5 S5 traçable. Aucune autre modif du fichier. Les 17 autres usages de `--sf-subtle` en `text-*` profitent immédiatement.

## FIX #3 — Helper `buildMetadata()` + template `<title>`

**Approche choisie** : **les deux** (helper + template), car les deux sont safe.

1. **Helper `lib/seo/metadata.ts`** :
   - `buildMetadata(title, description?)` retourne un `Metadata` Next 16.
   - Description par défaut `DEFAULT_APP_DESCRIPTION` exportée pour fallback.
   - Pas appliqué dans les routes — les lanes 2/3/4 ou un suivi devront l'ajouter dans chaque page.

2. **Template dans `(app)/layout.tsx`** :
   ```ts
   export const metadata: Metadata = {
     title: { template: '%s — Smart Farm', default: 'Smart Farm' },
   }
   ```
   - SAFE : les routes qui ne définissent pas `metadata.title` afficheront `"Smart Farm"` au lieu de la title-pavé landing.
   - Les routes qui font `export const metadata = { title: 'Cheptel' }` afficheront `"Cheptel — Smart Farm"` automatiquement (template Next 16).
   - Le `<html>` racine n'est pas touché.

## VÉRIFS

| Test | Résultat |
|---|---|
| `npx tsc --noEmit` | ❌ **NON EXÉCUTÉ** — sandbox Bash refuse `tsc`. Code revu manuellement : 0 erreur attendue (types triviaux, alias `@/*` correct, imports cohérents, `cn` existe dans `lib/utils.ts`). |
| Read avant Edit | ✅ Toujours respecté |
| Pas de réécriture `globals.css` | ✅ 2 `Edit` ciblés, ~5 lignes touchées sur 501 |
| Pas de console.log | ✅ |
| Pas de nouvelle dépendance npm | ✅ |
| Pas de hook (AnimalLabel = Server compat) | ✅ |

**Si tsc passé en local par toi : aucune erreur attendue.** Si erreur survient, c'est probablement un type strict sur `animal.nom!` (non-null assertion) — déjà protégé par le check `hideNom` au-dessus.

## TODO ORCHESTRATEUR (intégration `<AnimalLabel>`)

À intégrer dans (Lane 2 ou suivi dédié) :

| Route / Composant | Usage suggéré |
|---|---|
| `app/(app)/cheptel/[id]/page.tsx` (titre fiche truie) | `<AnimalLabel animal={truie} format="full" />` au lieu de `truie.nom (truie.tag)` |
| `app/(app)/dashboard/page.tsx` widget "DERNIÈRES NAISSANCES" | `<AnimalLabel animal={mb.truie} format="inline" />` |
| `app/(app)/mises-bas/page.tsx` (liste portées) | `<AnimalLabel animal={portee.truie} format="full" />` |
| `app/(app)/reproduction/page.tsx` (saillies à diagnostiquer) | `<AnimalLabel animal={saillie.truie} />` |
| `app/(app)/sanitaire/**` (lignes d'alertes) | idem |
| `app/api/registre/route.ts:372` `nomAnimal()` | remplacer par `formatAnimalLabel(a)` (même module) — fix le bug pour exports PDF |
| `app/(app)/sanitaire/_dialogs-sanitaire.tsx:95` | idem |

**Recommandation** : avant de propager partout, valider visuellement les 3 formats avec Playwright sur `/cheptel` + `/mises-bas` sur le compte test prod.

### TODO `<title>` par page

À ajouter dans les pages (1 ligne chacune) :
```ts
// exemple dans app/(app)/cheptel/page.tsx
import { buildMetadata } from '@/lib/seo/metadata'
export const metadata = buildMetadata('Cheptel')
```

Pages prioritaires : `/cheptel`, `/dashboard`, `/mises-bas`, `/reproduction`, `/alertes`, `/sanitaire`, `/calendrier`, `/pesees`, `/stock`, `/alimentation`, `/performances`, `/parametres`.

## INTERDITS RESPECTÉS

- ❌ Pas touché routes `(app)/**`, `(auth)/**` (sauf layout `(app)/layout.tsx` pour template metadata — c'était dans le périmètre `OU` du brief)
- ❌ Pas touché `proxy.ts`, `next.config.ts`, `package.json`
- ❌ Pas exécuté `npm run build` ni restart serveur
- ❌ Pas installé de dépendances

## DIFF SUMMARY

```
A  app/src/lib/format/animal-label.ts                    (49 lignes)
A  app/src/components/ui/animal-label.tsx                (90 lignes)
A  app/src/lib/seo/metadata.ts                           (42 lignes)
M  app/src/app/globals.css                               (+4/-2 lignes)
M  app/src/app/(app)/layout.tsx                          (+13/-0 lignes)
A  agents/sprint-s5-lane5/RAPPORT_LANE5.md               (ce fichier)
```

Caveman delivered.
