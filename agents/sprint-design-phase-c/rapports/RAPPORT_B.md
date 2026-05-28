# RAPPORT B — Harmonisation empty-states

## Périmètre respecté
2 fichiers touchés EXACTEMENT :
- `app/src/components/ui/empty-state.tsx`
- `app/src/components/ui/empty-onboarding.tsx`

Aucune page utilisatrice, aucun autre `ui/*` (button/card intacts). Pas de build/tsc/commit/push.

## API GELÉE — confirmée
- `EmptyStateProps { icon?, title, description?, tone?, cta?, className? }` — INCHANGÉ
- `EmptyStateTone = 'default' | 'good'` — INCHANGÉ
- `EmptyOnboardingProps { icon, eyebrow?, title, description, cta?, ctaSecondary?, className? }` — INCHANGÉ
- 0 prop ajoutée / retirée / renommée. Aucun type exporté modifié. Server-component préservé (0 directive, 0 hook).

## Harmonisations appliquées

| # | Sujet | EmptyState | EmptyOnboarding |
|---|---|---|---|
| 1 | Token mort | `var(--sf-leaf,…)` supprimé → `--sf-primary` direct (leaf non défini en CSS, fallback déjà actif) | — |
| 2 | Couleur description | `--sf-muted` → `--sf-ink-secondary` (cohérence + lisibilité terrain) | déjà `--sf-ink-secondary` (gardé) |
| 3 | Couleur eyebrow/neutre | icône neutre `--sf-subtle` (gardé) | eyebrow `--sf-ink-secondary` → `--sf-subtle` (= rôle neutre EmptyState) |
| 4 | Spacing icône | `mb-3` → `mb-4` (grille 4/8/16/24) | `mb-4` (gardé) |
| 5 | Titre court | `mb-3` h2 → `mb-4` | — |
| 6 | Padding bloc | `py-8 px-4` → `px-4 py-8` (ordre unifié) | `py-10` → `py-8` (grille, aligne sur EmptyState) |
| 7 | Radius card | — | `var(--sf-radius-lg, 12px)` → `var(--sf-radius-lg)` (token nu, fallback hex retiré) |
| 8 | strokeWidth icône | `1.5` (déjà) | injecté `1.5` via `React.cloneElement` (non destructif : respecte un strokeWidth appelant) |
| 9 | tone `good` | `--sf-primary` (vert Sahel = bonne nouvelle) confirmé | — |
| 10 | a11y | `aria-hidden` icône (gardé) | `aria-hidden` wrapper icône (gardé) |

Tokens neutres unifiés : **subtle** = eyebrow/icône neutre · **ink-secondary** = description (body) · **muted** plus utilisé dans ces 2 composants.

## Vérifications grep — sorties RÉELLES

**V1 — types exportés présents** (`grep -c …Props/…Tone`) :
```
empty-state.tsx:2        (EmptyStateTone + EmptyStateProps)
empty-onboarding.tsx:1   (EmptyOnboardingProps)
```
→ 3 types attendus = 3 présents. OK.

**V2 — props d'origine présentes** : toutes confirmées
```
empty-state:      icon?, title, description?, tone?, cta?, className?
empty-onboarding: icon, eyebrow?, title, description, cta?, ctaSecondary?, className?
```
→ Aucune disparue. OK.

**V3 — `'use client'`** (`grep -c`) :
```
empty-state.tsx:0
empty-onboarding.tsx:1   ← FAUX POSITIF : commentaire JSDoc ligne 13
                           " * Server-component compatible (pas de hook, pas de 'use client')."
```
→ Aucune directive réelle (ligne 1 = `import`, pas de directive). Server-components préservés. OK.

**V4 — anti-patterns** (`grep -iE "border-l-[2-9]|backdrop-blur|linear-gradient|box-shadow|drop-shadow"`) :
```
(aucune ligne) — exit=1
```
→ 0 anti-pattern. Pas de gradient / shadow / side-stripe. OK.

**Hooks** (`grep -E "\buse[A-Z]\w+\("`) : 0 match. `cloneElement`/`isValidElement` sont des utilitaires React (pas des hooks) → server-safe.

## Divergence brief (notée, non implémentée à l'aveugle)
- **Brief pt6** : « aligner sur rounded.lg DESIGN = 14px ». Or le token CSS réel `--sf-radius-lg` vaut **12px** (globals.css l.253), pas 14px. Décision : utiliser le **token nu** (`var(--sf-radius-lg)`) plutôt qu'un hex en dur — conforme à la règle "pas de hex quand un token existe" + anti-hallucination. Si la cible 14px est voulue, c'est une correction de **token global** (hors périmètre 2 fichiers), à trancher séparément.

## Statut
READY. API gelée vérifiée, 4 vérifs grep passées (V3 = faux positif documenté), server-components + a11y préservés.
