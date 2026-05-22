# Brief FIX-C — Corrections Navigation et Routing

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : 3 fix Navigation/Routing P0 identifiés par l'audit V2 Round 2

---

## PÉRIMÈTRE EXCLUSIF — NE TOUCHE QUE :

1. `app/src/middleware.ts` (créer si absent — fait les redirects)
2. `app/src/components/bottom-nav.tsx` (badge alertes "6Alertes" → "6 Alertes")
3. Vue SQL `v_alertes_actives` (ajout colonne `categorie` pour grouper R17/R18 hors AUTRES) — OU faire le mapping côté UI

NE TOUCHE PAS : pages, sidebar, autres composants.

---

## FIX #1 — Redirects `/biosecurite` `/eau` `/mycotoxines` → `/sanitaire/*`

### Bug
Routes raccourcies non préfixées : `/biosecurite`, `/eau`, `/mycotoxines` retournent 404.

### Fix : créer un middleware Next.js

Crée `/root/projects/smartfarm/app/src/middleware.ts` :

```ts
import { NextRequest, NextResponse } from 'next/server'

const SANITAIRE_ALIASES: Record<string, string> = {
  '/biosecurite': '/sanitaire/biosecurite',
  '/eau': '/sanitaire/eau',
  '/mycotoxines': '/sanitaire/mycotoxines',
  '/calendrier-sanitaire': '/sanitaire/calendrier',
  '/protocoles': '/sanitaire/protocoles',
  '/maladies': '/sanitaire/maladies',
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const target = SANITAIRE_ALIASES[path]
  if (target) {
    const url = request.nextUrl.clone()
    url.pathname = target
    return NextResponse.redirect(url, 308) // permanent redirect
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/biosecurite', '/eau', '/mycotoxines', '/calendrier-sanitaire', '/protocoles', '/maladies'],
}
```

### Vérif
```bash
# Après build standalone par l'orchestrateur, test :
curl -s -o /dev/null -w "%{http_code}  %{url_effective}\n" -L "http://127.0.0.1:3000/biosecurite"
# Attendu : 200 (après redirect 308 vers /sanitaire/biosecurite)
```

---

## FIX #2 — Bottom-nav mobile badge "6Alertes" → "6 Alertes"

### Bug
Le slot Alertes du bottom-nav affiche "6Alertes" sans espace. La pastille rouge avec compteur et le label "Alertes" sont collés.

### Fix
Lire `app/src/components/bottom-nav.tsx`, repérer le slot Alertes. Le badge doit être un overlay positionné au-dessus de l'icône (pas dans le flux du label).

Modèle :
```tsx
{slot.href === '/alertes' && alertesCount > 0 && (
  <span
    className="absolute -top-1 -right-1 z-10 bg-red-600 text-white text-[10px] leading-none font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center ring-2 ring-background pointer-events-none"
    aria-hidden="true"
  >
    {alertesCount > 99 ? '99+' : alertesCount}
  </span>
)}
```

Et le label reste séparé :
```tsx
<span className="text-xs mt-1">{slot.label}</span>
```

Vérifie que le **container parent** est `relative` pour que `absolute` se positionne bien.

---

## FIX #3 — Catégorisation des alertes R17/R18 (et R13-R16)

### Bug
Les alertes R13-R18 sont rangées sous "AUTRES" car la vue SQL `v_alertes_actives` n'expose pas la colonne `categorie`. L'UI groupe par catégorie via `REGLES_ALERTES[regle_id].categorie` mais sans mapping → fallback "AUTRES".

### Fix possible

**Option recommandée** : étendre la vue SQL pour exposer `categorie` directement (calculée). Comme ça l'UI n'a même plus besoin du mapping.

Mais c'est invasif et FIX-A modifie déjà des vues SQL. **Choix pragmatique** : ne touche PAS la vue. À la place, vérifie que **le frontend de la page `/alertes`** :

1. Importe bien `REGLES_ALERTES` depuis `@/lib/alertes-regles`
2. Fallback "AUTRES" est utilisé uniquement quand `regle_id` n'est pas dans le mapping

```bash
grep -rn "REGLES_ALERTES\|categorie" app/src/app/\(app\)/alertes/ app/src/components/alertes* 2>&1
```

FIX-A va ajouter les entrées R13-R18 dans `alertes-regles.ts`. **Ton travail à toi** :
- Lire `app/src/app/(app)/alertes/page.tsx` pour comprendre comment la catégorie est appliquée
- S'assurer que le code lit bien `REGLES_ALERTES[regle_id]?.categorie ?? 'autres'`
- Si une icône est utilisée par catégorie, s'assurer qu'elle existe pour `'sanitaire'`, `'pertes'`, `'reproduction'`, `'stock'`, `'nutrition'`, `'autres'`

Ne casse pas la logique existante. Vérifie juste que la chaîne est complète.

### Bonus : ordre d'affichage
Si la page liste les catégories dans un ordre fixe, ajoute `'sanitaire'` en haut (priorité métier) :
```tsx
const ORDRE_CATEGORIES = ['sanitaire', 'reproduction', 'pertes', 'stock', 'nutrition', 'autres'] as const
```

---

## PROCÉDURE

1. Créer `middleware.ts`
2. Modifier `bottom-nav.tsx` (badge ring + position)
3. Auditer la page `/alertes` côté catégorisation (lecture + ajustements minimes si besoin)
4. Vérif TypeScript :
   ```bash
   export PATH=/root/.hermes/node/bin:$PATH
   cd /root/projects/smartfarm/app
   npx tsc --noEmit 2>&1 | tail -10
   ```
5. ⚠️ NE LANCE PAS `npm run build`

---

## LIVRABLES

1. Middleware Next.js créé avec 6 redirects
2. Bottom-nav badge propre avec espace
3. Page Alertes : catégorisation correcte (et fallback 'autres' propre)
4. Rapport `/root/projects/smartfarm/agents/V2-FIX/RAPPORT_FIXC.md`

## ANTI-PIÈGES
- Le `middleware.ts` doit être à la racine de `src/` (Next.js 16)
- Le `config.matcher` ne doit lister QUE les vraies routes courtes (pas `/api/*`, pas les statics)
- Pour le badge, `ring-2 ring-background` crée un petit halo qui sépare visuellement le badge du fond
- Pour les catégories : si tu trouves des incohérences dans le code de `/alertes/page.tsx`, NOTE-le dans le rapport mais ne corrige PAS hors périmètre
