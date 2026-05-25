# Brief Lane B — Hydration mismatch alerte-card (B2 P0)

## TOI
Dev senior React. 1 fichier. 30 min. Caveman.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (rapidement)
2. `/root/projects/smartfarm/agents/sprint-s2-audit/RAPPORT_AUDIT.md` §B2

## PÉRIMÈTRE
✅ Touche : `/root/projects/smartfarm/app/src/app/(app)/alertes/_components/alerte-card.tsx`
❌ Pas d'autre fichier
❌ Pas `npm run build`, pas restart serveur, pas git commit

## CONTEXTE BUG
Erreur React #418 (text mismatch SSR/client) en prod sur `/alertes`.
Cause : ligne 117-119 de alerte-card.tsx utilise `formatDistanceToNow(detecteLe, { locale: fr })` qui :
- SSR rend `il y a 3 jours` (calculé à T0 serveur)
- Client rend `il y a 3 jours et 2 secondes` puis tronqué → texte parfois différent
→ React détecte mismatch → erreur #418.

## MISSION
Faire en sorte que le `formatDistanceToNow` ne s'exécute QU'EN CLIENT (après hydration), avec fallback `''` pour SSR.

## OPTION RECOMMANDÉE (la plus propre)
Le composant est actuellement un Server Component (pas de `'use client'`).
Extraire l'affichage de la date dans un mini composant client local :

Ajouter en haut du fichier :
```tsx
'use client'  // NON — ne pas convertir tout le composant en client
```
Plutôt, créer un sous-composant client juste pour la date.

**Approche** : créer un nouveau fichier `/root/projects/smartfarm/app/src/app/(app)/alertes/_components/relative-time.tsx` :

```tsx
'use client'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export function RelativeTime({ date }: { date: Date }) {
  const [label, setLabel] = useState<string>('')
  useEffect(() => {
    setLabel(formatDistanceToNow(date, { locale: fr }))
  }, [date])
  // Ne rend rien au SSR ni au 1er render client → 0 mismatch
  return label ? <>il y a {label}</> : null
}
```

Puis dans `alerte-card.tsx` :
- Importer : `import { RelativeTime } from './relative-time'`
- Remplacer le span ligne 117-119 par :
  ```tsx
  <span className="text-xs text-[var(--sf-muted,#5C5346)] eyebrow">
    <RelativeTime date={detecteLe} />
  </span>
  ```
- Supprimer les imports devenus inutiles (`formatDistanceToNow`, `fr`) si plus utilisés ailleurs dans le fichier.

## VÉRIFICATIONS OBLIGATOIRES
1. `cd /root/projects/smartfarm/app && npx tsc --noEmit` → 0 erreur
2. `grep -c "formatDistanceToNow" /root/projects/smartfarm/app/src/app/\\(app\\)/alertes/_components/alerte-card.tsx` → 0
3. `grep -c "RelativeTime" /root/projects/smartfarm/app/src/app/\\(app\\)/alertes/_components/alerte-card.tsx` → ≥2 (import + usage)
4. `test -f /root/projects/smartfarm/app/src/app/\\(app\\)/alertes/_components/relative-time.tsx` → existe

## LIVRABLE
1. 2 fichiers : `relative-time.tsx` créé + `alerte-card.tsx` modifié
2. Rapport stdout 4 lignes max :
   - Fichier créé : relative-time.tsx
   - Fichier modifié : alerte-card.tsx
   - tsc : OK / FAIL
   - grep RelativeTime : N

## ANTI-PIÈGES
- ❌ NE PAS ajouter `'use client'` au sommet de alerte-card.tsx (le briserait Server Component)
- ❌ NE PAS modifier d'autres composants alerte
- ❌ NE PAS toucher alertes-list.tsx
- Le fichier alerte-card.tsx fait 157 lignes. Si après ton patch il fait <140 ou >180 lignes, vérifie
- `formatDistanceToNow` est utilisé QUE dans le span ligne 117-119 → cherche-le bien

Go.
