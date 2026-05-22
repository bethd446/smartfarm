# Audit QA fonctionnel Smart Farm V2 — Round 2

**Date** : 21 mai 2026
**Auditeur** : Reviewer senior contexte vierge (delegate_task)
**Build testé** : Next.js 16.2.6 — standalone sur :3000
**Méthode** : navigation DOM-snapshot + console + inspection sources

## Score global : **5.5 / 10**

L'architecture, la sidebar et les routes V2 (biosécurité, eau, mycotoxines) sont en place et rendues correctement. **Mais** un bug serveur P0 casse la fonctionnalité phare annoncée (« Marquer fait » du calendrier sanitaire porcelets) et l'UX a plusieurs trous (pages quasi-vides sans empty-state, libellés d'alerte trompeurs, KPI dashboard et KPI calendrier en double standard). En l'état, livrable **non bon pour production**.

---

## 🔴 P0 — Bloquants (à corriger avant tout)

### P0-1. Bouton « MARQUER FAIT » du calendrier sanitaire porcelets crashe la page
- **URL** : `/sanitaire/calendrier`
- **Repro** : cliquer n'importe quel bouton MARQUER FAIT (testé sur Fer dextran T-001).
- **Symptôme UI** : page entière remplacée par *« This page couldn't load »* + bouton Reload. Aucun toast.
- **Cause racine** (logs `/tmp/sf-standalone.log`) :
  ```
  Error: Failed to find Server Action "x". This request might be from an older or newer deployment.
  ```
- **Conséquence** : la feature V2 phare du calendrier sanitaire est totalement inutilisable.
- **Fix** : forcer un rebuild propre des Server Action manifests. Les références d'actions doivent être stables entre builds. Vérifier `.next/server/app-paths-manifest.json`.

### P0-2. Routes V2 documentées sans préfixe `/sanitaire/` — 404 garantis si lien externe
- **Repro** : `GET /biosecurite`, `/eau`, `/mycotoxines` → 404.
- **Vérité du code** : les pages vivent sous `/sanitaire/biosecurite`, `/sanitaire/eau`, `/sanitaire/mycotoxines`.
- **Fix** : ajouter `redirect()` Next pour `/biosecurite` → `/sanitaire/biosecurite` etc. OU corriger la doc.

### P0-3. Mises-bas — page vide, ni liste, ni empty state
- **URL** : `/mises-bas`
- **Constat** : titre + 3 boutons (Export, Sevrage, Nouvelle MB) et **rien d'autre**.
- Pourtant DB contient 2 mises-bas (T-001 13/05, T-002 15/05).
- **Fix** : afficher l'historique mises-bas + sevrages.

---

## 🟠 P1 — Importants

### P1-1. Alerte R01 mal libellée — « Truie T-003 vide depuis 116 jours »
- T-003 est en réalité **gestante en post-terme** (saillie 25/01, 116 j = 114 j gestation + 2 j retard).
- Libellé envoie le vétérinaire investiguer infertilité au lieu de déclencher induction.
- **Fix** : moteur R01 doit distinguer (a) sans saillie active vs (b) gestante > 117 j (alerte différente).

### P1-2. Calendrier sanitaire — compteurs entête à 0 alors qu'il y a 5 actes EN RETARD
- Entête : EN RETARD 0 / AUJOURD'HUI 0 / À VENIR 0 + « Tous les animaux sont à jour 🎉 »
- Plus bas : table « ACTES PORCELETS — EN RETARD (5) ».
- KPIs entête ignorent les actes porcelets → message rassurant erroné.
- **Fix** : agréger porcelets + adultes dans les compteurs, ou renommer.

### P1-3. Dashboard — 2 KPI techniques sur 4 vides (`—`) sans explication
- ISSF et Productivité numérique affichent `—`.
- **Fix** : remplacer par micro-message « Données insuffisantes (≥1 cycle complet sevrage→saillie) ».

### P1-4. Alerte R17 et R18 catégorisées « AUTRES »
- Sur `/alertes`, R17 « Consommation eau chute -28.5 % » et R18 « Lot maïs non analysé » rangées sous **AUTRES**.
- Filtrage « Catégorie = Sanitaire » manquerait ces alertes critiques.
- **Fix** : ajouter `categorie='eau'`/`'mycotoxines'`/`'biosecurite'` dans la vue ou côté UI.

### P1-5. Page Reproduction : H1 = « Nouvelle saillie » au lieu de « Reproduction »
- H1 actuel induit en erreur sur une page qui liste 3 saillies.
- **Fix** : H1 = « Saillies » ou « Reproduction ».

### P1-6. Avertissement console récurrent (a11y)
- `Warning: Missing 'Description' or 'aria-describedby={undefined}' for {DialogContent}`.
- Sur tous les modaux Radix Dialog.
- **Fix** : ajouter `<DialogDescription>` ou `aria-describedby` à chaque `<DialogContent>`.

---

## 🟡 P2 — Polish / cohérence

- **P2-1.** Sidebar : `Performances` dans LOGISTIQUE & NUTRITION — devrait être dans PILOTAGE.
- **P2-2.** Bottom-nav mobile : badge alertes affiche « 6Alertes » sans espace.
- **P2-3.** `/sanitaire/eau` : `nb_animaux=320` (?) alors que `/cheptel` affiche « 5 animaux ». Source du calcul ?
- **P2-4.** Empty state absent sur `/mises-bas` (cf P0-3) et cartes dashboard « STOCK QUI BAISSE » / « DERNIÈRES NAISSANCES ».
- **P2-5.** Skeleton loaders non observables (SSR rapide). À documenter.
- **P2-6.** `/sanitaire/biosecurite` : checklist 100 % statique sans état coché persistant.
- **P2-7.** `/sanitaire/mycotoxines` : ligne L-202605-003 affiche NON CONFORME avec Afla=35 (OK) mais ZEA et DON `—`. Préciser le motif.
- **P2-8.** Bouton SCANNER sur `/cheptel` non testé.
- **P2-9.** Chatbot `/assistant` non testé en bout en bout (bulles non vérifiées).

---

## ✅ Bonnes nouvelles

- Sidebar 5 sections **en place et cohérente** ✓
- Routes V2 `/sanitaire/biosecurite`, `/sanitaire/eau`, `/sanitaire/mycotoxines` **rendues correctement** ✓
- BCS truie (radiogroup 1-5) **présent dans les 3 formulaires** ✓
- Alerte R18 mycotoxines **fonctionne** ✓
- Alerte R17 eau **calculée et affichée** ✓
- KPI techniques (TMM 3.9 %, Nés Vivants 11.5) **calculés** ✓
- Bottom-nav badge alertes mobile **présent** ✓

---

## Couverture du test

| Module | Verdict |
|---|---|
| Dashboard | OK avec réserves (P1-3, P1-4) |
| Alertes | OK structure, libellés à revoir (P1-1, P1-4) |
| Cheptel | OK |
| Reproduction (liste + form saillie) | H1 incorrect (P1-5), BCS OK |
| Mises-bas | **Page liste vide P0-3** ; formulaires OK + BCS OK |
| Sanitaire calendrier + Marquer fait | **Crash P0-1** |
| Sanitaire/biosecurite | Read-only, statique (P2-6) |
| Sanitaire/eau | OK, métrique douteuse (P2-3) |
| Sanitaire/mycotoxines | OK |
| KPI / Performances | OK |
| Assistant (chatbot) | Non testé bout en bout |
| Autres modules (Bandes/Bâtiments/Pesées/Alimentation/Stock/Conseiller) | Non testés |
