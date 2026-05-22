# Rapport CHANT-B — Bâtiments cliquables

## Statut
✅ Terminé

## Périmètre touché
- `src/app/(app)/batiments/page.tsx` — modifié
- `src/app/(app)/batiments/[id]/page.tsx` — créé
- Aucune migration DB. Aucun autre module touché.

## Travaux réalisés

### 1. `/batiments/page.tsx` — Cartes cliquables + occupation
- Chaque card est désormais wrappée dans `<Link href={"/batiments/${id}"}>` avec hover + focus ring.
- Query enrichie : `cases(id, numero, capacite, type, animaux(id, tag, statut, sexe, categorie))`.
- Calcul côté serveur : `animauxActifs` (filter `statut === 'actif'`) + `taux = animaux / capacite * 100`.
- Nouveau bloc en bas de card : "Occupation : N / capacité + Badge taux %".
- Badge taux couleur : `success` (<70%), `warning` (70–89%), `danger` (≥90%).
- Conservation du métadata `title: 'Bâtiments — Smart Farm'` (ajouté explicite).
- Conservation du style carnet (typo Big Shoulders, couleurs sf-*).

### 2. `/batiments/[id]/page.tsx` — Page détail créée
- Signature Next 16 : `params: Promise<{ id: string }>` → `await params`.
- Query unique chargeant cases + animaux + races(nom).
- `notFound()` si bâtiment inexistant ou supprimé (`deleted_at IS NULL`).
- Header : breadcrumb retour `← Tous les bâtiments`, nom, badge type, capacité, surface, total animaux.
- 4 KPI cards (animaux présents, capacité totale, taux occupation + badge état, nb cases).
- Liste des cases triées numériquement par `numero`, chacune avec :
  - Badge `N / capacité` (danger si surcharge)
  - Liste animaux : tag (lien vers `/cheptel/[id]`), nom, sexe, catégorie, race
  - `Case vide` (italique) si aucun animal actif
- `EmptyState` si aucune case configurée.
- `generateMetadata` dynamique : `"<nom du bâtiment> — Bâtiment — Smart Farm"`.

## Vérifications
- `npx tsc --noEmit` : **0 erreur** (global + ciblé sur batiments).
- HTTP `/batiments` : 200 (serveur standalone, build actuel).
- HTTP `/batiments/[id]` : 404 sur serveur actuel — **normal**, l'orchestrateur rebuild en fin de vague.
- DB : 5 bâtiments, dont 2 avec cases (Maternité A: 3, Verraterie C: 2). 0 animal actif présent → EmptyState par case affichera "Case vide" (cas démo conforme au brief).

## Composants & patterns réutilisés
- `Card, CardContent, CardHeader, CardTitle` (composant patché double-trait)
- `Badge` (variants : default, outline, secondary, success, warning, danger)
- `EmptyState` (icon, title, description)
- `Link` Next.js (cliquabilité + retour)
- Lucide : `Building2, Plus, ArrowLeft, Boxes`

## Anti-pièges respectés
- ✅ Pas de modification DB
- ✅ `await params` (Next 16)
- ✅ EmptyState quand pas de cases / "Case vide" quand pas d'animaux
- ✅ Métadata `title` conservé sur les deux pages
- ✅ Pas de `npm run build` lancé
- ✅ Pas de touche autres modules

## Points d'attention orchestrateur
- Aucun. Build standalone à régénérer pour servir `/batiments/[id]` (attendu).
- Données démo : 0 animal `statut='actif'` → si tests visuels souhaités, seeder quelques animaux avec `case_id` et `statut='actif'`.
