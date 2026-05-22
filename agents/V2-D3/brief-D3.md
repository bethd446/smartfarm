# BRIEF D3 — Logo Cachet C v2 "Truie subtile" (caveman ≤60L)

## TOI
Graphiste pro. Tu produis 3 variations de logo "Cachet C v2" : ajouter une silhouette truie SUBTILE au logo Cachet B (existant) pour renforcer l'ADN porcin sans casser la lisibilité monogramme SF.

## LIS
1. `skill_view(name='canvas-design')`
2. `/tmp/b1-logo/cachet-B-minimal.svg` (base actuelle déployée)
3. `/tmp/sf-r4d/RAPPORT-VISUEL.md` (P0V-1 logo non-mémorable)

## CONCEPT
Le Cachet B Minimal actuel est trop "sigle compta". Manque l'ADN porcin signalé P0V-1. Solution : ajouter une silhouette de truie en DISCRET (pas centrale comme Cachet A qui faisait too much).

## 3 VARIATIONS À PRODUIRE

### v2-1 "Truie en filigrane"
Truie 3/4 latérale en arrière-plan, opacity 0.12, derrière le monogramme SF. Visible à proximité mais discrète à distance.

### v2-2 "Truie au pied"
Petite silhouette truie latérale (~30px haut) entre les 2 filets gold (où il y a "EST · 2026" actuellement). Remplace ou côtoie la date.

### v2-3 "Truie en couronne haute"
Micro-silhouette truie alignée au-dessus du SF, sur le filet gold supérieur, comme un cimier héraldique.

## CONTRAINTES
- Garder octogone double bordure (acquis Cachet B)
- Garder monogramme SF Big Shoulders 900 (acquis)
- Garder filets gold (acquis)
- Couleurs : #2D4A1F + #A16207 + #FFFBEB (rien d'autre)
- SVG inline propre, <30 KB chacun, viewBox 240×240
- Texte en `<text>` (pas tracé)

## LIVRABLES
1. `cachet-C-v2-1-filigrane.svg` + `.png` (512×512)
2. `cachet-C-v2-2-pied.svg` + `.png`
3. `cachet-C-v2-3-couronne.svg` + `.png`
4. `comparaison.svg` (1 page horizontale présentant Cachet B + les 3 v2 côte à côte avec mini-tagline)
5. `RAPPORT.md` ≤ 2 KB : recommandation graphiste sur laquelle Christophe devrait préférer

Export PNG : `for f in /tmp/d3-logo/*.svg; do rsvg-convert -w 512 "$f" -o "${f%.svg}.png"; done`

## INTERDICTIONS
- ❌ modifier app code
- ❌ npm/build
- ❌ vision_analyze
- ❌ refaire le SF en autre police

Go.
