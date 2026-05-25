# Brief AUDIT S4 — Cartographie navigation + cascades métier

## TOI
Auditeur senior. Read-only. Caveman. Contexte vierge. ≤ 30 min.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (notamment règles 1-11)
2. `/root/projects/smartfarm/.brain/CAVEMAN.md`

## CONTEXTE — Décisions orchestrateur déjà validées
| # | Décision |
|---|---|
| 1 | Purge `/bandes` (route + sidebar + drawer + bottom-nav, archive lecture seule si pas trop coûteux) |
| 2 | PPA descend sous Sanitaire (`/sanitaire/ppa` existe déjà, retirer du top-level sidebar) |
| 3 | Stock reste top-level |
| 4 | Transitions stade = **manuelles** (bouton "Faire passer en X") |
| 5 | Recherche par boucle = **top-bar persistante** |
| 6 | `/actions-rapides` : garde + perfectionne |

Parcours linéaire cible :
```
Repro → Mise bas → Maternité → [SEVRER] → Démarrage1 → [PASSER D2] → Démarrage2 → Croissance → Finition
                                  ↑
                          choix bâtiment dispo
                          + cascade auto (statut, alerte, stock)
```

## OBJECTIF
Produire UN seul fichier : `/root/projects/smartfarm/agents/sprint-s4/RAPPORT_S4_AUDIT.md` ≤ 8 KB

Le rapport DOIT couvrir 5 sections :

### 1. Cartographie navigation actuelle
- Liste des 15 entrées sidebar.tsx + 5 bottom-nav.tsx + 15 mobile-drawer.tsx
- Identification doublons (sidebar/drawer probablement identiques)
- Routes orphelines (page.tsx existe mais pas dans sidebar) : ex `/calendrier`, `/conseiller`, `/onboarding`, `/actions-rapides`, `/performances` (vs `/kpi`?)

### 2. Migration sidebar/drawer/bottom-nav (suite décisions)
Tableau cible final avec 10-12 entrées max. Format :
| Pos | Label | Href | Group | Action |
|---|---|---|---|---|

Plus : liste des fichiers à toucher (sidebar.tsx, mobile-drawer.tsx, bottom-nav.tsx).

### 3. Audit cascades métier actuelles
Pour CHAQUE action critique, indique ce qui se passe AUJOURD'HUI dans le code (intact, non-câblé, partiel) :
- **Sevrage** : cherche `_dialog-sevrage.tsx`, `sevrage` dans `*_actions.ts` → décrit le flux actuel
- **Saillie** : cherche dialog + action → flux actuel
- **Mise bas** : cherche dialog + action → flux actuel
- **Transition stade porcelets** : `_actions.ts` cheptel → flux actuel (UI existante ou pas ?)
- **Pesée** : cherche dialog + déclenche alerte ou pas ?
- **Mort/réforme animal** : cherche action + cascade stock/effectif ou pas ?

Verdict par cascade : ✅ complet · 🟡 partiel · ❌ absent

### 4. Recherche globale par boucle
- Existe-t-il déjà un composant `<GlobalSearch>` / `<CommandPalette>` / search top-bar ?
- Quel layout (`app-shell.tsx` ? `layout.tsx` ?) accueillerait le champ recherche ?
- Estimer effort (composant Cmd+K shadcn dispo ? RPC Supabase pour fuzzy search tag ?)

### 5. Plan d'attaque Phase 3
Recommander 3-4 lanes pour exécution parallèle, chaque lane :
- Périmètre fichiers (pour éviter conflits)
- Effort estimé (min)
- Dépendances entre lanes (si lane B dépend de lane A → série pas parallèle)

## MÉTHODE
1. `grep -rn "from('animaux'\|sevrage\|portee\|transition\|mise.bas" --include="*.ts" --include="*.tsx" app/src/app -l | head -30`
2. Lire le contenu CIBLÉ des dialogs/actions critiques (max 8 reads de fichiers, pas exhaustif)
3. `ls app/src/app/(app)/*/` pour voir les routes
4. `grep -n "href:" components/sidebar.tsx components/mobile-drawer.tsx components/bottom-nav.tsx`
5. Pour `/bandes` : `grep -rn "/bandes\b\|from('bandes')" --include="*.ts" --include="*.tsx" app/src` → compter les références (impact de la purge)

## LIVRABLE
1 fichier : `/root/projects/smartfarm/agents/sprint-s4/RAPPORT_S4_AUDIT.md` (≤ 8 KB, télégraphique)

Le rapport DOIT permettre à l'orchestrateur de :
- Décider sans relire les fichiers
- Briefer les sous-agents producteurs avec des lignes exactes à modifier
- Anticiper les conflits parallélisation

## INTERDICTIONS
- ❌ Modifier le moindre fichier source (audit pur)
- ❌ `npm run build`, `git commit`
- ❌ Inventer des cascades qui n'existent pas — chaque verdict ✅/🟡/❌ DOIT citer un fichier + ligne
- ❌ Plus de 10 reads de fichiers (audit, pas review)
- ❌ Rapport > 8 KB (densité > exhaustivité)
- ❌ Vision_analyze (texte uniquement)
- ❌ Plus de 25 min total

## CRITÈRES SUCCÈS
- 5 sections livrées
- Tableau migration sidebar cible avec 10-12 entrées
- ≥3 cascades auditées avec verdict + preuve (path:ligne)
- Plan 3-4 lanes prêt à briefer

Go.
