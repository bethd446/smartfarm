# RAPPORT_L4 — Pesées (Phase D3 / Task 5)

**Fichier** : `app/src/app/(app)/pesees/page.tsx` (97 → 140 l)
**Statut** : DONE

## Baseline (avant)

| check                  | valeur |
|------------------------|--------|
| href=                  | 0      |
| DialogPeser/ActionsPeser/_actions-peser | 2 |
| toLocaleDateString...  | 1      |

## Vérifications (après)

| check                                | attendu | obtenu |
|--------------------------------------|---------|--------|
| anti-patterns (gradient/blur/borderL2-9/serif/editorial) | 0 | 0 |
| dates natives (toLocale…/formatDistanceToNow)            | 0 | 0 |
| href=                                                    | 0 | 0 |
| Dialog/Actions/_actions-peser (préservé)                 | 2 | 2 |
| RelativeTime (import + usage)                            | ≥1| 2 |

`npx tsc` non lancé (interdit côté worktree design).

## Transformations

### Header — Pattern E (PageTitle)
- `<h1 text-4xl font-bold>` ad-hoc → `<PageTitle eyebrow="PERFORMANCES" icon=<Scale/>>`
- Eyebrow Big Shoulders 11px 0.18em, titre Big Shoulders 4xl black uppercase.
- Sous-ligne dense : `<total>` `tabular-nums` + "pesées récentes · GMQ et courbes de poids".
- Trigger `<ActionsPeser />` préservé à droite (props inchangées : animaux, bandes, defaultOpen, defaultAnimalId).

### KPI total → sous-compteur header
- 1 seule mesure (count pesées). Intégrée en sous-compteur `tabular-nums font-semibold` dans le `<p>` du header.
- Pas de bandeau Pattern A (1 cellule isolée = anti-pattern).

### Liste pesées récentes — Pattern C (table dense hairline)
- Suppression `<Card>/<CardHeader>/<CardTitle>/<CardContent>` enveloppants.
- Container `border-t-2` couleur `--sf-primary` + `<table min-w-[640px]>`.
- `<thead>` Big Shoulders 11px 0.1em uppercase, `border-b border-[var(--sf-line)]`.
- Colonnes : **Date** (RelativeTime) · **Sujet** (nom + tag `font-mono` parenthèses si dispo, sinon code bande) · **Type** (Badge outline) · **Poids** (`tabular-nums font-bold` aligné droite).
- Rows : `border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40`.
- `overflow-x-auto -mx-4 sm:mx-0` pour mobile.

### Date — hydration safe
- Avant : `new Date(p.date_pesee).toLocaleDateString('fr-FR')` (mismatch SSR/client).
- Après : `<RelativeTime date={p.date_pesee} addSuffix />` (client only, post-hydration).

### Empty state
- Card retirée → `<div border border-[var(--sf-line)] py-12 text-center>`.
- Icône Scale 12 sur `--sf-line`, eyebrow Big Shoulders, sous-titre `--sf-muted`.
- `.eyebrow` class CSS remplacée par styles inline tokens (cohérence registres autres pages).

## Imports

Retirés : `Card`, `CardContent`, `CardHeader`, `CardTitle`.
Ajoutés : `PageTitle`, `RelativeTime`.

## Data préservée

- Requêtes Supabase : pesees (avec joins animal+bande), animaux filtre vivants (`statut in actif/malade`, `deleted_at is null`), bandes — **0 modification**.
- `defaultOpen` / `defaultAnimalId` depuis searchParams → toujours passés à `<ActionsPeser>`.
- `<PeseesFab animaux={animaux ?? []} bandes={bandes ?? []} />` préservé.
- `p.type`, `p.poids_kg`, `p.animal?.{tag,nom}`, `p.bande?.{nom,code}`, `p.date_pesee` tous consommés.

## Divergences vs cahier des charges

1. **Colonne GMQ retirée** : la requête `pesees` ne renvoie aucun champ GMQ ni `poids_precedent`. Calcul GMQ = N-1 jointures + diff temporel, hors scope page.tsx (97 l). Conservé colonne **Type** (badge `tetée|sevrage|reforme|...`) qui existait avant et porte de l'info utile.
2. **Eyebrow "PERFORMANCES"** (au lieu de "PESÉES") : cohérence avec hub `/performances` (les pesées alimentent les courbes de poids et GMQ — section performances zootechniques). Modifiable si Christophe préfère "PESÉES".
3. **Sujet** affiche `nom (tag)` si animal, sinon `nom (code)` si bande, sinon `—` (gestion pesées par bande, pas seulement individuelles).

## Statut

**DONE** — 0 anti-pattern, dates hydration-safe, data 100 % préservée, FAB + Dialog + Actions intacts.
