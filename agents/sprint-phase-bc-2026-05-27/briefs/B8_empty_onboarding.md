# BRIEF B8 — Composant `<EmptyOnboarding>` + application 4 écrans empty

## TOI
Senior React + Tailwind v4 design system. Mode caveman.

## PÉRIMÈTRE
✅ Touche :
  - `app/src/components/ui/empty-onboarding.tsx` (CRÉE new)
  - `app/src/app/(app)/stock/page.tsx` UNIQUEMENT bloc empty state (l.236-240)
  - `app/src/app/(app)/alimentation/plans/page.tsx` UNIQUEMENT bloc empty state
  - `app/src/app/(app)/sanitaire/calendrier/page.tsx` UNIQUEMENT bloc empty state
  - `app/src/app/(app)/sanitaire/protocoles/page.tsx` UNIQUEMENT bloc empty state
❌ Touche pas : autres routes, layouts, composants existants `<EmptyState>` (s'il existe, EmptyOnboarding est plus riche)

## CONTEXTE
- Repo `/Users/13mac/smartfarm/`
- Brief V2 §A8 et §10.4 mentionnent `<EmptyOnboarding>` cible 8+ écrans (on en fait 4 ici, les 4 autres pour Vague 3)
- Stack : Server Component compatible (pas de hook), Tailwind v4, palette `--sf-*`
- Tokens existants : `--sf-mil-50` (fond), `--sf-sahel-700` (vert primaire), `--sf-or-600` (accent), `--sf-ink` (texte)
- Composant existant `<EmptyState>` peut exister déjà (vérifier `components/ui/`) — EmptyOnboarding plus riche (illustration + CTA pédago)

## MISSION

### 1. Composant `<EmptyOnboarding>` (créer)
```tsx
type EmptyOnboardingProps = {
  /** Icône Lucide (ex: <Stethoscope />) - taille 48px */
  icon: React.ReactNode
  /** Eyebrow contextuel court (ex: "MODULE PROTOCOLES") */
  eyebrow?: string
  /** Titre H2 pédagogique (ex: "Aucun protocole enregistré") */
  title: string
  /** 1-2 lignes "pourquoi c'est utile" en français simple */
  description: string
  /** CTA principal "Commencer en 30s" */
  cta?: { label: string; href: string }
  /** CTA secondaire optionnel ("Voir un exemple") */
  ctaSecondary?: { label: string; href: string }
  className?: string
}
```

Layout :
- Card fond `--sf-mil-50` border `--sf-line`, padding généreux (32-48px), centré
- Icône Lucide 48px sahel-700
- Eyebrow uppercase tracking-wide 12px gris-secondaire (utilise token `--sf-ink-secondary` si dispo)
- Title : Big Shoulders Display 24-28px sahel-700
- Description : Instrument Sans 14-16px ink-secondary, max-width 60ch
- CTA primary : Button variant=`default` (vert sahel-700)
- CTA secondary : Button variant=`outline`

Server-component compatible (pas de `'use client'`, pas de hooks).

### 2. Appliquer 4 écrans

**a. `/stock` empty** (actuellement "Aucun article en stock") :
```tsx
<EmptyOnboarding
  icon={<Package className="h-12 w-12" />}
  eyebrow="MODULE STOCK"
  title="Ton inventaire est vide"
  description="Enregistre ta première matière première (maïs, tourteau soja…) pour suivre ton stock en temps réel et recevoir des alertes en cas de rupture."
  cta={{ label: "Ajouter un article", href: "/stock?action=new" }}
  ctaSecondary={{ label: "Voir le référentiel CI", href: "/alimentation/matieres" }}
/>
```

**b. `/alimentation/plans` empty** :
```tsx
<EmptyOnboarding
  icon={<Wheat className="h-12 w-12" />}
  eyebrow="PLANS D'ALIMENTATION"
  title="Aucun plan d'alimentation enregistré pour ce filtre"
  description="Planifie la ration de chaque bande selon son stade physiologique (gestation, lactation, sevrage…). Smart Farm calcule les quantités et coûts auto."
  cta={{ label: "Créer un premier plan", href: "/alimentation/plans?action=new" }}
/>
```

**c. `/sanitaire/calendrier` empty** :
```tsx
<EmptyOnboarding
  icon={<Calendar className="h-12 w-12" />}
  eyebrow="CALENDRIER SANITAIRE"
  title="Aucun acte planifié pour ce filtre"
  description="Les actes attendus (fer J3, vaccins J21, vermifuges) sont auto-générés depuis tes protocoles vaccinaux + bandes en cours."
  cta={{ label: "Voir les protocoles", href: "/sanitaire/protocoles" }}
/>
```

**d. `/sanitaire/protocoles` empty** :
```tsx
<EmptyOnboarding
  icon={<ShieldCheck className="h-12 w-12" />}
  eyebrow="PROTOCOLES VACCINAUX"
  title="0 protocoles actifs"
  description="Définis tes protocoles standards (cochette pré-saillie, truie gestante, porcelet sevrage). Smart Farm les projette automatiquement sur le calendrier de chaque bande."
  cta={{ label: "Créer un premier protocole", href: "/sanitaire/protocoles?action=new" }}
  ctaSecondary={{ label: "Voir les 3 standards IFIP", href: "/sanitaire/protocoles?seed=ifip" }}
/>
```

Pour chaque écran : remplacer juste le bloc empty state (le reste de la page intact). Si paramètre `?action=new` pas géré par la route, garder le href, le futur fix B6/autre câblera le dialog.

## VÉRIFICATIONS OBLIGATOIRES
```bash
cd /Users/13mac/smartfarm/app
npx tsc --noEmit -p tsconfig.json
```

## LIVRABLES
1. `app/src/components/ui/empty-onboarding.tsx` (créé)
2. 4 fichiers `page.tsx` patchés (modifs minimales)
3. Rapport `agents/sprint-phase-bc-2026-05-27/RAPPORT_B8.md` (≤80 lignes caveman)

## ANTI-PIÈGES
- ❌ Ne JAMAIS réécrire les pages entières — Edit ciblé sur le bloc empty uniquement
- ❌ Server Component STRICT (pas de hook React, pas de `useState`)
- ❌ Tokens `--sf-*` only, pas de couleur en dur
- ❌ Pas d'icône Unicode (`~`, `+`, `▣`) — Lucide React only

Mode caveman.
