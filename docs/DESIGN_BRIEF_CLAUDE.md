# Design Brief — Smart Farm CI

> Document destiné à **Claude Design** (feature "Set up your design system" de Claude.ai).
> Lis ce fichier en complément de [`DESIGN.md`](../DESIGN.md) à la racine.

---

## Qui on est

**Smart Farm CI** est une web-app de gestion d'élevage porcin **multi-fermes**, déployée en production à [smartfarm.group](https://smartfarm.group). La marque est **mère** : plusieurs fermes ivoiriennes (Smart Farm CI-01, etc.) tournent dessus, chacune avec son cheptel, ses bandes, son sanitaire.

- **Métier** : élevage porcin tropical (truies, verrats, porcelets, cochettes — vocabulaire FR pro zootechnique).
- **Géographie** : Côte d'Ivoire, climat tropical humide, monnaie XOF (FCFA).
- **Stade produit** : v0.4.0 — prod live, ~50 pages, environ 44 tables Supabase, 102 RLS policies.
- **Stack** : Next.js 16 (App Router, output standalone) + React 19 + TypeScript + Tailwind CSS v4 (CSS-first `@theme`) + shadcn/ui (radix primitives) + Supabase (auth Magic Link, RLS, Postgres 17).

## Notre cible utilisateur

- **Persona principal** : éleveur ou technicien d'élevage ivoirien.
- **Device** : smartphone Android, écran 360–414px, parfois plein soleil, parfois en porcherie (gants, doigts humides).
- **Réseau** : 4G variable, parfois 3G. **Le poids JS et l'absence de blocking calls comptent.**
- **Technicité** : modeste à élevée selon le profil. L'interface doit rester **lisible sans formation**, mais le vocabulaire métier est **strict** (Saillie, Mise bas, Sevrage, Gestation, Cochette, Verrat).
- **Persona secondaire** : gestionnaire / responsable multi-fermes, sur desktop, qui consulte les KPI agrégés (MCA, IC, GMQ — indicateurs IFIP).

## Ce qu'on a déjà (à respecter / améliorer, pas refondre)

- **Tailwind v4** avec `@theme` CSS-first dans `app/src/app/globals.css` — voir les tokens `--sf-*` (palette Terre & Mil). Tous les tokens DESIGN.md sont extraits de ce fichier.
- **shadcn/ui** primitives dans `app/src/components/ui/` (button, card, dialog, dropdown, sheet, table, tabs, etc.).
- **Polices self-hosted** dans `app/public/fonts/` : Big Shoulders Display (titrage) + Instrument Sans (texte).
- **Composants métier** déjà construits dans `app/src/components/` : `app-shell.tsx`, `sidebar.tsx`, `bottom-nav.tsx`, `barcode-scanner.tsx`, `quick-actions-fab.tsx`, `contrast-toggle.tsx`.
- **Mode dark** + **mode haut contraste** (`html[data-contrast='high']`) déjà implémentés.
- **Cibles tactiles ≥ 44px** appliquées globalement via CSS sur `pointer: coarse`.

## Ce qu'on veut perfectionner (priorité Claude Design)

### 1. Landing page publique (`smartfarm.group/`)
- Pitch clair en haut : "Gérer un élevage porcin tropical, sans Excel."
- Section "Pourquoi Smart Farm" — bénéfices terrain, pas vocabulaire marketing.
- Section preuve : screenshot dashboard, screenshot fiche truie, screenshot KPI bande.
- CTA "Demander un accès" (formulaire / magic link).
- Mention Côte d'Ivoire explicite (drapeau, langue, FCFA).

### 2. Pages auth (`/connexion`, `/inscription`, `/mot-de-passe-oublie`)
- **Magic link** comme méthode principale (déjà câblé Supabase).
- Pages sobres, formulaire centré, max-width ~400px.
- Empty/error states clairs ("Lien envoyé à …", "Lien expiré, redemander").

### 3. Dashboard (`/dashboard`)
- Charge utile **dense** : effectif cheptel, alertes du jour, indicateurs reproduction en cours, KPI bande active.
- Hiérarchie : alertes critiques en haut > KPI vedette > listes secondaires.
- Mobile-first impératif.

### 4. Pages métier
- **Cheptel** (`/cheptel`) : liste truies/verrats/porcelets, filtres par bande/bâtiment/statut.
- **Reproduction** (`/reproduction`) : flux Saillie → Diagnostic gestation → Mise bas → Sevrage.
- **Sanitaire** (`/sanitaire`) : calendrier vaccinations porcelets (J1/J5/J14/J28), biosécurité, mortalités.
- **Alimentation** (`/alimentation`) : matières premières CI XOF, formulations, plans, consommations.
- **Bandes** (`/bandes`) : suivi cohortes, phases (démarrage 1/2, croissance, finition), KPI IFIP.

### 5. Transverse
- **Mode haut contraste** : finaliser la couverture (certains composants oublient l'override).
- **Empty states métier** : chaque liste vide a un CTA action ("Aucune saillie ce mois — Déclarer une saillie").
- **Responsive ≥ tablette** (`md:`/`lg:`) : la sidebar gauche prend le relais du bottom-nav.

## Ce qu'on NE veut PAS

- ❌ Style "agriculture moderne" générique (vert pomme, cyan dégradés, illustrations cartoon `<svg>` happy farm).
- ❌ Couleurs flashy hors palette Terre & Mil. Pas de `#22C55E`, pas de `#06B6D4`, pas de `#A855F7`.
- ❌ Mascotte, porc rose, dessin enfantin. Le métier est sérieux.
- ❌ Glassmorphism, neumorphism, blur excessif.
- ❌ Animations décoratives. Transitions ≤ 200ms, motrices uniquement.
- ❌ Stock photos "happy farmer" — préférer photographie vétérinaire documentaire OU iconographie Lucide sobre.
- ❌ Vocabulaire FR amateur : on dit **Saillie**, pas "accouplement" ; **Mise bas**, pas "naissance" ; **Cochette**, pas "jeune truie".
- ❌ Format date US (`MM/DD/YYYY`). C'est FR (`19/05/2026` ou `19 mai 2026`).
- ❌ Toute devise autre que XOF (FCFA), format `1 250 000 FCFA`.

## Inspirations à viser

- **Stripe** — sobriété, mesure, typographie sérieuse, blanc dominant, accents rares mais marqués.
- **Linear** — densité d'information sans bruit, hiérarchie tight, états bien définis.
- **Notion** — clarté hiérarchique, navigation latérale, content-first.
- **Hubertus Hohenlohe / vieux manuels agronomiques** — pour la "vibe" éditoriale (Big Shoulders Display ≈ presse agricole condensée).

## Contraintes techniques à respecter

- **Pas de modification du code applicatif (`app/src/**`) par Claude Design en première passe.** Toute prop visuelle doit pouvoir s'implanter via tokens CSS et classes Tailwind.
- **Pas de dépendance JS lourde ajoutée.** Si une animation est proposée, elle doit tenir en CSS pure ou Framer Motion (déjà candidat, pas installé).
- **WCAG AA minimum**, AAA sur les paires danger/critical (lisibilité plein soleil).
- **Bundle JS first-load < 200 KB** côté landing publique (4G CI).
- **i18n** : tout est FR aujourd'hui. Pas d'i18n multilingue prévue à court terme — concentrer l'effort sur le **vocabulaire FR pro zootechnique** correct.

## Livrables attendus de Claude Design

1. **Refonte landing publique** (HTML/Tailwind drop-in compatible Next.js 16 App Router server component).
2. **Refonte pages auth** (connexion, inscription, magic link, oubli) sobres et cohérentes.
3. **Système de cards/KPI** réutilisable pour dashboard et pages métier.
4. **Système d'alertes 3 niveaux** (critical / high / medium) avec forme + couleur.
5. **Guide d'iconographie** (set Lucide, tailles, weights).
6. **Mockups annotés** des écrans clés (voir [`SCREENSHOTS.md`](./SCREENSHOTS.md)).

Tout livrable doit consommer les tokens définis dans [`../DESIGN.md`](../DESIGN.md) — pas de nouvelle palette, pas de nouvelle famille typo sans justification écrite.
