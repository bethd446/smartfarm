# RAPPORT D1-L2 — Harmoniser Performances (KPI)

## Périmètre traité
- `app/src/app/(app)/performances/economique/page.tsx`
- `app/src/app/(app)/performances/croissance/page.tsx`

Charts NON touchés : `economique/_charts.tsx` (`EconomiqueCharts`), `croissance/_chart.tsx` (`CroissanceChart`). Aucun `ui/*` modifié.

## Diagnostic AVANT
Anti-pattern **hero-metric template** présent sur les 2 pages : grid `md:grid-cols-3` de 3 `<Card>` chacune avec un gros chiffre isolé (`text-4xl/text-3xl font-black`), label eyebrow et accent couleur. Cliché SaaS visé par DESIGN.md (Anti-patterns).
Pas de gradient ni side-stripe préexistant (V2 = 0 avant comme après).

## Fix appliqué
Grid de cards hero-metric remplacé par une **section dense tabulaire** alignée sur le registre validé `batiments/page.tsx` :
- `<section className="border-t-2">` filet primary + eyebrow Big Shoulders de section.
- `<dl>` : une ligne `<div>` par KPI, hairline `border-t border-[var(--sf-line)]`.
- `<dt>` libellé eyebrow 11px Big Shoulders + sous-libellé contexte (sf-subtle).
- `<dd>` valeur `font-mono font-bold tabular-nums text-lg`, unité toujours affichée en suffixe normal/muted (XOF/kg, FCFA, g/j, %).
- Plus aucun `text-4xl/text-3xl font-black` décoratif isolé.
- Tones conservés via `getToneColor()` sur la valeur (couleur sémantique, pas gradient).

## KPI — AVANT == APRÈS (100% préservés)

### economique (3 KPI)
| KPI | Valeur | Unité | Contexte conservé |
|---|---|---|---|
| Coût aliment par kg vif produit | `Math.round(coutAlimentParKgVif)` | XOF/kg | seuils good/warn/bad + tone |
| Coût total aliment période | `fmtXOF(coutTotalAliment)` | FCFA | nb consommations |
| Marge brute estimée | `fmtXOF(margeEstimee)` | FCFA | CA − coûts, tone primary/danger |

Charts : bar coûts/bande + pie répartition (`EconomiqueCharts coutParBande repartitionCouts`) intacts.
Tableau mensuel 12 mois (`ResponsiveTable`) intact. Empty state intact. Sélecteur période intact.

### croissance (3 KPI)
| KPI | Valeur | Unité | Contexte conservé |
|---|---|---|---|
| GMQ moyen ferme | `Math.round(gmqMoyenFerme)` | g/j | n animaux |
| GMQ référentiel LT-CI | `Math.round(gmqRefMoyen)` | g/j | moyenne J0→J180 |
| Écart vs référentiel | `fmtNum(ecartPct,1)` (signe +/−) | % | tone good/warn/bad |

Chart courbe (`CroissanceChart referentiel reel bandes`) intact. Tableau par stade (`ResponsiveTable` + `Badge`) intact.

## VÉRIFS (sorties réelles)

### V1 — imports charts préservés (AVANT == APRÈS)
```
economique  grep -cE 'import.*hart|_chart|_charts' = 1  → 9:import { EconomiqueCharts } from './_charts'
croissance  grep -cE 'import.*hart|_chart|_charts' = 1  → 8:import { CroissanceChart } from './_chart'
```
Usages props inchangés :
```
economique:382  <EconomiqueCharts coutParBande={coutParBande} repartitionCouts={repartitionCouts} />
croissance:239  <CroissanceChart referentiel={referentiel} reel={reel} bandes={...} />
```

### V2 — anti-patterns (linear-gradient | background-clip text | border-l-[2-9] | instrument serif)
```
economique → MATCHES=0
croissance → MATCHES=0
```

### V3 — registre dense (équilibre balises)
```
ECO: section 1/1 | dl 1/1 | dt 3/3 | dd 3/3   (3 KPI)
CRO: section 1/1 | dl 1/1 | dt 3/3 | dd 3/3   (3 KPI)
```
`text-4xl font-black` restant : uniquement le **H1 header** de page (eco:266, cro:222) — titre app conforme, pas un hero-metric KPI. Aucun gros chiffre décoratif isolé restant.

## Garde-fous respectés
- Registre APP : Big Shoulders eyebrow + Instrument Sans + tabular-nums. Pas d'Instrument Serif.
- Tokens `--sf-*` only. Unités toujours affichées. Format FR via `fmtXOF` (Intl fr-CI, espace fine).
- Data + charts 100% préservés. Mobile-first (flex justify-between, hairlines, pas de grid figé).
- Pas de side-stripe / glassmorphism / gradient / gradient-text.

## Note hors-périmètre (non implémentée)
`economique/page.tsx` importe `Badge` (ligne 4) **jamais utilisé** — import mort PRÉEXISTANT (déjà inutilisé avant ce sprint, aucun `<Badge>` dans la page). Hors mission hero-metric, non touché. Suggestion : le supprimer dans un futur passage lint.

## INTERDITS respectés
Pas de build/tsc/commit/push. Pas de modif `_chart.tsx`/`_charts.tsx`/`ui/*`. Aucun KPI/chart/data perdu.
