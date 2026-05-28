# Brief C — Card grids identiques → composition éditoriale

## TOI
Dev senior React/Tailwind + sens éditorial. Tu remplaces des grilles de cards identiques (anti-pattern) par une composition plus variée et hiérarchisée, en préservant 100% de la fonctionnalité (liens, data, navigation).

## LIS D'ABORD (obligatoire)
1. `CLAUDE.md` (racine)
2. `DESIGN.md` — Anti-patterns ("card grids identiques"), Typography (registre app = Big Shoulders, PAS editorial Instrument Serif sur l'app interne), Layout, Components
3. `app/src/app/(app)/conseiller/page.tsx` (intégral)
4. `app/src/app/(app)/batiments/page.tsx` (intégral)
5. `app/src/components/ui/card.tsx` — pour comprendre l'API Card (NE PAS la modifier, juste l'utiliser ou s'en passer)

## Périmètre
✅ Touche EXACTEMENT 2 fichiers :
- `app/src/app/(app)/conseiller/page.tsx`
- `app/src/app/(app)/batiments/page.tsx`

❌ Touche pas :
- `card.tsx` ni aucun composant `ui/*` (49 usages de card, intouchable)
- `conseiller/_components/tip-card.tsx`, `conseiller/[slug]/`, `batiments/[id]/` (hors scope)
- Tout autre fichier

❌ Pas `npm run build`, pas `npx tsc`, pas commit, pas push.

## Contexte

L'anti-pattern (impeccable) : grilles de cards strictement identiques (icône + titre + texte, répétées N fois) = monotonie "AI slop". Le fix : introduire de la **hiérarchie et de la variété** — numérotation, hairlines, tailles différenciées, densité, asymétrie — tout en restant dans le **registre app interne** (Big Shoulders, tokens --sf-*, dense terrain).

⚠️ CE N'EST PAS la landing : pas de bascule Instrument Serif editorial. On reste sobre, dense, agronomique (charte). On casse juste la monotonie du grid identique.

## Mission

### conseiller/page.tsx
1. Lis et comprends la fonction actuelle (liste de conseils/modules ?). Identifie le card grid identique.
2. Repense en composition hiérarchisée :
   - Option : liste éditoriale avec numérotation (01/02/03), hairlines de séparation, titre Big Shoulders + description, au lieu de N cards égales
   - OU différencier les tailles (1 item vedette + reste en liste dense)
3. PRÉSERVE : tous les liens (`href`), toute la data affichée, l'ordre, les filtres éventuels.

### batiments/page.tsx
1. Lis et comprends (liste de bâtiments d'élevage avec stats ?).
2. Repense le grid identique en composition plus dense/hiérarchisée :
   - Tableau dense OU liste avec hairlines + données alignées (tabular-nums pour les chiffres)
   - Mettre en avant les infos clés (effectif, type, occupation) sans la monotonie card
3. PRÉSERVE : liens vers `/batiments/[id]`, data (nom, type, effectif…), actions.

## Garde-fous
- Registre APP INTERNE : Big Shoulders pour titres/eyebrows, Instrument Sans body, tabular-nums chiffres. PAS d'Instrument Serif.
- Tokens `--sf-*` uniquement (pas de hex en dur si token existe)
- Cibles tactiles ≥44px (charte, terrain mobile)
- Mobile-first : la composition doit rester lisible en 360-414px (pas juste desktop)
- AUCUNE perte de fonctionnalité : si tu n'es pas sûr qu'un lien/data est préservé, garde-le
- Pas de side-stripe, pas de glassmorphism, pas de gradient

## VÉRIFICATIONS OBLIGATOIRES (sorties réelles dans le rapport)
1. `grep -c "href=" app/src/app/\(app\)/conseiller/page.tsx app/src/app/\(app\)/batiments/page.tsx` → nb de liens AVANT == APRÈS (note les 2 valeurs, elles doivent être ≥ à l'origine)
2. `grep -i "instrument serif\|sf-font-editorial" app/src/app/\(app\)/conseiller/page.tsx app/src/app/\(app\)/batiments/page.tsx` → 0 (registre app, pas editorial)
3. `grep -i "border-l-[2-9]\|backdrop-blur\|linear-gradient" <2 fichiers>` → 0 (anti-patterns absents)
4. Décris en 2 lignes la composition AVANT (grid de N cards) vs APRÈS (ce que tu as fait)

## LIVRABLE
`agents/sprint-design-phase-c/rapports/RAPPORT_C.md` (≤100 lignes). Par page : avant/après composition + liens préservés (grep) + divergences.

## INTERDITS
- ❌ Toucher card.tsx ou tout composant ui/*
- ❌ Perdre un lien, une donnée, une action
- ❌ Bascule Instrument Serif (registre app interne, pas marketing)
- ❌ Build/tsc/commit/push
- ❌ Inventer une data/un champ qui n'existe pas (lis le fetch réel d'abord)
- ❌ Rapport > 100 lignes

Go.
