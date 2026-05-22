# Brief POLISH-B — Polish UI Dashboard et Pages métier

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : 5 fix UI/UX P1-P2 identifiés par les audits

---

## PÉRIMÈTRE EXCLUSIF — NE TOUCHE QUE :

1. `app/src/app/(app)/reproduction/page.tsx` (H1)
2. `app/src/components/sidebar.tsx` (déplacer Performances)
3. `app/src/app/(app)/dashboard/page.tsx` (empty states sections + KPI tooltips)
4. `app/src/app/(app)/dashboard/_components/` (composants)
5. `app/src/app/(app)/layout.tsx` (metadata titles dynamiques par route via generateMetadata si pertinent)

NE TOUCHE PAS : migrations SQL, alertes-regles, nutrition-engine, autres pages.

---

## FIX #1 — H1 page Reproduction : "Nouvelle saillie" → "Reproduction"

### Bug audit V2 R2 (P1-5)
La page `/reproduction` affiche un `<h1>Nouvelle saillie</h1>` alors qu'elle liste les saillies historiques. L'utilisateur cherche le bouton "Nouvelle saillie" en haut, voit le H1 et est confus.

### Fix
Dans `app/src/app/(app)/reproduction/page.tsx`, modifie le H1 :
```tsx
<h1 …>
  <Heart className="h-8 w-8 text-[var(--sf-accent)]" />
  Reproduction
</h1>
```

Le sous-titre `{saillies?.length ?? 0} montées enregistrées` reste OK.

Conserve le bouton "Nouvelle saillie" tel quel.

---

## FIX #2 — Sidebar : "Performances" → groupe "Pilotage"

### Bug audit V2 R2 (P2-1)
Sémantiquement, "Performances" (`/kpi`) est un outil de pilotage, pas de logistique. Le groupe "Logistique & Nutrition" devrait contenir Alimentation et Stock seulement.

### Fix
Dans `app/src/components/sidebar.tsx`, modifier l'entrée Performances :
```ts
{ href: '/kpi', label: 'Performances', icon: TrendingUp, group: 'Pilotage' },
```

Conserve les autres items.

Vérifie aussi que l'ordre dans le groupe `Pilotage` reste cohérent : Tableau de bord → Alertes → Actions rapides → Performances (place le 4ème).

---

## FIX #3 — Empty states sur sections dashboard

### Bug audit V2 R2 (P2-4)
Les cartes du dashboard "STOCK QUI BAISSE" et "DERNIÈRES NAISSANCES" affichent juste un titre sans contenu si vide, sans empty state.

### Fix
Lire `app/src/app/(app)/dashboard/page.tsx` et identifier les sections concernées. Repère les patterns :
```tsx
{items.length === 0 && /* rien */}
{items.length > 0 && items.map(...)}
```

Remplace par :
```tsx
{items.length === 0 ? (
  <EmptyState
    icon={IconAdapté}
    title="Titre court"
    description="Pourquoi c'est vide"
  />
) : (
  <ul>...</ul>
)}
```

Sections concernées (au moins) :
- "Stock qui baisse" → `<EmptyState icon={CheckCircle2} title="Stocks au-dessus du seuil" description="Aucune matière première en alerte stock — tout est OK." />`
- "Dernières naissances" → `<EmptyState icon={Baby} title="Aucune naissance récente" description="Les mises-bas des 30 derniers jours apparaîtront ici." />`
- "Dernières saillies" (si présente) → idem pattern

Importe `EmptyState` depuis `@/components/ui/empty-state` et les icônes adaptées de `lucide-react`.

---

## FIX #4 — KPI dashboard : remplacer "—" par message explicatif

### Bug audit V2 R2 (P1-3)
Les 4 KPI techniques sur le dashboard (ISSF, Productivité numérique) affichent "—" sans explication. L'utilisateur ne sait pas pourquoi c'est vide.

### Fix
Lis le composant qui affiche les KPI cards (probablement `_components/` ou directement dans `dashboard/page.tsx`). Repère le code qui rend "—".

Remplace :
```tsx
<div className="text-2xl font-bold">
  {kpi.valeur ?? '—'}
</div>
```

Par :
```tsx
<div className={kpi.valeur != null ? "text-2xl font-bold" : "text-xs text-muted-foreground italic"}>
  {kpi.valeur != null ? formatKpi(kpi.valeur, kpi.unit) : 'Données insuffisantes — minimum 1 cycle complet (sevrage → saillie fécondante) requis'}
</div>
```

Ou utiliser un tooltip Radix `<Tooltip>` :
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div className="text-2xl text-muted-foreground cursor-help">—</div>
  </TooltipTrigger>
  <TooltipContent>
    Données insuffisantes pour calculer ce KPI (minimum 1 cycle complet requis).
  </TooltipContent>
</Tooltip>
```

(Choix : option 1 est plus simple, option 2 plus élégante. Choisis selon les composants Tooltip disponibles dans `@/components/ui/`.)

---

## FIX #5 — Titles dynamiques `<title>` par route

### Bug audit V2 R2 (P2-9)
Toutes les pages partagent le même `<title>` (probablement "Smart Farm"). Mauvais pour navigation par onglets.

### Fix
Pour chaque page principale, ajouter `export const metadata` :

```ts
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tableau de bord — Smart Farm',
}
```

À ajouter dans (au minimum) :
- `dashboard/page.tsx` → "Tableau de bord — Smart Farm"
- `alertes/page.tsx` → "Alertes — Smart Farm"
- `cheptel/page.tsx` → "Cheptel — Smart Farm"
- `reproduction/page.tsx` → "Reproduction — Smart Farm"
- `mises-bas/page.tsx` → "Mises bas & Sevrages — Smart Farm"
- `sanitaire/page.tsx` → "Sanitaire — Smart Farm"
- `sanitaire/calendrier/page.tsx` → "Calendrier sanitaire — Smart Farm"
- `sanitaire/biosecurite/page.tsx` → "Biosécurité — Smart Farm"
- `sanitaire/eau/page.tsx` → "Suivi eau — Smart Farm"
- `sanitaire/mycotoxines/page.tsx` → "Mycotoxines — Smart Farm"
- `kpi/page.tsx` → "Performances — Smart Farm"
- `assistant/page.tsx` → "Assistant — Smart Farm"

Pour les routes dynamiques (`/cheptel/[id]`), utiliser `generateMetadata` :
```ts
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  // peut faire un fetch tag mais c'est facultatif — start simple :
  return { title: `Animal ${id.slice(0,8)}… — Smart Farm` }
}
```

(Si tu manques de temps, fais seulement les 10 routes statiques, c'est suffisant.)

---

## PROCÉDURE

1. Lire les fichiers concernés
2. Appliquer chaque fix une par une
3. Vérif TS :
   ```bash
   export PATH=/root/.hermes/node/bin:$PATH && cd /root/projects/smartfarm/app && npx tsc --noEmit 2>&1 | tail -10
   ```
4. ⚠️ NE LANCE PAS `npm run build`

---

## LIVRABLES

1. H1 Reproduction corrigé
2. Sidebar : Performances dans Pilotage
3. Dashboard : empty states + KPI explicatifs
4. ≥10 routes avec metadata.title spécifique
5. Rapport `/root/projects/smartfarm/agents/V2-POLISH/RAPPORT_POLISH_B.md`

## ANTI-PIÈGES
- Pas de migration ni modification SQL
- Le composant Tooltip de `@/components/ui/` : vérifie son existence avant import
- Ne casse pas le styling existant (conserve les classes/style inline existants)
- Pour `generateMetadata` Next 16 : `params` est asynchrone — `await`
