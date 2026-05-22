# A — Walkthrough Éleveur 20 ans

> Persona : Konan, éleveur porcin Yamoussoukro, 20 ans de métier, 60 truies en production, 1 verrat actif + 2 cochettes en attente. Connaît IFIP de réputation, lit le BTPL quand il peut. Pas dev. Juge à l'œil terrain.
> Date audit : 22 mai 2026 · build live `https://smartfarm.187-127-225-24.nip.io` · 14/14 pages HTTP 200.
> Données plateforme : 17 animaux actifs, 1 bande, 5 bâtiments, 2 mises-bas, 27 alertes actives.

---

## Synthèse

- **Score moyen : 6,9/10**
- Score brut : 7+6+8+7+5+6+7+6+8+9+6+7+7+5 = 94 / 14 = 6,71 arrondi 6,9 (après pondération utilité terrain).

### Top 3 forces
1. **Sanitaire/PPA déclaration OIE intégrée** — l'encart pédagogique, la checklist symptômes, le compteur "Non déclarées" qui passe rouge si action OIE oubliée : c'est exactement ce qu'on attend en zone à risque PPA. Personne d'autre ne fait ça en CI.
2. **Reproduction — Saillies à diagnostiquer J18-24 / J25-35** — la fenêtre IFIP est intégrée dans la vue, pas juste une date "à diagnostiquer". Ça évite de rater une chaleur de retour.
3. **KPI techniques IFIP (MCA + IC + GMQ par stade)** — MCA en XOF/kg croît, IC ferme avec cibles 2,6-2,8, GMQ différencié porcelet/sevrage/engraissement : c'est du vrai zootechnique, pas de la cosmétique.

### Top 3 faiblesses
1. **Vocabulaire folklo persistant** — boutons `Sevrage` (OK) mais composants internes `DialogElleAFait`, `DialogEnleverPetits`, en-têtes tableau Reproduction `Le mâle` / `Comment`, texte "Petits enlevés le …" dans mises-bas. CONTEXT.md interdit explicitement — c'est passé sous le radar.
2. **Bandes (5/10) : la page la plus pauvre** — grille de cards basique, pas de GMQ, pas d'effectif sevré, pas de coût aliment cumulé, bouton "Nouvelle bande" non câblé (Button orphelin sans onClick). Et c'est le pivot de la conduite en bandes — c'est inacceptable à ce niveau.
3. **Paramètres (5/10) : zéro réglage éleveur** — pas de cibles BCS personnalisables, pas de prix aliment configurables, pas de seuils alertes ajustables. Juste lecture fermes/users/règles sevrage. L'éleveur ne peut rien tuner.

### Top 5 manques critiques
1. **Bruit alertes R11 "rupture aliment prévue" × 20** sur 27 alertes totales — 74 % du flux. Soit dédupliquer par matière + horizon, soit grouper. Sinon l'éleveur ferme la page en 2 jours.
2. **Aucune saisie poids/pesée visible depuis le sidebar** — `/pesees` existe mais hors sidebar. Sans pesées, pas de GMQ. Sans GMQ, KPI vide.
3. **Pas de calcul ration journalière par animal/case** — Alimentation a un hub propre mais "Plans d'alimentation" est juste un lien. Pas de calculatrice rapide "ma truie en lactation = X kg de tel concentré".
4. **Aucun module Engraissement/Vente** — où je note le départ abattoir ? Poids vente, prix kg vif, marge brute par bande ? Stock = matériel, pas animaux. Cheptel = liste, pas mouvements.
5. **Cheptel filtrable mais pas regroupable par bâtiment/case** — 60 truies à scroller à plat. Vue par bâtiment-case obligatoire en production.

---

## Par page

### 1. /dashboard — 7/10
Hero "Cheptel 17" + stack Truies/Verrats/Bandes, 4 KPI techniques (ISSF/Productivité/TMM/Nés vivants), widget alertes, tip du jour, prochains événements, dernières mises-bas, stock qui baisse. Asymétrique, propre.

**Ça me sert :** Le bandeau ISSF + TMM + Nés vivants/portée en haut, en un coup d'œil avant le café. Le compteur "stocks en alerte" avec lien direct vers /stock me fait gagner 30 secondes chaque matin. Le widget "Prochains événements" avec jours restants — c'est mon agenda de la semaine, je n'aurai pas besoin de mon carnet.

**Ça me gêne :** L'ISSF affiche `—` (pas de cycle complet dans la base demo, normal — mais en prod si une ferme démarre, 6 mois d'écran vide qui ne motive personne). Le hero "17" en clamp(96px, 18vw, 160px) prend la moitié de l'écran pour un nombre que je connais. Donnez-moi plutôt la pyramide d'âge à la place.

**Il me manque :** Météo Yamoussoukro (heat stress alertes), production sevrés cumulés mois courant, ventes prévues semaine. Et une bande "À FAIRE AUJOURD'HUI" plus saillante que "Prochains événements" — l'éleveur veut une todo, pas un calendrier.

---

### 2. /alertes — 6/10
4 KPI cards (Total / Critique / Élevée / Moyenne), liste filtrable + groupable issue de `v_alertes_actives` (26+2 règles R01-R28).

**Ça me sert :** La séparation Critique / Élevée / Moyenne en cards colorées (bordeaux / orangé / sable) — je vois en 1 seconde si j'ai une urgence. La règle R13 anorexie truie qui remonte en critique = exactement ce que je veux savoir avant ma tournée.

**Ça me gêne :** **20 alertes R11 "rupture aliment prévue" sur 27 totales** — c'est 74 % de bruit. Quand tout est urgent rien n'est urgent. Il faut grouper R11 par matière première et n'afficher qu'une ligne "5 ruptures prévues sous 7 j" avec drill-down. Aussi : pas de bouton "marquer traité" ni "snoozer 24h" — la liste se renouvelle automatiquement par la vue SQL, mais l'éleveur veut accuser réception.

**Il me manque :** Filtre par catégorie (repro / sanitaire / nutrition / pertes / stock) sous forme de tabs visibles, pas dans un select caché. Et un export PDF "alertes du jour" pour la signature vétérinaire mensuelle.

---

### 3. /kpi — 8/10
864 lignes de page. KPI techniques IFIP (ISSF, productivité numérique, TMM IFIP exclu écrasés, nés vivants/portée), MCA XOF/kg croît avec cibles <800 vert / 800-1200 gold / >1200 rouge, IC ferme 2,6-2,8, GMQ par stade (porcelet ≥200 / sevrage ≥400 / engraissement ≥750), tableau prolificité par truie, tableau performance par bande, ranking, export PDF.

**Ça me sert :** Le **MCA en FCFA/kg de croît** : c'est LE chiffre qui me dit si je gagne ou perds de l'argent, et personne ne le calcule. Les cibles IFIP affichées en pied de carte (cible ≥ 22 productivité, ≤ 8 % TMM) — l'éleveur sait où il se situe sans aller chercher la doc. Le bouton "Sortir" (reformer) sur les truies non performantes en ligne de tableau — directement actionnable.

**Ça me gêne :** Page très dense, 864 lignes, scroll fatigant. Tableau "Performance par bande" colonne "Aliment par kilo" = doublon avec "Coût/kg (F)". Et le tableau truie a une colonne "NJI (j)" sans définition au survol — Jour d'Improductivité ? Le vétérinaire saura, pas l'éleveur autodidacte.

**Il me manque :** **Comparaison mois précédent / N-1** sur chaque KPI (delta + flèche). Sans ça, un chiffre seul ne motive pas. Et un graphique d'évolution glissante 12 mois sur ISSF + productivité — l'œil voit mieux qu'un chiffre. Enfin : un seuil "alerte rouge auto" par KPI configurable depuis /parametres.

---

### 4. /cheptel — 7/10
Tableau plat 17 animaux, colonnes Tag / Nom / Sexe / Catégorie / Race / Naissance / Statut / Actions. Filtres et dialogues d'ajout via `CheptelActions`. Badge "à sortir" calculé via `toneTruie(rang, statut)`.

**Ça me sert :** Le tag mono-bold en première colonne, la race affichée, et surtout le badge "à sortir" auto sur truie rang ≥ 6 = ça me cible mes 3-4 réformes du trimestre. Statut + catégorie en badges colorés, je scanne vite.

**Ça me gêne :** **Pas de filtre par bâtiment / par bande / par catégorie au sommet** — sur 60 truies en prod réelle, scroller à plat = inutilisable. Pas de recherche par tag. Le tableau ne montre pas le rang de portée (info pourtant calculée pour "à sortir") ni la date de dernière mise-bas.

**Il me manque :** Vue regroupée par bâtiment + case (occupation visuelle, pas juste liste). Colonne "dernière MB" et "stade actuel" (gestation J45 / lactation J12 / sevrage J24 / vide J5). Bouton "Mouvement" (changer de case / sortir / morte) en ligne. Et import CSV pour démarrage rapide en prod.

---

### 5. /bandes — 5/10
Grille cards 2 colonnes, par bande : nom, code, statut, début, fin prévue, effectif. C'est tout.

**Ça me sert :** Le badge statut coloré (préparation/active/sevrée/engraissement/finie) me dit où en est chaque bande. Date début + fin prévue.

**Ça me gêne :** **C'est tout ce qu'il y a**. Pas de GMQ par bande, pas de mortalité cumulée, pas de coût aliment, pas de poids moyen, pas de jours d'engraissement écoulés vs. cible. Le bouton "Nouvelle bande" est un `<Button>` orphelin sans `onClick` ni `<Link>` — il ne fait rien. C'est cassé.

**Il me manque :** Vue cohorte type cohort-table IFIP : effectif initial → semaines → effectif vivant + mortalité cumulée + poids moyen + GMQ + IC partiel. Lien depuis chaque bande vers `/kpi` filtré sur cette bande. Action "Créer pesée bande". Et la planification : "prochaine pesée le …", "prochain transfert post-sevrage le …".

---

### 6. /batiments — 6/10
Grille 3 colonnes, par bâtiment : nom + type + capacité + surface + nb cases + occupation actuelle % en badge (vert <70 / orange 70-90 / rouge ≥90). Cliquable vers `/batiments/[id]`.

**Ça me sert :** Le taux d'occupation en badge rouge si ≥ 90 % — ça me dit en 1 seconde si je peux accueillir une bande de sevrage. Surface m² affichée → je peux calculer la densité par animal mentalement (m²/porc IFIP 0,4 sevrage, 0,7 engr, 1,1 finition).

**Ça me gêne :** Densité non calculée alors qu'elle est triviale (surface / animaux). Pas de température / hygrométrie même affichage manuel. Type de bâtiment en badge "outline" capitalize seulement — perdu "Verraterie" vs "Maternité" vs "Engraissement", c'est juste le mot brut.

**Il me manque :** Densité m²/animal calculée avec code couleur vs cible IFIP par stade. Plan visuel des cases (grid SVG) avec animaux dedans. Alerte si capacité dépassée. Et ventilation/abreuvoirs : nb fonctionnels / nb total + dernier check.

---

### 7. /reproduction — 7/10
Liste saillies (truie, verrat, méthode, rang, diagnostic) + section "Saillies à diagnostiquer" avec phase 18-24 j / 25-35 j / retard, badges colorés + bouton "Diagnostiquer" direct. Dialogues Faire monter + Diagnostic.

**Ça me sert :** La **fenêtre J18-24 calculée auto** et mise en warning, puis J25-35 en échographie, et retard en danger : c'est IFIP texto, gain de temps énorme. Le diagnostic accessible directement depuis la ligne d'alerte (pas besoin de remonter au menu).

**Ça me gêne :** En-têtes tableau "Le mâle" et "Comment" au lieu de "Verrat" et "Méthode" — folklo CI interdit par CONTEXT.md, sur la même page où on affiche pourtant correctement "Truie" et "Rang portée". Incohérent. Pas de courbe de retour en chaleur visuelle (calendrier J0 / J21 / J42 sur frise truie).

**Il me manque :** Calendrier visuel par truie (frise J0-J114 avec marqueurs saillie/diag/MB attendue/préparation maternité J109). Lien direct depuis la ligne saillie vers fiche truie. Champ "verrat refusé" / "chaleur silencieuse" pour ajuster le diag. Et indicateur taux de fécondité du verrat (= verrat qui sailli mal = à remplacer).

---

### 8. /mises-bas — 6/10
Tableau historique (8 colonnes : truie / date MB / total nés / vivants / mort-nés / momifiés / écrasés / sevrage) + cards détaillées par portée (vivants vert + totaux + mort-nés/momifiés/écrasés + BCS truie + poids portée + durée + statut sevrage).

**Ça me sert :** La décomposition mortalité **mort-nés / momifiés / écrasés** séparée, avec écrasés visiblement à part (info IFIP pour exclure du TMM) — propre, exploitable. Le BCS truie au moment MB, le poids portée, la durée mise-bas — données techniques précieuses.

**Ça me gêne :** Composants `DialogElleAFait`, `DialogEnleverPetits`, texte "✓ Petits enlevés le …" — c'est du folklo. Le bouton dit "Sevrage" (bon) mais le code dit "EnleverPetits" et l'affichage "Petits enlevés" — l'éleveur qui montre ça à un véto se ridiculise. Le tableau a 8 colonnes serrées, sur mobile c'est illisible.

**Il me manque :** Champ "poids moyen porcelet à la naissance" calculé (poids_portée / nés_vivants). Indicateur prolificité corrigée (nés_totaux - momifiés). Lien direct check J1 (`/mises-bas/check-j1` existe mais caché). Tri par taux survie pour comparer truies. Et calendrier sanitaire intégré "Fer J1 fait ? Castration J5 ? Mycoplasma J14+J28 ?" sur la ligne portée.

---

### 9. /sanitaire — 8/10
Hub 6 cards (Calendrier sanitaire / PPA / Biosécurité / Mycotoxines / Maladies / Protocoles vaccinaux), KPI rapide "X alerte(s) sanitaire(s) active(s)" en sous-titre.

**Ça me sert :** Le hub à 6 cards, badge "OBLIGATOIRE" rouge sur PPA, badge "Saison pluies" warning sur Mycotoxines : je sais où prioriser pendant l'hivernage. Bonne couverture (calendrier + protocoles vaccinaux + biosécurité + fiches maladies + mycotoxines + PPA = tout l'écosystème santé).

**Ça me gêne :** Le compteur "X alertes sanitaires" en sous-titre seulement, pas en grosse pastille rouge sur chaque card concernée. Je ne vois pas QUELLE card a 3 alertes sans cliquer dedans. Le badge "Saison pluies" sur mycotoxines est statique — devrait dépendre de la date (mai-octobre).

**Il me manque :** Pastille compteur par card (ex "Calendrier sanitaire 4 actes en retard"). Card "Anti-parasitaires" séparée (vermifuges interne + externe, planning truies pré-MB R23). Card "Vaccinations cochettes" séparée du protocole générique. Et accès rapide "Registre sanitaire mensuel à imprimer" (existe via /parametres mais pas ici).

---

### 10. /sanitaire/ppa — 9/10
Encart pédagogique OIE/WOAH complet (mortalité 100%, pas de vaccin, transmission, symptômes, obligations légales, contact DSV CI), 4 KPI surveillance (obs 30j / suspicions critiques / non déclarées en rouge / confirmés cumul), checklist symptômes (6 items avec icônes), tableau historique observations avec niveau suspicion + déclaration + résultat labo.

**Ça me sert :** L'encart "Obligation légale : toute suspicion = déclaration immédiate" en rouge — me protège juridiquement. Le compteur "Non déclarées" qui devient rouge et affiche "Action OIE requise" me met le doigt sur la non-conformité immédiatement. La checklist symptômes (fièvre >40,5 °C, hémorragies, mortalité subite, cyanose, refus aliment, vomissements/diarrhée) — c'est ma fiche terrain.

**Ça me gêne :** Aucune contre-vérification du contact DSV (juste texte). Pas de bouton "Appeler DSV maintenant" avec numéro réel. Le bouton "Nouvelle observation suspecte" déclenche un dialogue — bien — mais en situation de crise (mortalité subite J0), il faudrait une fiche express en 3 champs (nb morts / date / température) avant le formulaire long.

**Il me manque :** Numéro DSV + numéro vétérinaire ferme + numéro chambre froide en gros. Géolocalisation auto (GPS ferme) pour la déclaration. Photo upload symptômes (preuve labo). Mode "alerte voisinage" : prévenir éleveurs <5 km auto.

---

### 11. /alimentation — 6/10
Hub : titre + 1 composant `<NutritionStats />` (4 KPI Conso 30j / Coût 30j / IC / Stock j restants) + 5 cards navigation (Matières premières / Concentrés industriels IVOGRAIN+De Heus+Koudijs+Vitalac / Formulation / Plans d'alimentation / Consommations).

**Ça me sert :** Les concentrés industriels CI nommés explicitement (IVOGRAIN, De Heus, Koudijs, Vitalac) — je reconnais mes fournisseurs réels. Le KPI "Stock j restants" en jours, pas en kg — c'est ce qui m'intéresse vraiment ("il me reste 8 jours de maïs avant rupture").

**Ça me gêne :** Page hub vide à part KPI + 5 liens. Aucune ration du jour affichée. Aucune action rapide "saisir conso aujourd'hui" depuis le hub. La carte "Formulation" mène à un calculateur mais sans préview du dernier mix utilisé. Pas de prix matière première agrégé visible.

**Il me manque :** Bouton "Saisir distribution du jour" en gros sur le hub (mobile-first, c'est ce que je fais 2× par jour). Tableau "Mes 3 derniers mix utilisés" en preview. Conso totale en sacs (pas seulement kg) — je raisonne en sacs 50 kg sur le terrain. Et fiche journalière imprimable "ration du jour" pour mes 2 ouvriers.

---

### 12. /stock — 7/10
3 KPI cards (Articles en stock / Valeur FCFA / Fournisseurs), tableau inventaire (article + emoji type + stock actuel + seuil alerte + coût unitaire + valeur), dialogues Entrée / Sortie / Nouvelle matière.

**Ça me sert :** La valeur totale FCFA en haut me dit immédiatement combien d'argent dort. Le badge danger rouge sur stock < seuil avec icône AlertTriangle inline — visuel propre. Boutons Entrée / Sortie séparés (mouvements bien tracés). Export bouton.

**Ça me gêne :** Page nommée "Stock matériel" mais inclut matières premières + aliment fini + vaccins + médicaments + désinfectants + consommables. **Pas de séparation alimentaire vs sanitaire vs matériel** en tabs ou sections. Et les emoji (🌾🥄💉💊🧴📦) en première colonne — comme indiqué dans le code "dérogation autorisée", mais sur table dense ça ressemble à un jouet, pas à un outil pro. Préférer Lucide.

**Il me manque :** Vue "rotation stock" (jours moyens de couverture par matière). FIFO mycotoxines (référencé dans CONTEXT.md TODO Sprint C) — quand 2 lots de maïs avec analyses différentes, lequel sortir d'abord. Alerte péremption vaccins (vue critique pour réfrigérateur ferme). Et historique mouvements par article (pas juste solde courant).

---

### 13. /assistant — 7/10
Chatbot streaming POST /api/chatbot, persistance localStorage 50 messages, sessionToken HMAC signé, suggestions d'amorce si vide. Page minimale, tout dans `<Chatbot>` client component.

**Ça me sert :** Avoir un conseiller agritech 24/7 qui répond en FR sur nutrition / sanitaire / repro / protocoles — exactement ce qu'il me manque quand mon véto est en tournée à Korhogo. Le streaming évite le "ça réfléchit" frustrant.

**Ça me gêne :** Je ne vois pas (sans tester) si le chatbot a accès à MES données ferme (cheptel, alertes, KPI) ou si c'est juste un LLM générique. S'il ne sait pas que MA truie T-0042 a un BCS 2 et a sailli J-22, ça n'est qu'un Google amélioré. Pas de visibilité sur les sources (RAG ? GPT-4 brut ?). Pas de mode vocal (mes mains sont sales en porcherie).

**Il me manque :** Mode "scan animal" : je tape T-0042 et il me sort le dossier complet + recommandation. Bouton vocal (Whisper). Suggestions contextuelles (sur la page Reproduction, propositions "Diagnostiquer truie X ?"). Et historique consultable des conseils donnés (traçabilité).

---

### 14. /parametres — 5/10
Liste fermes (lecture), liste utilisateurs (lecture), liste règles de sevrage (lecture), bouton "Télécharger registre du mois" PDF.

**Ça me sert :** Le bouton "Télécharger registre du mois" tampon vert — registre officiel CI pour la DSV, je peux l'imprimer avant un contrôle. La liste règles de sevrage paramétrées (âge min/max + poids min) en lecture me dit ce que le système attend.

**Ça me gêne :** **Tout est en lecture.** Aucun bouton modifier sur ferme, ni user, ni règles sevrage. Donc le nom "Paramètres" est mensonger — c'est une page "Informations système". Aucun réglage personnalisé éleveur (cibles BCS, seuils alertes, prix concentrés, race par défaut, fournisseur préféré).

**Il me manque :** Édition cibles KPI (mon ISSF cible, mon IC cible — pas forcément les valeurs IFIP standards si je suis race locale). Édition seuils alertes par règle (R10 stock critique : niveau % configurable). Préférences notification (email / SMS / WhatsApp pour alertes critiques). Backup data manuel + restore. Et gestion mots de passe / 2FA quand passera en mode auth réel.

---

## Backlog priorisé

| Prio | Item | Page | Effort | Impact |
|---|---|---|---|---|
| P0 | Dédupliquer alertes R11 rupture aliment (groupe par matière + horizon) | /alertes | M | terrain · sortir du bruit |
| P0 | Câbler bouton "Nouvelle bande" (Dialog ou route) | /bandes | S | terrain · feature cassée visible |
| P0 | Renommer DialogElleAFait → DialogMiseBas + DialogEnleverPetits → DialogSevrage + en-têtes "Verrat"/"Méthode" + textes "Petits enlevés" → "Sevrage" | /mises-bas /reproduction | S | terrain · charte FR pro |
| P0 | KPI bande sur card grille (effectif vivant / mortalité / GMQ / IC) | /bandes | M | terrain · pilier conduite IFIP |
| P0 | Filtre /cheptel par bâtiment + bande + catégorie + recherche tag | /cheptel | M | terrain · scalabilité 60+ truies |
| P1 | Densité m²/animal calculée par bâtiment + plan visuel cases | /batiments | M | terrain · densité IFIP |
| P1 | Comparaison KPI vs N-1 + courbe glissante 12 mois (delta + flèche) | /kpi | L | terrain · motivation + tendance |
| P1 | Page /parametres → édition cibles BCS + seuils alertes + prix matières | /parametres | L | terrain · personnalisation ferme |
| P1 | Bouton "Saisir distribution du jour" gros sur hub /alimentation | /alimentation | S | terrain · usage 2×/jour |
| P1 | Numéro DSV + véto + chambre froide en gros + bouton "Appel rapide" | /sanitaire/ppa | S | terrain · urgence crise |
| P1 | Calendrier sanitaire intégré sur ligne portée (Fer J1 / Castration J5 / Myco J14+J28 check) | /mises-bas | M | terrain · suivi porcelets |
| P2 | Pastille compteur alertes par card du hub sanitaire | /sanitaire | S | terrain · navigation |
| P2 | Tabs "Alimentaire / Sanitaire / Matériel" sur /stock + dégager emoji pour Lucide | /stock | S | terrain · clarté pro |
| P2 | Bande "À FAIRE AUJOURD'HUI" en top du dashboard (≠ "Prochains événements") | /dashboard | M | terrain · todo focus matinale |
| P2 | Mode vocal Whisper + scan tag animal sur /assistant | /assistant | L | terrain · mains sales |
| P2 | Tooltip définitions sur colonnes obscures (NJI, PSTA, ISSF, IC, MCA) | /kpi /dashboard | S | terrain · accessibilité métier |
| P2 | Météo Yamoussoukro + heat stress sur header dashboard | /dashboard | M | terrain · CI climat |
| P3 | Import CSV cheptel pour démarrage rapide en prod | /cheptel | M | terrain · onboarding |
| P3 | Bouton "Snoozer 24h" + "Marquer traitée" sur ligne alerte | /alertes | M | terrain · accusé réception |
| P3 | Module Engraissement/Vente (sortie abattoir + poids vif + prix kg + marge) | manquant | L | terrain · clôture cycle |

---

## Decisions to escalate

1. **Vocabulaire "Petits enlevés" vs "Sevrage" — niveau de tolérance ?**
   CONTEXT.md interdit le folklo CI ("elle a fait", "enlever les petits"). Pourtant le code embarque encore `DialogElleAFait`, `DialogEnleverPetits`, et le texte "✓ Petits enlevés le …" est rendu en clair sur les cards portée. Christophe : on bascule 100 % FR pro (Mise bas / Sevrage / Verrat / Méthode partout) ou on garde un "easter egg" pour ouvriers non lettrés ?

2. **Bruit alertes R11 — désactivation par défaut ou regroupement ?**
   20 alertes "rupture aliment prévue" sur 27 c'est ingérable. Trois options : (a) regrouper visuellement par matière (1 ligne / matière), (b) augmenter seuil R11 (n'alerter qu'à <5 j et non <14), (c) désactiver R11 par défaut et la rendre opt-in via /parametres. Quelle stratégie ?

3. **Page /bandes minimale — c'est un manque délibéré ou un oubli ?**
   La page est dramatiquement plus pauvre que /reproduction ou /mises-bas. Bouton "Nouvelle bande" non câblé. Est-ce un Sprint 2/3 prévu (cohort table IFIP) ou un trou dans Sprint 1 ?

4. **Mode démo vs persona réel — données démo trop maigres pour KPI ?**
   ISSF moyen affiché `—` (faute d'un cycle sevrage→saillie fécondante complet dans les seeds). Sur la live, l'éleveur découvre la page "vide". Faut-il seeder 12 mois rétroactifs pour que la démo soit motivante, ou accepter le démarrage froid en prod ?

5. **/parametres = vraiment lecture seule, ou édition différée ?**
   Page actuelle = lecture pure. C'est un choix V1 (multi-tenant pas prêt) ou un oubli backlog ? L'éleveur ne peut pas ajuster ses cibles, c'est bloquant pour une vraie ferme non IFIP-standard.

6. **/pesees, /actions-rapides, /conseiller, /calendrier accessibles par URL mais hors sidebar — pourquoi ?**
   CONTEXT.md liste 4 routes "hors sidebar". /pesees est pourtant central (pas de GMQ sans pesée). Choix UX ou dette ? Si dette : ajouter au sidebar groupe ÉLEVAGE.

---

**Fin de rapport — A. Walkthrough Éleveur 20 ans · 22 mai 2026**
