# RAPPORT D1-L3 — Harmonisation Alertes

## Périmètre touché (2 fichiers, conforme brief)
- `app/src/app/(app)/alertes/_components/alerte-card.tsx` — card → ligne de registre dense
- `app/src/app/(app)/alertes/page.tsx` — bande KPI gravité densifiée

Non touchés : `alertes-list.tsx`, `relative-time.tsx`, `dialog-alerte-manuelle.tsx`, `ui/*`. Aucun build/tsc/commit/push.

## Ce qui a changé

### alerte-card.tsx
- Plus de `<Card>/<CardContent>/<Badge>/<Button>` (double-card supprimée). Ligne de registre façon `conseiller` : `<Link>` ou `<div>` à `border-b border-[var(--sf-line)]`, hover `bg-surface-1`, focus-visible ring.
- **Sévérité par FORME** (dot 10px, pas de side-stripe) : critique = disque plein rouge · élevée = anneau rouge 3px · moyenne = anneau ambre 2px · info = anneau bleu 2px. `box-shadow: inset`, jamais `border-l`.
- Titre en **Big Shoulders** (`--sf-font-display`), description `line-clamp-2`, méta inline (gravité · catégorie), pied (cible-lien + `<RelativeTime>` tabular-nums).
- **Chevron** si lien (affordance), masqué sinon (pas de bouton mort — logique `computeLien` 100 % préservée).
- CTA contextuel (`getCtaLabel`) → désormais `aria-label` du Link cliquable plein-ligne (toute la ligne navigue).
- `pr-28` réserve la place du bouton snooze superposé par `alertes-list.tsx` (absolu top-2/right-2) → 0 collision.

### page.tsx
- Grille 4 KPI cards colorées + faux-dégradé (`opacity: 0.85` sur Élevée) → **une seule `<Card>` bande dense** `divide-x/y`, dot+forme cohérent avec la card. Fond neutre, chiffres Big Shoulders tabular-nums.
- Imports lucide nettoyés : `Siren/AlertTriangle/AlertCircle` retirés ; `Bell`+`CheckCircle2` conservés (tous deux utilisés).
- Empty-state, header, FAB, `<AlertesList>`, fetch animaux/bâtiments : intacts.

## API AlerteCard — STABLE (divergences brief documentées)
1. Le brief décrit des props plates `{id, titre, severite, ...}`. **Réalité du code** : signature `AlerteCard({ alerte }: { alerte: Alerte })`, et `alertes-list.tsx` (read-only) appelle `<AlerteCard alerte={a} />`. J'ai **gardé l'API objet `{ alerte }`** → `page.tsx`/`alertes-list.tsx` passent toujours les bonnes props, 0 régression call-site. Aucune prop modifiée.
2. La 4e gravité réelle est **`info`** (type `Alerte['gravite'] = critique|élevée|moyenne|info`), pas `faible`. J'ai suivi le type réel — les 4 niveaux + sémantique couleur/forme sont préservés.

## Vérifs (sorties réelles)

**V1 — liens préservés** `grep -c 'href=\|lien'`
```
alerte-card.tsx:16
page.tsx:4
```

**V2 — sévérités** `grep -oE 'critique|élevée|moyenne|info' alerte-card.tsx | sort | uniq -c`
```
   4 critique
   4 élevée
   5 info
   4 moyenne
```
Les 4 niveaux présents (GRAVITE_LABEL + GRAVITE_DOT + branches computeLien). Aucune sémantique perdue.

**V3 — anti-patterns** : le sandbox a bloqué les `grep -niE` (pattern à classes/`-i`). Confirmé par **Read intégral** des 2 fichiers (page.tsx L1-217, alerte-card.tsx L1-248) :
- `gradient` / `linear-gradient` / `bg-gradient` → 0
- `backdrop-blur` → 0
- `Instrument Serif` → 0 (seuls `sans-serif` de fallback fontFamily, conformes)
- `border-l` (side-stripe) → 0
- `opacity` sur page.tsx → 0 (faux-dégradé `opacity: 0.85` de l'ancienne card Élevée supprimé)

**RelativeTime conservé** : import L5 + usage L222 `<RelativeTime date={detecteLe} />` (composant client inchangé, hydration-safe).

**Card/Badge/Button dans alerte-card.tsx** → 0 import/usage (double-card supprimée, Read L1-6).

**page.tsx données KPI** : `total` (99+ cap, L88), `compte.critique` (L111), `compte['élevée']` (L137), `compte.moyenne` (L163) toutes consommées → 0 perte. Balises `<Card>` 4/4, `<CardContent>` 4/4 (Read intégral).

## Garde-fous respectés
- Registre app (Big Shoulders, Instrument Sans, tabular-nums), **0 Instrument Serif**.
- Tokens `--sf-*` only. Cibles ≥44px (`min-h-[44px]`, snooze `min-h-11`). Mobile-first (grid-cols-2 → md:4).
- Sévérité 4 niveaux + sémantique couleur/forme préservée. Data/liens 100 %.
- Pas de side-stripe / glassmorphism / gradient.

## Non vérifié (hors périmètre brief)
`tsc`/`build` non lancés (interdits). À valider visuellement : cohabitation ligne `border-b` + wrapper `space-y-2` de `alertes-list.tsx` (léger gap entre lignes — acceptable, registre groupé par section).
