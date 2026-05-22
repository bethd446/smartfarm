# Audit Métier Exhaustif — SmartFarm

> Auditeur : reviewer senior élevage porcin tropical (CI). App SmartFarm post-POLISH, 22 règles d'alertes en place, vue `v_alertes_actives` consolidée, calendrier sanitaire porcelets, biosécurité 12 items, eau, mycotoxines, BCS truie 5 stades, KPI techniques IFIP.

## Score global métier : **7.2 / 10**

Note décomposée :
- Structure données & vues SQL : **9/10** (rare à ce niveau de granularité GTTT)
- Couverture règles métier reproduction/sanitaire : **8/10**
- Nutrition / formulation : **5/10** (matrice AA incomplète CI, pas de calcul ration auto)
- Biosécurité & traçabilité sanitaire : **7/10** (12 items, mais pas de scoring ni KPI agrégé)
- Économique / coûts / GTE : **3/10** (pas de marge sur coût alimentaire, pas de prix de revient kg vif)
- UX terrain mobile / saisie rapide : **7/10** (bottom-nav OK, mais peu de raccourcis "1-tap")

## Synthèse top P0 (8 améliorations critiques)

1. **R-NEW Vermifuge truie J-14 pré-MB** absent (INRAE / pratique standard) — porcelets nés sur truie parasitée = anémie + mortalité
2. **Diagnostic gestation J21-28 obligatoire** : règle R21 alerte mais pas de Server Action "saisie diag rapide" depuis l'alerte
3. **BCS truie au sevrage < 2,5** → alerte dédiée manquante (truie maigre = ISS long = perte productivité IFIP)
4. **Sevrage non-déclenché à J21 ≠ J28** : `regles_sevrage` rigide (25-28j fixes) — option "sevrage 21j précoce" ou "35j" inexistante
5. **Mortalité porcelets lactation** : pas de KPI/alerte distinct pertes naissance→sevrage (cible IFIP < 15%, écrasés vs autres)
6. **Marge sur coût alimentaire (MCA)** absente — KPI GTE majeur. Données pourtant disponibles (`consommations_aliment`, `departs`)
7. **Cochettes vaccins Parvo/Lepto** : protocole table OK (présent en BDD), mais pas appliqué automatiquement aux cochettes à J70 dans `evenements_prevus`
8. **Anémie porcelet** : Fer dextran J1 OK, mais pas d'alerte si non-administré J3 (fenêtre critique tropical)

---

## Module 1 — Dashboard `/dashboard`

✅ En place :
- KPI techniques ferme (truies actives, nés vivants moyen, TMM%, productivité)
- Lien rapide vers actions, alertes
- Empty states + skeleton

⚠️ Manquant :
- **P0** : KPI MCA (marge sur coût alimentaire) — données dispo, calcul manquant
- **P1** : KPI "porcelets sevrés / truie / an" (productivité numérique annuelle, ref IFIP ~26)
- **P1** : Mini-graphique évolution 30j alertes critiques
- **P2** : Carte "tâches aujourd'hui" (evenements_prevus du jour)

💡 :
- Score santé global ferme (composite : TMM + biosécurité + R12 retards)
- Comparaison vs cible IFIP avec code couleur (vert/orange/rouge)

---

## Module 2 — Alertes `/alertes` (22 règles)

✅ En place : R01→R22 mappées UI+SQL, gravité, lien_suggere, regroupement.

⚠️ Manquant (par référentiel) :
- **P0 R-NEW Vermifuge truie J-14 pré-MB** (INRAE / standard tropical)
- **P0 R-NEW BCS sevrage < 2,5** (truie déclassée, IFIP)
- **P0 R-NEW Fer porcelet J3 non-administré** (anémie carence, ferme tropicale)
- **P1 R-NEW Mortinatalité élevée** (>8% nés morts vs nés totaux, INRAE)
- **P1 R-NEW Pertes lactation > 15%** (IFIP cible, déjà calculé v_kpi_techniques_truie mais pas en alerte)
- **P1 R-NEW Visiteur sans douche/délai 48h** (R-FAO biosécurité) — table `visites_biosecurite` existe mais aucune règle SQL ne la traite
- **P2 R-NEW Vaccin truie rappel manquant** (cohérence protocoles_vaccinaux)
- **R09 seuil 2%/30j** : trop strict pour ferme tropicale (CIRAD : 3-4% acceptable mortalité globale annuelle élevage tropical). Calibrer.
- **R20 ISS >10j** : cible IFIP est 5-7j, alerte à partir de 8j serait plus réactive

💡 :
- Snooze 24h sur alerte (UI uniquement, ack pour éviter saturation)
- Mode "alertes critiques uniquement" pour SMS éleveur

---

## Module 3 — KPI `/kpi`

✅ En place :
- v_kpi_techniques_ferme (nés totaux, nés vivants, sevrés moyen, ISSF, TMM%, productivité, pertes lactation)
- v_kpi_techniques_truie (par truie, rang portée)
- TMM exclut écrasés (méthode IFIP correcte)

⚠️ Manquant :
- **P0** : `sevres_par_portee_moyen` est NULL dans donnée réelle → vérifier requête (probable absence sevrage saisi)
- **P0** : GMQ par catégorie d'âge (post-sevrage 7-30kg, croissance 30-60kg, finition 60-110kg)
- **P0** : IC global ferme (Indice de Consommation) — donnée brute existe (v_kpi_bande.ic) mais pas agrégé
- **P1** : Taux de mise bas (= MB / saillies, cible IFIP 88-92%)
- **P1** : Taux de fertilité 1ère saillie (=diagnostic+ / saillie1, cible 85%)
- **P1** : Âge sevrage moyen + écart-type (cohérence pratiques)
- **P2** : Comparatif inter-bandes graphique

💡 :
- Export PDF mensuel KPI pour vétérinaire/banquier
- Pré-saisie cibles IFIP (paramétrable ferme) avec écart absolu/relatif

---

## Module 4 — Cheptel `/cheptel` + `/cheptel/[id]`

✅ En place :
- Catégories (verrat/truie/cochette/porcelet/etc.), statut, lignage mère/père
- Fiche animal probablement complète
- Pesées historiques liées

⚠️ Manquant :
- **P0** : Pas de **fenêtre âge cochette → truie** automatique (>250j sailli ⇒ promu truie, R14 existe pour alerte mais pas action)
- **P0** : Pas de saisie BCS rapide depuis fiche (devrait être 1-tap mobile)
- **P1** : Lignage : pas de détection **consanguinité** (parent commun mère/père)
- **P1** : Date de réforme prévisionnelle (truie ≥ 6 portées ou ISSF>21j 3x, IFIP)
- **P2** : Pedigree visuel 3 générations

💡 :
- Alerte "verrat sur-utilisé" (>1 saillie/3j, INRAE)
- Auto-déclassement cochette → truie à 1ère MB

---

## Module 5 — Reproduction `/reproduction`

✅ En place :
- Saillies (date, truie, verrat, méthode IA/monte naturelle, BCS)
- Diagnostics gestation (saillie_id, résultat, méthode)
- Vue v_saillies_a_diagnostiquer
- Calendrier repro v_calendrier_repro

⚠️ Manquant :
- **P0** : **Fenêtre IA double 12h + 24h** non guidée (truie en chaleur = 2 saillies espacées, INRAE)
- **P0** : Pas de "détection chaleur" form (date observation chaleur → suggérer saillie J0+J1)
- **P0** : R02 retour chaleur — alerte mais pas de saisie facilitée "nouveau cycle"
- **P1** : Échographie programmée J28 (visit vet) — pas d'événement créé auto
- **P1** : Rang de portée n'est pas auto-incrémenté à la mise-bas
- **P2** : Taux d'utilisation verrat par mois

💡 :
- Suggestion auto verrat (génétique + non-utilisé < 48h + non-consanguin)
- Pré-remplir prochaine saillie après sevrage (cycle attendu J+5-7)

---

## Module 6 — Mises-bas `/mises-bas` + check J+1

✅ En place :
- Saisie nés totaux/vivants/morts/momifiés, poids portée, durée, BCS truie, écrasés
- Check J+1 dédié (page)
- v_checks_post_mb_attendus

⚠️ Manquant :
- **P0** : **Vermifuge truie J-14 pré-MB** : pas d'événement créé auto dans evenements_prevus
- **P0** : **Apport colostrum** : pas de checklist (tous porcelets tétés < 6h post-naissance)
- **P0** : Champ "uniformité portée" (poids min/max ou CV) — manquant (cible CV<15% INRAE)
- **P1** : Saisie **adoptions croisées** entre truies (pratique gestion portées hétérogènes)
- **P1** : Comptage **mâles/femelles** à la naissance (sexage J+0)
- **P2** : Photo mise-bas/portée

💡 :
- Auto-création événements J1 (fer), J3 (castration), J5 (queue), J14 (vaccin) à la saisie MB
- Suggestion adoption si portée > 14 vs < 10 même semaine

---

## Module 7 — Bandes `/bandes` + `/bandes/[id]`

✅ En place :
- Création bande, code, dates, animaux liés, statut
- v_kpi_bande (effectif, conso, GMQ, IC, coût alim)
- Page détail

⚠️ Manquant :
- **P0** : Sexage bande non séparé mâles/femelles (R22 alerte si manquant >2 mois)
- **P0** : Transit/transfert d'animaux **inter-bandes** non tracé (date sortie OK, mais cause = "transit interne" manquante)
- **P1** : Bande "porcs reproducteurs futurs" (sélection cochettes/futurs verrats à J70)
- **P1** : **Tri à 30j post-sevrage** (uniformisation poids) — pratique IFIP, non outillée
- **P2** : Recalcul GMQ projectif jusqu'à abattage

💡 :
- Cycle de vie complet bande visualisé timeline (entrée → mises bas → sevrage → vente)
- Auto-suggestion sortie commerciale quand poids moyen > seuil ferme

---

## Module 8 — Bâtiments `/batiments` + `/batiments/[id]`

✅ En place :
- Bâtiments, salles, cases, capacité, surface_m2, type

⚠️ Manquant :
- **P0** : **Densité animale** (surface/animal, FAO/CIRAD norme 0.7 m² post-sevrage, 1 m² engraissement) — pas calculée
- **P0** : **Vide sanitaire** : item checklist biosec OK, mais pas tracé par bâtiment/case (date dernier vide)
- **P1** : Suivi température/hygrométrie (tropical CI — important heat stress)
- **P1** : Plan de bâtiment / occupation visuelle
- **P2** : Coût maintenance par bâtiment

💡 :
- Alerte surdensité automatique (animaux_actuels × m²/animal vs surface_m2)
- Calendrier vide sanitaire par bâtiment (programmation rotation)

---

## Module 9 — Pesées `/pesees`

✅ En place :
- Pesées individuelles (animal_id) et lot (bande_id, nb_animaux)
- Types pesée variés

⚠️ Manquant :
- **P0** : Pesée standardisée porcelets J28 (cible 7-8 kg sevrage, INRAE) — pas d'alerte si <6kg
- **P0** : Pesée d'abattage / vente : confusion avec mouvement `departs` (devrait être lié 1-1)
- **P1** : Calcul GMQ automatique entre 2 pesées (par animal/bande)
- **P1** : Détection animaux "queues de bande" (poids < moyenne - 2σ)
- **P2** : Pesée balance Bluetooth (scan auto)

💡 :
- Programme pesées suggéré (J1, J7, J21, J28, puis 4 semaines)
- Courbe de croissance vs référentiel race

---

## Module 10 — Sanitaire `/sanitaire` + sous-pages

### `/sanitaire/calendrier`
✅ Calendrier porcelets J1/J5/J14/J28, bouton "marquer fait", gravité, statut temporel.

⚠️ Manquant :
- **P0** : Pas de calendrier **cochette pré-saillie** (J70 Parvo+Lepto, J150 Rouget, J165 Vermifuge — protocoles existent en BDD mais pas générés en événements)
- **P0** : Pas de calendrier **truie gestante** (J85 Erysipèle+Parvo)

### `/sanitaire/biosecurite`
✅ 12 items checklist, audits persistants, v_biosecurite_etat_actuel.

⚠️ Manquant :
- **P1** : Score biosécurité agrégé (% items conformes) — pas en KPI dashboard
- **P1** : Lien visites_biosecurite → checklist (visiteur sans douche = item "Sas douche" en violation auto)
- **P2** : Audit récurrent (rappel mensuel)

### `/sanitaire/eau`
✅ R17 chute >20% vs moyenne 7j.

⚠️ Manquant :
- **P1** : Cible consommation eau / catégorie (truie gestante 12-15 L/j, truie allaitement 25-35 L/j INRAE) — sous-conso aussi alerte
- **P2** : Qualité eau (analyse coliformes périodique)

### `/sanitaire/mycotoxines`
✅ 5 mycotoxines (Afla B1, ZEA, DON, OTA, FUM), seuils EU, R18 alerte 7j sans analyse.

⚠️ Manquant (CONTEXT.md TODO confirmé) :
- **P1** : Affichage colonnes OTA/FUM (champs en BDD mais UI absente)
- **P2** : Seuils différenciés par catégorie animale (truie gestante = plus strict ZEA)

### `/sanitaire/maladies` & `/sanitaire/protocoles`
✅ Catalogue maladies + protocoles vaccinaux (15 protocoles, voie IM encolure correcte).

⚠️ Manquant :
- **P0** : **PPA (Peste Porcine Africaine)** : pas de protocole de surveillance / déclaration (obligation OIE/WOAH en CI)
- **P1** : Rappels automatiques vaccins truies (Parvo/Lepto/Erysipèle pré-saillie cochettes existent en table mais pas en `evenements_prevus`)
- **P1** : Registre traitements antibiotiques (traçabilité, **délai d'attente** avant abattage) — table `traitements` existe mais pas de calcul délai

💡 :
- Auto-création événements de tous protocoles obligatoires à l'entrée d'un animal en cheptel
- Mode "épidémie" : déclencher protocole d'urgence (isolement bande, désinfection)

---

## Module 11 — Alimentation `/alimentation` (matières, formulation, plans, concentrés)

✅ En place :
- 30+ matières premières CI (maïs, soja, sorgho, manioc, son blé/riz, drèches, tourteaux palmiste/coton/arachide, sel, etc.)
- nutrition-engine (computeMixNutrition, ratios AA NRC 2012, heat stress tropical)
- CIBLES_RATIOS_AA par stade
- Plans alimentation bande

⚠️ Manquant :
- **P0** : **Décomposition AA matières CI** : Thr/Trp/Cys NULL sur la majorité (Maïs/Soja OK). Bloquant pour optimisation ration tropicale. Source : tables INRAE/Sauvant 2004.
- **P0** : **Aucune formulation enregistrée** (0 row formulations) — module dispo mais zéro utilisation, doute UX
- **P0** : Pas de **moulin de formulation auto** (solveur linéaire pour optimiser coût sous contraintes) — module attendu en élevage tropical
- **P1** : Cible énergie/protéine par stade visible dans formulation UI
- **P1** : Calcul **coût ration journalier** par bande (consommations_aliment × cout_kg formulation)

💡 :
- Bouton "Auto-formuler" à partir d'objectif (stade, coût max, contraintes Lys/Met/Thr)
- Comparatif 2 formulations côte-à-côte (coût + nutriments)

---

## Module 12 — Stock `/stock`

✅ En place :
- Matieres_premieres + seuil_alerte + stock_actuel
- Mouvements_stock (entrée/sortie, coût)
- R10 stock < seuil + R11 rupture prévue <7j
- Commandes + fournisseurs + lots

⚠️ Manquant :
- **P0** : **FIFO/FEFO** (premier entré ou premier expiré = sorti). Aucune logique de date d'expiration sur lots mycotoxines (zéro garde fou)
- **P0** : **Réception lot ↔ analyse mycotoxine** : workflow rupture (analyse présente mais "conforme" non bloquant pour utilisation)
- **P1** : Inventaire physique périodique (écart théorique vs réel)
- **P1** : Suggestion commande automatique (basé R11 + délai livraison fournisseur)
- **P2** : Code-barres / QR sur sac/lot (le composant `barcode-scanner` existe en composants !)

💡 :
- Tableau réception avec OK/REFUS direct (si Afla B1 > 20 ppb : bloquer mise en stock)
- Alerte rupture par catégorie (toutes matières "céréale" sous seuil → urgence)

---

## Module 13 — Calendrier `/calendrier` (global repro)

✅ En place :
- v_calendrier_repro consolide (saillies, MB attendues, sevrages)
- evenements_prevus avec type, priorité, statut, date_realisation

⚠️ Manquant :
- **P0** : Pas de vue **unifiée multi-sources** (repro + sanitaire porcelets + sanitaire cochettes + biosécurité + stock) — devrait être un calendrier global
- **P1** : Filtre par catégorie (repro/sani/stock/biosec)
- **P1** : Export iCal pour synchronisation téléphone éleveur
- **P2** : Drag & drop replanification

💡 :
- Vue "semaine type" élevage avec tâches récurrentes
- Notification push J-1 + J0 pour acte critique

---

## Module 14 — Assistant `/assistant` (chatbot agritech)

✅ En place :
- UI chatbot bulles WhatsApp (post-POLISH)

⚠️ Manquant :
- **P0** : Pas d'**ancrage contexte ferme** (l'assistant devrait connaître l'état réel : alertes, KPI, dernières MB)
- **P0** : Pas de **suggestions proactives** (basé alertes actives)
- **P1** : Historique conversations persisté
- **P2** : Mode vocal (mobile terrain mains sales)

💡 :
- "L'assistant a remarqué 3 alertes critiques aujourd'hui : ..."
- Mode "vétérinaire de garde" : checklist diagnostique guidé

---

## Module 15 — Conseiller `/conseiller`

✅ En place :
- 56 tips répartis (reproduction 10, conduite 10, nutrition 10, installation 10, économique 7, sanitaire 9)
- Catégorie, niveau, source, tags
- Page slug détail

⚠️ Manquant :
- **P1** : Tips contextualisés selon **stade ferme actuel** (ex: "saison sèche tropicale" → tips chaleur)
- **P1** : Tips liés à **alertes actives** (R13 truie anorexie → tip "comment relancer l'appétit")
- **P2** : Système de "tips lus / favoris"

💡 :
- Tip du jour push notification
- Quiz mensuel éleveur (formation continue)

---

## Plan de bataille suggéré — 4 sprints

### Sprint A — CRITIQUE santé bête/éleveur (1-2 semaines)
**Objectif : éviter pertes animales évitables**
1. **R-NEW Vermifuge truie J-14 pré-MB** (SQL + UI alerte + auto-création événement à saisie saillie/diag)
2. **R-NEW Fer porcelet J3 non-administré** (alerte si pas saisie J1+J3)
3. **R-NEW BCS sevrage < 2,5** (alerte truie sortie maigre)
4. **PPA surveillance** : page dédiée + protocole déclaration OIE/WOAH
5. **Auto-création événements protocoles cochettes** (J70 Parvo+Lepto, J150 Rouget, J165 Vermifuge — tout existe en BDD, manque le trigger)
6. **Densité bâtiment** : calcul + alerte surdensité (FAO/CIRAD)

### Sprint B — IMPORTANT productivité IFIP (2-3 semaines)
**Objectif : combler trous GTTT/GTE**
1. **MCA (Marge sur Coût Alimentaire)** : KPI ferme + bande
2. **IC global ferme** + GMQ par stade
3. **Taux de mise-bas** (MB/saillie) + **Taux de fertilité 1ère saillie**
4. **Décomposition AA** : compléter Thr/Trp/Cys 25+ matières premières CI (source INRAE Sauvant)
5. **Première formulation porcelet sevrage** (pré-starter + starter) sauvegardée comme template
6. **Sexage à la mise-bas** (champs mâles/femelles + uniformité portée CV)

### Sprint C — AUTOMATISATION (2 semaines)
**Objectif : éleveur moins de saisie, plus de décision**
1. **Calendrier unifié multi-sources** (repro+sani+cochettes+stock)
2. **Auto-événements protocoles** : à entrée animal cheptel, créer toute la chaîne (J1, J3, J5, J14, J28…)
3. **FIFO mycotoxines** : bloquer mise en stock si analyse non-conforme
4. **Assistant contextualisé** : injecter état ferme (alertes/KPI) dans contexte chatbot
5. **Suggestion commande auto** sur R11 + délai fournisseur

### Sprint D — UX TERRAIN MOBILE (1-2 semaines)
**Objectif : saisie 1-tap éleveur**
1. **Saisie BCS rapide** depuis fiche cheptel (5 boutons 2-3-3.5-4-4.5)
2. **Bouton "marquer fait"** étendu (vaccins, traitements, vermifuges, pas que porcelets)
3. **Snooze 24h** alertes UI
4. **Export PDF mensuel KPI** (vétérinaire/banquier)
5. **Code-barres / QR lot** (composant déjà présent, à brancher sur réception stock)

---

## Points forts à conserver (DO NOT BREAK)

- ✅ Architecture vue `v_alertes_actives` UNION ALL des 22 règles → extensible
- ✅ TMM IFIP (exclut écrasés) — méthode correcte rare en outils francophones
- ✅ BCS truie 5 stades + historique (saillies/MB/sevrages)
- ✅ Calendrier sanitaire porcelets J1/J5/J14/J28 — granularité juste
- ✅ 5 mycotoxines avec seuils EU (rare en outil tropical, valeur forte)
- ✅ Heat stress tropical + ratios AA NRC 2012 dans nutrition-engine
- ✅ Voie IM encolure (musculature massétère) sur 8 protocoles — détail vétérinaire pro
- ✅ Vocabulaire FR pro standardisé (terrain-labels.ts)
- ✅ Sidebar 5 groupes / bottom-nav 5 slots + badge alertes mobile

---

## Verdict

**GO AVEC FIXES** — Sprint A obligatoire avant déploiement production réelle (sécurité bête).

L'application a une base data/SQL exceptionnellement solide pour un outil porcin francophone tropical. Les gaps métier identifiés sont des **enrichissements** d'un socle sain, pas des refontes. Priorité absolue : alertes anti-pertes (Sprint A) + KPI économiques manquants (Sprint B) pour atteindre un niveau "outil de gestion vétérinaire + technique + économique" digne d'un IFIP-Like tropical.

Score post Sprint A+B : projetable à **8.5/10**.
Score post tous sprints : projetable à **9.2/10**.

**Notes auditeur :**
- 22 règles présentes en code mais CONTEXT.md mentionne 20 → mettre à jour CONTEXT.md (R21 diagnostic gestation attendu, R22 bande non sexée 2 mois)
- 0 formulations enregistrées en BDD : soit feature non-utilisée par seeders, soit UX bloquante — investiguer
- 5 mortalités/cheptel : données seed minimales (3 truies, 2 verrats) → certaines alertes seront silencieuses tant que données réelles absentes
