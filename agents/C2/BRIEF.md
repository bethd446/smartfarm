# CHANTIER C2 — Conseiller (300 tips agritech)

## Contexte

Smart Farm Next.js 16 + Supabase Docker local. Stack confirmée (C1-C7 livrés). Vocabulaire FR pro CI. Devise FCFA.
Repo `/root/projects/smartfarm/app/`. PATH important : `export PATH=/root/.hermes/node/bin:/usr/local/bin:/usr/bin:/bin`. DB port 54322. DEMO_FERME_ID `'00000000-0000-0000-0000-000000000001'`. Serveur Next standalone sur :3000.

## Mission C2

Construire un module Conseiller qui propose ~300 tips agritech actionnables organisés par thématique, avec recherche et tip du jour.

## Architecture

- **DB** : tips stockés dans une table `tips_conseiller` (V1, pas localStorage)
- **Données statiques** : 300 tips seedés via migration SQL, ils sont fixes (pas user-generated)
- **UI** : page hub `/conseiller` + page détail par tip + widget "Tip du jour" sur dashboard

## 6 sous-chantiers parallèles

---

### AGENT C2-SCHEMA — Schéma DB + page hub + UI

**Fichiers AUTORISÉS** :
- `supabase/migrations/20260521020001_tips_conseiller.sql` (NEW) — table + seed VIDE (juste structure)
- `app/src/app/(app)/conseiller/page.tsx` (NEW) — page hub avec recherche + filtres
- `app/src/app/(app)/conseiller/[slug]/page.tsx` (NEW) — page détail tip
- `app/src/app/(app)/conseiller/_components/tip-card.tsx` (NEW)
- `app/src/app/(app)/conseiller/_components/search-tips.tsx` (NEW)
- `app/src/app/(app)/dashboard/_components/tip-du-jour.tsx` (NEW) — widget dashboard
- `app/src/app/(app)/dashboard/page.tsx` (MODIFY chirurgical) — insérer `<TipDuJour />` à côté de `<AlertesWidget />`
- `app/src/components/sidebar.tsx` (MODIFY chirurgical) — ajouter "Conseiller" dans section INTELLIGENCE (à côté d'Assistant)

**Spec schéma SQL** :
```sql
create table tips_conseiller (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  titre text not null,
  categorie text not null check (categorie in ('reproduction','sanitaire','nutrition','conduite','economique','installation')),
  niveau text not null check (niveau in ('debutant','intermediaire','expert')),
  resume text not null,
  contenu text not null,
  tags text[] not null default '{}',
  source text,
  created_at timestamptz default now()
);

create index tips_conseiller_cat_idx on tips_conseiller(categorie);
create index tips_conseiller_niveau_idx on tips_conseiller(niveau);
create index tips_conseiller_tags_idx on tips_conseiller using gin(tags);

-- Pas de RLS V1 (single-tenant)
grant select on tips_conseiller to anon, authenticated, service_role;
```

**Spec page `/conseiller`** :
- Header : titre + sous-titre "300 conseils pour gérer ton élevage porcin"
- 4 KPI cards : Total tips, Tips reproduction, Tips sanitaire, Tips nutrition
- Filtres : par catégorie (6 boutons pills + "Toutes"), par niveau (3 boutons + "Tous")
- Recherche full-text simple côté server avec `searchParams.q` → filtre `ilike` sur titre + resume + tags array
- Grille de cards (3-4 par row desktop, 1 mobile) : titre + résumé + badges catégorie/niveau + tags + lien "Lire →"
- Pagination simple (50 tips par page) ou scroll infini V2

**Spec page `/conseiller/[slug]`** :
- Titre + badges catégorie/niveau
- Résumé en intro
- Contenu markdown rendu (utiliser le mini-renderer du chatbot ou react-markdown si dispo)
- Sidebar droite : tags + source + lien retour
- Footer : 3 tips similaires (même catégorie, random)

**Spec widget Tip du jour (dashboard)** :
- Card titre "💡 Tip du jour"
- Tip pseudo-aléatoire mais déterministe par jour : `tips[dayOfYear % totalCount]` (pour que tout le monde voit le même tip le même jour)
- Affiche : badge catégorie + titre + résumé (max 200 chars) + bouton "Lire →"

**Spec sidebar** :
- Ajouter "Conseiller" dans section "INTELLIGENCE" sous "Assistant"
- Icône `Lightbulb` ou `BookOpen` lucide-react

**Définition de DONE** :
- Migration appliquée (table créée vide)
- Routes HTTP 200 : `/conseiller`, `/conseiller/<slug-existant>` après seed (mais OK si vide pendant le développement)
- Build vert

---

### AGENT C2-REPRO — Rédige 60 tips reproduction

**Fichier AUTORISÉ** :
- `supabase/migrations/20260521020002_tips_reproduction.sql` (NEW) — INSERT 60 tips catégorie `reproduction`

**Format pour chaque tip** :
```sql
insert into tips_conseiller (slug, titre, categorie, niveau, resume, contenu, tags, source) values
('reperer-chaleurs-truie', 'Repérer les chaleurs d''une truie', 'reproduction', 'debutant',
 'Une truie en chaleur présente 3 signes principaux : œstrus visible (vulve rouge gonflée), réflexe d''immobilisation au test du dos, comportement agité.',
 E'## Les 3 signes infaillibles\n\n### 1. Signes vulvaires\n...\n\n### 2. Test du dos (réflexe d''immobilisation)\n...\n\n### 3. Comportement\n...',
 ARRAY['chaleur', 'truie', 'œstrus', 'IA', 'monte'],
 'INRA 2018 + IFIP'),
...
```

**60 sujets à couvrir** (réparts en 20 débutant / 25 intermédiaire / 15 expert) :

Cycle œstral et chaleurs (10) :
1. Repérer les chaleurs d'une truie
2. Test du dos : technique correcte
3. Durée et phases du cycle œstral porcin
4. Synchronisation des chaleurs (groupes de truies)
5. Effet mâle pour induire l'œstrus
6. Anœstrus post-sevrage : causes et solutions
7. Anœstrus de fin de gestation
8. Score de chaleur : grille pratique
9. Repérer les chaleurs silencieuses
10. Fréquence des observations en bande

Saillie naturelle (8) :
11. Verrat actif : choisir le bon mâle
12. Préparer la cabine de saillie
13. Saillie supervisée vs libre
14. Nombre de saillies par cycle
15. Délai optimal entre détection et saillie
16. Verrat fatigué : signes d'alerte
17. Rotation des verrats
18. Notation des saillies (carnet d'élevage)

Insémination artificielle (12) :
19. IA porcine : avantages vs monte naturelle
20. Conservation des doses semence (température, durée)
21. Cathéter IA : choix et hygiène
22. Technique IA en 7 étapes
23. Moment optimal d'IA après détection
24. Double IA : intérêt
25. Génétique : choisir un verrat IA (lignées CI)
26. Coût IA vs verrat propre
27. Échec d'IA : diagnostic
28. Centre IA porcin en Côte d'Ivoire (où trouver semence)
29. Décongélation et tempérage de la dose
30. Hygiène pré-IA : nettoyage truie

Gestation (10) :
31. Diagnostic de gestation à 21-28 jours
32. Échographie portable : usage pratique
33. Logement truies gestantes (groupes vs box)
34. Alimentation truie gestante (courbe MS/jour)
35. Stress thermique et avortement
36. Vaccinations en gestation (parvo, lepto, rouget)
37. Vermifugation truies gestantes
38. Retour en chaleur post-saillie : causes
39. Avortements à répétition : protocole d'investigation
40. Gestation pseudogestation : reconnaître

Mise bas (10) :
41. Préparer la maternité (température, sol)
42. Signes annonciateurs de la mise bas
43. Assister une mise bas difficile
44. Soins immédiats au porcelet (cordon, dents, queue)
45. Adoption croisée : règles
46. Lait colostral : importance et tirage
47. Dystocie : quand intervenir ?
48. Réanimer un porcelet
49. Hypothermie du nouveau-né
50. Métrite post-partum : prévention

Sevrage (5) :
51. Âge optimal de sevrage en CI (21-28 jours)
52. Aliment de pré-sevrage (creep feeding)
53. Stress de sevrage : limiter
54. Sevrage en lot vs individuel
55. Sevrage et retour en chaleur de la truie

Reproductivité globale (5) :
56. Taux de fertilité : seuils et calcul
57. Pertes embryonnaires précoces
58. Productivité numérique (porcelets/truie/an)
59. Réforme des truies : critères
60. Cochettes : préparation au premier service

**Sources à citer dans `source`** : NRC 2012, INRA 2018, IFIP Mémento Porc, FAO, CIRAD.

**Style contenu** :
- Markdown avec h2/h3, listes, gras
- 200-400 mots par tip (suffisant, pas trop)
- Concret, actionnable, chiffres précis
- Adapté contexte CI (température élevée, races locales)

**Slug** : kebab-case, court, descriptif (ex: `reperer-chaleurs-truie`, `ia-porcine-technique`, `mise-bas-difficile-assistance`).

**Définition de DONE** :
- Migration appliquée
- `SELECT count(*) FROM tips_conseiller WHERE categorie='reproduction'` retourne 60
- Pas de slug en doublon

---

### AGENT C2-SANITAIRE — Rédige 60 tips sanitaire/biosécurité

**Fichier AUTORISÉ** :
- `supabase/migrations/20260521020003_tips_sanitaire.sql` (NEW) — INSERT 60 tips catégorie `sanitaire`

**60 sujets** (20 débutant / 25 intermédiaire / 15 expert) :

Biosécurité ferme (15) :
1. Sas sanitaire d'entrée : aménagement
2. Pédiluve : composition et renouvellement
3. Visiteurs externes : protocole d'accès
4. Quarantaine des nouveaux animaux (durée, isolement)
5. Lutte contre rongeurs (rats vecteurs PPA, leptospirose)
6. Lutte contre mouches (vectrices)
7. Désinfection des bâtiments (rotation principes actifs)
8. Vide sanitaire entre bandes (durée minimale 7-14j)
9. Gestion des cadavres (équarrissage CI, fosse)
10. Eaux usées : gestion sécurisée
11. Litière : choisir et renouveler
12. Tenue dédiée porcherie (changement à l'entrée)
13. Outils dédiés par bâtiment
14. Visite vétérinaire programmée (fréquence)
15. Plan de biosécurité écrit (modèle)

Vaccinations (12) :
16. Calendrier vaccinal porcelet J1-J100
17. Conservation chaîne du froid (frigo, glacière)
18. Reconstitution des vaccins lyophilisés
19. Aiguilles : choix calibre et longueur
20. Sites d'injection IM porcelet vs adulte
21. Pourquoi vacciner les truies en fin de gestation
22. Vaccin rouget : protocole
23. Vaccin parvo-lepto : protocole truies
24. Mycoplasmose vaccin : choix
25. Circovirus PCV2 : nécessité en CI
26. Réactions vaccinales : gérer
27. Registre vaccinal : tenir

Maladies courantes CI (15) :
28. Diarrhée néonatale : diagnostic différentiel
29. Diarrhée post-sevrage (E. coli, salmonelle)
30. Toux chronique : suspects (mycoplasme, pasteurelle)
31. Anémie ferriprive porcelet : prévention
32. Gale sarcoptique : reconnaître
33. Ascaridiose : signes et traitement
34. Coccidiose : prévention au sevrage
35. Peste Porcine Africaine : alerter
36. Peste Porcine Classique : différences PPA
37. Rouget aigu vs chronique
38. Métrite-Mammite-Agalactie (MMA)
39. Stress thermique : signes et limites
40. Boiteries : causes principales
41. Prolapsus rectal/utérin : interventions
42. Cannibalisme caudal : causes et solutions

Soins et médicaments (10) :
43. Trousse de premiers soins porcine
44. Antibiotiques porcs : utiliser raisonnable
45. Délai d'attente avant abattage
46. Voie d'administration : IM, SC, orale
47. Thermomètre rectal : utilisation
48. Anti-inflammatoires (méloxicam, kétoprofène)
49. Vermifuges : rotation et résistances
50. Antiseptiques locaux
51. Mesurer la déshydratation
52. Ordonnance vétérinaire : exigée pour quoi ?

Santé du verrat (3) :
53. Examen testiculaire mensuel
54. Spermogramme : fréquence
55. Boiterie verrat : conséquences

Hygiène et infrastructure (5) :
56. Eau de boisson : qualité et débit
57. Sols porcherie : entretien
58. Évacuation lisier
59. Ventilation naturelle vs mécanique
60. Détection précoce : check quotidien 5 points

**Sources** : OIE/WOAH, FAO EMPRES, CIRAD pathologie porcine tropicale, IFIP, ANSES.

**Style** : 200-400 mots markdown.

**Définition de DONE** : 60 tips catégorie `sanitaire` en DB, slugs uniques.

---

### AGENT C2-NUTRITION — Rédige 60 tips nutrition/alimentation

**Fichier AUTORISÉ** :
- `supabase/migrations/20260521020004_tips_nutrition.sql` (NEW)

**60 sujets** :

Fondamentaux nutrition (10) :
1. Comprendre les besoins MAT/EM/Lys
2. Lecture étiquette d'un concentré
3. Stades physiologiques porc (NRC 2012)
4. Eau : besoin quotidien par catégorie
5. Indice de consommation (IC) : calcul et cible
6. Coût alimentaire / kg vif produit
7. MS, MAT, EM : définitions
8. Acides aminés essentiels (lys, met, thr, trp)
9. Calcium/Phosphore : ratio Ca:P
10. Fibres : rôle et seuils

Matières premières locales CI (12) :
11. Maïs grain : qualité et stockage
12. Sorgho : substitution maïs (limite tannins)
13. Manioc séché : intérêt énergétique
14. Patate douce : usage
15. Tourteau de soja 48% : roi des tourteaux
16. Tourteau d'arachide : aflatoxines vigilance
17. Tourteau de coton : gossypol limite
18. Tourteau de palmiste : fibre élevée
19. Son de blé : équilibre fibres
20. Son de riz : intérêt et stockage
21. Drêches de brasserie : variabilité
22. Farine de poisson : ressource locale CI

Concentrés industriels (8) :
23. IVOGRAIN : gammes disponibles
24. De Heus : pre-starter/starter
25. Koudijs / Nutreco
26. Vitalac : positionnement
27. Concentré complet vs supplément
28. Premix vitamine-minéral : composition
29. Lysine HCl : ajout
30. Méthionine DL : ajout

Formulation (10) :
31. Calculer une formule maïs-soja
32. Formule porcelet 1er âge type
33. Formule croissance 30-60 kg
34. Formule finition 60-110 kg
35. Formule truie gestante
36. Formule truie allaitante
37. Formule verrat
38. Mix-fait-maison vs concentré tout prêt
39. Coût FCFA/kg formule (calcul)
40. Logiciel formulation gratuit

Rationnement (10) :
41. Courbe alimentation truie gestante
42. Truie allaitante : rationnement
43. Porcelet sevré : transition alimentaire
44. Croissance : ad libitum ou rationné ?
45. Finition : restriction si gras excessif
46. Verrat : rationnement maintenance
47. Distribution : 2-3 repas/jour
48. Sol vs auge vs nourrisseur
49. Refus aliment : causes
50. Saisonnalité conso (saison sèche/pluies)

Stock et économie (10) :
51. Stockage matières premières (humidité, T°)
52. Rotations FIFO
53. Aflatoxines : prévention et test
54. Achat groupé d'aliments
55. Suivi consommation hebdo
56. Calcul coût/porc à l'abattage
57. Pertes aliment (gaspillage)
58. Eau et croissance (corrélation)
59. Prix marché Abidjan/Bouaké
60. Aliment fermenté/liquide : intérêts

**Sources** : NRC 2012, INRA 2018, FAO, CIRAD nutrition tropicale, IFIP.

**Définition de DONE** : 60 tips catégorie `nutrition` en DB.

---

### AGENT C2-CONDUITE — Rédige 60 tips conduite d'élevage

**Fichier AUTORISÉ** :
- `supabase/migrations/20260521020005_tips_conduite.sql` (NEW)

**60 sujets** :

Logement et infrastructure (15) :
1. Bâtiment porcherie : orientation
2. Toiture : isolation thermique tropicale
3. Ventilation naturelle CI (effet cheminée)
4. Densité animaux par m² (par catégorie)
5. Maternité : aménagement
6. Cases d'engraissement : sol et auge
7. Caillebotis vs sol plein
8. Lavage haute pression : protocole
9. Brumisateurs et goutteurs : refroidissement
10. Aire d'exercice / parcours
11. Clôture biosécurité
12. Lampes chauffantes porcelets
13. Désinfection avant entrée bande
14. Stockage aliment : silos vs sacs
15. Atelier ferme : équipement minimum

Gestion bandes (12) :
16. Conduite en bande : intérêts
17. Bandes 7-14-21 jours
18. Planning des bandes annuel
19. Couleurs identification (boucles, tatouage)
20. Tatouage vs boucle vs RFID
21. Mouvement entre bâtiments
22. Vide sanitaire : durée
23. All-in all-out
24. Mélange de lots : éviter
25. Tri par poids (lots homogènes)
26. Bande perdue : reconstituer
27. Bande d'attente : utilité

Bien-être animal (10) :
28. Stress thermique en CI : mitiger
29. Comportement normal : repères
30. Enrichissement environnemental
31. Bagarres : causes et prévention
32. Castration porcelet : techniques modernes
33. Caudectomie : pour ou contre
34. Manipulation des animaux (chargement)
35. Calme à l'élevage = productivité
36. Transport : règles
37. Abattage : éthique et qualité

Performances zootechniques (10) :
38. GMQ : calcul et cibles par stade
39. IC : indice de consommation cible
40. Mortalité : seuils acceptables
41. Productivité numérique (porcelets/truie/an)
42. Taux de réforme truies
43. Âge à la première mise bas
44. Intervalle sevrage-saillie (ISS)
45. Tableau de bord zootechnique mensuel
46. Benchmarking : comparer sa ferme
47. Audit performance trimestriel

Travail quotidien (8) :
48. Tournée matin : checklist 10 points
49. Tournée soir : checklist
50. Enregistrement événements quotidiens
51. Carnet d'élevage : tenir à jour
52. Photos régulières (suivi état corporel)
53. Pesées : fréquence et stratégie
54. Curage : organisation
55. Repos hebdomadaire (1 jour ouvrier)

Personnel et formation (5) :
56. Embaucher un ouvrier porcin (profil)
57. Formation continue (centres CI)
58. EPI (équipements protection)
59. Risques zoonotiques
60. Salaire ouvrier porcher CI (référence)

**Définition de DONE** : 60 tips `conduite` en DB.

---

### AGENT C2-ECO — Rédige 60 tips économique/gestion/installation

**Fichier AUTORISÉ** :
- `supabase/migrations/20260521020006_tips_eco.sql` (NEW)

**60 sujets répartis en `economique` (30) et `installation` (30)** :

#### ÉCONOMIQUE (30) :

Coûts de production (10) :
1. Décomposition coût/porc à l'abattage
2. Part aliment dans coût total (~65-75%)
3. Coût/kg vif produit (calcul)
4. Amortir bâtiments : durée
5. Charges fixes vs variables
6. Coût mort-né
7. Coût d'une saillie (semence + IA)
8. Coût de la mortalité globale
9. Économie d'échelle (truies)
10. Tableau de bord comptable mensuel

Marché Côte d'Ivoire (10) :
11. Prix porc vif marché CI (référence)
12. Prix carcasse abattoir SIVAC/SIPRA
13. Saisonnalité prix (Tabaski, Noël, Pâques)
14. Filière formelle vs informelle
15. Distributeurs et grossistes
16. Abattoirs autorisés CI (carte)
17. Restaurateurs locaux (HCI hôtellerie)
18. Marché export sous-région
19. Marketing produit "fermier"
20. Vente directe vs intermédiaires

Gestion financière (10) :
21. Plan de trésorerie élevage porcin
22. Calcul de la marge brute
23. Calcul du seuil de rentabilité
24. Financement : banques agritech CI
25. Microfinance CI (Coopec, RCMEC)
26. Subventions FIRCA agritech
27. Comptabilité simplifiée éleveur
28. Suivi des stocks (valorisation)
29. Indicateur EBE (Excédent Brut d'Exploitation)
30. Plan d'investissement 3 ans

#### INSTALLATION (30) :

Démarrage projet (10) :
31. Étude de faisabilité élevage porcin CI
32. Choisir le site (zone géographique CI)
33. Capacité initiale recommandée (10-20 truies)
34. Budget démarrage (mini 5-10M FCFA)
35. Autorisations administratives CI
36. Choix race (Large White, Landrace, Duroc, locale)
37. Achat reproducteurs (où trouver en CI)
38. Importation génétique (procédure)
39. Calendrier de mise en route (12 premiers mois)
40. Erreurs débutants à éviter

Infrastructure (10) :
41. Plan ferme porcine 10 truies
42. Plan ferme 50 truies
43. Construction durable (matériaux CI)
44. Toit en tôle vs paille
45. Sol béton vs terre battue
46. Adduction d'eau : source et stockage
47. Électrification (panneaux solaires CI)
48. Évacuation eaux usées (lagunage)
49. Compostage fumier
50. Vente fumier maraîchers

Équipement (10) :
51. Liste équipement de base
52. Verrat ou IA : équipement requis
53. Échographe portable : modèles CI
54. Pèse-animaux : choix
55. Auges et abreuvoirs (modèles)
56. Lampes chauffantes (porcelets)
57. Chariot transport
58. Pulvérisateur désinfection
59. Outillage de soin (boîte à outils)
60. Coût équipement complet 20 truies

**Définition de DONE** : 60 tips répartis `economique` (30) + `installation` (30) en DB.

---

## Contraintes communes

1. **Devise FCFA** partout
2. Contexte **Côte d'Ivoire** (Abidjan, Bouaké, Yamoussoukro)
3. Markdown clean (h2/h3, listes, gras, code si besoin)
4. **Pas d'invention de chiffres farfelus** — utilise tes connaissances réelles, marque `[à confirmer localement]` si incertain
5. Sources citées dans `source` (NRC, INRA, IFIP, FAO, CIRAD, OIE...)
6. Slug : kebab-case, max 50 chars, unique
7. Tags : 3-5 tags par tip, en minuscules
8. Résumé : 1 phrase, 100-200 chars, accroche
9. Contenu : 200-400 mots
10. **Pas de hallucination de marques** non documentées (utiliser uniquement IVOGRAIN, De Heus, Koudijs, Vitalac, SIVAC, SIPRA, FIRCA pour CI)

## Livrable rapport (chacun)
1. Fichier migration livré
2. Nb tips insérés (`select count(*) from tips_conseiller where categorie=X`)
3. 3 exemples de slugs
4. Hypothèses

GO.
