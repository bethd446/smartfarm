# Brief LANE A — Navigation cleanup S4

## TOI
Dev senior. Caveman. Contexte vierge. 15 min.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (rapidement)
2. `/root/projects/smartfarm/agents/sprint-s4/RAPPORT_S4_AUDIT.md` §2

## PÉRIMÈTRE
✅ Touche UNIQUEMENT :
- `/root/projects/smartfarm/app/src/components/sidebar.tsx`
- `/root/projects/smartfarm/app/src/components/mobile-drawer.tsx`

❌ NE PAS toucher `bottom-nav.tsx` (rien à retirer dedans)
❌ NE PAS toucher `/bandes/page.tsx` (la route reste pour archive lecture seule, on retire juste la navigation)
❌ NE PAS toucher `/sanitaire/ppa/page.tsx` (page conservée comme sous-page sanitaire)
❌ Pas `npm run build`, pas git commit

## MISSION
1. **Retrait sidebar.tsx** :
   - Ligne ~26 : entrée `Bandes` (`href: '/bandes', label: 'Bandes', icon: Layers, group: 'Élevage'`)
   - Ligne ~33 : entrée `PPA` (`href: '/sanitaire/ppa', label: 'PPA', icon: AlertTriangle, group: 'Santé'`)
   → Supprimer ces 2 lignes du tableau `nav`.

2. **Retrait mobile-drawer.tsx** :
   - Ligne ~36 : entrée `Bandes`
   - Ligne ~43 : entrée `PPA`
   → Supprimer ces 2 lignes du tableau `nav`.

3. **Cleanup imports** :
   - Si `Layers` n'est plus utilisé après retrait Bandes → retirer de `import { Layers, ... } from 'lucide-react'`
   - Si `AlertTriangle` n'est plus utilisé après retrait PPA → retirer pareil (vérifier qu'il n'est PAS utilisé ailleurs dans le fichier)
   - Sinon, laisser les imports tels quels.

4. **Bonus optionnel (SI temps)** :
   - Vérifier qu'aucun composant n'importe la const `nav` exportée
   - Si oui, ne PAS extraire vers lib/navigation.ts (refacto trop large pour cette lane)
   - Sinon, ignorer.

## VÉRIFICATIONS OBLIGATOIRES
1. `cd /root/projects/smartfarm/app && npx tsc --noEmit` → 0 erreur
2. `grep -c "Bandes\|/bandes" /root/projects/smartfarm/app/src/components/sidebar.tsx` → 0
3. `grep -c "PPA\|/sanitaire/ppa" /root/projects/smartfarm/app/src/components/sidebar.tsx` → 0
4. Pareil pour `mobile-drawer.tsx`
5. `grep -c "from 'lucide-react'" /root/projects/smartfarm/app/src/components/sidebar.tsx` → 1 (l'import existe toujours)

## LIVRABLE
1. 2 fichiers modifiés (sidebar.tsx + mobile-drawer.tsx)
2. Rapport stdout 6 lignes max :
   - sidebar.tsx : 2 lignes retirées (LXX, LXX)
   - mobile-drawer.tsx : 2 lignes retirées (LXX, LXX)
   - imports cleanup : Layers retiré OUI/NON, AlertTriangle retiré OUI/NON
   - tsc : OK / FAIL

## ANTI-PIÈGES
- ❌ Ne PAS toucher `bottom-nav.tsx` (PPA/Bandes pas dedans)
- ❌ Ne PAS supprimer la **route** `/bandes/page.tsx` (juste la navigation)
- ❌ Ne PAS retirer Sanitaire (`/sanitaire`) ! Juste son sous-onglet PPA top-level
- ❌ Ne PAS refacto les arrays (juste delete 4 lignes au total)
- Le résultat doit avoir **EXACTEMENT 12 entrées** dans chaque array (vs 14 avant)

Go.
