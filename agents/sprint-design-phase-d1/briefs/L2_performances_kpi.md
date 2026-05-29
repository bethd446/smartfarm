# Brief D1-L2 — Harmoniser Performances (KPI)

## TOI
Dev senior React/Tailwind + data viz. Tu harmonises les 2 pages de performances (économique + croissance) en purgeant les hero-metric templates, sans casser les charts ni la data.

## LIS D'ABORD
1. `CLAUDE.md` (racine)
2. `DESIGN.md` — Anti-patterns (**hero-metric template** : gros chiffre + label + stats + accent = cliché SaaS à éviter), Typography (registre app Big Shoulders), Layout
3. `app/src/app/(app)/performances/economique/page.tsx` (intégral, 156 l)
4. `app/src/app/(app)/performances/croissance/page.tsx` (intégral, 242 l)
5. `app/src/app/(app)/batiments/page.tsx` — RÉFÉRENCE composition dense (tableau de données) validée

## Périmètre
✅ Touche EXACTEMENT :
- `app/src/app/(app)/performances/economique/page.tsx`
- `app/src/app/(app)/performances/croissance/page.tsx`

❌ Touche pas : les fichiers `_chart.tsx`/`_charts.tsx` (composants recharts — laisser intacts), aucun ui/*, tout autre fichier.
❌ Pas build/tsc/commit/push.

## Contexte
Ces pages affichent des KPI (GMQ, IC, coûts, marges…) probablement en gros chiffres "hero-metric". L'anti-pattern : big number isolé + label + accent gradient. Le fix : **tableau de données dense** ou KPI sobres alignés (tabular-nums), cohérents, sans le template SaaS.

⚠️ Les graphiques recharts (`_chart.tsx`/`_charts.tsx`) sont importés — NE les touche PAS, garde leurs props/usages intacts.

## Mission
Pour chaque page :
1. Lis et comprends le fetch réel + les KPI affichés + les charts importés.
2. Remplace les hero-metric isolés par une présentation dense/tabulaire : valeurs alignées tabular-nums, unités, libellés Big Shoulders eyebrow, séparateurs hairline. Pas de gros chiffre décoratif isolé avec accent gradient.
3. PRÉSERVE : tous les KPI calculés, les charts (mêmes props), les liens, la data.

## Garde-fous
- Registre APP INTERNE : Big Shoulders, Instrument Sans, tabular-nums. PAS d'Instrument Serif.
- Tokens `--sf-*` only. Toujours afficher l'unité (kg, %, FCFA, j). Format FR (`1 250 000 FCFA`).
- Data 100% préservée. Charts intacts.
- Pas de side-stripe/glassmorphism/gradient. Pas de gradient-text.
- Mobile-first.

## VÉRIFS (sorties réelles dans rapport)
1. `grep -c "import.*hart\|_chart\|_charts" <2 fichiers>` → imports charts préservés (AVANT==APRÈS)
2. `grep -i "linear-gradient\|background-clip.*text\|border-l-[2-9]\|instrument serif" <2 fichiers>` → 0
3. Liste les KPI affichés AVANT et confirme qu'ils sont tous APRÈS

## LIVRABLE
`agents/sprint-design-phase-d1/rapports/RAPPORT_L2.md` (≤90 lignes).

## INTERDITS
- ❌ Toucher _chart.tsx/_charts.tsx ou ui/*
- ❌ Perdre un KPI, un chart, une data
- ❌ Instrument Serif · gradient-text · hero-metric template
- ❌ Build/tsc/commit/push · Rapport > 90 lignes

Go.
