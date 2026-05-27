# RAPPORT LANE DASHBOARD — Phase A · A9
*Repli des 4 cartes "Données insuffisantes" en 1 bandeau compact*

## Fichier touché
- `app/src/app/(app)/dashboard/page.tsx` (section KPI techniques UNIQUEMENT)

## Changements

### Imports
Ajout `Hourglass` à l'import lucide-react existant. Aucune nouvelle dépendance.

### Logique (section KPI techniques, ~lignes 230-358)
Remplacé la grille fixe `<KpiTechCard>` × 4 par un bloc qui :

1. Construit `kpiDefs[]` (4 KPI) avec icône, label, sub, value, unit, target, tone.
2. Partitionne en `active` (tone ≠ 'muted') vs `missing` (tone === 'muted').
3. Branches d'affichage :
   - **Tous muted (cas actuel sur démo)** → 1 bandeau jaune-pâle, pas de cartes.
   - **Mix** → cartes actives (grille adaptée à `active.length`) + bandeau récap des manquantes.
   - **Tous actifs** → 4 cartes, pas de bandeau.
4. Bandeau : `bg=var(--sf-warm)` (jaune-pâle), icône `Hourglass` (couleur accent-deep), titre uppercase Big Shoulders + descriptif listant les labels manquants + lien `Voir KPI activables →` vers `/kpi` (touch-target 44 px).

### Grille adaptative
Quand certaines cartes sont actives, la grille s'adapte (`grid-cols-1/2/3/4`) pour rester alignée plutôt que de laisser un vide.

## Détection "données insuffisantes"
Pas de duplication de logique : on réutilise `toneXxx() === 'muted'` (déjà défini dans `kpi-tech-card.tsx`). Critère existant : `value === null/undefined` ou non-finite.

## Ne casse pas
- HEADER PageTitle : intact
- KPI GRID asymétrique (cheptel total, truies, verrats, portées) : intact
- AlertesWidget + TipDuJour : intact
- Prochains événements : intact
- Dernières naissances + Stock qui baisse : intact
- Variables `kpiTech`, `kpiTechFerme` : conservées telles quelles
- Fonctions `toneIssf`, `toneProductivite`, `toneTmm`, `toneNesVivants` : appelées identiquement

## Vérifications

### Type-check
NON-EXÉCUTÉ — l'environnement de cette lane refuse l'accès Bash (permission denied sur `npx tsc`). Revue manuelle :
- `Hourglass` importé depuis lucide-react ✅
- `KpiTone` retourné par toneXxx() compatible avec `KpiTechCardProps.tone` ✅
- `value: number | null | undefined` ⊂ `KpiTechCardProps.value: number | string | null | undefined` ✅
- IIFE `(() => <section>...</section>)()` retourne ReactElement ✅
- Aucun import inutilisé (`KpiTechCard`, `Clock`, `Zap`, `Skull`, `Target`, `toneIssf`, `toneProductivite`, `toneTmm`, `toneNesVivants` toujours référencés) ✅

**À exécuter dans la worktree principale avant commit :**
```bash
cd /Users/13mac/smartfarm/app
npx tsc --noEmit -p tsconfig.json
```

### Visuel attendu (compte demo)
État actuel : 0 cycle complet → **tous KPI muted** → 1 seul bandeau affiché, plus aucune carte. Gain visuel ~20 % d'écran desktop libéré sous la section KPI hero.

## Conflit Lane Stock (A5)
**Aucun conflit** : Lane Stock touche uniquement la section STOCK QUI BAISSE (lignes 415-482). Lane Dashboard A9 touche uniquement la section KPI TECHNIQUES (lignes 233-282 avant patch). Disjoint.

Seul point partagé : le fichier `page.tsx` lui-même → git merge texte → résolution automatique si patches sur lignes différentes. Aucune variable / import partagé entre les deux sections.

## Mode caveman respecté
- 1 seul fichier modifié
- 0 nouvelle dépendance
- 0 modif de composant global
- Réutilisation du token `--sf-warm` (déjà utilisé pour la card cheptel total)
- Réutilisation du composant `KpiTechCard` existant (juste rendu conditionnellement)
