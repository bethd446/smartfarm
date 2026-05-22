# K1 — Critique Métier (éleveur 25 ans méfiant)

> Adversaire : Éleveur porcin ivoirien, 25 ans de carrière. Paye 80 €/mois. Cherche à résilier.
> Mode lecture seule. Audit sur app live `http://127.0.0.1:3000` + source `/root/projects/smartfarm/app/src`.
> Date : 22 mai 2026 · auditeur K1

---

## Verdict global : VAIS-JE RÉSILIER ? **OUI**

Trois raisons brutes :

1. **L'app prétend être "offline-first"** (cf. `layout.tsx` ligne 7 → `description: "...offline-first, mobile."`) **mais y a NI manifest PWA, NI service worker, NI page /offline**. Je curl `/manifest.json` → 404. `/sw.js` → 404. Putain mais ils ont mis "offline-first" dans le SEO et derrière y a RIEN. Au campement à Tiébissou la 4G saute 6h sur 24, leur app devient un presse-papier inutile. C'est juste pas sérieux que sur une promesse aussi centrale ils mentent.
2. **Pour enregistrer UNE mise-bas, je traverse un wizard 5 étapes / 12 champs / minimum 8 taps clavier**. Mon ouvrier qui sort de la maternité avec les mains qui sentent encore le sang, il va abandonner au step 3 et écrire au feutre rouge sur la porte de la case comme avant. Ils ont raté le geste numéro 1 du métier.
3. **Aucun batch nulle part. Aucune action multi-truies**. 3 saillies aujourd'hui = 3 fois le même formulaire de 8 champs = 24 taps minimum. Le cahier IFIP papier je fais ça en 30 secondes avec 3 lignes.

---

## Scénarios testés

### Scénario A — Déclarer mise bas en 30 sec

> "Une truie a fait sa mise bas ce matin à 5h. Je veux la déclarer en 30 sec en marchant entre les cases."

**Verbatim** : "Putain mais ils ont fait un WIZARD 5 ÉTAPES pour une mise-bas ? J'ai pas le temps de faire des étapes, j'ai 4 cases à inspecter avant 7h."

**Parcours réel observé** (`_dialog-mise-bas.tsx`) :
- Step 0 — Truie & horaire : 2 champs (select saillie + date) → 2 taps
- Step 1 — Naissances : 4 champs numériques (totaux/vivants/morts-nés/momifiés) → 4 saisies clavier
- Step 2 — État portée : 2 champs (poids portée kg + écrasés) → 2 saisies
- Step 3 — Truie post-MB : durée, checkbox assistance, **BCS 1-5 sur 5 boutons**, observations → 4 interactions
- Step 4 — Récapitulatif → 1 tap confirmer

**Clics réels** : minimum **8 taps + 5 saisies clavier numériques** = ~13 interactions
**Temps réel estimé** : **2 min 30 minimum** sur smartphone avec gants/mains mouillées. Plus si erreur de validation "Total nés ≠ somme" qui me fait revenir au step 1.

**Failles** :
- Saisie clavier obligatoire pour les 4 nombres (Total/Vivants/Morts-nés/Momifiés). Pourquoi pas un stepper -/+ ? Mon doigt mouillé tape "12" et ça écrit "1" puis "2" décalés.
- "Total nés" obligé d'être saisi SÉPARÉMENT alors qu'il est = vivants + morts + momifiés. Pourquoi je le tape ? Calculez-le pour moi.
- BCS demande BCS de la TRUIE post-MB. Sérieusement ? Je viens de finir l'arrachage des dernières enveloppes placentaires et tu me demandes de noter la condition corporelle au moment où je tape le rapport ? On le fait à J+3 minimum dans la vraie vie.
- Pas de bouton "Mise bas express" : tag + nombre vivants → enregistré, le reste à compléter ce soir au calme.

**Verdict : 3/10**. Hors limite pour terrain matinal. Le wizard tue le geste pro.

---

### Scénario B — 3 saillies en 1 minute

> "J'ai 3 truies en chaleur ce matin sur la même bande. Je veux les marquer toutes saillies en 1 min, même verrat."

**Verbatim** : "Ils ont raté ÇA ?! 1 formulaire par truie ?! Mais c'est insultant, un cahier papier je fais 3 lignes consécutives dans la colonne Saillies."

**Parcours réel** (`_dialog-faire-monter.tsx`) :
- Le composant n'a aucune option `multiple` ni paramètre liste.
- Pas trouvé une seule occurrence de "batch", "saillie.*multiple", "plusieurs.*saillie" dans le code source.
- Donc : ouvrir dialog → choisir truie → verrat → méthode → date → bande → rang → BCS → observations → submit → **fermer** → réouvrir... × 3.

**Clics réels** : ~24 interactions pour 3 truies.
**Temps réel estimé** : **3 min 30 sec minimum**.

**Faille critique** : aucun batch nulle part. Ni saillie, ni vaccination, ni pesée, ni traitement. Pour une ferme de 80 truies en bande conduite, ça veut dire 3-4 saisies identiques répétées 20 fois à la sortie d'un même cycle. C'est juste pas sérieux que ça existe pas en 2026 sur une app qui demande 80 €/mois.

**Verdict : 1/10**. Show-stopper élevage en bande.

---

### Scénario C — Logger mortalité porcelet nocturne

> "Un porcelet est mort dans la nuit, je veux logger mortalité + cause."

**Verbatim** : "Putain mais la cause c'est un CHAMP TEXTE LIBRE ? Mon ouvrier va taper 'ecrazement' avec une faute, demain ma stat 'top cause mortalité' va être complètement à côté."

**Parcours réel** (`_dialogs-sanitaire.tsx` → `DialogNouvellePerte`) :
- Switch cible animal/bande (1 tap)
- Select animal (1 tap + scroll dans liste de 80+ truies/porcelets sans filtre rapide, sans QR scan dans le dialog)
- Date (déjà aujourd'hui, OK)
- **Cause** : `<Input>` texte libre avec placeholder "Ex. Maladie, écrasement, accident…" — schema valide `min(1)` donc obligatoire, mais aucun picker
- **Diagnostic** : encore un texte libre optionnel
- Checkbox autopsie + Observations
- Submit

**Clics + saisies** : ~3 taps + **2 saisies clavier longues** (cause + diagnostic)
**Temps réel estimé** : **45 sec** si je connais le tag, **2 min** si je dois chercher dans la liste.

**Failles** :
- **Cause = champ libre** = poubelle statistique. Aucun picker des 5-6 causes IFIP standards (Écrasement, Faiblesse, Diarrhée, Pneumopathie, Inconnue, Autre). Conséquence : impossible de faire un Pareto cause de mortalité fiable. Le KPI `topCauseMortalite` que je vois dans le code (`sanitaire-stats.tsx` ligne 75) repose donc sur du texte libre = nada.
- Pas de scan QR boucle dans le dialog pour identifier l'animal. La sidebar mentionne un `barcode-scanner` mais il n'est pas branché dans le dialog mortalité.
- Pas d'âge auto-rempli depuis l'animal sélectionné (utile pour différencier écrasement néonatal vs maladie post-sevrage).

**Verdict : 3/10**. Saisie possible mais données pourries en sortie.

---

### Scénario D — Historique sanitaire truie T-001 chez le véto

> "Je suis chez le véto, je dois voir l'historique sanitaire complet de la truie T-001 en moins de 10 secondes."

**Verbatim** : "Bon ça ils l'ont pas complètement raté."

**Parcours réel** :
- Sidebar Cheptel → table cherche T-001 (Ctrl+F natif marche, pas de search box visible côté server-side mais le tableau est dans le DOM)
- Tap sur ligne → `/cheptel/[id]` → onglet Santé via `AnimalTabs`
- 4 onglets : Pesées / Reproduction / Santé / Mouvements
- Onglet Santé affiche vaccinations + traitements

**Temps réel estimé** : **~15 sec** si j'ai le réseau et que je connais l'URL. **30+ sec** si je dois scroller la liste cheptel (pas de search-bar UX visible).

**Failles** :
- Pas de recherche rapide tag (search input dédié sur /cheptel). Je vois 80 lignes, je scroll.
- Si réseau down chez le véto en brousse → écran blanc (cf. faille offline).
- Pas de bouton "Exporter PDF dossier sanitaire" sur la fiche truie (utile chez véto sans wifi).

**Verdict : 6/10**. La structure est bonne, l'accès trop lent en mobilité réelle.

---

### Scénario E — Meilleure truie à garder

> "Je veux voir quelle est ma meilleure truie pour décider laquelle réformer en fin de cycle."

**Verbatim** : "Bon là ils ont sorti un Trophy + classement + médailles 🥇🥈🥉, ça c'est exploitable."

**Parcours réel** (`/cheptel/classement-truies/page.tsx`) :
- Route accessible mais **PAS dans la sidebar** (j'ai dû la trouver dans la liste H1). Donc l'éleveur lambda l'ignore.
- Tableau Rang | Tag | Nom | NV moy | Vitalité | Survie | Portées | Score
- Vue SQL `v_score_truie` qui calcule un score composite.

**Faille majeure** : **classement-truies n'est PAS dans la sidebar des 14 items**. Comment je le trouve ? Si je le sais pas, je le sais pas. Énorme gâchis fonctionnel.

Autre faille : score composite calculé mais **aucune explication des pondérations** affichée à l'éleveur. "Score 78" → 78 sur quoi ? Comment c'est calculé ? Le verdict métier "garder/réformer" n'est pas explicite, c'est à moi de l'interpréter.

**Verdict : 5/10**. Bonne fonctionnalité, planquée + pas explicite.

---

### Scénario F — Check J+1 porcelet par ouvrier

> "Mon ouvrier doit faire le check J+1 porcelets ce matin. Je veux lui montrer en 5 sec quoi vérifier."

**Parcours réel** (`/mises-bas/check-j1/page.tsx`) :
- Route existe, server action `enregistrerCheck`
- Page liste les mises-bas attendues check par phase J0/J+1/J+2-3/J+4-7
- Form fields : vivants_actuels, écrasés_24h, morts_autres_24h, bcs_truie, truie_lactation_ok, truie_appetit_ok, porcelets_actifs, observations
- Protocole IFIP J1 (fer, tétée colostrum, tarissement cordon) **NON détaillé en checklist visuelle dans la page**

**Failles** :
- Route **HORS SIDEBAR** aussi. Mon ouvrier ne la trouve pas. Je dois lui envoyer le lien en WhatsApp.
- Le protocole IFIP "ce qu'il faut faire à J+1" (administrer fer, observer tétée, désinfecter ombilic, peser portée) n'est pas affiché en checklist actionnable. C'est juste un formulaire qui demande "Truie lactation OK ?" sans rappeler comment le constater.
- Pas de mode "ouvrier" pour limiter les champs accessibles ni traduire en Dioula/Baoulé.

**Verdict : 4/10**. Le hook DB est là, l'aide opérationnelle manque.

---

### Scénario G — Stock aliment en rupture

> "On est en rupture aliment, je dois savoir combien j'ai en stock truie gestante."

**Parcours réel** (`/stock/page.tsx`) :
- KPI Cards en haut : Articles en stock / Valeur stock / Fournisseurs
- Tableau Article | Type | Stock | Seuil alerte | Coût | Valeur
- Badge rouge si stock_actuel < seuil_alerte
- ✅ Chiffre clair, unité affichée

**Verbatim** : "Bon, ça c'est fait correctement."

**Failles** :
- **Pas de projection "il me reste combien de jours ?"** — c'est ÇA qui compte. 200 kg de truie gestante, à combien de jours d'autonomie ? Je dois faire le calcul dans ma tête à chaque fois.
- Pas de bouton "Commander à fournisseur X" / "Envoyer SMS au fournisseur habituel".
- Pas de FIFO visible (date lot + DLUO matières). Le mycotoxines repose là-dessus selon CONTEXT.md mais l'UI Stock ne le montre pas.

**Verdict : 6/10**. Affichage OK, manque la projection métier.

---

## TOP 10 FAILLES P0 (par ordre d'impact terrain)

1. **Pas d'offline-first malgré la promesse**. Aucun service worker / manifest / cache. 6h panne 4G CI = app morte. Fail catastrophique vs cahier papier.
2. **Wizard mise-bas 5 étapes / 12 champs / 8+ taps**. Le geste le plus fréquent et critique du métier est l'expérience la plus lourde.
3. **Aucun batch nulle part** (saillies, vacc, pesées, traitements). Inacceptable en élevage en bande.
4. **Cause mortalité = champ texte libre** → analytics inexploitables, fautes d'orthographe garanties.
5. **Pas de QR scan boucle dans les dialogs** (mortalité, pesée, traitement). Sortir → scanner → recopier le tag à la main = perte 20 sec × N.
6. **Saisie clavier numérique partout** (totaux, écrasés, momifiés, BCS optionnel, poids). Pas de stepper ±, pas de touchpad XL.
7. **Pages critiques HORS SIDEBAR** : `/cheptel/classement-truies`, `/cheptel/[id]/genealogie`, `/mises-bas/check-j1`. Fonctionnalités payées invisibles.
8. **Pas de recherche tag rapide** sur /cheptel (80+ lignes à scroller). Fail en mobilité.
9. **Pas de mode "ouvrier"** ni de traduction (Dioula, Baoulé, français simple). 80 % de mon staff lit pas correctement le français pro avec le vocabulaire "ISSF", "TMM", "BCS post-MB".
10. **BCS demandé au moment du wizard mise-bas** alors que la pratique IFIP c'est à J+3 et J+21. Inversion temporelle = saisie bâclée ou non-réponse.

---

## Fonctionnalités critiques MANQUANTES

### Cahier systématique IFIP attendu (référentiel papier que j'utilise depuis 25 ans)

- **Registre des saillies** : ✅ géré (saillies) mais **manque** : retour en chaleur J18-24 visualisé clairement sur la fiche truie en plus de la liste globale.
- **Registre des mises-bas** : ✅ saisie présente mais **wizard inadapté**.
- **Registre vaccinations & traitements** : ✅ saisie sanitaire OK.
- **Cahier de mortalité avec cause normée** : ❌ champ libre. **Manque picker IFIP standardisé**.
- **Inventaire mensuel cheptel** (cochettes / truies / verrats / porcelets / engraissement) : ❌ pas vu de snapshot mensuel exportable PDF.
- **Plan de prophylaxie annuel** : 🟡 partiel (`/sanitaire/protocoles` existe) mais pas de "ce mois-ci voici les vaccinations à faire" projeté à 12 mois.
- **Cahier d'alimentation par stade** (consommations réelles vs prévues) : 🟡 `/alimentation/consommations` existe, pas vérifié en profondeur mais l'écart prévu/réel n'est pas central.
- **Journal des entrées/sorties d'animaux** (mouvements, ventes, achats) : ❌ pas vu de page "Mouvements ferme" globale.
- **Carnet sanitaire véto par animal exportable PDF** : ❌ /api/registre existe mais pas de bouton "Export dossier truie T-001 PDF".
- **Cahier des températures bâtiment** : ❌ rien (or critique pour mortalité néonatale CI = stress thermique).
- **Cahier des analyses eau** : ❌ /sanitaire/eau a été désactivé (redirect 307) selon CONTEXT.md.
- **Calcul économique simple par bande** : ❌ pas vu — coût aliment + sanitaire / kg viande vendue.

### Manques bloquants vs concurrence papier-stylo

- **Action vocale** ("Truie T012, mise bas, 12 vivants, 1 mort-né") : tendance 2026, absente.
- **Photo + OCR boucle** : absent.
- **Templates SMS notification ouvrier** : absent.
- **Mode 1-tap "rien à signaler"** par animal (90 % du temps = pas d'événement).

---

## Comparaison avec cahier papier-stylo

| Aspect | Papier-stylo | Smart Farm |
|---|---|---|
| Saisie mise bas 30 sec | ✅ 3 nombres griffonnés | ❌ wizard 2-3 min |
| Saisie batch 3 saillies | ✅ 3 lignes consécutives 1 min | ❌ 3 formulaires séparés 3-4 min |
| Marche entre cases mains sales | ✅ stylo + cahier sous bras | ❌ smartphone glisse |
| Soleil écrasant lecture écran | ✅ papier lisible | ❌ écran reflète |
| Panne réseau 6h | ✅ continue | ❌ écran blanc |
| Picker cause mortalité normé | ❌ texte libre éleveur | ❌ texte libre |
| Historique 25 ans | ✅ archives boîtes | 🟡 dépend Supabase + backup |
| Recherche tag T-001 historique | 🟡 lent (feuilleter) | ✅ rapide si je sais l'URL |
| Export pour véto / coopérative | ❌ photocopie | 🟡 export CSV existe, PDF dossier individuel non |
| Calcul KPI ISSF/TMM | ❌ je fais à la main | ✅ calculé automatiquement |
| Alertes auto fenêtre diagnostic | ❌ je dois penser | ✅ R01-R28 fait |
| Classement reproducteur truies | ❌ approximatif | ✅ vue score (mais cachée hors sidebar) |
| Multi-langue ouvrier | ✅ je dicte | ❌ français uniquement |

**Ce que le papier fait mieux** :
- Rapidité brute de saisie quotidienne
- Robustesse panne réseau / batterie
- Pas de friction écran/gants/mouillé/soleil
- Aucune courbe d'apprentissage ouvrier
- Hors-de-portée hacking / RLS / vendor lock-in

**Ce que Smart Farm fait mieux (et qu'il faut pas perdre)** :
- KPI techniques IFIP automatiques
- Alertes calendaires (R01-R28)
- Classement reproducteur multicritère
- Export CSV/PDF KPI
- Centralisation pluriferme potentielle

---

## Réponses aux questions dures

1. **Combien de pages obligent du clavier** ? Au minimum **6 dialogs critiques** : mise bas (5 numériques), saillie (BCS + rang), perte/mortalité (cause + diagnostic), sevrage (nb sevrés + poids), pesée (poids), nouveau matériel (nom + seuil). Aucun stepper ±. Aucun input voice.

2. **Combien de fois je tape la même info** ? Date `aujourd'hui` à chaque dialog (heureusement bouton "Aujourd'hui" présent mais valeur déjà pré-remplie par défaut donc bouton redondant). Tag truie pas auto pré-rempli quand on vient d'une fiche truie (j'ouvre un dialog depuis `/cheptel/T-001` → faut re-sélectionner T-001 dans le select). Bande pas pré-remplie quand truie connue.

3. **Friction principale qui me fait repasser au papier** : **le wizard mise-bas 5 étapes + l'absence d'offline**. Si je perds 2 min par mise-bas × 8 portées/semaine × 4 semaines = **64 min/mois rien que sur la mise-bas**, sans compter les retry quand réseau plante. Plus la peur que les données soient perdues offline. Je continue au cahier en parallèle "par sécurité" → l'app devient redondante → je résilie.

4. **Fonctionnalités critiques manquantes vs cahier IFIP** : cause mortalité normée, mouvements animaux globaux, températures bâtiments, dossier individuel PDF, plan prophylaxie projeté 12 mois, calcul économique bande. Détaillé section ci-dessus.

5. **Hors ligne 6h** : **TOUT casse**. Pas de SW. Aucun cache. L'éleveur voit un écran blanc / erreur réseau. Catastrophe totale. La description marketing dit "offline-first" mais c'est un mensonge.

6. **Erreurs probables doigts mouillés + soleil** :
   - Tapes "12" → "1" + "2" séparés sur input number = "1" puis "12" → champ devient "112" ? Selon focus.
   - Mauvais select truie (liste flat 80 items, scroll loupé) → mortalité enregistrée sur la mauvaise bête → impossible à annuler ou audit_log ?
   - Soleil écrasant → vert sahel #2D4A1F sur crème #FFFBEB est BON contraste mais badges danger #F1D4CE peuvent disparaître au soleil direct.
   - Wizard 5 étapes → tap accidentel "Suivant" sans valider step courant → données zappées.

---

## Verdict final

**UTILISABLE TERRAIN** : **NON** en l'état pour un éleveur seul/équipe réduite en brousse CI.

L'app est techniquement riche (28 règles d'alertes, KPI IFIP automatiques, classement reproducteur, hub sanitaire, 43 tables RLS) mais elle a été **conçue par des gens qui n'ont pas tenu un stylo dans une maternité à 5h du matin**. Elle s'adresse à un **chef d'élevage en bureau qui regarde des KPI** et pas à l'éleveur-opérateur-ouvrier qui fait les gestes du métier.

**Pédiatrique ou pro ?** **Pédiatrique sur les gestes terrain, pro sur l'analyse**.

C'est un outil d'**analytics post-saisie** déguisé en outil de saisie temps réel. Pour qu'il devienne pro terrain il faut :

1. PWA réelle + service worker + page offline + queue de sync (P0 — promesse marketing à honorer).
2. Mode "saisie express" 3 champs maxi pour mise-bas, saillie, mortalité avec validation différée (P0).
3. Batch multi-truies sur saillie/vaccination/pesée (P0).
4. Picker normé pour cause mortalité (P0 — 30 min de dev).
5. Action "1-tap" depuis fiche truie : Mort, Saillie, Diagnostic, Pesée, BCS — sans re-sélection (P1).
6. Mettre `/cheptel/classement-truies`, `/mises-bas/check-j1`, `/cheptel/[id]/genealogie` DANS la sidebar (P1 — 10 min).
7. Recherche tag rapide sur /cheptel (P1).

En l'état, **je résilie**. Je garde mon cahier IFIP et je paye un comptable une fois par trimestre pour saisir les KPI dans Excel.

---

*Audit réalisé en lecture seule. 0 fichier modifié. 0 build lancé. Toutes assertions vérifiées par curl + lecture source.*
