# RAPPORT D2-L2 — Harmonisation hub Alimentation

## VERDICT
READY. Hub Alimentation harmonisé au registre dense, MÊME traitement que hub Sanitaire (D1-L1).

## FICHIERS TOUCHÉS (2, périmètre exclusif respecté)
- `app/src/app/(app)/alimentation/page.tsx` — modules card grid → registre liste dense numéroté
- `app/src/app/(app)/alimentation/_components/nutrition-stats.tsx` — 4 hero-metric cards (fonds colorés) → bandeau registre dense
- ❌ 0 sous-page touchée · ❌ `_fab.tsx` intact · ❌ `ui/*` intact

## CE QUI A CHANGÉ

### nutrition-stats.tsx (KPI)
- AVANT : `grid` de 4 `<Card>` avec `background: var(--sf-*-bg)` (anti-pattern hero-metric, fonds colorés).
- APRÈS : `<section>` bandeau hairline (`border-t-2` primary + `border-b`), grille `grid-cols-2 lg:grid-cols-4`, séparateurs `border-l`/`border-t` conditionnels — copie exacte du pattern `sanitaire-stats.tsx`.
- Tons sémantiques conservés mais portés par icône+valeur (`tone`), 0 fond de card coloré.
- Valeurs `tabular-nums`, period eyebrow Big Shoulders, label Big Shoulders, sub `--sf-subtle`.
- **Logique de calcul KPI 100% inchangée** (conso/coût/IC/stock — queries, reduce, byBande, best-effort stock identiques).
- **Alerte stock critique <7j préservée** : `stockCritique` → icône `AlertTriangle`, ton `--sf-danger-ink`, period "critique", `role="alert" aria-live="polite"`.
- Import `Card`/`CardContent` retiré (plus d'orphelin).

### page.tsx (modules)
- AVANT : `grid md:grid-cols-2 lg:grid-cols-3` de 6 `<Card>` identiques.
- APRÈS : registre `<section>` + `<ul>` liste dense numérotée 01–06 (`padStart(2,'0')`, Big Shoulders), `min-h-[56px]`, icône + titre Big Shoulders + description Instrument Sans `line-clamp` + `ChevronRight` — copie exacte du pattern `sanitaire/page.tsx`.
- Titre section "Modules alimentation" (style identique "Modules sanitaires").
- Import `Card`/`CardContent` retiré.
- En-tête `PageTitle`, `<NutritionStats />`, `<AlimentationFab />` intacts.

## DATA / NAV PRÉSERVÉES
- 6 hrefs intacts : matieres, concentres, formulation, plans, consommations, matieres-prix.
- `grep -c "href:" page.tsx` = 7 (1 type + 6 routes) — inchangé.
- KPI : conso 30j / coût 30j / IC moyen / stock j restants — calcul identique, rendu seul modifié.
- Badges contextuels : aucun n'existait dans la page (NAV_CARDS sans badge). Aucun inventé (anti-hallucination). Le modèle sanitaire prévoit le slot badge ; ici `null` partout faute de data réelle.

## VÉRIFICATIONS (exécutées)
```
grep -c "href:" page.tsx                       → 7 (préservé)
grep -oE "/alimentation/[a-z-]+'" page.tsx     → 6 routes (toutes présentes)
grep -niE "linear-gradient|backdrop-blur|border-l-[2-9]|instrument.serif|font-editorial" page.tsx           → 0
grep -niE "...même regex..." _components/nutrition-stats.tsx → 0
grep -c "min-h-[56px]" page.tsx                → 1 (registre modules)
grep -c "padStart" page.tsx                    → 1 (numérotation 01..06)
imports Card orphelins                          → 0 (les 2 fichiers)
icônes importées nutrition-stats                → toutes utilisées
```

## GARDE-FOUS RESPECTÉS
- 0 gradient / glassmorphism / side-stripe / backdrop-blur.
- 0 Instrument Serif / font-editorial.
- Tokens `--sf-*` partout · `tabular-nums` sur chiffres · mobile-first · cibles ≥44px (KPI `min-h-[44px]`, modules `min-h-[56px]`).
- Cohérence visuelle stricte avec hub Sanitaire D1.

## NON FAIT (par consigne)
- Pas de `tsc` / `npm run build` / commit / push.

## NOTE
- Le brief annonçait "5 modules" ; le hub en a **6** (Historique prix matières inclus). Numéroté 01–06, les 6 hrefs préservés.
