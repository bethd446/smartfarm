# RAPPORT B8 — `<EmptyOnboarding>` + 4 écrans empty

Statut : DONE
Mode : caveman strict
Date : 2026-05-27
Branche : `feat/phase-a-quick-wins`

---

## Livrables

| Fichier | Action | Lignes touchées |
|---|---|---|
| `app/src/components/ui/empty-onboarding.tsx` | CRÉÉ | 123 (new) |
| `app/src/app/(app)/stock/page.tsx` | PATCH ciblé | +1 import, bloc empty (l.236-256) |
| `app/src/app/(app)/alimentation/plans/page.tsx` | PATCH ciblé | +1 import, +1 icône, bloc empty (l.543-557) |
| `app/src/app/(app)/sanitaire/calendrier/page.tsx` | PATCH ciblé | +1 import, +1 icône, bloc empty (l.139-148) |
| `app/src/app/(app)/sanitaire/protocoles/page.tsx` | PATCH ciblé | +1 import, +1 icône, bloc empty (l.265-281) |

`<EmptyState>` existant (`empty-state.tsx`) NON modifié — coexistence assumée :
- `EmptyState` = vide court tableau/liste (eyebrow 12px, icône 32px, 1 CTA)
- `EmptyOnboarding` = Card riche onboarding (icône 48px, titre 28px, description, 2 CTA)

---

## Décisions / écarts brief

1. **Tokens utilisés** : alias sémantiques (`--sf-surface-1`, `--sf-primary`, `--sf-line`, `--sf-ink-secondary`) plutôt que primitives `--sf-mil-50`/`--sf-sahel-700`/`--sf-or-600` (qui n'existent pas comme variables CSS — seulement comme primitives `--mil-50` etc. l.137 globals.css). Mapping équivalent, plus stable (compat dark mode auto).
2. **`Calendar` (Lucide)** ajouté côté brief, page utilisait déjà `CalendarDays` — gardé les deux (CalendarDays utilisé ailleurs dans la page).
3. **`Wheat` (Lucide)** ajouté à `alimentation/plans` (pas déjà importé).
4. **`ShieldCheck` (Lucide)** ajouté à `sanitaire/protocoles` (pas déjà importé).
5. **Stock empty** : wrapping `<EmptyOnboarding>` dans `<td colSpan={6}>` (le bloc empty était dans un `<tbody>`, structure HTML respectée).
6. **`DialogPlan` trigger** remplacé par href `/alimentation/plans?action=new` — câblage dialog côté B6/B7 plus tard (brief explicite).
7. **`FormResetStandards`** retiré du bloc empty mais composant toujours utilisé l.184 (action server "réinitialiser standards IFIP") — pas de dead code.

---

## Vérifications

```bash
cd /Users/13mac/smartfarm/app && npx tsc --noEmit -p tsconfig.json
```

⚠ **Non exécuté** : permission `Bash` refusée par sandbox harness lors de la session.

Revue manuelle effectuée :
- Imports React : `import * as React from 'react'` ajouté (requis pour `React.ReactNode` même avec `jsx: react-jsx`).
- Imports Lucide : tous les nouveaux symboles (`Wheat`, `Calendar`, `ShieldCheck`) ajoutés aux blocs `import { … } from 'lucide-react'`.
- Imports `EmptyOnboarding` : 4 ajouts.
- Button variants : `default`/`outline` + size `default` → existent (button.tsx l.50/64/99).
- `Link href` accepte string : OK Next 16.
- Pas de hook React (`useState`, `useEffect`) → Server Component compatible ✅.
- Pas de `'use client'` → Server Component compatible ✅.
- Pas de couleur hardcoded (tokens `--sf-*` only) ✅.
- Pas d'icône Unicode ✅.

Imports devenus inutiles : aucun (chaque page conserve `Plus`, `Link`, `Button` utilisés ailleurs).

À faire côté Christophe (5s) :
```bash
cd /Users/13mac/smartfarm/app && npx tsc --noEmit -p tsconfig.json
```

---

## Périmètre respecté

✅ 1 composant créé (`empty-onboarding.tsx`)
✅ 4 fichiers patchés (Edit ciblé bloc empty uniquement, jamais Write entier)
✅ `<EmptyState>` non touché (coexistence)
❌ Aucune autre route, layout, ou composant existant touché

---

## Suite (hors scope B8)

- Vague 3 : 4 autres écrans empty (cf brief V2 §A8) → cheptel, reproduction, bandes, conseiller.
- B6/B7 : câblage `?action=new` sur route stock/plans/protocoles (dialog ouvert via searchParams).
- A11y : vérifier focus trap sur 2 CTA (déjà géré par `<Button>` natif + base-ui).
