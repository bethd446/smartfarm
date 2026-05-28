# Brief B — Harmonisation empty-states

## TOI
Dev senior React/Tailwind + design system. Tu harmonises et polis 2 composants empty-state partagés, **sans changer leur API** (26 usages dépendent des props actuelles).

## LIS D'ABORD (obligatoire)
1. `CLAUDE.md` (racine)
2. `DESIGN.md` sections Typography (registre app = Big Shoulders) + Anti-patterns + Components
3. `app/src/components/ui/empty-state.tsx` (69 l, 21 usages)
4. `app/src/components/ui/empty-onboarding.tsx` (123 l, 5 usages)
5. `app/src/components/ui/button.tsx` — vérifier variants/sizes dispo (ne pas inventer)

## Périmètre
✅ Touche EXACTEMENT 2 fichiers :
- `app/src/components/ui/empty-state.tsx`
- `app/src/components/ui/empty-onboarding.tsx`

❌ Touche pas :
- Aucune page utilisatrice (les 26 usages restent intacts grâce à l'API stable)
- `button.tsx`, `card.tsx`, autres ui/*
- Tout autre fichier

❌ Pas `npm run build`, pas `npx tsc`, pas commit, pas push.

## CONTRAINTE ABSOLUE — API STABLE
Les **props publiques NE CHANGENT PAS** (sinon 26 fichiers cassent) :
- `EmptyState` : `{ icon?, title, description?, tone?, cta?, className? }` — INCHANGÉ
- `EmptyStateTone` = `'default' | 'good'` — INCHANGÉ
- `EmptyOnboarding` : `{ icon, eyebrow?, title, description, cta?, ctaSecondary?, className? }` — INCHANGÉ

Tu peux changer le RENDU interne (JSX, classes, styles), JAMAIS la signature des props ni les types exportés.

## Mission — harmoniser le rendu
État actuel : les 2 composants sont fonctionnels mais incohérents entre eux (tokens, spacing, strokeWidth icônes, échelle typo). Objectif : cohérence visuelle + alignement DESIGN.md, registre app interne (Big Shoulders conservé pour titres — PAS de bascule editorial).

1. **Tokens unifiés** : utiliser strictement les tokens `--sf-*` (pas de hex en dur quand un token existe). Vérifier que `--sf-ink-secondary` / `--sf-subtle` / `--sf-muted` sont cohérents entre les 2.
2. **Spacing grille 4/8/16/24** (charte) : harmoniser les py/px/mb des 2 composants sur la même grille.
3. **Icône** : `strokeWidth={1.5}` cohérent sur les 2 (EmptyState l'a, vérifier EmptyOnboarding).
4. **Typo** : titres en `--sf-font-display` (Big Shoulders) — déjà le cas, garder. Vérifier l'échelle (EmptyState 12px uppercase eyebrow-style, EmptyOnboarding clamp 22-28px titre). Cohérence des `letter-spacing`.
5. **Palette `tone`** : EmptyState a `default`/`good`. Vérifier que `good` utilise bien `--sf-primary` (vert Sahel = bonne nouvelle, cf charte). Pas de gradient, pas de shadow (déjà respecté).
6. **EmptyOnboarding** : la card utilise `--sf-radius-lg` fallback 12px — aligner sur les tokens `rounded` du DESIGN.md (lg=14px). Bordure complète fine (pas de side-stripe).
7. **A11y** : `aria-hidden` sur icônes décoratives (déjà partiel), vérifier.

## Garde-fous
- N'ajoute PAS de nouvelle prop (API gelée)
- Ne retire AUCUNE prop existante
- Reste server-component compatible (pas de `'use client'`, pas de hook)
- Pas de gradient, pas de shadow décoratif, pas de side-stripe

## VÉRIFICATIONS OBLIGATOIRES (sorties réelles dans le rapport)
1. `grep -c "export interface EmptyStateProps\|export interface EmptyOnboardingProps\|export type EmptyStateTone" app/src/components/ui/empty-state.tsx app/src/components/ui/empty-onboarding.tsx` → types exportés toujours présents
2. `grep "icon?\|title\|description\|tone?\|cta\|eyebrow?\|ctaSecondary?" app/src/components/ui/empty-state.tsx app/src/components/ui/empty-onboarding.tsx` → toutes les props d'origine présentes (compare à la liste ci-dessus)
3. `grep -c "'use client'" app/src/components/ui/empty-state.tsx app/src/components/ui/empty-onboarding.tsx` → 0 (server-component préservé)
4. `grep -i "border-l-[2-9]\|backdrop-blur\|linear-gradient\|box-shadow\|drop-shadow" app/src/components/ui/empty-state.tsx app/src/components/ui/empty-onboarding.tsx` → 0 (anti-patterns absents)

## LIVRABLE
`agents/sprint-design-phase-c/rapports/RAPPORT_B.md` (≤80 lignes). Liste des harmonisations + confirmation API gelée + vérifs grep réelles.

## INTERDITS
- ❌ Changer/ajouter/retirer une prop publique
- ❌ Ajouter `'use client'` ou un hook
- ❌ Toucher une page utilisatrice ou un autre composant ui/*
- ❌ Build/tsc/commit/push
- ❌ Rapport > 80 lignes

Go.
