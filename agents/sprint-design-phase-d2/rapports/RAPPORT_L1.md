# RAPPORT D2-L1 — Harmonisation Cheptel (liste 5 onglets)

## CONSTAT INITIAL
Le hub Cheptel était **déjà très majoritairement au registre dense** : header `PageTitle` +
eyebrow + sous-compteur dense (pas de hero-metric), tabs en nav `border-b` filet primary
Big Shoulders uppercase, tables hairline. **0 anti-pattern** (gradient/glassmorphism/side-stripe/
serif). Écarts au pattern référence `batiments`/`sanitaire` = fins. Interventions chirurgicales,
pas de réécriture.

## MODIFS PAR BLOC (AVANT → APRÈS)

### 1. Tabs — compteurs `tabular-nums` (page.tsx ~l.260)
- AVANT : `<span>{label} ({c ?? '—'})</span>` — compteur collé au label, sans tabular-nums.
- APRÈS : label + compteur séparés ; compteur en `tabular-nums text-[var(--sf-subtle)] font-normal`.
- Pourquoi : doctrine DESIGN §193 (tous les chiffres tabular-nums) + alignement visuel pattern
  référence (numéro neutre subtle, cf batiments l.100/131). Compteur reste lisible en état actif.

### 2. Table Portées — filet de tête primary (page.tsx ~l.483)
- AVANT : `<table className="... border-t border-b border-[var(--sf-line)]">`
- APRÈS : `border-b --sf-line` + `border-t-2` `style={borderTopColor: var(--sf-primary)}`.
- Pourquoi : reproduit la « tête de registre » de batiments/sanitaire (`border-t-2` primary).

### 3. Table Porcelets bulk — filet de tête primary (_porcelets-table-bulk.tsx ~l.99)
- AVANT : `<table className="... border-t border-b border-[var(--sf-line)]">`
- APRÈS : `border-b --sf-line` + `border-t-2` `style={borderTopColor: var(--sf-primary)}`.
- Pourquoi : idem, cohérence registre dense. Sticky bar bulk + dialogs **non touchés**.

### 4. Table Animaux (ResponsiveTable, truies/cochettes/verrats) — filet de tête desktop (page.tsx ~l.364)
- AVANT : `<section aria-labelledby="cheptel-liste-titre">`
- APRÈS : `<section className="md:border-t-2" style={borderTopColor: var(--sf-primary)}>`.
- Pourquoi : `ResponsiveTable` est dans `ui/*` (**hors périmètre, non modifié**). Filet primary
  posé sur le wrapper `<section>`, en desktop uniquement (`md:`) — la table desktop colle au bord ;
  en mobile le rendu est en cards où le filet n'a pas de sens. Aligné sur batiments (en-tête desktop-only).

## DATA / LOGIQUE PRÉSERVÉES (100%)
- **5 tabs** : `TABS` array + type `TabKey` + `isTab()` inchangés → truies/cochettes/verrats/porcelets/portees.
- **Règle 9 filtres** : `.eq('statut','actif').is('deleted_at',null)` intacts (counts l.73-77, query l.114).
  Filtre `pret_croissance` (l.126), recherche `ilike tag` (l.131), filtre portées q (l.104-112) intacts.
- **Badges stade repro** : `STADE_REPRO_MAP` (GESTANTE/ALLAITANTE/VIDE/PRÉ-SAILLIE + J-jours) intact.
- **Liens fiches** : `/cheptel/${r.id}` (bulk l.153) intact ; aucun lien fiche dans page.tsx (délégués à
  CheptelRowActions/PorceletsTableBulk, non touchés).
- **Stade reproducteur** (vue `v_animaux_stade_repro` + fallback graceful) intact.
- Banners (bcs/mortalite/pret_croissance), recherche GET, FAB, CheptelActions/RowActions : **0 modif**.

## VÉRIFS (lecture manuelle — Bash/grep refusés par sandbox sur ce périmètre)
| Check | Attendu | Constat |
|---|---|---|
| liens `cheptel/${` page.tsx | avant==après (0) | 0 → 0 OK |
| liens `cheptel/${` bulk | avant==après (1) | 1 → 1 OK (l.153 intact) |
| 5 tabs (truies\|cochettes\|verrats\|porcelets\|portees) | 5 | 5 OK |
| anti-patterns `linear-gradient\|backdrop-blur\|border-l-[2-9]\|instrument.serif\|font-editorial` | 0 | 0 OK (ajouts = `border-t-2` top, pas left) |
| tabular-nums compteur tabs | présent | ajouté OK |

## DIVERGENCES / NOTES
- **ResponsiveTable (ui/*) non touchée** : sa table desktop n'a pas nativement de `border-t-2` primary
  ni `tabular-nums` global. Filet ajouté côté wrapper page.tsx pour rester dans le périmètre.
  Si harmonisation profonde voulue (tabular-nums par défaut sur les th/td) → lane future `ui/*`.
- **Eyebrow colonnes** : Cheptel utilise tracking `0.1em` (cohérent ResponsiveTable + tables internes),
  batiments utilise `0.16em`. Écart cosmétique laissé en l'état (cohérence interne Cheptel > alignement
  inter-pages mineur). À trancher orchestrateur si normalisation tracking souhaitée.
- **Vocab FR strict** : aucun libellé modifié (cochette/truie/verrat/porcelet/portée intacts).

## PÉRIMÈTRE RESPECTÉ
✅ Touché : `cheptel/page.tsx`, `cheptel/_porcelets-table-bulk.tsx`
❌ Non touché : `[id]/`, tous `_dialog-*`, `_actions`, `_row-actions`, `_fab`, `_banner-*`, `ui/*`,
   server-actions, schemas, classement-truies. Pas de build/tsc/commit (orchestrateur valide).
