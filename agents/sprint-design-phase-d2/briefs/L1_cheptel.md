# Brief D2-L1 — Harmoniser Cheptel (liste 5 onglets)

## TOI
Dev senior React/Tailwind. Tu harmonises la liste cheptel au registre app dense (doctrine DESIGN.md), sans casser data/nav/filtres/tabs.

## PÉRIMÈTRE EXCLUSIF
✅ Touche :
  - `app/src/app/(app)/cheptel/page.tsx` (545 l — liste 5 onglets : truies/cochettes/verrats/porcelets/portées)
  - `app/src/app/(app)/cheptel/_porcelets-table-bulk.tsx` (SI la table porcelets bulk porte un anti-pattern card grid/hero-metric)
❌ Touche pas : `cheptel/[id]/` (fiche — autre lane future), tous les `_dialog-*.tsx`, `_actions.tsx`, `_server-actions.ts`, `_schemas.ts`, `_fab.tsx`, `_row-actions.tsx`, `classement-truies/`, `ui/*`
❌ Pas npm run build / tsc / commit / push (orchestrateur s'en charge)

## LIS D'ABORD
1. `CLAUDE.md` (racine) + `.brain/CONTEXT.md` (règles 9 filtres animaux + 10 hydration dates)
2. `DESIGN.md` §195 Anti-patterns (hero-metric, card grids), §180 registre Big Shoulders app interne
3. `app/src/app/(app)/batiments/page.tsx` — **pattern de référence "registre dense hairline"** à reproduire
4. `app/src/app/(app)/cheptel/page.tsx` intégral

## MISSION
Harmoniser la liste cheptel (header + tabs + tables/cards) au registre app dense :
- Tabs (TRUIES/COCHETTES/VERRATS/PORCELETS/PORTÉES) : si rendues en card grid colorée → registre tabs propre (Big Shoulders uppercase, état actif filet primary, compteurs tabular-nums)
- Lignes animaux : si cards répétées → tableau/liste dense hairline (`border-b --sf-line`), colonnes alignées, valeurs `tabular-nums`, badge stade repro par tonalité (déjà existant : GESTANTE/ALLAITANTE/VIDE/PRÉ-SAILLIE)
- Header sous-compteur ("X reproducteurs · Y porcelets…") : registre dense, pas de hero-metric isolé
- Si KPI hero-metric en haut (gros chiffres isolés) → bandeau dense ou retrait

## GARDE-FOUS (cadrage prudent)
- **Data/logique 100% préservées** : 5 tabs, filtres statut (règle 9 : `.in('statut',['actif','malade']).is('deleted_at',null)`), recherche, compteurs, badges stade repro, liens fiches `/cheptel/[id]`
- Big Shoulders titres/eyebrows/chiffres · Instrument Sans body · `tabular-nums` chiffres
- **0 Instrument Serif** (registre app, pas marketing) · tokens `--sf-*` only · mobile-first · cibles ≥44px
- 0 gradient / glassmorphism / side-stripe (`border-l-[2-9]`) / backdrop-blur
- Préserver `<ResponsiveTable>` si utilisé (pattern mobile cards déjà géré)

## VÉRIFICATIONS (sorties réelles dans le rapport)
```bash
# liens fiches préservés
grep -c "cheptel/\${" app/src/app/\(app\)/cheptel/page.tsx   # avant == après
# 5 tabs préservés
grep -oE "truies|cochettes|verrats|porcelets|portees" page.tsx | sort -u   # 5 valeurs
# anti-patterns
grep -niE "linear-gradient|backdrop-blur|border-l-[2-9]|instrument.serif|font-editorial" page.tsx   # 0
```

## LIVRABLE
1. `cheptel/page.tsx` modifié (+ `_porcelets-table-bulk.tsx` si touché)
2. Rapport `agents/sprint-design-phase-d2/rapports/RAPPORT_L1.md` (≤120 lignes caveman) : AVANT/APRÈS par bloc + data préservée + vérifs réelles + divergences

## ANTI-PIÈGES
- ❌ Ne JAMAIS toucher la fiche `[id]` ni les dialogs (scope creep)
- ❌ Préserver règle 9 filtres animaux vivants à l'identique
- ❌ Si fichier énorme : Edit ciblés, jamais réécriture complète
- ❌ Vocab FR strict (cochette ≠ truie, etc.)

Mode caveman. Direct.
