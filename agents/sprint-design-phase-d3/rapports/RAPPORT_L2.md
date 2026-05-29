# RAPPORT_L2 — mortalités/page.tsx (D3 vague 1)

Statut : DONE. Fichier touché : `app/src/app/(app)/mortalites/page.tsx` (458 l → 507 l). Aucun autre fichier.

## AVANT / APRÈS par bloc

| Bloc | AVANT | APRÈS |
|---|---|---|
| Header | `PageTitle eyebrow="ÉLEVAGE"` + Skull (déjà Pattern E) + `<p>` compteur prose. | Pattern E préservé. Compteur dans `<span tabular-nums font-semibold>` (chiffre tonifié). |
| KPI | 3× `<Card>` grid `text-3xl font-black` (YTD, Mois courant, Top 3 motifs avec barres %). | 1× `<section>` bandeau dense (Pattern A) `border-t-2` ton `--sf-danger-ink`, 3 cellules hairline : TrendingDown YTD · (Calendar/AlertTriangle) Mois (ton danger + `role="alert"` si ≥5) · Skull Motif #1 (label motif strict via `MOTIF_LABELS`). |
| Filtres | `<Card><CardContent>` + form GET. | Form GET nu, bandeau hairline `border-t border-b`, labels Big Shoulders 10px tracking 0.16em, contrôles `h-11` (≥44px). |
| Tableau | `<Card><CardHeader><CardTitle>Historique (N)</CardTitle>` + `<thead bg-muted/40>` + ligne date `toLocaleDateString('fr-FR')`. | `<h2>` Big Shoulders + Pattern C : `border-t-2 ton --sf-danger-ink`, `<thead>` hairline `--sf-line` + Big Shoulders 11px tracking 0.1em uppercase. Cellule Date : `<RelativeTime date=… addSuffix />`. Animal : nom en `font-medium`, tag en `font-mono text-subtle` (= Pattern reproduction). |
| Pagination | `<a>` underline. | `<a>` underline + `min-h-[44px] flex items-center` (cibles gants). |

## Data préservée (grep AVANT vs APRÈS)

| Grep | AVANT | APRÈS | Attendu |
|---|---|---|---|
| `href=` | 3 | 3 | == baseline |
| `DialogMortalite` | 2 | 2 | == baseline |
| `toLocaleDateString\|toLocaleString\|formatDistanceToNow` | 1 | 0 | 0 |
| `RelativeTime` | 0 | 2 | ≥1 |
| `linear-gradient\|backdrop-blur\|border-l-[2-9]\|instrument.serif\|font-editorial` | 0 | 0 | 0 |
| `<Card\|CardContent\|CardHeader\|CardTitle` | 18 | 0 | 0 (purgé) |
| `<Card>` import | 1 | 0 | retiré |

Calculs (kpiYtd, kpiMonth, motifCounts, topMotifs), requêtes Supabase, options dialog (animaux, bandes), pagination, filtres : **inchangés**. Vocabulaire motif via `MOTIF_LABELS[m.motif]` (strict, non reformulé). Texte spécial `'autre' + motif_libre` conservé tel quel.

## Imports

- Retirés : `Card, CardContent, CardHeader, CardTitle` (Card devenu inutilisé).
- Ajoutés : `RelativeTime` (`@/components/ui/relative-time`), `Calendar`, `TrendingDown`, `AlertTriangle` (lucide-react) pour les icônes des cellules KPI.

## Divergences vs plan

1. **3 cellules KPI au lieu de 2** : le plan parlait de « 2 gros chiffres (taux mortalité 30 j, etc.) » — le fichier réel n'a pas de calcul de taux 30 j, il a YTD + Mois courant + Top 3 motifs (avec barres). J'ai compacté ces 3 indicateurs en 3 cellules dense plutôt que d'inventer un calcul taux. Le "Top 3" devient "Motif #1" dans la cellule (motif majoritaire YTD + count) — lisible en un coup d'œil, dense, respecte le vocabulaire motif strict. Les barres % du Top-3 disparaissent (visuel rich incompatible registre dense).
2. **Pas de calcul taux mortalité 30 j ajouté** : le plan suggérait « conserver le calcul du taux et son ton » mais aucun taux n'est calculé dans le code actuel. Aucun nouveau calcul ajouté (règle anti-hallucination). Le ton danger est porté par la cellule "Mois courant" via seuil `kpiMonth >= 5` (`monthCritical`) → `--sf-danger-ink` + `role="alert"`. Seuil arbitraire 5 — à valider métier si nécessaire.
3. **Card filtres dénudé** : le filtre form GET sortait du registre s'il restait dans une `<Card>`, je l'ai converti en bandeau hairline `border-t border-b` aligné Pattern A/C.
4. **Compteur `<Card>` baseline = 18** (grep) vs spec qui annonçait 28 — la spec comptait probablement les variants Card+CardContent+CardHeader+CardTitle séparément. Tous purgés (== 0).

## Garde-fous respectés

- Tokens `--sf-*` uniquement (aucune couleur brute).
- Big Shoulders sur titres / eyebrows / labels chiffrés ; `tabular-nums` sur tous les chiffres.
- 0 `linear-gradient`, `backdrop-blur`, `border-l-[2-9]`, Instrument Serif, `font-editorial`.
- Cibles ≥ 44 px (`h-11` inputs, `min-h-[44px]` pagination + reset + bouton Filtrer, `h-12` trigger).
- `focus-visible` héritage des composants `Button` / `<a>` (pas explicitement ajouté sur `<a>` pagination — héritera de l'arborescence app si nécessaire).
- Mobile-first : grid KPI `grid-cols-1 sm:grid-cols-3`, table avec `overflow-x-auto -mx-4 sm:mx-0`.
- 0 fichier hors `page.tsx` touché. 0 commit / build / tsc.

## Fichier rapport

`agents/sprint-design-phase-d3/rapports/RAPPORT_L2.md` (~80 l).
