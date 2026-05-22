# AUDIT MÉTIER PORCIN — Smart Farm V2 (Round 2)

**Date** : 21 mai 2026  
**Périmètre** : Sprints S1+S2+S3 (Reproduction · Sanitaire · Biosécurité · Eau · Mycotoxines · Nutrition NRC · KPI · Alertes R01-R18)  
**Réfs croisées** : NRC 2012, INRA-CIRAD-AFZ 2018, IFIP Mémento Porc 2022, OIE/WOAH, FAO production porcine AO, Règlement UE 2006/576 (mycotoxines).

## Score global : **6.5 / 10**

Base métier solide (catalogue maladies, terminologie zootechnique FR pro, intégration locale CI avec IVOGRAIN/De Heus/manioc/palmiste, BCS truie 1-5). **Mais 2 incohérences internes bloquantes** (calendrier porcelets ↔ protocoles BD ; mapping R13-R18 manquant) et **plusieurs erreurs scientifiques** sur les références NRC et seuils mycotoxines à corriger avant déploiement terrain.

---

## P0 — Bloquants (à corriger avant pilote)

### P0-1. Incohérence calendrier porcelets ↔ protocoles vaccinaux (DOUBLE SOURCE DE VÉRITÉ)
La page `/sanitaire/calendrier` affiche **« Mycoplasmose H1 à J7 » et « H2 à J21 »**, alors que la table `protocoles_vaccinaux` impose **primo J14 + rappel J28 (puis J28 Mycoplasma+PCV2)**. Deux moteurs vivent en parallèle. Risque terrain : vétérinaire qui suit le calendrier vaccine 7 j trop tôt — l'immunité maternelle bloque la réponse vaccinale Mhyo avant J10-14 (IFIP, Maes 2008). **Action** : aligner le générateur de calendrier sur la table `protocoles_vaccinaux` (single source of truth).

### P0-2. Mapping UI alertes R13-R18 manquant
`src/lib/alertes-regles.ts` ne contient que R01→R12. Les vues SQL produisent **R13-R18** (anorexie, cochette >250 j, mortalité lot anormale, mise-bas tardive, eau, lot non analysé) → la fonction `getRegleMetadata()` retourne `undefined` pour ces règles, donc **affichage sans titre / sans catégorie / sans gravité dans le centre d'alertes**. C'est précisément la valeur métier ajoutée par S2 qui passe à la trappe en UI.

### P0-3. Terminologie « lysine totale » sans précision SID
Tableau « Besoins de référence NRC 2012 / INRA 2018 » affiche Lys/Met en % sans préciser **digestible (SID) vs totale**. Les valeurs (Lys allaitante 1.05%, gestante 0.55%) correspondent au **SID NRC**, mais sont labellisées comme totales dans le type TS (`lysine_min_pct`). Conséquence terrain : un formulateur qui interprète comme « totale » sous-dose de ~10-15 % (ratio SID/totale ≈ 0.87). **Action** : renommer en `lysine_sid_min_pct`, ajouter colonne « base : digestible iléale standardisée (SID) » dans le tableau UI + tooltip.

### P0-4. TMM (Taux de mortinatalité) calcule la mauvaise grandeur
`v_kpi_techniques_truie` calcule TMM = (mort-nés + momifiés + **écrasés**) / nés totaux. **Erreur scientifique** : la TMM stricto sensu (IFIP, GTTT) = (mort-nés + momifiés)/nés totaux **uniquement** (pertes péri-partum). Les **écrasés** sont des morts post-natales et constituent les **« pertes en lactation »** — déjà calculées séparément (`pertes_lactation_pct`). En l'état, on les compte 2 fois et la TMM affichée est gonflée de 2-4 points typiquement. **Action** : retirer `sum_ecrases` du numérateur TMM.

---

## P1 — Erreurs métier importantes

### P1-1. Seuils mycotoxines trop laxistes pour truies/porcelets
Code commenté « seuils UE porcs : aflB1 ≤ 20, ZEA ≤ 250, DON ≤ 900 ppb ». Or **Règlement UE 2006/576/CE** :
- ZEA : 250 ppb porc engraissement OK, mais **truies et porcelets = 100 ppb** (recommandation).
- DON : 900 ppb tous porcs OK.
- **Manque Fumonisines B1+B2** : seuil 5 000 ppb porcs — **omission majeure** en CI où le maïs local est massivement contaminé en saison pluies (FAO CI 2022 : 60-80 % lots maïs > 1 000 ppb FUM).
- **Manque Ochratoxine A** (50 ppb porc).
**Action** : ajouter colonnes FUM, OTA + seuils différenciés truie/porcelet vs engraissement.

### P1-2. Castration porcelet : âge et libellé
- Protocole BD : castration **J7** ; calendrier UI : J3 (« Coupe queue/castration optionnel »).
- Recommandation UE / IFIP : avant **J7 sans anesthésie**, idéalement **J3-J5**. J7 est la limite supérieure.
- Libellé « optionnel » erroné pour la CI : pas de filière mâle entier, castration **systématique** des mâles destinés à l'abattage. Remplacer par « Castration mâles non reproducteurs ».
- **Manque AINS** dans le libellé UI alors que le protocole BD le mentionne (méloxicam) — perdu en route.

### P1-3. Vaccin « Peste Porcine + Rouget » à J42 — formulation ambiguë
Description en base : *« Peste porcine africaine : pas de vaccin homologué — utiliser PPC si disponible. Rouget systématique »*. Or **la Côte d'Ivoire n'a pas non plus de vaccin PPC homologué et largement diffusé** (filière artisanale, pas de programme national de vaccination PPC). Le libellé induit en erreur : suggérer Rouget seul à J42 + mentionner PPC comme conditionnelle. Reformuler : *« Rouget systématique (Erysipelothrix). PPC : uniquement sur prescription vétérinaire si vaccin disponible (rare en CI) »*.

### P1-4. Verrat — Ca/P NRC trop hauts
Verrat : Ca 0.85 % / P 0.65 %. NRC 2012 table 17-7 verrat reproducteur : Ca **0.75 %**, P total **0.60 %**. Légère sur-spécification (sans danger mais surcoût de phosphate bicalcique = ~5 XOF/kg).

### P1-5. KPI ISSF — convention IFIP non documentée
Le calcul considère « saillie suivante qui aboutit à une mise-bas » (= saillie fécondante confirmée *a posteriori*). Convention IFIP / GTTT = ISSF = sevrage → **saillie fécondante** (= avec gestation confirmée par diagnostic). Ici on attend la mise-bas effective → biais : les truies **réformées entre saillie fécondante et mise-bas** sont exclues. À documenter dans l'UI (tooltip) ou aligner sur diagnostic positif.

### P1-6. R06 incohérente avec son propre périmètre
R06-porcelets-non-vaccines-J14 : « Porcelet 16-25 j sans vaccination Mycoplasma ». Mais le calendrier déclenche la primo à **J7** (cf. P0-1). Si on aligne sur J14 BD, l'intervalle 16-25 j est correct. Si on garde J7 calendrier, R06 doit déclencher dès J9-15. À harmoniser après P0-1.

---

## P2 — Améliorations métier / terrain CI

- **Ratios AA idéaux absents** : Met+Cys/Lys (0.55-0.60), Thr/Lys (0.65), Trp/Lys (0.18-0.22). Sans ces ratios, formulation incomplète — un porcelet 1er âge formulé seulement sur Lys et Met sera carencé en Thr (gros impact diarrhée post-sevrage en zone tropicale).
- **Ratio Lys/EM** (g Lys SID / Mcal EM) — c'est LE ratio clé en formulation pratique IFIP, à afficher pour chaque stade. Ex : porcelet 5-15 kg ≈ 4.0 g/Mcal.
- **Tourteau de coton 5 % MAT 41 %, Lys 1.65 %** : noter le gossypol libre — limite porc 100 ppm gossypol (USDA). À indiquer dans `notes_terrain` + alerte si > 8 % d'inclusion ration. Le tourteau de coton CI dépasse souvent 200 ppm gossypol libre.
- **Tourteau d'arachide** : risque aflatoxine majeur — devrait être systématiquement « lié à un lot analysé » côté UI (R18 cible déjà soja/maïs/arachide → bon, mais à mettre en évidence sur la fiche matière).
- **Eau tropicale** : R17 mesure une chute >20 % vs moyenne 7 j. **Manque besoin absolu** : truie allaitante CI ≥ **20-25 L/j** (vs 15-20 zone tempérée — chaleur). Ajouter une alerte basse absolue « consommation < 8 L/truie/j ».
- **Fer dextran J1 « entre les côtes »** : voie IM correcte mais le **site standard est l'encolure** (face latérale du cou) ou la face interne de la cuisse. « Entre les côtes » est dangereux (risque pneumothorax). Reformuler.
- **Libellé "Mycoplasmose H1/H2"** : non standard. Préférer « Mycoplasma hyo — primo / rappel » (terme IFIP/vétérinaire CI).
- **BCS truie 1-5** : OK. Mais manque la **cible BCS par stade** (sevrage 3.0, mise-bas 3.5, fin lactation 2.5) — déclencheur d'alerte si écart > 0.5.
- **Tropical heat stress** : la mention du fichier nutrition-data.ts (« +3-5 % besoin EM ») n'est pas appliquée numériquement aux valeurs. Soit on assume, soit on ajoute un facteur stade `* 1.04` documenté.
- **Réforme/longévité** : aucune métrique « parité moyenne au sevrage » / « % réforme cycle 1-2 » — c'est pourtant un indicateur économique majeur pour CI où le renouvellement coûte cher (cochette F1 importée).
- **R14 cochette >250 j** : seuil cohérent IFIP (1ère saillie 220-240 j, retard si >250 j). OK.
- **Manque alerte « intervalle sevrage-saillie > 10 j »** classique GTTT (signal de chaleur silencieuse / sous-nutrition).
- **Calendrier porcelets ne mentionne pas la coupe des dents (J1-J3)** ni la **boucle d'identification** — actes standards de la maternité.

---

## Synthèse priorités

| Priorité | Item | Effort | Impact métier |
|---|---|---|---|
| P0-1 | Réconcilier calendrier porcelets ↔ `protocoles_vaccinaux` | M | Évite vaccination Mhyo trop précoce |
| P0-2 | Mapping UI R13-R18 dans `alertes-regles.ts` | S | Récupère valeur S2 |
| P0-3 | Renommer Lys/Met en SID + tooltip | S | Évite sous-dosage AA |
| P0-4 | TMM : retirer écrasés du numérateur | S | KPI conforme GTTT |
| P1-1 | Mycotoxines : seuils truies/porcelets + FUM + OTA | M | Spécifique CI saison pluies |
| P1-2 | Castration J3-J5 systématique + libellé AINS | S | Conforme UE & filière CI |
| P1-3 | Reformuler PPC/PPA J42 | S | Pas d'induction en erreur |
| P1-5 | Documenter convention ISSF | S | Conformité GTTT |
| P2 | Ajouter ratios AA idéaux (Thr/Lys, Trp/Lys) + Lys/EM | M | Formulation porcelet correcte |
| P2 | Cibles BCS par stade | S | Alerte sous/sur-nutrition truie |

**Score détaillé** :
- Reproduction / KPI : 7/10 (TMM erronée P0)
- Sanitaire / protocoles vaccinaux : 6/10 (incohérence calendrier P0)
- Mycotoxines : 5/10 (seuils incomplets, FUM/OTA manquants)
- Nutrition NRC : 6/10 (terminologie SID, ratios AA manquants)
- Alertes R01-R18 : 7/10 (logique SQL bonne mais UI incomplète)
- Adaptation terrain CI : 7/10 (matières locales bonnes, manque application heat-stress)

**Verdict** : **Pas prêt pour pilote commercial sans corriger les 4 P0**. Les P0 sont chacun < 1 j de dev. Une fois corrigés et P1-1 (mycotoxines) traité, l'app passe à un **8/10 solide** et peut entrer en pilote terrain.
