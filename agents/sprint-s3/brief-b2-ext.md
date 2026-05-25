# Brief B2-EXT — Cartographie + fix hydration date-fns

## TOI
Dev senior React. Caveman. Contexte vierge.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md`
2. `/root/projects/smartfarm/agents/sprint-s2-audit/RAPPORT_AUDIT.md` §B2 (fix initial)
3. Le fix S2 référence : `/root/projects/smartfarm/app/src/app/(app)/alertes/_components/relative-time.tsx` (composant client-only à RÉUTILISER)

## CONTEXTE
S2 a fixé l'hydration React #418 sur `alerte-card.tsx` en extrayant `formatDistanceToNow` dans un composant client `<RelativeTime>`. **Le pattern doit être étendu** à TOUS les autres composants qui rendent une date relative (ou formatage locale-dépendant) côté serveur.

## MISSION en 2 PHASES

### PHASE 1 — Cartographie (audit)
1. Grep tous les usages :
```bash
cd /root/projects/smartfarm/app/src
grep -rn "formatDistanceToNow\|formatRelative\|formatDistance\b" --include="*.tsx" --include="*.ts" | grep -v relative-time.tsx | grep -v "alerte-card.tsx"
```
2. Pour chaque match, classer :
   - 🟢 **À MIGRER** : usage dans JSX (rendu visible) → risque hydration mismatch
   - 🟡 **OK** : usage dans logic (variable, prop transmise), pas rendu direct
   - 🔴 **OK** : déjà dans un client component (`'use client'` en tête)
3. Lister aussi les autres formatters i18n-dépendants à risque : `new Date().toLocaleString()`, `Intl.DateTimeFormat`, `Intl.NumberFormat` dans des Server Components

### PHASE 2 — Patch (fix)
Pour chaque 🟢 :
- Soit utiliser `<RelativeTime date={...}>` existant (si format relatif `il y a X`)
- Soit créer un nouveau composant client local si format différent (ex: `<FormattedDate format='dd MMM yyyy'>`)
- Soit ajouter `suppressHydrationWarning` sur le span SI le contenu est UNIQUEMENT décoratif (dernier recours, justifier)

**Limite scope** : si plus de **8 fichiers 🟢** identifiés, traite les 8 plus visibles (pages principales d'abord : dashboard, alertes, calendrier, sanitaire, reproduction).

### Cas particuliers
- Si `<RelativeTime>` n'est exporté que depuis `_components/relative-time.tsx` (privé à alertes), envisager :
  - Soit déplacer vers `components/ui/relative-time.tsx` (réutilisable globalement)
  - Soit dupliquer (acceptable si seul cas)
  - **Décision recommandée** : déplacer vers `components/ui/relative-time.tsx`, mettre à jour l'import dans `alerte-card.tsx`

## PÉRIMÈTRE
✅ Touche : fichiers contenant `formatDistanceToNow` ou similaire dans JSX server-side
✅ Peut créer/déplacer `components/ui/relative-time.tsx`
❌ Pas de `npm run build`, pas restart serveur, pas git commit
❌ Pas d'autres refactor non liés

## VÉRIFICATIONS OBLIGATOIRES après patch
1. `cd /root/projects/smartfarm/app && npx tsc --noEmit` → 0 erreur
2. `grep -rn "formatDistanceToNow" /root/projects/smartfarm/app/src --include="*.tsx" --include="*.ts" | grep -v "'use client'" | grep -v "/ui/relative-time.tsx"` → idéalement 0 hit (ou tous dans des fichiers `'use client'`)

## LIVRABLE
1. **Fichier rapport** : `/root/projects/smartfarm/agents/sprint-s3/RAPPORT_B2_EXT.md` ≤ 4 KB
   - Carto (table fichiers + classification)
   - Patches appliqués (liste)
   - Faux positifs justifiés
   - Verifications (tsc OK, greps OK)
2. **Fichiers code** :
   - `components/ui/relative-time.tsx` (déplacé OU créé)
   - X fichiers patchés (selon carto)

## ANTI-PIÈGES
- ❌ Ne PAS toucher aux composants déjà `'use client'` (pas de risque hydration)
- ❌ Ne PAS toucher au registre PDF (`api/registre/mensuel/_template.tsx`) — c'est un template SSR pour PDF, pas rendu navigateur
- ❌ Ne PAS toucher aux fichiers `_actions.ts` / `_server-actions.ts` (server only, pas de hydration)
- ❌ Si tu déplaces `relative-time.tsx`, mets à jour l'import dans `alerte-card.tsx` (déjà fait par S2)
- Le fichier `relative-time.tsx` actuel rend `il y a {formatDistanceToNow(date)}` — si tu le rends global, propose une prop `prefix` optionnelle (default `"il y a "`) pour plus de flexibilité

Go.
