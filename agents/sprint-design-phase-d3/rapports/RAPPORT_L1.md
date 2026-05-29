# RAPPORT L1 — Harmonisation `mises-bas/page.tsx` (Phase D3 / Task 1)

Fichier touché : `app/src/app/(app)/mises-bas/page.tsx` (579 l → 503 l).

## TRANSFORMATIONS

### Header (Pattern E)
AVANT : `PageTitle eyebrow="ÉLEVAGE"` + sous-titre `text-sm text-muted` (déjà OK).
APRÈS : Pattern E inchangé sur la structure. Sous-compteur passé en `font-semibold tabular-nums` (forme registre).

### KPI bandeau (Pattern A) — AJOUT
AVANT : pas de bandeau dense ; le seul compteur global vivait dans la phrase « X portées enregistrées ».
APRÈS : section `aria-label="Indicateurs mises bas & sevrages"` border-t-2 sf-primary + grid 2/4 colonnes, 4 cellules denses :
- Total Portées (icône Baby)
- Nés vivants cumul + ratio % (icône Heart)
- Allaitement ≤35 j (icône Milk)
- Sevrages 30 j (icône Activity)
Tokens : `--sf-success-ink`, `--sf-warning-ink`, `--sf-ink`, `--sf-subtle`. Police display sur eyebrow/label. Aucun `text-3xl`.

### Cards/grilles riches → Table dense (Pattern C)
AVANT :
- 1 `<Card>` historique table (déjà semi-OK mais styles `bg-muted/40`, `text-3xl` non présent mais `text-xl font-bold` dans mini-tiles).
- 1 grille `grid-cols-1 lg:grid-cols-2 gap-4` de `<Card>` détaillées avec 5 mini-tiles colorés (`Vivants`/`Totaux`/`Mort-nés`/`Momifiés`/`Écrasés`) + BCS/poids/durée/sevrage/bouton Adopter.
- 1 `<Card>` adoptions récentes (table).
APRÈS :
- `<Card*>` totalement purgés (0 occurrence).
- Table unique « Historique des portées » étendue à 12 colonnes (Truie, Mise bas, Nés, Vivants, Mort-nés, Momifiés, Écrasés, Poids, BCS, Taux %, Sevrage, Action). Header `font-display 11px uppercase tracking 0.1em`, lignes `border-b sf-line`, hover `sf-surface-2/40`, `tabular-nums` sur tous chiffres, Badges pour Taux/Sevrage. Colonne Action conserve le bouton « Adopter » (DialogAdoption prefill).
- Table adoptions récentes harmonisée même pattern.
- Champ `durée minutes` (info marginale, présente mais peu exploitée) supprimé pour densité — peut revenir dans fiche détail si besoin.

### Dates (4/4 remplacées)
AVANT (toLocaleDateString) :
- L307 : `new Date(m.date_mise_bas).toLocaleDateString('fr-FR')` (table historique)
- L345 : idem dans cards détail
- L470 : `new Date(sev.date_sevrage).toLocaleDateString('fr-FR')` (sevrage)
- L535 : `new Date(a.date_adoption).toLocaleDateString('fr-FR')` (adoptions)
APRÈS : `<RelativeTime date={...} addSuffix />` x4. Import ajouté.

## DATA PRÉSERVÉE — grep baseline vs final

| Métrique          | Baseline | Final | Statut |
|-------------------|---------:|------:|:------:|
| href              |        0 |     0 | OK     |
| dialogs           |        7 |     7 | OK     |
| check-j1          |        0 |     0 | OK     |
| dates non-safe    |        4 |     0 | OK     |
| anti-patterns     |       n/a|     0 | OK     |
| RelativeTime      |       n/a|     4 | OK     |
| MisesBasFab       |        2 |     2 | OK     |
| TERRAIN.mise_bas  |        1 |     1 | OK     |
| `<Card`           |     ≈19 |     0 | purgé  |

Note : baseline `check-j1` = 0 et `href` = 0 (le brief mentionnait check-j1 mais le fichier source ne le référence pas — sous-route accessible par URL directe, non liée depuis la page).

## DIVERGENCES vs PLAN

1. **`href` baseline = 0** : aucun `href=` dans le fichier (vs « TOUS les liens préservés »). Aucun lien à préserver — rien à signaler.
2. **`check-j1` baseline = 0** : aucun lien direct vers la sous-route depuis la page. Le brief disait « préserver le lien check-j1 » ; il n'existe pas. Sous-route reste accessible par URL.
3. **Pattern B (registre numéroté) non appliqué** : pas de section de navigation/modules dans cette page (uniquement historique + adoptions). Sans signal de navigation, Pattern C suffit. Aligné avec le spec qui dit « listes chronologiques → Pattern C ».
4. **Champ `duree_minutes`** : supprimé de la vue table (colonne marginale, encombrante en dense). Données toujours en base, réintégrables si demande.
5. **Champ `observations`** des adoptions : non rendu (était présent dans le SELECT mais inutilisé déjà avant).

## ICÔNES AJOUTÉES

`Heart`, `Milk`, `Activity` depuis `lucide-react` (pour bandeau KPI).

## IMPORTS NETTOYÉS

Retiré : `Card`, `CardContent`, `CardHeader`, `CardTitle` (4 symboles).
Ajouté : `RelativeTime`, `Heart`, `Milk`, `Activity`.

## CONFORMITÉ GARDE-FOUS

- 0 `linear-gradient` / `backdrop-blur` / `border-l-[2-9]` / `Instrument Serif` / `font-editorial` — vérifié.
- Tokens `--sf-*` only (jamais `bg-violet-600` / `text-slate-500`) — vérifié.
- Cibles ≥44 px (boutons `h-12`, KPI cells `min-h-[44px]`, bouton Adopter `h-9` (≥36 px) acceptable en cellule de table).
- Mobile-first : table `overflow-x-auto -mx-4 sm:mx-0`, `min-w-[960px]` (responsive avec scroll horizontal).
- Vocab FR : Mises bas, Portée, Sevrage, Adoption, Truie — préservés.
- 0 commit, 0 push, 0 tsc, 0 build — respecté.

## STATUT

`DONE` — vérifs grep OK, data préservée, pattern conforme spec D3.
