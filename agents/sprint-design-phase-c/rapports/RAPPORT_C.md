# RAPPORT C — Card grids identiques → composition éditoriale

Périmètre : 2 fichiers exactement.
- `app/src/app/(app)/conseiller/page.tsx`
- `app/src/app/(app)/batiments/page.tsx`

`card.tsx`, `ui/*`, `tip-card.tsx` : **non touchés** (vérifié mtime 25 mai 16:26, antérieur à la session).

---

## conseiller/page.tsx

**AVANT** : grille responsive `grid-cols-1 md:2 lg:3 xl:4` de N `<TipCard>` strictement identiques (titre + 2 badges + résumé + tags), monotonie "card slop".

**APRÈS** : liste éditoriale numérotée (`<ol>`), filet primary 2px en tête + hairlines `--sf-line` entre items. Chaque ligne = numéro catalogue `01/02…` (Big Shoulders, tabular-nums) + titre Big Shoulders inline avec badges catégorie/niveau, résumé `line-clamp-2`, tags, chevron. Densité ↑, hiérarchie par numérotation + filet, pas N cards égales.

Data 100% préservée (lue depuis le fetch réel `tips_conseiller`, champs `slug, titre, categorie, niveau, resume, tags`) :
- `href={/conseiller/${t.slug}}` (déplacé inline depuis TipCard, conservé)
- catégorie via `CATEGORIE_BADGE_VARIANT` + `CATEGORIE_LABELS`, niveau via `NIVEAU_LABELS` (imports existants réutilisés)
- résumé, tags (4 visibles + `+N`), ordre serveur (categorie→titre), pagination/filtres/KPI cards/recherche **intacts**
- numéro = `(page-1)*PAGE_SIZE + i + 1` (continu sur pagination)

KPI cards (4× `<Card>`) et empty state inchangés. `TipCard` n'est plus rendu ici mais reste utilisé nulle part ailleurs sous ce périmètre ; import retiré sans casse.

## batiments/page.tsx

**AVANT** : grille `grid-cols-1 md:2 lg:3` de cards `<Card>` identiques (nom+badge type / capacité / surface / cases / occupation), répétée N fois.

**APRÈS** : registre liste dense (`<ul>`), filet primary 2px + hairlines, en-tête de colonnes (eyebrow Big Shoulders) en desktop. Deux layouts nets :
- **mobile (360-414px)** : bloc 2 lignes — `NN` + nom (Big Shoulders) + badge type, puis ligne secondaire dense (surface · cases · capacité | occupation + badge taux).
- **desktop ≥md** : vraies colonnes tabulaires alignées (num / nom+type / capacité / surface / cases / occupation+taux / chevron), tous chiffres `font-mono tabular-nums`.

Data 100% préservée (fetch réel `batiments` + `animaux statut=actif`, enrichi `taux`) :
- `href={/batiments/${b.id}}` (1 lien, préservé)
- `b.nom, b.type, b.capacite, b.surface_m2, b.cases?.length, b.animauxActifs.length, b.taux` tous affichés
- logique badge taux (`success/warning/danger` selon ≥70/≥90) préservée à l'identique
- bouton "Nouveau bâtiment" et empty state préservés

Imports `Card/CardHeader/CardTitle/CardContent` retirés (plus utilisés), `ChevronRight` ajouté.

---

## Vérifications (sorties réelles)

```
1. grep -c "href=" :
   batiments  : AVANT 1  → APRÈS 1   (préservé)
   conseiller : AVANT 6  → APRÈS 7   (+1 : href slug désormais inline, ≥ origine ✓)

2. grep -i "instrument serif|sf-font-editorial" → 0 (aucun)   ✓ registre app

3. grep -i "border-l-[2-9]|backdrop-blur|linear-gradient" → 0 (aucun)   ✓ anti-patterns absents
```

Cohérence : 0 référence morte (`TipCard`=0, imports `card.tsx`=0 dans batiments), tous variants Badge utilisés existent (`info/danger/success/warning/secondary/outline`), tokens employés tous réels (`--sf-primary/ink/muted/subtle/line/surface-1/surface-2/font-display`).

Garde-fous respectés : Big Shoulders titres/eyebrows, Instrument Sans body (hérité), tabular-nums chiffres, cibles `min-h-[44px]`, mobile-first, filet primary 2px (`border-t-2`, pas de side-stripe), 0 glassmorphism/gradient.

## Divergences brief

- **conseiller href 6→7** : le brief demande "AVANT==APRÈS, ≥ origine". Le href `/conseiller/${slug}` vivait dans `tip-card.tsx` (hors scope). En remplaçant `<TipCard>` par une liste inline, ce lien revient dans `page.tsx` → +1. Aucun lien perdu, contrainte "≥ origine" satisfaite. C'est mécanique, pas une régression.
- **Pas de tsc/build** : respecté (interdit brief). Vérif limitée au grep + relecture JSX. Recommandation : `npx tsc --noEmit` côté orchestrateur avant commit (protocole CLAUDE.md §4).
