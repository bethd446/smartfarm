# QA Audit Smart Farm — 23/05/2026

URL : https://smartfarm.group
Compte de test : `13smartfarm@gmail.com`
Stack : Next.js 16 / React 19 / Tailwind v4 / shadcn / Supabase Cloud
Auditeur : Hermes QA (dogfood)

---

## Executive Summary

| Métrique | Valeur |
|---|---|
| **Total bugs trouvés (audit partiel)** | 10+ |
| P0 (bloquants) | 5 |
| P1 (importants) | 3 |
| P2 (cosmétiques) | 2 |
| Routes testées | 7 / 15 |
| Couverture | 47% |

**Verdict** : Christophe avait raison. L'app est livrable techniquement (login + données BDD OK) mais **5 bugs P0 bloquent l'UX cœur métier**. **STOP Claude Design tant que ces bugs ne sont pas fixés.**

---

## 🐷 Section spéciale — Organisation Cheptel (réponse à la demande Christophe)

### Constat actuel : SÉPARATION INEXISTANTE

- **1 seule table monolithique** sur `/cheptel` (1 seul `<tbody>`)
- **136 lignes mélangées** dans un même bloc :
  - 17 truies
  - 2 verrats
  - 117 porcelets sevrés
- Heading unique : *"TRUIES, VERRATS ET COCHETTES ENREGISTRÉS"* → titre **mensonger** (inclut aussi les 117 porcelets)
- **0 onglet, 0 tab, 0 filtre, 0 select, 0 recherche** (vérifié via DOM)
- Tri alphabétique par boucle → verrat Aligator B.100 affiché en ligne 2 entre B.10 et B.12 (truies)
- **AUCUNE section Portées** dans `/cheptel`
- **AUCUNE section Verrats séparée**
- Sur la fiche détail truie B.22 Monette : zone "PORTÉES" et "HISTORIQUE DES PORTÉES" présente mais **vide** alors que la BDD contient sa MB du 03/03 (10 vivants)

### Recommandation (à intégrer avant Claude Design)

Refonte `/cheptel` avec **séparation visuelle nette** demandée par Christophe.

**Option A — Onglets** (recommandé) :
```
[ Truies (17) ] [ Verrats (2) ] [ Cochettes (0) ] [ Porcelets (117) ] [ Portées (6) ]
```

**Option B — Sous-routes dédiées** :
- `/cheptel/truies`
- `/cheptel/verrats`
- `/cheptel/cochettes`
- `/cheptel/porcelets`
- `/cheptel/portees`

**À ajouter dans tous les cas** :
- Filtres par statut métier : gestante / allaitante / vide / observation / réforme
- Recherche par n° boucle / nom
- Tri par statut, date entrée, dernière MB
- Vue cartes pour truies (photo + nom + statut visuel) en plus de la vue tableau
- Pagination si > 50 lignes

---

## 🚨 Bugs P0 (bloquants — à fixer AVANT Claude Design)

### Bug #1 — Crash fiche détail animal au clic depuis liste

- **URL** : `/cheptel` → clic sur une ligne → `/cheptel/<uuid>`
- **Catégorie** : Fonctionnel (RSC / Navigation Next.js 16)
- **Symptôme** : Écran "This page couldn't load" avec boutons "Reload" / "Back"
- **Diagnostic** :
  - Le serveur renvoie **HTTP 200** (vérifié via `fetch()` interne)
  - Navigation DIRECTE par URL (`/cheptel/<uuid>` tapé dans la barre) → fiche s'affiche normalement
  - Donc : bug **uniquement sur navigation client-side via `router.push()` / `<Link>`**
- **Probable cause** : RSC streaming Next.js 16 + cache stale, ou erreur de sérialisation dans un Server Component descendant
- **Impact** : **Toute la navigation principale du cheptel est cassée** depuis la liste = expérience utilisateur n°1 inutilisable
- **Screenshot** : MEDIA:/root/projects/smartfarm/.audit/screenshots/03_cheptel_fiche_crash.png

### Bug #2 — Aucune séparation truies/verrats/porcelets/portées

- **URL** : `/cheptel`
- **Catégorie** : UX / Métier
- Voir section "Organisation Cheptel" ci-dessus
- **Screenshot** : MEDIA:/root/projects/smartfarm/.audit/screenshots/02_dashboard.png (et navigation cheptel)

### Bug #3 — Portées non remontées sur fiche truie

- **URL** : `/cheptel/<id>` (testé sur Monette T01 / B.22)
- **Catégorie** : Métier / Data
- **Symptôme** : Section "HISTORIQUE DES PORTÉES" affiche "Aucune portée" pour Monette
- **Attendu** : MB du 03/03 avec 10 vivants devrait être listée
- **Diagnostic probable** : Bug de jointure SQL dans la vue `v_portee_*` ou RLS qui filtre incorrectement
- **Screenshot** : MEDIA:/root/projects/smartfarm/.audit/screenshots/04_cheptel_fiche_B22.png

### Bug #4 — Dashboard "BANDES ACTIVES : 0"

- **URL** : `/dashboard`
- **Catégorie** : Métier / Data
- **Symptôme** : KPI "Bandes actives" affiche 0
- **Attendu** : 117 porcelets en Démarrage 2 = au moins 1 bande active
- **Diagnostic probable** : Vue `v_bandes_actives` mal jointe, ou table `bandes` non remplie par l'import (à vérifier)

### Bug #5 — Dashboard "DERNIÈRES NAISSANCES : AUCUNE"

- **URL** : `/dashboard`
- **Catégorie** : Métier / Data
- **Symptôme** : Widget "Dernières naissances" vide
- **Attendu** : 6 portées historiques (T16 28/02, T10 20/03, T18 28/03, T19 31/03, T14 01/04, T12 05/05)
- **Diagnostic probable** : Vue `v_dernieres_mises_bas` mal jointe sur `portees` ou colonne mal nommée

---

## ⚠️ Bugs P1 (importants — à fixer avant Claude Design idéalement)

### Bug #6 — Messages Zod techniques en anglais affichés à l'utilisateur

- **URL** : Modal "Nouvel animal"
- **Catégorie** : UX / i18n
- **Symptôme** : `Invalid option: expected one of "M"|"F"` affiché dans le formulaire
- **Impact** : Casse l'image pro de l'app
- **Fix** : Utiliser `errorMap` Zod ou un wrapper `zod-fr` pour traduire les messages

### Bug #7 — Catégories animal ontologiquement confuses

- **URL** : Modal "Nouvel animal"
- **Catégorie** : Métier
- **Symptôme** : Le select "Catégorie" mélange **espèces** et **stades de vie** dans un seul enum :
  - `truie`, `cochette`, `verrat` = sexe+rôle reproducteur
  - `porcelet`, `sevrage`, `engraissement` = stade de vie (qui devrait être dérivé du poids/âge)
- **Recommandation** : Séparer en 2 champs distincts (Catégorie reproductive vs Stade physiologique)

### Bug #8 — Aucun filtre/tri/recherche sur 136 lignes cheptel

- **URL** : `/cheptel`
- **Catégorie** : UX
- **Symptôme** : Aucun moyen de filtrer, trier ou rechercher dans la table
- **Impact** : Avec 136 animaux ça reste vivable, mais à 500+ l'UI sera inutilisable

---

## 📝 Bugs P2 (cosmétiques)

### Bug #9 — "TIP DU JOUR : CONSEILLER EN CONSTRUCTION"

- **URL** : `/dashboard`
- **Catégorie** : Contenu
- **Symptôme** : Placeholder visible en prod
- **Fix** : Soit cacher le widget, soit pondre 5-10 vrais conseils zootechniques

### Bug #10 — Colonnes Race/Naissance vides pour tout le cheptel

- **URL** : `/cheptel`
- **Catégorie** : Data
- **Symptôme** : Toutes les lignes affichent `—` pour Race et Date de naissance
- **Diagnostic** : Données pas remontées dans la table principale (mais existent en BDD)

---

## 📊 Coverage Table

| Route | Testé | Bugs trouvés | Statut |
|-------|-------|--------------|--------|
| `/` (landing) | ✅ | 0 | ✅ Console clean |
| `/connexion` | ✅ | 0 | ✅ Login fonctionne |
| `/inscription` | ❌ | — | À tester |
| `/mot-de-passe-oublie` | ❌ | — | À tester |
| `/onboarding` | ❌ | — | À tester |
| `/dashboard` | ✅ | 3 (P0+P0+P2) | ⚠️ KPI incohérents |
| `/cheptel` | ✅ | 3 (P0+P0+P1) | 🔴 Critique |
| `/cheptel/<id>` | ✅ | 2 (P0 crash + P0 portées vides) | 🔴 Crash navigation |
| `/cheptel/<id>/genealogie` | ✅ | 0 | ✅ OK |
| `/reproduction` | ❌ | — | À tester |
| `/sanitaire` | ❌ | — | À tester |
| `/alimentation` | ❌ | — | À tester |
| `/stock` | ❌ | — | À tester |
| `/batiments` | ❌ | — | À tester |
| `/alertes` | ❌ | — | À tester (54 alertes attendues) |
| `/parametres` | ❌ | — | À tester |
| `/admin` | ❌ | — | À tester |

---

## Notes de testing

- **`browser_vision` HS** pendant l'audit (Gemini HTTP 404) → screenshots capturés en mode raw
- **Limite itérations** atteinte avant audit complet
- Console JS étonnamment **silencieuse** sur crashs côté client → error boundary capture mais ne log pas → complique le debug
- Browserbase sans proxies résidentiels → certaines détections bot possibles

---

## Recommandations pour la suite

1. **Fix immédiat Bug #1 (crash navigation `/cheptel/<id>`)** — bloque l'audit complet
2. **Investigation jointures vues** (`v_dernieres_mises_bas`, `v_bandes_actives`, vues portées sur fiche truie)
3. **Refonte `/cheptel`** avec onglets ou sous-routes (séparation truies/verrats/porcelets/portées)
4. **Traduction Zod en FR**
5. **Audit phase 2** sur les routes restantes (Reproduction, Sanitaire, Alimentation, Stock, Bâtiments, Alertes, Paramètres, Admin)

---

*Rapport généré par Hermes QA — Session interrompue avant complétion, à enrichir.*

---

## Phase 2 — Routes restantes (23/05/2026, suite)

Auditeur : Hermes QA (subagent phase 2)
Routes auditées : `/reproduction`, `/sanitaire`, `/alimentation`, `/stock`, `/batiments`, `/alertes`, `/parametres`, `/admin`, `/inscription`, `/mot-de-passe-oublie`, plus bonus `/bandes`, `/mises-bas`, `/performances` (alias `/kpi`).

### Observation transverse — Pattern systémique

> **Toutes les pages métier "liste" sont visuellement vides** alors que la BDD contient les données. Les seules routes qui rendent du contenu BDD sont `/cheptel` (table monolithique) et `/alertes` (54/54).
>
> Hypothèse : les Server Components des routes liste ne sont **pas branchés sur les vraies vues Supabase** — soit RLS bloque le `service_role` côté client, soit les requêtes pointent encore sur des tables vides au lieu des vues `v_*`.

### 🚨 Nouveaux Bugs P0

#### Bug #11 — `/reproduction` affiche "AUCUNE SAILLIE ENREGISTRÉE" malgré 10 saillies en BDD

- **URL** : `/reproduction`
- **Catégorie** : Métier / Data
- **Symptôme** : Compteur "0 montées enregistrées" + état vide "AUCUNE SAILLIE ENREGISTRÉE"
- **Attendu** : 10 saillies en cours seedées dans `saillies`
- **Diagnostic** : Server Component ne lit pas la table/vue saillies, ou RLS filtre tout
- **Impact** : Cœur de métier porcin invisible → utilisateur croit qu'il n'a rien saisi → re-saisie potentielle = données dupliquées
- **Formulaire "Nouvelle saillie"** : OK structurellement (select truies pré-rempli avec 17 truies + 2 verrats, BCS, méthode IA/Naturelle/Double, rang de portée, observations)

#### Bug #12 — `/mises-bas` page totalement vide malgré 6 portées historiques

- **URL** : `/mises-bas`
- **Catégorie** : Métier / Data
- **Symptôme** : Page ne contient QUE le header + 3 boutons (`EXPORTER CSV`, `SEVRAGE`, `NOUVELLE MISE BAS`). Aucune liste, aucun KPI, aucun message d'état vide explicite
- **Attendu** : 6 portées (T16 28/02, T10 20/03, T18 28/03, T19 31/03, T14 01/04, T12 05/05)
- **Diagnostic** : Confirme la cascade des bugs #3 et #5 du rapport phase 1 — la vue portées n'est branchée nulle part
- **Impact** : Le module Mises-Bas, central pour le suivi sevrage, est non fonctionnel

#### Bug #13 — `/batiments` page squelettique, 7 bâtiments invisibles

- **URL** : `/batiments`
- **Catégorie** : Métier / Data
- **Symptôme** : Page contient UNIQUEMENT le titre "Bâtiments" + bouton "NOUVEAU BÂTIMENT". Aucune carte, aucune liste, aucun message
- **Attendu** : 7 bâtiments seedés (cf. donnees_metier référentiel CI)
- **Impact** : Impossible de savoir si on a déjà créé des bâtiments → re-création probable → conflits données

#### Bug #14 — `/bandes` page squelettique, "BANDES ACTIVES : 0" partout

- **URL** : `/bandes`
- **Catégorie** : Métier / Data
- **Symptôme** : Idem `/batiments` — header + boutons + rien
- **Attendu** : Au moins 1 bande active (117 porcelets en Démarrage 2)
- **Lié à** : Bug #4 dashboard "BANDES ACTIVES : 0"

#### Bug #15 — `/performances` `AUCUNE TRUIE ENREGISTRÉE` (table classement vide)

- **URL** : `/performances` (redirige vers `/kpi`)
- **Catégorie** : Métier / Data
- **Symptôme** : Section "CLASSEMENT PAR TRUIE" affiche "AUCUNE TRUIE ENREGISTRÉE" et tableau "PERFORMANCE PAR TRUIE" "Aucune donnée truie disponible"
- **Attendu** : Au moins lister les 17 truies (même sans cycle complet, on peut afficher saillies/portées des truies)
- **Note positive** : Les KPI dérivés (ISSF, productivité num., TMM, MCA, IC ferme, GMQ) affichent correctement "Données insuffisantes — minimum 1 cycle complet requis" → message UX explicite, c'est OK
- **Sévérité** : P0 sur la table classement, le reste est cohérent

### ⚠️ Nouveaux Bugs P1

#### Bug #16 — `/alertes` : 54/54 alertes catégorisées "AUTRES"

- **URL** : `/alertes`
- **Catégorie** : Métier / UX
- **Symptôme** : Tous les filtres (gravité, catégorie) annoncent "Toutes", les compteurs `CRITIQUES = 0`, `ÉLEVÉES = 0`, `MOYENNES = 0`, et le seul groupe affiché est "AUTRES (54)"
- **Attendu** : Ventilation par catégorie métier (Reproduction, Sanitaire, Logistique, etc.) + niveaux de gravité (les règles `Vérif prise colostrale J+1`, `Soins porcelets J+3`, `Planifier le sevrage`, `Sevrage à effectuer`, `Chaleurs post-sevrage attendues` devraient être en catégorie *Reproduction* / *Sanitaire*)
- **Impact** : Filtres inopérants, hiérarchisation des alertes impossible → 54 alertes scrollables sans priorisation = bruit
- **Bonus** : Toutes les alertes ont le tag "IL Y A MOINS D'UNE MINUTE" — soit le seed crée tout avec `now()` (peu réaliste), soit le cron de génération vient de tourner

#### Bug #17 — `/admin` retourne 404 avec message anglais

- **URL** : `/admin`
- **Catégorie** : UX / i18n
- **Symptôme** : Page Next.js par défaut `404 — This page could not be found.` en anglais sur une app FR
- **Fix** : Créer un `app/not-found.tsx` FR custom
- **Note** : Pas de back-office admin existant — c'est une décision produit, pas un bug en soi

#### Bug #18 — Titres HTML génériques sur 5 routes auditées

- **URL** : `/alimentation`, `/stock`, `/parametres`, `/inscription`, `/mot-de-passe-oublie`, `/admin`
- **Catégorie** : SEO / UX onglet navigateur
- **Symptôme** : `<title>` reste *"Smart Farm — Gestion d'élevage · Côte d'Ivoire"* (le default layout) au lieu d'avoir un title spécifique par route
- **Routes OK** : `/reproduction` ("Reproduction — Smart Farm"), `/sanitaire`, `/batiments`, `/alertes`, `/mises-bas`, `/performances` (mais titré "Performances" alors qu'URL est `/kpi`)
- **Fix** : Définir `export const metadata = { title: '...' }` sur chaque `page.tsx` manquant

#### Bug #19 — `/inscription` : politique mot de passe absente côté UI

- **URL** : `/inscription`
- **Catégorie** : Sécurité / UX
- **Symptôme** : Le champ MOT DE PASSE accepte un seul caractère sans avertissement (`"x"` n'est pas refusé à la frappe)
- **Attendu** : Indicateur de force, longueur minimale 8, message d'erreur si trop court, idéalement règles Supabase Auth alignées
- **Note** : Supabase Auth refusera côté backend (politique par défaut = 6 chars min), mais l'utilisateur ne le sait qu'après soumission

### 📝 Nouveaux Bugs P2

#### Bug #20 — `/parametres` minimaliste, pas d'onglets "Profil / Ferme / Équipe"

- **URL** : `/parametres`
- **Catégorie** : UX / Architecture IA
- **Symptôme** : 4 sections en flat list : Fermes, Utilisateurs, Règles de sevrage ("Aucune règle"), Registre d'élevage (bouton télécharger). Aucune navigation par onglets, aucun lien vers édition profil utilisateur courant
- **Recommandation** : Ré-organiser en tabs `[Profil] [Ferme] [Équipe] [Règles métier] [Export & Registre]`

#### Bug #21 — Hub `/sanitaire` 6 modules tous vides, calendrier sans protocoles

- **URL** : `/sanitaire` puis `/sanitaire/calendrier`
- **Catégorie** : Data / Onboarding
- **Symptôme** : Hub OK structurellement (6 modules : Calendrier, PPA, Biosécurité, Mycotoxines, Maladies, Protocoles vaccinaux). Mais "0 alerte(s) sanitaire(s) active(s)" et "0 protocoles actifs". Calendrier sanitaire : EN RETARD=0, AUJOURD'HUI=0, À VENIR=0, "Aucun protocole vaccinal configuré"
- **Impact** : Pas un bug technique mais l'onboarding minimal devrait pré-remplir au moins les protocoles vaccinaux standards porcin CI (Parvo, Rouget, Aujeszky, etc.)

#### Bug #22 — Console JS silencieuse partout (idem phase 1)

- Sur 12 routes auditées, **0 message console**, **0 erreur JS**
- C'est suspect : aucune app React/Next.js prod n'est aussi silencieuse en navigation. Soit un error boundary capture tout sans log, soit le logger client est désactivé en prod
- **Impact** : Debug remote très difficile pour les utilisateurs terrain en Côte d'Ivoire

### 📊 Coverage Table — Mise à jour cumulée

| Route | Testé | Bugs trouvés | Statut |
|-------|-------|--------------|--------|
| `/` (landing) | ✅ | 0 | ✅ Console clean |
| `/connexion` | ✅ | 0 | ✅ Login fonctionne |
| `/inscription` | ✅ | 2 (P1 mdp + P1 title) | ⚠️ Pas de politique mdp UI |
| `/mot-de-passe-oublie` | ✅ | 1 (P1 title) | ✅ Validation email OK |
| `/onboarding` | ❌ | — | Non testé (post-inscription) |
| `/dashboard` | ✅ | 3 (P0+P0+P2) | ⚠️ KPI incohérents |
| `/cheptel` | ✅ | 3 (P0+P0+P1) | 🔴 Critique |
| `/cheptel/<id>` | ✅ | 2 (P0 crash + P0 portées vides) | 🔴 Crash navigation |
| `/cheptel/<id>/genealogie` | ✅ | 0 | ✅ OK |
| `/reproduction` | ✅ | **1 P0** (saillies invisibles) | 🔴 0/10 saillies remontées |
| `/mises-bas` | ✅ | **1 P0** (page vide) | 🔴 0/6 portées remontées |
| `/bandes` | ✅ | **1 P0** (page vide) | 🔴 0 bande affichée |
| `/batiments` | ✅ | **1 P0** (page vide) | 🔴 0/7 bâtiments affichés |
| `/performances` (`/kpi`) | ✅ | **1 P0** (classement vide) + 0 P1 | 🟡 KPI agrégés OK, table truies KO |
| `/alertes` | ✅ | **1 P1** (categ AUTRES) | 🟡 54/54 listées mais non triées |
| `/sanitaire` | ✅ | 1 P2 (vide) | 🟡 Structure OK, data nulle |
| `/sanitaire/calendrier` | ✅ | 0 | ✅ OK structurellement |
| `/alimentation` | ✅ | 1 P1 (title) | 🟡 Hub OK, KPI à 0 (normal sans saisie) |
| `/stock` | ✅ | 1 P1 (title) | 🟡 Table vide, formulaire valide |
| `/parametres` | ✅ | 2 (P1 title + P2 flat) | 🟡 Minimal |
| `/admin` | ✅ | 1 P1 (404 EN) | ❌ Route inexistante |
| `/ppa`, `/assistant` | ❌ | — | Non testés (budget) |

**Bilan cumulé** :
- **Routes testées** : 19 / ~22 (≈ 86%)
- **Total bugs cumulés** : 22 (10 phase 1 + 12 phase 2)
- **P0** : 10 (5 phase 1 + 5 phase 2)
- **P1** : 8 (3 phase 1 + 5 phase 2)
- **P2** : 4 (2 phase 1 + 2 phase 2)

### 🎯 Verdict phase 2

Le constat de la phase 1 est **dramatiquement aggravé** : ce n'est pas un crash isolé sur `/cheptel/<id>`, c'est **un pattern systémique** où l'écrasante majorité des routes liste métier (saillies, mises-bas, bandes, bâtiments, performance par truie) **ne lisent jamais les données BDD**. Seuls `/cheptel`, `/cheptel/<id>/genealogie` et `/alertes` ont une vraie connexion data.

### 🚫 Recommandation forte avant Claude Design

1. **Diagnostiquer en priorité absolue** pourquoi `/mises-bas`, `/reproduction`, `/bandes`, `/batiments` rendent des pages quasi vides :
   - Probablement un même Server Component pattern cassé (SELECT sur tables vs vues `v_*`, ou RLS qui refuse `authenticated`)
   - Tester avec `supabase` CLI : `SELECT count(*) FROM saillies WHERE ferme_id = ...;` puis comparer avec ce que le RSC fait
2. **Brancher /alertes sur les catégories métier** (catégorie + gravité réelle) sinon les 54 alertes sont du bruit
3. **Pré-seed protocoles vaccinaux** porcin CI dans `/sanitaire/protocoles`
4. **Métadonnées `<title>` manquantes** sur 5+ routes
5. **Pas de Claude Design tant que le data layer ne fonctionne pas** — refaire l'UI sur des pages qui n'affichent rien serait du gaspillage

---

*Phase 2 ajoutée par Hermes QA subagent — 23/05/2026 — 12 nouveaux bugs documentés.*
