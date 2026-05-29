# Brief D2-L2 — Harmoniser Alimentation (hub)

## TOI
Dev senior React/Tailwind. Tu harmonises le hub Alimentation au registre app dense (doctrine DESIGN.md), sans casser data/nav/KPI.

## PÉRIMÈTRE EXCLUSIF
✅ Touche :
  - `app/src/app/(app)/alimentation/page.tsx` (136 l — hub : KPI + modules)
  - `app/src/app/(app)/alimentation/_components/nutrition-stats.tsx` (SI anti-pattern hero-metric/card grid)
❌ Touche pas : sous-pages `matieres/` `concentres/` `formulation/` `plans/` `consommations/` `matieres-prix/`, `_fab.tsx`, `ui/*`
❌ Pas npm run build / tsc / commit / push

## LIS D'ABORD
1. `CLAUDE.md` + `.brain/CONTEXT.md`
2. `DESIGN.md` §195 Anti-patterns (hero-metric, card grids), §180 registre app
3. `app/src/app/(app)/batiments/page.tsx` — pattern référence registre dense hairline
4. `app/src/app/(app)/sanitaire/page.tsx` — **déjà harmonisé en D1** (liste modules numérotée 01-07) = MODÈLE à suivre pour les modules alimentation
5. `app/src/app/(app)/alimentation/page.tsx` + `_components/nutrition-stats.tsx` intégral

## MISSION
Même traitement que le hub Sanitaire (D1-L1) :
- KPI top (CONSO 30J / COÛT 30J / IC MOYEN / STOCK J RESTANTS) : si hero-metric cards isolées → bandeau registre dense (grille hairlines, valeurs `tabular-nums`, unités suffixe, tons par icône+couleur)
- Modules (Matières premières / Concentrés / Formulation / Plans / Consommations) en card grid → **registre liste dense numéroté** (01..05, Big Shoulders + icône + titre + badge contextuel + ChevronRight, `min-h-[56px]`), comme sanitaire
- Préserver tous les hrefs sous-modules + badges contextuels éventuels

## GARDE-FOUS (cadrage prudent)
- **Data 100% préservée** : KPI (conso/coût/IC/stock jours), hrefs modules
- Cohérence avec hub sanitaire déjà harmonisé (même registre liste numérotée)
- Big Shoulders titres/chiffres · Instrument Sans body · `tabular-nums`
- 0 Instrument Serif · tokens `--sf-*` · mobile-first · cibles ≥44px
- 0 gradient / glassmorphism / side-stripe / backdrop-blur
- Si KPI "STOCK CRITIQUE <7j" rouge existe (Phase A Lane 4) → préserver l'alerte

## VÉRIFICATIONS (rapport)
```bash
grep -c "href=" app/src/app/\(app\)/alimentation/page.tsx     # hrefs préservés
grep -niE "linear-gradient|backdrop-blur|border-l-[2-9]|instrument.serif|font-editorial" page.tsx   # 0
```

## LIVRABLE
1. `alimentation/page.tsx` modifié (+ `nutrition-stats.tsx` si touché)
2. Rapport `agents/sprint-design-phase-d2/rapports/RAPPORT_L2.md` (≤100 lignes caveman)

## ANTI-PIÈGES
- ❌ Ne PAS toucher les 6 sous-pages alim (scope creep)
- ❌ Aligner sur le rendu sanitaire D1 (cohérence hubs)
- ❌ Si `nutrition-stats.tsx` orphelin (importé nulle part) → noter dans rapport, harmoniser quand même
- ❌ Vocab FR strict

Mode caveman. Direct.
