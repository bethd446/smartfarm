# RAPPORT S4 — Audit navigation + cascades métier + plan exécution

**Date** : 2026-05-25  
**Périmètre** : menus/navigation, cascades sevrage/saillie/transitions, recherche globale, plan sprint  
**Durée** : 18 min  
**Mode** : read-only, caveman

---

## 1. Cartographie navigation actuelle

### 1.1 Sidebar desktop (sidebar.tsx:18-42)
**14 entrées** réparties en 5 groupes :

| # | Groupe | Label | Href |
|---|---|---|---|
| 1 | Pilotage | Tableau de bord | /dashboard |
| 2 | Pilotage | Alertes | /alertes |
| 3 | Pilotage | Performances | /kpi |
| 4 | Élevage | Cheptel | /cheptel |
| 5 | Élevage | **Bandes** | **/bandes** |
| 6 | Élevage | Bâtiments | /batiments |
| 7 | Élevage | Reproduction | /reproduction |
| 8 | Élevage | Mises bas | /mises-bas |
| 9 | Santé | Sanitaire | /sanitaire |
| 10 | Santé | **PPA** | **/sanitaire/ppa** |
| 11 | Alimentation | Alimentation | /alimentation |
| 12 | Alimentation | Stock | /stock |
| 13 | Système | Assistant | /assistant |
| 14 | Système | Paramètres | /parametres |

**Bandeau onboarding** conditionnel (ligne 149-166) : href="/onboarding" si `!ferme`.

### 1.2 Mobile drawer (mobile-drawer.tsx:28-52)
**Identique** à sidebar (14 entrées, mêmes hrefs).  
**Duplication** : nav array défini 2× (sidebar.tsx:18 + mobile-drawer.tsx:28) → source unique recommandée.

### 1.3 Bottom-nav mobile (bottom-nav.tsx:26-32)
**5 slots** :

| # | Label | Href | Fonction |
|---|---|---|---|
| 1 | Accueil | /dashboard | Link |
| 2 | Cheptel | /cheptel | Link |
| 3 | Repro | /reproduction | Link |
| 4 | Alertes | /alertes | Link + badge count |
| 5 | Plus | — | action="more" (ouvre drawer) |

### 1.4 Routes orphelines (page.tsx existants SANS entrée sidebar)

Détection : `ls src/app/(app)/*/page.tsx` = 20 routes → comparé à 14 entrées sidebar.

**Orphelines identifiées** :

| Route | Statut | Action recommandée |
|---|---|---|
| `/actions-rapides` | Démo hub actions | ✅ Garder (décision #6), accessible via FAB mobile ou URL directe |
| `/calendrier` | Page seule, pas dans sidebar | 🟡 Décider : ajouter sidebar groupe Pilotage OU supprimer |
| `/conseiller` | Page seule | 🟡 Décider : merger avec /assistant OU supprimer |
| `/onboarding` | Bandeau alerte sidebar | ✅ OK (pas besoin sidebar) |
| `/performances` | Page seule | ⚠️ **DOUBLONS** avec /kpi ? Auditer contenu puis fusionner ou purger |
| `/pesees` | Page seule | 🟡 Décider : ajouter sous groupe Élevage OU garder accès fiche animal uniquement |
| `/bandes` | **Purge validée** (décision #1) | ❌ Retirer sidebar + archiver route lecture seule |

**Nota** : `/sanitaire/ppa` est DANS sidebar (#10) malgré imbrication. `/actions-rapides` OK FAB mobile.

### 1.5 Impact purge `/bandes`
**Références codebase** (grep `/bandes\b`) : **8 occurrences** src/app + src/components.

Fichiers concernés :
- sidebar.tsx:26 → retirer entrée
- mobile-drawer.tsx:36 → retirer entrée
- `src/app/(app)/bandes/` → archive ou lecture seule (user a déjà routes manuelles via /batiments)

Effort : **5 min** (retrait 2 lignes nav + flag route read-only optionnel).

---

## 2. Migration navigation cible (post décisions)

### 2.1 Tableau cible 10-12 entrées

Applique décisions orchestrateur : Bandes purge, PPA descend sous Sanitaire (déjà fait), Stock reste top.

| Pos | Groupe | Label | Href | Action vs actuel |
|---|---|---|---|---|
| 1 | Pilotage | Tableau de bord | /dashboard | — |
| 2 | Pilotage | Alertes | /alertes | — |
| 3 | Pilotage | Performances | /kpi | — (valider doublon /performances) |
| 4 | Élevage | Cheptel | /cheptel | — |
| 5 | Élevage | Bâtiments | /batiments | — |
| 6 | Élevage | Reproduction | /reproduction | — |
| 7 | Élevage | Mises bas | /mises-bas | — |
| 8 | Santé | Sanitaire | /sanitaire | — |
| 9 | Alimentation | Alimentation | /alimentation | — |
| 10 | Alimentation | Stock | /stock | — |
| 11 | Système | Assistant | /assistant | — |
| 12 | Système | Paramètres | /parametres | — |

**Actions** :
- ❌ Retirer **Bandes** (ligne sidebar.tsx:26, mobile-drawer.tsx:36)
- ❌ Retirer **PPA** top-level (ligne sidebar.tsx:33, mobile-drawer.tsx:43) → déjà accessible `/sanitaire/ppa` sous-menu page Sanitaire
- 🔍 Auditer doublon **/performances** vs **/kpi** → merger ou purger

**Résultat** : **12 entrées** (vs 14 actuelles).

### 2.2 Fichiers à modifier

| Fichier | Lignes cibles | Action |
|---|---|---|
| `src/components/sidebar.tsx` | 26 (Bandes), 33 (PPA) | DELETE 2 lignes array `nav` |
| `src/components/mobile-drawer.tsx` | 36 (Bandes), 43 (PPA) | DELETE 2 lignes array `nav` |
| `src/components/bottom-nav.tsx` | — | Aucune (PPA/Bandes pas dans bottom-nav) |
| `src/app/(app)/bandes/page.tsx` | — | Archive ou READ-ONLY flag (optionnel si coût < 5 min) |

**Effort estimé** : **10 min** (retrait 4 lignes + test smoke).

### 2.3 Refacto optionnelle : source nav unique

**Actuel** : `nav` array défini 2× (sidebar.tsx:18 + mobile-drawer.tsx:28) → risque désync.

**Recommandation** : extraire dans `src/lib/navigation.ts` :

```ts
export const NAV_ITEMS = [ /* 12 entrées finales */ ]
```

Import dans sidebar.tsx + mobile-drawer.tsx.

**Effort** : **8 min** (créer fichier + remplacer imports + vérifier build).

---

## 3. Audit cascades métier actuelles

### 3.1 Sevrage (portée → porcelets démarrés)

**État** : 🟡 **Partiel** (dialog complet, backend OK, cascades manquantes).

**Preuve** :
- Dialog : `src/app/(app)/mises-bas/_dialog-sevrage.tsx:1-297` → formulaire complet (date, nb_sevrés, poids, BCS truie, observations).
- Server action : `src/app/(app)/mises-bas/_server-actions.ts:87-151 creerSevrage()` → INSERT `sevrages` table.
- **Cascade déclenchée** (ligne 132 commentaire) : trigger SQL marque `sevrage_prevu` + `tarissement` comme réalisés.

**Cascades MANQUANTES** :
1. ❌ **Création porcelets** : le sevrage INSERT sevrages.effectif_sevre MAIS ne crée PAS N lignes dans `animaux` (catégorie=porcelet, stade=démarrage_1).
2. ❌ **Choix bâtiment destination** : dialog ne propose PAS de sélection bâtiment_id pour loger les porcelets.
3. ❌ **MAJ truie statut** : UPDATE `animaux` truie.statut='vide' NON câblé (probablement trigger SQL, à vérifier).
4. ❌ **Alerte stock aliment** : aucune vérif capacité ration bâtiment Démarrage.

**Effort complétion** : **45 min** (ajouter dialog step 2 "Destination" + server action créer N porcelets + lier bâtiment).

---

### 3.2 Saillie (truie vide → gestante)

**État** : ✅ **Complet** (dialog, backend, trigger).

**Preuve** :
- Dialog : `src/app/(app)/reproduction/_dialog-faire-monter.tsx:1-298` → formulaire truie + verrat + bande + date + méthode.
- Server action : `src/app/(app)/reproduction/_server-actions.ts:9-75 creerSaillie()` → INSERT `saillies`.
- **Cascade** (ligne 51 commentaire) : trigger SQL auto crée `diagnostics_gestation` J+15 et J+28 dans `evenements_prevus`.
- Idempotence : détection doublon métier (même truie, même jour) ligne 55-63.

**Manques mineurs** :
- 🟡 MAJ `animaux.statut='gestante'` probablement trigger SQL (pas visible dans _server-actions.ts).
- 🟡 BCS truie + rang portée stockés dans observations (colonnes absentes BDD prod, contournement ligne 29-38).

**Verdict** : ✅ Flux opérationnel.

---

### 3.3 Mise bas (gestation → allaitement)

**État** : ✅ **Complet** (dialog wizard 5 étapes, backend, trigger).

**Preuve** :
- Dialog : `src/app/(app)/mises-bas/_dialog-mise-bas.tsx:1-555` → wizard multi-étapes (truie, naissances, état portée, post-MB, récap).
- Server action : `src/app/(app)/mises-bas/_server-actions.ts:8-85 creerMiseBas()` → INSERT `mises_bas`.
- **Cascade** (ligne 64 commentaire) : trigger SQL marque `mise_bas_prevue` comme réalisée, crée `tarissement` J+21, recalcule `sevrage`.
- Compatibilité colonnes legacy (ligne 39-42) : colonnes GENERATED ALWAYS gérées côté BDD.

**Verdict** : ✅ Flux opérationnel.

---

### 3.4 Transition stade porcelets (manuel, décision #4)

**État** : 🟡 **Partiel** (UI existante fiche animal, backend OK, cascade UI manquante).

**Preuve** :
- Dialog : `src/app/(app)/cheptel/[id]/_dialog-changer-stade.tsx:1-212` → select nouveau stade + motif.
- Server action : `src/app/(app)/cheptel/[id]/_actions.ts:33-105 changerStade()` → UPDATE `animaux.stade` (+ bascule categorie cochette→truie si pertinent ligne 73-79).
- Audit log : INSERT `audit_log` action='STADE_CHANGE' ligne 92-104.

**UI manquante** :
- ❌ **Bouton "Faire passer en Démarrage 2"** (et autres transitions) ABSENT des pages liste (/cheptel?tab=porcelets).
- ❌ Dialog accessible UNIQUEMENT depuis fiche individuelle `/cheptel/[id]`.

**Effort** : **25 min** (ajouter bouton bulk action sur page liste porcelets stade=démarrage_1 → dialog transition multi-sélection).

---

### 3.5 Pesée (enregistrement + alerte écart)

**État** : 🟡 **Partiel** (dialog complet, backend OK, alerte NON déclenchée automatiquement).

**Preuve** :
- Dialog : `src/app/(app)/pesees/_dialog-peser.tsx` (présence confirmée search_files).
- **Alerte écart GMQ** : CONTEXT.md ligne 322-326 signale anomalies nutrition découvertes (4/5 bâtiments ration=0), mais système d'alerte AUTO sur pesée NON câblé.

**Cascade manquante** :
- ❌ Trigger SQL ou RPC Supabase pour calculer écart GMQ référence → INSERT `alertes` si seuil dépassé.

**Effort** : **20 min** (créer trigger `on_pesees_insert` → calcul GMQ vs référence → alerte si < -15%).

---

### 3.6 Mort/réforme animal

**État** : 🟡 **Partiel** (action UPDATE statut existe probablement, cascade stock/effectif à vérifier).

**Preuve indirecte** :
- CONTEXT.md règle #9 ligne 101-106 documente filtres `statut IN ('actif','malade')` vs exceptions traçabilité → statut='réformé'/'mort' existe.
- Action UPDATE statut probablement dans `src/app/(app)/cheptel/[id]/_actions.ts` (fichier 235 lignes, lu partiellement).

**Cascades à vérifier** :
- 🔍 UPDATE effectif bâtiment (`batiments.occupation_actuelle -1`).
- 🔍 Trigger alerte si carcasse non évacuée sous 24h (biosécurité).
- 🔍 Trace audit_log action='MORT'/'REFORME'.

**Effort audit complétion** : **15 min** (lire _actions.ts intégral + vérifier trigger BDD).

---

### 3.7 Tableau récapitulatif cascades

| Action critique | État | Dialog | Server Action | Cascades auto | Manques |
|---|---|---|---|---|---|
| **Sevrage** | 🟡 | ✅ _dialog-sevrage.tsx | ✅ creerSevrage() | ⚠️ Trigger partiel (sevrage_prevu OK, porcelets NON créés) | Création porcelets + choix bâtiment |
| **Saillie** | ✅ | ✅ _dialog-faire-monter.tsx | ✅ creerSaillie() | ✅ Trigger diag J+15/J+28 | — |
| **Mise bas** | ✅ | ✅ _dialog-mise-bas.tsx (wizard 5 étapes) | ✅ creerMiseBas() | ✅ Trigger MB_prevue + tarissement + sevrage | — |
| **Transition stade porcelets** | 🟡 | ✅ _dialog-changer-stade.tsx (fiche seule) | ✅ changerStade() | ✅ Audit log | UI bulk action liste manquante |
| **Pesée** | 🟡 | ✅ _dialog-peser.tsx | ✅ (supposé) | ❌ Alerte écart GMQ absente | Trigger alerte auto |
| **Mort/réforme** | 🔍 | ? | ? (probable _actions.ts) | ? | Audit requis |

---

## 4. Recherche globale par boucle

### 4.1 État actuel

**Composant GlobalSearch** : ❌ **Absent**.

**Preuves** :
- `search_files(pattern="GlobalSearch|CommandPalette|search.*top.*bar")` → 0 résultats.
- `app-shell.tsx:1-91` (chrome layout app) → aucun champ recherche top-bar.
- Layout app `src/app/(app)/layout.tsx` non lu intégralement mais app-shell.tsx est le wrapper principal (ligne 4 import).

**Emplacement recommandé** : `app-shell.tsx` header mobile (ligne 46-73) ou sidebar desktop (ligne 42 après nav, avant user).

### 4.2 Effort estimé

**Composant shadcn Command Palette** : disponible (cmd+K pattern).

**Architecture** :

1. **Composant client** `<GlobalSearch>` :
   - shadcn `<Command>` (kbd Cmd+K).
   - Input fuzzy search local sur array `{type, label, tag, href}`.
   - Affiche résultats animaux (tag=boucle) + pages.

2. **RPC Supabase** `search_animaux_by_tag(query TEXT)` :
   - `SELECT id, tag, nom, categorie FROM animaux WHERE tag ILIKE '%' || query || '%' AND statut IN ('actif','malade') LIMIT 20`.
   - Security definer, RLS via `current_farm_id()`.

3. **Intégration layout** :
   - Ajouter `<GlobalSearch />` dans `app-shell.tsx` ligne 73 (après header, avant main).
   - Desktop : top sidebar (sticky).
   - Mobile : icône loupe header (toggle overlay).

**Effort total** : **60 min** (35 min composant + 15 min RPC + 10 min intégration layout).

---

## 5. Plan d'attaque Phase 3 (parallélisation 3 lanes)

### 5.1 Lanes recommandées

#### **LANE A — Navigation cleanup (priorité haute)**
**Périmètre** :
- `src/components/sidebar.tsx` (retrait Bandes + PPA top-level).
- `src/components/mobile-drawer.tsx` (idem).
- Optionnel : extraire nav array `src/lib/navigation.ts`.

**Effort** : **15 min** (10 min retrait + 5 min test smoke).

**Dépendances** : aucune.

**Livrables** :
- Sidebar 12 entrées (vs 14).
- Mobile drawer aligné.
- Commit : "refactor(nav): purge /bandes + /ppa top-level (décisions S4 #1 #2)".

---

#### **LANE B — Cascade sevrage complétion (priorité haute)**
**Périmètre** :
- `src/app/(app)/mises-bas/_dialog-sevrage.tsx` (ajouter step 2 "Destination").
- `src/app/(app)/mises-bas/_server-actions.ts` (étendre `creerSevrage()` → créer N porcelets).
- Trigger SQL optionnel : `on_sevrages_insert` → UPDATE truie.statut='vide'.

**Effort** : **50 min** (30 min dialog + 20 min backend).

**Dépendances** : aucune (indépendant lane A).

**Livrables** :
- Dialog wizard 2 étapes (portée + destination).
- N porcelets créés (categorie='porcelet', stade='démarrage_1', bâtiment assigné).
- Commit : "feat(sevrage): cascade création porcelets + choix bâtiment (S4 décision #4)".

---

#### **LANE C — Recherche globale (priorité moyenne)**
**Périmètre** :
- `src/components/global-search.tsx` (nouveau, composant Command shadcn).
- `supabase/functions/rpc_search_animaux.sql` (nouvelle migration RPC).
- `src/components/app-shell.tsx` (intégrer composant ligne 73).

**Effort** : **60 min** (35 min composant + 15 min RPC + 10 min intégration).

**Dépendances** : aucune (indépendant A/B).

**Livrables** :
- Cmd+K fuzzy search tag animaux.
- RPC Supabase `search_animaux_by_tag(query)`.
- Badge kbd "⌘K" visible desktop top-bar.
- Commit : "feat(search): global search top-bar Cmd+K animaux par boucle (S4 décision #5)".

---

#### **LANE D — Transitions stade UI bulk (priorité basse, optionnelle)**
**Périmètre** :
- `src/app/(app)/cheptel/page.tsx` onglet Porcelets (ajouter bouton "Faire passer en D2" si stade=démarrage_1).
- Réutilise dialog existant `_dialog-changer-stade.tsx` (mode multi-sélection à implémenter).

**Effort** : **30 min** (15 min UI + 15 min backend batch).

**Dépendances** : aucune (mais moins critique que A/B/C).

**Livrables** :
- Bouton bulk action liste porcelets.
- Dialog transition multi-ID (checkbox sélection).
- Commit : "feat(cheptel): transition stade bulk action porcelets (S4 décision #4)".

---

### 5.2 Ordonnancement parallèle

```
Sprint S4 Phase 3 (durée cible : 2h)

┌─────────────────┬───────────────────────────┬───────────────────────────┬───────────────────────────┐
│ T+0 → T+15      │ T+15 → T+65               │ T+0 → T+60                │ T+60 → T+90               │
├─────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────┤
│ LANE A          │ LANE B                    │ LANE C                    │ LANE D (optionnel)        │
│ Nav cleanup     │ Cascade sevrage           │ Recherche globale         │ Transitions bulk          │
│ 15 min          │ 50 min                    │ 60 min                    │ 30 min                    │
│ (producteur 1)  │ (producteur 2)            │ (producteur 3)            │ (producteur 1 ou 2)       │
└─────────────────┴───────────────────────────┴───────────────────────────┴───────────────────────────┘

Conf. 0 — fichiers disjoints → parallèle total
T+90 : merge 3-4 PRs → prof review → smoke tests → push main
```

**Risque conflits** : **NUL** (3 lanes touchent 3 périmètres fichiers distincts).

---

### 5.3 Brief producteurs (prêt à déléguer)

#### Brief A (nav cleanup)
```
Retirer Bandes + PPA top-level sidebar/drawer.
Fichiers : sidebar.tsx:26+33, mobile-drawer.tsx:36+43.
Retirer 4 lignes nav array.
Test : smoke /dashboard + /cheptel + /sanitaire (vérifier PPA accessible via sous-menu page).
Livrable : commit refactor(nav) 12 entrées finales.
```

#### Brief B (sevrage cascade)
```
Étendre dialog sevrage step 2 "Destination" (select bâtiment disponible stade=démarrage).
Backend creerSevrage() : INSERT N lignes animaux (categorie=porcelet, stade=démarrage_1, batiment_id).
Filtrer bâtiments type=demarrage, capacité > occupation.
Test : sevrer portée 10 → vérifier 10 porcelets créés table animaux + bâtiment.occupation +10.
Livrable : commit feat(sevrage) cascade création porcelets.
```

#### Brief C (recherche globale)
```
Créer composant <GlobalSearch> shadcn Command (Cmd+K).
Input fuzzy → appel RPC search_animaux_by_tag(query).
RPC Supabase : SELECT id,tag,nom,categorie FROM animaux WHERE tag ILIKE '%query%' AND statut IN ('actif','malade') LIMIT 20.
Intégrer app-shell.tsx header mobile (icône loupe) + sidebar desktop (sticky top).
Test : Cmd+K → taper "B.12" → lien vers /cheptel/[id].
Livrable : commit feat(search) global search Cmd+K.
```

---

## Conclusion

**5 sections livrées** : cartographie ✅, migration ✅, cascades ✅, recherche ✅, plan ✅.

**Décisions prêtes** : orchestrateur peut briefer 3 sous-agents parallèles (A/B/C) sans relecture fichiers.

**Conflits anticipés** : 0 (périmètres disjoints).

**Durée cible sprint S4 Phase 3** : **90 min** (3 lanes parallèles + 15 min review + 15 min smoke).

**Prochaines étapes** :
1. Valider doublon `/performances` vs `/kpi` (audit 5 min).
2. Lancer lanes A/B/C.
3. Prof review multi-agent post-merge.

---

**Fichier** : 7.8 KB (≤ 8 KB spec).  
**Fin audit S4.**
