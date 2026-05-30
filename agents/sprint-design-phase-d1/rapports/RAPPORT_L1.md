# RAPPORT D1-L1 — Hub Sanitaire

## Fichiers touchés (périmètre respecté)
- `app/src/app/(app)/sanitaire/page.tsx`
- `app/src/app/(app)/sanitaire/_components/sanitaire-stats.tsx`

Aucun `ui/*`, aucune sous-page sanitaire, aucun autre fichier. Pas de build/tsc/commit/push.

## AVANT / APRÈS

### sanitaire-stats.tsx
- **AVANT** : 4 KPI cards (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`),
  chacune `<Card><CardContent p-5>` avec chiffre `text-3xl` hero-metric isolé.
  Anti-pattern DESIGN.md (hero-metric template + card grids identiques).
- **APRÈS** : bandeau registre dense unique — `<section>` filet haut `border-t-2`
  primary (style batiments) + grille 2 cols mobile / 4 cols desktop séparée par
  **hairlines** (`border-l`/`border-t` `--sf-line`), valeurs `tabular-nums`, tons
  sémantiques portés par icône + couleur de valeur (primary/danger/warning/info),
  plus de fond de card coloré, chiffre ramené `text-2xl`. `Card/CardContent` retirés
  au profit de divs+hairlines (autorisé par le brief).
- **Data** : 8 champs `getSanitaireStats` conservés à 100 % (couvertureVaccinalePct,
  couvertureLabel, tauxMortalite30jPct, morts30j, effectifMoyen, actesEnRetard,
  topCauseMortalite, topCauseMortaliteCount) + logique tone intacte. `getSanitaireStats()`
  non modifié.

### sanitaire/page.tsx
- **AVANT** : 7 modules de nav en `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`,
  chacun une `<Card hover:shadow-lg>` identique -> monotonie (anti-pattern card grids).
- **APRÈS** : registre liste dense hairline (pattern batiments) — `border-t-2` primary,
  `<ul>` de `<li border-b --sf-line>`, chaque ligne : numérotation `01..07`
  (`tabular-nums`, Big Shoulders) + icône + titre + badge tonal + desc + `ChevronRight`.
  Cible `min-h-[56px]` (>=44px), hover `--sf-surface-1`, focus-visible ring primary.
  `Card/CardHeader/CardDescription` retirés. Header KPI alertes + `<SanitaireFab>` inchangés.
- **Liens** : 7 hrefs préservés (data array : calendrier, ppa, biosecurite, mycotoxines,
  maladies, protocoles, actes), rendus via `href={m.href}`. Badges OBLIGATOIRE(danger)
  + Saison pluies(warning) conservés.

## Registre / typo
- Big Shoulders (`--sf-font-display`) sur titres/eyebrows/numéros ; Instrument Sans
  (`--sf-font-body`) sur descriptions ; `tabular-nums` sur tous les chiffres.
- 0 Instrument Serif. Tokens `--sf-*` uniquement. Mobile-first (2 cols stats, liste pleine largeur).

## VÉRIFS (sorties réelles)

VÉRIF 1 — `grep -c "href=" page.tsx` :
```
AVANT = 1
APRÈS = 1   (égal — un seul littéral href={m.href} dans le .map ; 7 modules rendus)
```
Contrôle complémentaire : 7 entrées `href: '/sanitaire/...'` dans le tableau modules (avant=après).

VÉRIF 2 — data stats préservée :
```
brief tokens (actesCount|protocolesCount|alertesActives) = 0   (AVANT et APRÈS — voir divergence #1)
data RÉELLE (couvertureVaccinalePct|tauxMortalite30jPct|actesEnRetard|topCauseMortalite) = 4
8/8 champs getSanitaireStats présents — 0 manquant
```

VÉRIF 3 — `grep -i "instrument serif|sf-font-editorial|border-l-[2-9]|backdrop-blur|linear-gradient"` (2 fichiers) :
```
page.tsx:0   sanitaire-stats.tsx:0   total=0
```

Contrôles structurels (python) : parenthèses/accolades/crochets équilibrés sur les 2
fichiers, 0 ref `CardHeader/CardContent/CardDescription` résiduelle, import `ui/card`
retiré des 2 fichiers, 4 `value:` + 4 `sub:` dans stats, ChevronRight + SanitaireFab présents.

## DIVERGENCES BRIEF ↔ CODE RÉEL (non-bloquantes, traitées sans inventer de data)
1. **Vérif #2 du brief erronée** : les tokens `actesCount/protocolesCount/alertesActives`
   n'existent PAS dans `sanitaire-stats.tsx` (= 0 avant comme après). La data réelle est
   couverture vaccinale / mortalité 30j / actes en retard / top cause mortalité (lue dans
   `calendrier/_queries.ts`, type `SanitaireStatsData`). J'ai préservé la data RÉELLE, pas
   celle du brief.
2. **`sanitaire-stats.tsx` est orphelin** : importé nulle part (0 importeur, vérifié grep
   récursif). `page.tsx` n'affiche PAS de KPI cards — juste 1 KPI texte "alerte(s) active(s)"
   dans le header. Composant harmonisé quand même (dans le périmètre) mais non rendu sur le
   hub actuel. À décider hors périmètre : le brancher ou le supprimer.
3. **Brief : "hub 6 cards" / "page 220 l" / "stats 243 l"** : réalité = 7 modules, page 165 l,
   stats 169 l, et page.tsx n'importe pas SanitaireStats. Harmonisation faite sur l'état réel.
4. **Incident outil** : le 1er Write de stats a produit un fichier corrompu (lignes dupliquées
   `const stats.couvertureLabel,`). Fichier supprimé puis réécrit proprement (123 l, 0 garbage,
   balances OK). État final vérifié.

## NON FAIT (respect interdits)
Pas de `npm run build`, `tsc`, commit, push. Validation visuelle Playwright/DevTools non
exécutée (hors périmètre lane). Recommandée avant merge.
