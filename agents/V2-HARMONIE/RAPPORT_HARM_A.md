# RAPPORT HARM-A — Sidebar simplifiée + hub sanitaire + redirects

**Agent** : HARM-A (V2-HARMONIE)
**Date** : 22 mai 2026
**Statut** : ✅ Terminé — TypeScript `tsc --noEmit` clean (0 erreur)

## Fichiers modifiés (6)

| Fichier | Action |
|---|---|
| `src/components/sidebar.tsx` | Refonte nav : 5 groupes / 14 items (cf. note) |
| `src/components/mobile-drawer.tsx` | Aligné 1:1 sur sidebar |
| `src/components/bottom-nav.tsx` | **Inchangé** — déjà conforme au brief (5 slots) |
| `src/middleware.ts` | `/eau` retiré, `/ppa` ajouté (6 alias actifs) |
| `src/app/(app)/sanitaire/page.tsx` | Refonte complète → hub 6 cards + KPI alertes santé |
| `src/app/(app)/sanitaire/eau/page.tsx` | Redirect server vers `/sanitaire` |

## Architecture finale de la navigation (sidebar + drawer)

| Groupe | Items |
|---|---|
| **Pilotage** (3) | Tableau de bord, Alertes, Performances |
| **Élevage** (5) | Cheptel, Bandes, Bâtiments, Reproduction, Mises bas |
| **Santé** (2) | Sanitaire (hub), PPA |
| **Logistique** (2) | Alimentation, Stock |
| **Système** (2) | Assistant, Paramètres |

**Total : 5 groupes / 14 items** (suit la table explicite du brief).

⚠️ Le titre du brief dit "11 menus" mais la table énumère bien 14 entrées (3+5+2+2+2). J'ai suivi la table (source de vérité plus précise). Si Christophe préfère vraiment 11, candidats à fusionner : Performances→Tableau de bord, Bâtiments→Cheptel, PPA→hub Sanitaire seulement.

## Items retirés de la navigation (URL toujours accessibles)

- `/actions-rapides`, `/pesees`, `/calendrier`, `/conseiller`
- `/sanitaire/calendrier`, `/sanitaire/biosecurite`, `/sanitaire/mycotoxines`, `/sanitaire/maladies`, `/sanitaire/protocoles` (toutes dans le hub)
- `/sanitaire/eau` → désactivée (redirect server vers `/sanitaire`)

## Hub `/sanitaire` — 6 cards

1. **Calendrier sanitaire** → `/sanitaire/calendrier`
2. **PPA — Surveillance** (badge `OBLIGATOIRE` rouge) → `/sanitaire/ppa`
3. **Biosécurité** → `/sanitaire/biosecurite`
4. **Mycotoxines** (badge `Saison pluies` ocre) → `/sanitaire/mycotoxines`
5. **Maladies** (`MALADIES_PORCINES.length` fiches) → `/sanitaire/maladies`
6. **Protocoles vaccinaux** (`COUNT actif=true`) → `/sanitaire/protocoles`

+ Sous-titre KPI : `N alerte(s) sanitaire(s) active(s)` (R06, R12, R13, R17, R18, R23, R24, R25).

## Middleware redirects (308 permanent)

```
/biosecurite          → /sanitaire/biosecurite
/mycotoxines          → /sanitaire/mycotoxines
/calendrier-sanitaire → /sanitaire/calendrier
/protocoles           → /sanitaire/protocoles
/maladies             → /sanitaire/maladies
/ppa                  → /sanitaire/ppa   [NOUVEAU]
```
`/eau` **supprimé** (page eau désactivée).

## Adaptations vs brief

- Brief proposait `sb.from('maladies').select(count)` → table `maladies` **n'existe pas** en DB (vérifié `information_schema`). Remplacé par `MALADIES_PORCINES.length` (constante TS dans `@/lib/maladies-porcines`, source utilisée par la page `/sanitaire/maladies` existante).
- `Metadata` importé via `import type` (Next 16 best practice).
- `bottom-nav.tsx` non touché : il était déjà conforme.

## Vérifications

- `tsc --noEmit -p tsconfig.json` → **0 erreur** sur tout le projet.
- Pas de build lancé (règle dure CONTEXT.md).
- Page `/sanitaire/ppa` non créée ici (scope HARM-B). Lien présent dans sidebar + hub : retournera 404 tant que HARM-B n'a pas livré.

## Dépendances cross-agent

- HARM-B doit créer `/sanitaire/ppa` (page + éventuelle table `surveillance_ppa`) sinon lien mort dans sidebar/hub/middleware.
- Files orphelins conservés (peuvent être nettoyés en V3) : `_dialogs-sanitaire.tsx`, `_components/sanitaire-stats.tsx`, `_dialog-eau.tsx`.
