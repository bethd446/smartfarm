# Brief D1-L3 — Harmoniser Alertes

## TOI
Dev senior React/Tailwind. Tu harmonises la page alertes + sa card en liste dense hiérarchisée, sans casser data/liens/severité.

## LIS D'ABORD
1. `CLAUDE.md` (racine)
2. `DESIGN.md` — Anti-patterns (card grids identiques), Typography (registre app), Layout, hiérarchie d'alertes à 3 niveaux PAR FORME pas que couleur
3. `app/src/app/(app)/alertes/page.tsx` (intégral, 156 l)
4. `app/src/app/(app)/alertes/_components/alerte-card.tsx` (intégral, 116 l)
5. `app/src/app/(app)/conseiller/page.tsx` — RÉFÉRENCE liste éditoriale numérotée + hairlines validée (registre app)

## Périmètre
✅ Touche EXACTEMENT :
- `app/src/app/(app)/alertes/page.tsx`
- `app/src/app/(app)/alertes/_components/alerte-card.tsx`

❌ Touche pas : `alertes/_components/alertes-list.tsx`, `relative-time.tsx`, `dialog-alerte-manuelle.tsx`, aucun ui/*, tout autre fichier.
❌ Pas build/tsc/commit/push.

## Contexte
- `alerte-card.tsx` : card d'alerte (severite dot critique/elevee/moyenne/faible, titre, description, RelativeTime, lien). Props : `{id, titre, description, severite, type_alerte, cible_nom, created_at, lien}`.
- `alertes/page.tsx` : liste/grille d'AlerteCard.

⚠️ Si tu modifies les PROPS de AlerteCard, vérifie que `page.tsx` (et alertes-list.tsx si tu peux le lire en read-only) passent les mêmes. Préfère garder l'API AlerteCard stable.

## Mission
1. **alerte-card.tsx** : densifier la card en ligne d'alerte sobre — severité par dot + forme (cf charte : critique=plein, élevée/moyenne=contour), titre Big Shoulders, description line-clamp, RelativeTime, chevron si lien. Moins "card", plus "ligne de registre dense".
2. **alertes/page.tsx** : si c'est une grille de cards identiques, passer en liste dense avec hairlines (façon conseiller). Préserver filtres/tri/severité/pagination éventuels.

## Garde-fous
- Registre APP INTERNE : Big Shoulders, Instrument Sans, tabular-nums. PAS d'Instrument Serif.
- Tokens `--sf-*` only. Cibles ≥44px. Mobile-first.
- Severité préservée (les 4 niveaux + leur sémantique couleur/forme).
- Data/liens 100% préservés. RelativeTime conservé (hydration-safe, cf charte règle 10).
- Pas de side-stripe (utilise dot/forme, pas border-l épais), glassmorphism, gradient.

## VÉRIFS (sorties réelles dans rapport)
1. `grep -c "href=\|lien" app/src/app/\(app\)/alertes/page.tsx app/src/app/\(app\)/alertes/_components/alerte-card.tsx` → liens préservés
2. `grep -c "critique\|elevee\|moyenne\|faible" alerte-card.tsx` → 4 severités préservées
3. `grep -i "instrument serif\|border-l-[2-9]\|backdrop-blur\|linear-gradient" <2 fichiers>` → 0
4. Si props AlerteCard changées : documente + confirme que page.tsx passe les bonnes

## LIVRABLE
`agents/sprint-design-phase-d1/rapports/RAPPORT_L3.md` (≤90 lignes).

## INTERDITS
- ❌ Toucher alertes-list.tsx/relative-time.tsx/dialog-alerte-manuelle.tsx/ui/*
- ❌ Perdre data/lien/severité
- ❌ Instrument Serif · side-stripe · gradient
- ❌ Build/tsc/commit/push · Rapport > 90 lignes

Go.
