# BRIEF D2-A — Fix globals + composants UI (caveman ≤80L)

## TOI
Dev senior. Tu fais 3 P0 fondamentaux qui touchent UI partagé. Pas npm build (orchestrateur).

## LIS
1. `/root/projects/smartfarm/.brain/CONTEXT.md`
2. `/tmp/sf-r4/RAPPORT.md` (5 P0 R4 texte — tu attaques P0-2, P0-3, P0-5)

## SCOPE (3 P0)

### P0-2 — H1 unification charte (uppercase partout)
Fichiers à modifier : pages avec h1 = `text-4xl font-bold` SANS uppercase.
Cible : `text-4xl font-black uppercase tracking-[0.02em] text-[var(--sf-ink)]`
Garder font-family via parent app-shell.
Pages : `app/src/app/(app)/{cheptel,reproduction,kpi,sanitaire}/page.tsx` (dashboard déjà OK).
Méthode : `grep -rn "text-4xl font-bold" src/app/(app)/ | head -20` puis patch ciblé.

### P0-3 — Tap targets ≥56px (min-h-14)
Cible : `src/components/ui/button.tsx` — variant default h-11/h-10 → h-14.
Mais ATTENTION : ne pas casser variant `sm` (icon) qui doit rester compact.
Méthode : lire button.tsx, identifier `default` variant, patcher h-X → h-14 sur default uniquement.
Vérifier : `grep -rn "size=\"sm\"\\|size=\"icon\"" src/ | wc -l` — ne pas toucher ceux-là.

### P0-5 — text-xs lisibilité (cible terrain Sahel plein soleil)
Fichier : `src/app/globals.css`
Ajout après tokens "Terre & Mil" :
```css
/* === FIX-D2 P0-5 — text-xs base size augmentée pour lisibilité terrain === */
@media screen {
  .text-xs { font-size: 13px; line-height: 1.4; }
}
```
+ DANS PAGES `cheptel/page.tsx`, `alertes/page.tsx` : remplacer text-xs par text-sm sur les badges/dates/IDs PRINCIPAUX (pas tout — sélectif).
Méthode :
- `grep -n "text-xs" src/app/\(app\)/cheptel/page.tsx | head -10`
- patch sélectif sur les usages metadata visibles (date, badge animal id)
- Garder text-xs pour les footers/légendes secondaires

## INTERDICTIONS
- ❌ npm/build/restart
- ❌ modifier autre que ce qui est listé
- ❌ vision_analyze
- ❌ casser variant button "sm"/"icon"

## SORTIE
1 rapport `/tmp/d2-a/RAPPORT.md` ≤ 2 KB listant :
- Fichiers modifiés (avec compteur de lignes patchées)
- Test rapide : `grep -c "text-4xl font-black uppercase" src/app/\(app\)/{cheptel,reproduction,kpi,sanitaire}/page.tsx`
- Risques résiduels

Go.
