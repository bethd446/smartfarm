# BRIEF B1-A — LOGO "Cachet Ivoire" (caveman ≤80L)

## TOI
Graphiste pro. Tu produis 3 variations de logo SVG + 1 wordmark exercice (3 noms candidats) + 1 export PNG par variation. Pas re-build app, pas modifier code source.

## LIS D'ABORD
1. `skill_view(name='canvas-design')` — méthode design philosophy
2. `skill_view(name='brand-guidelines')` — règles application charte
3. `/tmp/sf-r4d/RAPPORT-VISUEL.md` (recos identité)
4. CONTEXT.md section "CHARTE Terrain Vivant"

## CONCEPT (validé par audit R4-D)
"Cachet Ivoire" = tampon vétérinaire/coopérative ivoirienne. Octogone, encre saturée, registre officiel. Inspi : tampons SACO cacao, Service Élevage CI.

## INPUTS contraints
- Forme : octogone (8 côtés réguliers, ~240×240px artwork)
- Couleur principale : #2D4A1F (vert sahel — validé charte)
- Accent : #A16207 (harvest gold WCAG)
- Bordure : double-trait gravure (extérieur 4px + intérieur 1.5px à 8px)
- Center : silhouette truie latérale 3/4 face (négatif sur fond vert OU positif sur fond crème)
- Monogramme "SF" en Big Shoulders Display, font-weight 900, uppercase
- Tagline arc inférieur (optionnelle, micro) : "YAMOUSSOUKRO · CI · 2026"

## LIVRABLES (5 fichiers SVG + 5 PNG export 512×512)
1. `cachet-A-classic.svg` — silhouette truie négatif fond vert, monogramme SF haut, tagline arc bas
2. `cachet-B-minimal.svg` — juste monogramme SF + bord octogone double, pas de truie (option épurée)
3. `cachet-C-pleine.svg` — fond vert plein, truie + SF en blanc/gold, tagline arc complet
4. `wordmark-trio.svg` — 1 page A4 paysage présentant les 3 noms candidats côte à côte :
   - "SMART FARM" (existant)
   - "EBURNEA FARM"
   - "AKWABA FARM"
   Chacun avec son logo Cachet à gauche, wordmark Big Shoulders à droite, tagline.
5. `application-test.svg` — mockup d'application réelle : 1 cachet sur bocal, 1 sur cachet papier (à l'encre), 1 sur t-shirt poitrine.

Exports PNG via : `cd /tmp/b1-logo && for f in *.svg; do rsvg-convert -w 512 "$f" -o "${f%.svg}.png"; done`
Vérifier `which rsvg-convert` d'abord, fallback `inkscape --export-type=png --export-width=512`.

## CONTRAINTES STRICTES
- SVG inline propre (viewBox, pas de width/height en px fixe sur <svg>)
- Texte en `<text>` (pas tracé) pour wordmark — police font-family="Big Shoulders Display" + fallback "Impact, sans-serif"
- 0 dépendance externe (pas d'href, pas d'image embeddée)
- Code SVG lisible (indenté), commentaires brefs <!-- -->
- Tailles fichier <30 KB chacun

## SORTIE
- Tous fichiers dans `/tmp/b1-logo/`
- 1 rapport `/tmp/b1-logo/RAPPORT-LOGO.md` ≤ 4 KB qui :
  - Liste les 5 livrables + tailles
  - Pour chaque variation A/B/C : 1 phrase justifiant le choix créatif
  - 1 recommandation finale (laquelle proposer à Christophe)
  - Liste les noms testés et lequel sonne le plus "marque-mère"

## INTERDICTIONS
- ❌ npm/build
- ❌ modifier code app
- ❌ vision_analyze
- ❌ générer logo via API externe payante
- ❌ skill autre que canvas-design / brand-guidelines

Go. Tu es graphiste, produit propre et rapide.
