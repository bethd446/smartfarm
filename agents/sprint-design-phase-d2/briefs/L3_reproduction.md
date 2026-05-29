# Brief D2-L3 — Harmoniser Reproduction

## TOI
Dev senior React/Tailwind + métier repro porcin. Tu harmonises la page Reproduction au registre app dense, sans casser data/diagnostic/historique.

## PÉRIMÈTRE EXCLUSIF
✅ Touche : `app/src/app/(app)/reproduction/page.tsx` (391 l — saillies à diagnostiquer + historique montées)
❌ Touche pas : `_dialog-diagnostic.tsx`, `_dialog-faire-monter.tsx`, `_server-actions.ts`, `_schemas.ts`, `_fab.tsx`, `ui/*`
❌ Pas npm run build / tsc / commit / push

## LIS D'ABORD
1. `CLAUDE.md` + `.brain/CONTEXT.md` (règles 9 filtres + 10 hydration dates)
2. `DESIGN.md` §195 Anti-patterns, §180 registre app
3. `app/src/app/(app)/batiments/page.tsx` — pattern registre dense référence
4. `app/src/app/(app)/alertes/page.tsx` — **déjà harmonisé D1** (lignes registre + sévérité par forme/dot) = MODÈLE pour les listes
5. `app/src/app/(app)/reproduction/page.tsx` intégral

## MISSION
Harmoniser les 2 zones de la page :
- **Section "Saillies à diagnostiquer"** : si cards/grid → liste registre dense (1 ligne par truie : tag + nom Big Shoulders + date saillie + J+N tabular-nums + badge fenêtre (EN RETARD/ÉCHOGRAPHIE 25-35J/À ATTENDRE) par tonalité, bouton DIAGNOSTIQUER inline). Badge fenêtre par couleur/forme, pas side-stripe.
- **Section "Historique des montées"** (journal chronologique) : tableau dense hairline, colonnes Date/Truie/Verrat/Méthode/Rang/Diagnostic alignées, `tabular-nums`, badge diagnostic (GESTANTE/VIDE/EN ATTENTE) tonal
- Header sous-compteur ("N montées enregistrées") : registre dense, pas hero-metric
- Boutons DIAGNOSTIC GESTATION + NOUVELLE SAILLIE en header : registre app (Big Shoulders), pas de styles primaires concurrents

## GARDE-FOUS (cadrage prudent)
- **Data/logique 100% préservées** : liste saillies à diag (calcul J+N), historique montées, badges diagnostic, boutons DIAGNOSTIQUER (ouvrent dialog inchangé), EXPORTER CSV
- Dates via `<RelativeTime>`/`<FormattedDate>` (règle 10, jamais formatDistanceToNow JSX serveur)
- Big Shoulders titres/chiffres · Instrument Sans body · `tabular-nums`
- 0 Instrument Serif · tokens `--sf-*` · mobile-first · cibles ≥44px
- 0 gradient / glassmorphism / side-stripe / backdrop-blur

## VÉRIFICATIONS (rapport)
```bash
# boutons diagnostiquer préservés
grep -c "DIAGNOSTIQUER\|DiagnosticGestation\|FaireMonter" app/src/app/\(app\)/reproduction/page.tsx
# anti-patterns
grep -niE "linear-gradient|backdrop-blur|border-l-[2-9]|instrument.serif|font-editorial" page.tsx   # 0
# dates hydration-safe
grep -c "formatDistanceToNow\|toLocaleString" page.tsx   # 0 attendu (sinon RelativeTime)
```

## LIVRABLE
1. `reproduction/page.tsx` modifié
2. Rapport `agents/sprint-design-phase-d2/rapports/RAPPORT_L3.md` (≤120 lignes caveman)

## ANTI-PIÈGES
- ❌ Ne PAS toucher les 2 dialogs (diagnostic / faire-monter)
- ❌ Préserver le calcul J+N et les badges fenêtre diagnostic
- ❌ Vocab strict : Saillie/Montée, Diagnostic gestation, Échographie, Truie gestante/vide
- ❌ Edit ciblés, pas réécriture complète (391 l)

Mode caveman. Direct.
