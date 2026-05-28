# Brief A — Purge side-stripe borders

## TOI
Dev senior React/Tailwind. Tu retires un anti-pattern visuel (bordure-accent latérale) sur 5 fichiers web, en préservant 100% du sens sémantique (danger/warning) et de la fonctionnalité.

## LIS D'ABORD (obligatoire)
1. `CLAUDE.md` (racine) — charte projet
2. `DESIGN.md` section "Anti-patterns design" — la règle side-stripe + alternatives autorisées
3. Chaque fichier cible avant de le modifier (Read intégral de la zone concernée)

## Périmètre
✅ Touche EXACTEMENT ces 5 fichiers (zones précises ci-dessous) :
- `app/src/app/(app)/sanitaire/maladies/page.tsx` (ligne ~60)
- `app/src/app/(app)/sanitaire/_components/alertes-sanitaires.tsx` (ligne ~92)
- `app/src/app/(app)/sanitaire/mycotoxines/page.tsx` (ligne ~501)
- `app/src/app/(app)/dashboard/page.tsx` (ligne ~525)
- `app/src/app/(app)/reproduction/_dialog-diagnostic.tsx` (ligne ~374)

❌ Touche pas :
- `app/src/app/api/registre/mensuel/_template.tsx` (c'est un PDF @react-pdf, hors scope du ban web — laisser tel quel)
- Aucun composant `ui/*`
- Tout autre fichier

❌ Pas `npm run build`, pas `npx tsc`, pas commit, pas push.

## Contexte

L'anti-pattern : `border-l-4` (bordure gauche épaisse colorée) comme accent décoratif sur callouts/alerts. Banni (cf DESIGN.md). Le sens sémantique (danger rouge, warning ambre) doit être conservé par d'**autres moyens** : bordure complète fine, fond teinté seul, ou icône/badge en tête.

## Mission — par fichier

### sanitaire/maladies/page.tsx:~60
Callout warning : `rounded-lg border-l-4 border-[warning-ink] bg-[warning-bg] p-3`.
**Fix** : retirer `border-l-4 border-[...]`, garder le fond teinté + ajouter une **bordure complète fine** `border border-[var(--sf-warning-ink,#5A3E0E)]/30`. Le fond ambre + bordure complète portent le sens.

### sanitaire/_components/alertes-sanitaires.tsx:~92
Alert row : `border-l-4 border-[var(--sf-danger)] pl-3`.
**Fix** : retirer `border-l-4 border-[...]`, remplacer le marqueur danger par une **pastille/point** en tête de row (`<span className="inline-block h-2 w-2 rounded-full bg-[var(--sf-danger)] shrink-0" aria-hidden />`) ou une icône. Garder `pl-3` pour l'alignement si pertinent.

### sanitaire/mycotoxines/page.tsx:~501
`border-l-4 p-3 rounded-r-md bg-muted/20`.
**Fix** : retirer `border-l-4` + `rounded-r-md` → utiliser `rounded-md border border-[var(--sf-line)] bg-muted/20 p-3` (bordure complète + fond).

### dashboard/page.tsx:~525
Variable `rowBorder = 'border-l-4 border-[var(--sf-danger)] pl-3'`.
**Fix** : remplacer par un marqueur en tête (pastille danger) ou un fond teinté de row `bg-[var(--sf-danger-bg)]/40 rounded-md px-3`. Vérifier l'usage de `rowBorder` dans le JSX pour adapter proprement.

### reproduction/_dialog-diagnostic.tsx:~374
Note warning : `border-l-4 p-3` + `borderLeftColor` inline.
**Fix** : retirer `border-l-4` + `borderLeftColor`, garder le fond warning + ajouter `border` complète fine (1px) de la même teinte. C'est un encart "retour chaleur" — le sens warning reste via fond ambre.

## Principe transversal
- JAMAIS de `border-l-[2-9]` ni `border-r-[2-9]` ni `borderLeft/RightWidth > 1px` comme accent
- Sens sémantique préservé via : fond teinté, bordure complète ≤1px, ou marqueur (point/icône) en tête
- Ne change RIEN d'autre (texte, logique, data)

## VÉRIFICATIONS OBLIGATOIRES (sorties réelles dans le rapport)
1. `grep -rn "border-l-[2-9]\|border-r-[2-9]\|borderLeftWidth\|borderLeftColor" app/src/app/\(app\)/sanitaire app/src/app/\(app\)/dashboard app/src/app/\(app\)/reproduction` → **0 occurrence** (hors api/registre exclu)
2. Pour chaque fichier modifié : `grep -c "var(--sf-danger)\|var(--sf-warning" <file>` → le sens sémantique est toujours présent (couleur conservée autrement)

## LIVRABLE
`agents/sprint-design-phase-c/rapports/RAPPORT_A.md` (≤80 lignes). Par fichier : avant/après en 1 ligne + vérif grep réelle.

## INTERDITS
- ❌ Toucher api/registre/_template.tsx (PDF, hors scope)
- ❌ Modifier un composant ui/*
- ❌ Changer le texte, la logique ou la data des callouts
- ❌ Build/tsc/commit/push
- ❌ Rapport > 80 lignes

Go.
