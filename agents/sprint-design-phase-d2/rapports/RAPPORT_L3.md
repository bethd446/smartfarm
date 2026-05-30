# RAPPORT L3 — Harmonisation Reproduction (D2)

Fichier touché (UNIQUE) : `app/src/app/(app)/reproduction/page.tsx`
Modèles suivis : `alertes/page.tsx` + `alertes/_components/alerte-card.tsx` (D1) · `batiments/page.tsx`

## CE QUI A CHANGÉ

### 1. Imports
- Retirés : `Card`, `CardContent`, `CardHeader`, `AlertCircle` (plus utilisés)
- Ajoutés : `RelativeTime` (depuis `@/components/ui/relative-time`), `CSSProperties` (type)

### 2. Header
- Sous-compteur "N montées enregistrées" : `N` passé en `font-semibold tabular-nums` (registre dense, pas hero-metric)
- Boutons header inchangés : `Diagnostic gestation` (outline) + `Nouvelle saillie` (primary) — 1 seul primary par page (DESIGN.md §223), Big Shoulders via Button. Pas de styles concurrents.

### 3. Section "Saillies à diagnostiquer" → registre dense hairline
Avant : Card + CardHeader + `<ul>` de boîtes `border ... rounded-md` (card-grid).
Après : titre H2 + compteur `(N)` inline + sous-texte, puis `<ul>` registre :
- `border-t-2` ambre (warning) en tête de liste, lignes `border-t border-[var(--sf-line)]`
- **Dot sévérité par FORME** (`dotPhase`, calque alerte-card) : retard → disque plein danger · fenêtre diag/écho → anneau ambre · attente → anneau gris discret
- Truie : tag `font-mono tabular-nums` + nom Big Shoulders
- Date saillie via `<RelativeTime ... addSuffix>` + `J+N` tabular-nums (calcul préservé)
- Badge fenêtre par **tonalité** (`variantPhase` : warning/danger/outline) — pas de side-stripe
- CTA `Diagnostiquer` inline, `min-h-11` (≥44px), ouvre `DialogDiagnostic` inchangé

### 4. Section "Historique des montées" (tableau)
- Bordure : `--sf-rule-top 4px` + bordures latérales/bas → simplifié à `border-t-2` primary (aligné batiments). Lignes hairline conservées.
- Colonne Date : `new Date(...).toLocaleDateString('fr-FR')` → `<RelativeTime ... addSuffix>` (hydration-safe, règle 10)
- Colonnes Date/Truie/Verrat/Méthode/Rang/Diagnostic + `tabular-nums` + badge diagnostic tonal : **inchangés**

## DATA / LOGIQUE PRÉSERVÉES (0 régression fonctionnelle)
- Requêtes Supabase, calcul J+N (`jours_post_saillie`), `labelPhase`/`variantPhase`, `diagBySaillie`, `saillesSansDiagPositif`, `diagnosticLabel`, ExportButton, FAB : intacts
- Les 2 dialogs (`_dialog-diagnostic`, `_dialog-faire-monter`) : NON touchés (perimetre)

## VÉRIFICATIONS (par lecture directe — Bash grep bloqué dans la session)
| Check | Attendu | Constaté |
|---|---|---|
| `DialogDiagnostic`/`DialogFaireMonter`/`Diagnostiquer` | preserved | DialogDiagnostic ×2, FaireMonter ×1, btn ×1 |
| `linear-gradient`/`backdrop-blur`/`border-l-[2-9]`/instrument-serif/font-editorial | 0 | 0 |
| `formatDistanceToNow`/`toLocaleString`/`toLocaleDateString` | 0 | 0 |
| `RelativeTime` import + usage | ≥2 | 1 import + 2 usages |
| imports orphelins Card/AlertCircle | 0 | 0 |

## NOTES
- `<RelativeTime>` est dans `ui/*` mais seulement IMPORTÉ (pas modifié) — conforme périmètre.
- Pas de composant `FormattedDate` date-only existant ; `FormattedDateTime` aurait collé `00:00` sur une date calendaire → `RelativeTime addSuffix` retenu (hydration-safe, registre alertes).
- Les `border-t-2` sont des traits de tête (rules), pas des side-stripes — conformes DESIGN.md §199.
- Pas de tsc/build/commit (perimetre). À valider visuellement par l'orchestrateur.
