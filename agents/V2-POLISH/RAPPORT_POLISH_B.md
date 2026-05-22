# RAPPORT POLISH-B — Polish UI Dashboard & Pages métier

**Agent** : POLISH-B (Sonnet 4.5, contexte vierge)
**Date** : 2026-05-21
**Mission** : 5 fix UI/UX P1-P2 identifiés par les audits V2 R2
**Périmètre** : pages dashboard, reproduction, sidebar, metadata.title sur ≥10 routes

---

## ✅ STATUT GLOBAL : 5/5 FIX LIVRÉS

Type-check TypeScript (`npx tsc --noEmit`) :
- **0 erreur TS introduite par POLISH-B**
- 1 erreur préexistante hors périmètre (`src/lib/nutrition-engine.ts:157` — `MixNutrition` manque threonine/tryptophane/cystine → c'est le territoire de POLISH-A, j'ai laissé en l'état comme demandé)

`npm run build` non lancé (consigne explicite du brief).

---

## FIX #1 — H1 page Reproduction : « Nouvelle saillie » → « Reproduction »

**Fichier** : `app/src/app/(app)/reproduction/page.tsx`

Avant :
```tsx
<Heart className="h-8 w-8 text-[var(--sf-accent)]" />
Nouvelle saillie
</h1>
```

Après :
```tsx
<Heart className="h-8 w-8 text-[var(--sf-accent)]" />
Reproduction
</h1>
```

- Sous-titre `{saillies?.length ?? 0} montées enregistrées` conservé tel quel
- Bouton CTA « Nouvelle saillie » dans le header conservé tel quel
- L'utilisateur ne confond plus le titre de page avec le bouton d'action

---

## FIX #2 — Sidebar : « Performances » déplacé de Logistique & Nutrition → Pilotage

**Fichier** : `app/src/components/sidebar.tsx`

Position finale dans le groupe **Pilotage** (ordre demandé respecté) :
1. Tableau de bord (`/dashboard`)
2. Alertes (`/alertes`)
3. Actions rapides (`/actions-rapides`)
4. **Performances (`/kpi`)** ← déplacé ici

Le groupe **Logistique & Nutrition** ne contient plus que **Alimentation** + **Stock**, sémantiquement cohérent.

Aucune autre entrée ni icône modifiée. Aucun `import` à ajouter (`TrendingUp` déjà importé).

---

## FIX #3 — Empty states sections dashboard

**Fichier** : `app/src/app/(app)/dashboard/page.tsx`

État avant audit : les sections `Stock qui baisse`, `Dernières naissances` et `Prochains événements` **avaient déjà** des `EmptyState`. J'ai aligné les copies sur la spec exacte du brief :

### Stock qui baisse
```tsx
<EmptyState
  icon={CheckCircle2}
  tone="good"
  title="Stocks au-dessus du seuil"
  description="Aucune matière première en alerte stock — tout est OK."
/>
```

### Dernières naissances
```tsx
<EmptyState
  icon={Baby}
  title="Aucune naissance récente"
  description="Les mises-bas des 30 derniers jours apparaîtront ici."
  cta={{ label: 'Enregistrer une naissance', href: '/mises-bas?action=new' }}
/>
```

### Prochains événements (déjà conforme, laissé tel quel)
```tsx
<EmptyState
  icon={CheckCircle2}
  tone="good"
  title="Rien d'urgent aujourd'hui ✅"
  description="Aucun événement planifié dans les 30 prochains jours."
/>
```

Composant `EmptyState` importé depuis `@/components/ui/empty-state` (déjà présent dans le fichier).

---

## FIX #4 — KPI dashboard : « — » → « Données insuffisantes »

**Fichier** : `app/src/components/kpi/kpi-tech-card.tsx`

Le composant `KpiTechCard` est partagé entre dashboard et fiche truie : un seul fix propage sur les 4 KPI techniques (ISSF, Productivité numérique, TMM, Nés vivants/portée).

### Choix d'implémentation
**Option 1 (texte explicatif inline)** retenue.
Raison : confirmation par `search_files` qu'il n'existe **aucun composant** `tooltip.tsx` dans `@/components/ui/` du projet. Pas d'ajout de dépendance Radix Tooltip pour un seul fix UI.

### Diff
Avant :
```tsx
const display = num === null || !Number.isFinite(num) ? '—' : num.toFixed(digits)
// ...
<div className="text-2xl font-bold tabular-nums" ...>
  {display}
  {unit && display !== '—' ? <span>{unit}</span> : null}
</div>
```

Après :
```tsx
const hasValue = num !== null && Number.isFinite(num)
const display = hasValue ? (num as number).toFixed(digits) : null
// ...
{hasValue ? (
  <div className="text-2xl font-bold tabular-nums" ...>
    {display}
    {unit ? <span>{unit}</span> : null}
  </div>
) : (
  <div
    className="text-xs italic leading-snug"
    style={{ color: 'var(--sf-muted)' }}
    title="Minimum 1 cycle complet (sevrage → saillie fécondante) requis pour calculer ce KPI."
  >
    Données insuffisantes — minimum 1 cycle complet (sevrage → saillie fécondante) requis
  </div>
)}
```

- Bonus : attribut `title` natif → tooltip CSS du navigateur, zéro JS, zéro composant
- L'éleveur sait désormais **pourquoi** la cellule est vide → comportement attendu de l'agritech

---

## FIX #5 — Metadata.title dynamique sur 12 routes principales

Pour chaque page server-component, ajout en tête de fichier :
```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '<Nom route> — Smart Farm',
}
```

### Routes équipées (12 — dépasse le seuil ≥10 demandé)

| Route | Title |
|---|---|
| `/dashboard` | Tableau de bord — Smart Farm |
| `/alertes` | Alertes — Smart Farm |
| `/cheptel` | Cheptel — Smart Farm |
| `/reproduction` | Reproduction — Smart Farm |
| `/mises-bas` | Mises bas & Sevrages — Smart Farm |
| `/sanitaire` | Sanitaire — Smart Farm |
| `/sanitaire/calendrier` | Calendrier sanitaire — Smart Farm |
| `/sanitaire/biosecurite` | Biosécurité — Smart Farm |
| `/sanitaire/eau` | Suivi eau — Smart Farm |
| `/sanitaire/mycotoxines` | Mycotoxines — Smart Farm |
| `/kpi` | Performances — Smart Farm |
| `/assistant` | Assistant — Smart Farm |

### Bonus
Toutes les pages cibles sont des **server components** (pas de `'use client'` au top) — `export const metadata` est donc supporté nativement. Vérifié avec `grep -l "^'use client'"` : 0 match.

### Routes dynamiques
`generateMetadata` pour `/cheptel/[id]`, `/sanitaire/maladies/[slug]`, `/conseiller/[slug]` : **pas implémenté** (brief autorise « seulement les 10 routes statiques, c'est suffisant »). À reprendre en passe ultérieure si besoin SEO.

---

## FICHIERS MODIFIÉS

```
app/src/app/(app)/reproduction/page.tsx         (FIX #1 + FIX #5)
app/src/components/sidebar.tsx                  (FIX #2)
app/src/app/(app)/dashboard/page.tsx            (FIX #3 + FIX #5)
app/src/components/kpi/kpi-tech-card.tsx        (FIX #4)
app/src/app/(app)/alertes/page.tsx              (FIX #5)
app/src/app/(app)/cheptel/page.tsx              (FIX #5)
app/src/app/(app)/mises-bas/page.tsx            (FIX #5)
app/src/app/(app)/sanitaire/page.tsx            (FIX #5)
app/src/app/(app)/sanitaire/calendrier/page.tsx (FIX #5)
app/src/app/(app)/sanitaire/biosecurite/page.tsx (FIX #5)
app/src/app/(app)/sanitaire/eau/page.tsx        (FIX #5)
app/src/app/(app)/sanitaire/mycotoxines/page.tsx (FIX #5)
app/src/app/(app)/kpi/page.tsx                  (FIX #5)
app/src/app/(app)/assistant/page.tsx            (FIX #5)
```

**Total** : 14 fichiers modifiés.

---

## VÉRIFICATIONS

- ✅ `npx tsc --noEmit` : 0 erreur dans le périmètre POLISH-B
- ✅ Aucun fichier hors périmètre touché (pas de SQL, pas d'`alertes-engine`, pas de `nutrition-engine`)
- ✅ Aucun `import` orphelin, aucun warning lint
- ✅ Styling existant conservé partout (classes, style inline, tokens CSS `var(--sf-*)`)
- ✅ Composant Tooltip Radix : vérifié absent → option 1 (texte inline) retenue
- ✅ `'use client'` : vérifié absent sur les 12 pages cibles → `metadata` export OK

---

## ANTI-PIÈGES RESPECTÉS

- Pas de modification de migrations SQL
- Pas de modification de `alertes-engine`, `nutrition-engine`
- `npm run build` non lancé
- Type-check OK (exception préexistante hors périmètre)

---

**Statut final : ✅ MISSION COMPLÈTE — Prêt pour merge.**
