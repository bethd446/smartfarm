# Brief D1-L1 — Harmoniser le hub Sanitaire

## TOI
Dev senior React/Tailwind. Tu harmonises le hub sanitaire (page + bandeau stats) avec la doctrine design, registre app interne, sans casser data/navigation.

## LIS D'ABORD
1. `CLAUDE.md` (racine)
2. `DESIGN.md` — Typography (registre app = Big Shoulders), Anti-patterns (hero-metric template, card grids identiques), Layout, Components
3. `app/src/app/(app)/sanitaire/page.tsx` (intégral, 220 l)
4. `app/src/app/(app)/sanitaire/_components/sanitaire-stats.tsx` (intégral, 243 l)
5. `app/src/app/(app)/batiments/page.tsx` — RÉFÉRENCE de la composition dense déjà validée (registre tabulaire, hairlines, tabular-nums) pour t'en inspirer

## Périmètre
✅ Touche EXACTEMENT :
- `app/src/app/(app)/sanitaire/page.tsx`
- `app/src/app/(app)/sanitaire/_components/sanitaire-stats.tsx`

❌ Touche pas : aucun composant `ui/*` (card.tsx etc.), aucune sous-page sanitaire (maladies, mycotoxines…), tout autre fichier.
❌ Pas build/tsc/commit/push.

## Contexte
- `sanitaire-stats.tsx` : 4 KPI cards (`grid grid-cols-2 lg:grid-cols-4`) icône+label+value+tone. Monotonie + style "hero-metric". Data : actes ce mois, protocoles actifs, alertes actives, maladies suivies.
- `sanitaire/page.tsx` : hub avec cards de navigation vers les sous-modules sanitaires.

## Mission
1. **sanitaire-stats** : transformer les 4 KPI cards égales en **bandeau de stats dense et sobre** (pas de gros chiffre hero-metric isolé). Inspire-toi de la densité batiments : ligne de stats avec valeurs tabular-nums, séparateurs hairline, tons sémantiques conservés (danger/warning/success). Garde les 4 mesures + leur logique tone.
2. **sanitaire/page.tsx** : harmoniser la grille de nav cards — si c'est N cards identiques, introduire hiérarchie/densité (numérotation OU liste avec hairlines OU différenciation). Préserver TOUS les liens vers sous-modules.

## Garde-fous
- Registre APP INTERNE : Big Shoulders titres/eyebrows, Instrument Sans body, tabular-nums chiffres. PAS d'Instrument Serif.
- Tokens `--sf-*` only. Cibles ≥44px. Mobile-first (360-414px lisible).
- Data 100% préservée (les 3 counts Supabase, les liens nav). Si un count/lien existe, il reste.
- Pas de side-stripe, glassmorphism, gradient.
- `card.tsx` non modifié (tu peux t'en passer au profit de divs+hairlines, ou le garder).

## VÉRIFS (sorties réelles dans rapport)
1. `grep -c "href=" app/src/app/\(app\)/sanitaire/page.tsx` → AVANT == APRÈS (note les 2)
2. `grep -c "actesCount\|protocolesCount\|alertesActives" app/src/app/\(app\)/sanitaire/_components/sanitaire-stats.tsx` → data préservée
3. `grep -i "instrument serif\|sf-font-editorial\|border-l-[2-9]\|backdrop-blur\|linear-gradient" <2 fichiers>` → 0

## LIVRABLE
`agents/sprint-design-phase-d1/rapports/RAPPORT_L1.md` (≤90 lignes). Avant/après + vérifs grep réelles + divergences.

## INTERDITS
- ❌ Toucher ui/* ou une sous-page sanitaire
- ❌ Perdre data/lien
- ❌ Instrument Serif (registre app)
- ❌ Inventer une data (lis le fetch réel)
- ❌ Build/tsc/commit/push · Rapport > 90 lignes

Go.
