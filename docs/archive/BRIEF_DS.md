# Smart Farm — Brief Design System (lecture obligatoire agents DS)

## CONTEXTE
Application **Smart Farm** : Next.js 16 + React 19 + Tailwind v4 + shadcn/ui.
Path app : `/root/projects/smartfarm/app/`
Path DS source : `/tmp/sf-ds/` (PorcTrack 8 Design System "Terrain Vivant" v3.2)

## OBJECTIF
Appliquer le Design System "Terrain Vivant" en **rebrandant PorcTrack 8 → Smart Farm** :
- Tokens `--pt-*` → `--sf-*`
- Palette/typo/vocabulaire/atomes : **conservés tels quels**
- Logo/nom : **Smart Farm**

## STACK FIGÉE
- Next.js 16.2.6 App Router + TypeScript
- Tailwind CSS v4 (pas de config tailwind.config.js — tout via `@theme`)
- shadcn/ui composants actuels dans `src/components/ui/` → à adapter vers atomes carnet
- Fichiers critiques : `src/app/globals.css`, `src/app/layout.tsx`, `src/components/sidebar.tsx`

## DS SOURCE
Lire **obligatoirement** :
- `/tmp/sf-ds/README.md` (manifeste DNA, vocabulaire terrain, voix)
- `/tmp/sf-ds/APPLICATION_GUIDE.md` (ordre d'application, tokens v3.2, mapping atomes)
- `/tmp/sf-ds/colors_and_type.css` (tous les tokens CSS)
- `/tmp/sf-ds/preview/*.html` (exemples visuels des composants)

## RÈGLES STRICTES
1. **Rebrand uniquement** : `--pt-*` → `--sf-*` PARTOUT (tokens, classes, commentaires)
2. **Zéro palette custom** : on garde `#2D4A1F` (primary vert ferme), `#B8703D` (accent terre cuite), `#F5E9D8` (warm), `#FAF7F0` (surface-0)
3. **Typo obligatoire** : Big Shoulders Display (display/eyebrows) + Instrument Sans (body)
4. **Vocabulaire terrain ivoirien** : "la truie demande", "faire monter", "enlever les porcelets", "porc fini", "case", "bande". Jamais "œstrus", "saillie", "sevrage", "charcutier", "loge", "lot".
5. **Touch ≥ 48 px** partout (boutons, liens, items liste)
6. **Atomes carnet d'élevage** (v3.2) :
   - Button : radius 4 px, tampon `--sf-stamp-ring` (pas pill 999 px)
   - Card : double-trait top/bottom/sides, radius 0 (pas 14 px shadcn)
   - Field : underline-only, label uppercase au-dessus
   - Pill : radius 999 OK mais UNIQUEMENT pour pills/badges, pas boutons
7. **Pas de pattern shadcn/Vercel/Tailwind UI** : pas de gradient diagonal, pas de `scale(0.97)` active, pas de box-shadow subtile 1px/2px
8. **Convention chiffres** : `tabular-nums` partout, FCFA sans décimales

## FICHIERS À NE PAS TOUCHER
- `/root/projects/smartfarm/supabase/` (migrations SQL)
- `/root/projects/smartfarm/scripts/` (migration Cloud)
- `/root/projects/smartfarm/app/src/app/api/` (routes backend déjà sécurisées)
- `/root/projects/smartfarm/app/src/lib/supabase/` (clients DB)

## VALIDATION FINALE
- Build Next.js doit passer : `npm run build`
- Aucun warning TypeScript nouveau
- App testable sur https://smartfarm.187-127-225-24.nip.io
