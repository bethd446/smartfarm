# RAPPORT A — Purge side-stripe borders

Anti-pattern visé : `border-l-4` (bordure-accent latérale > 1px). Banni cf DESIGN.md L199.
Sens sémantique (danger/warning) préservé par : fond teinté, bordure complète ≤1px, ou marqueur en tête.
5 fichiers web migrés. PDF `api/registre/mensuel/_template.tsx` non touché (hors scope). 0 composant `ui/*` modifié.

## Fixes par fichier

| Fichier | Avant | Après |
|---|---|---|
| sanitaire/maladies/page.tsx:60 | `rounded-lg border-l-4 border-[warning-ink] bg-[warning-bg]` | `rounded-lg border border-[var(--sf-warning-ink,#5A3E0E)]/30 bg-[warning-bg]` — bordure complète fine + fond ambre |
| sanitaire/_components/alertes-sanitaires.tsx:92 | `... border-l-4 border-[var(--sf-danger)] pl-3` | `... pl-3` + pastille `<span h-2 w-2 rounded-full bg-[var(--sf-danger)] shrink-0 aria-hidden>` en tête de row |
| sanitaire/mycotoxines/page.tsx:501 | `border-l-4 p-3 rounded-r-md bg-muted/20` (+ `style borderColor` dyn) | `rounded-md border p-3 bg-muted/20` (+ `style borderColor` dyn conservé) |
| dashboard/page.tsx:525 | `rowBorder = 'border-l-4 border-[var(--sf-danger)] pl-3'` | `rowBorder = 'bg-[var(--sf-danger-bg)]/40 rounded-md px-3'` — fond teinté row danger |
| reproduction/_dialog-diagnostic.tsx:374 | `border-l-4 p-3` + `borderLeftColor` inline | `border rounded-md p-3` + `borderColor` inline (même teinte warning) |

Texte / logique / data des callouts : inchangés. Seuls className/style ajustés (+ 1 pastille JSX).

## Vérifications grep (sorties réelles)

### Vérif 1 — 0 side-stripe dans sanitaire + dashboard + reproduction
```
$ grep -rn "border-l-[2-9]\|border-r-[2-9]\|borderLeftWidth\|borderLeftColor\|borderRightWidth\|borderRightColor" \
    app/src/app/(app)/sanitaire app/src/app/(app)/dashboard app/src/app/(app)/reproduction
(aucune sortie — 0 occurrence) ✅
```

### Vérif 2 — sens sémantique conservé (grep -c par fichier)
```
maladies/page.tsx ............ 2   (var(--sf-warning…))
alertes-sanitaires.tsx ....... 1   (var(--sf-danger) → pastille)
mycotoxines/page.tsx ......... 7   (var(--sf-danger…/warning…))
dashboard/page.tsx ........... 0*  (pattern strict; voir note)
_dialog-diagnostic.tsx ....... 5   (var(--sf-warning…))
```
*Note dashboard : 0 sur le pattern exact `var(--sf-danger)` car le fix utilise `var(--sf-danger-bg)`. Sémantique danger bien présente — grep large `sf-danger|sf-warning|variant='danger'` → 12 occurrences ; `variant = 'danger'` (Badge) + `bg-[var(--sf-danger-bg)]/40` sur la row au L524-525.

## Divergences brief (justifiées, non implémentées à l'aveugle)

1. **mycotoxines** : le brief proposait `border border-[var(--sf-line)]` (bordure neutre). J'ai gardé `border` complète + le `style={{ borderColor: bordureRisque(...) }}` dynamique existant (rouge/ambre/gris/vert selon niveau_risque, L140-151). Raison : le neutre `--sf-line` aurait SUPPRIMÉ la sémantique couleur du risque. Bordure complète colorée 1px = conforme règle DESIGN.md (« bordure complète ≤1px portant le sens »). Plus fidèle au sens.

2. **dashboard** : option « fond teinté de row » retenue (pas la pastille), `rowBorder` ne s'appliquant qu'au cas danger ; le JSX `${rowBorder}` reste inchangé. Conforme au brief (alternative explicitement autorisée L46).

## Vérifs non exécutées
- `tsc`/`build` : interdits par le brief (L24, L66). Modifs limitées à className/style + 1 `<span>` correctement fermé, sans impact type.
- Bash refusé sur certaines commandes contenant `echo` ; grep purs exécutés, sorties ci-dessus réelles.

Statut : 5/5 fixes appliqués · Vérif 1 = 0 occurrence · sens danger/warning préservé partout.
