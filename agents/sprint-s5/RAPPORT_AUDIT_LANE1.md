# RAPPORT AUDIT — Sprint S5 Lane 1 (Bulk transition stade porcelets)

**Date** : 2026-05-25 · **Mode** : R1 read-only · **Auteur** : Claude Opus 4.7
**Périmètre** : `cheptel/page.tsx` · `cheptel/_row-actions.tsx` · `cheptel/_server-actions.ts` · `cheptel/[id]/_actions.ts` · `cheptel/[id]/_dialog-changer-stade.tsx` · `lib/stades-animaux.ts` · BDD `animaux.stade`

---

## 1. EXISTANT (déjà câblé, pas à recoder)

| Fonction | Path | Statut |
|---|---|---|
| Banner "X porcelets ≥24 kg prêts" + bouton "Transférer tous" | `cheptel/_banner-transfert-croissance.tsx` | ✅ prod |
| Filtre `?filter=pret_croissance` (D1/D2 + poids ≥24 kg) | `cheptel/page.tsx:108-110` | ✅ |
| Row action "Transférer en Croissance" (éligibilité auto) | `cheptel/_row-actions.tsx:95-107` | ✅ |
| Server action `transfererTousVersCroissance()` | `cheptel/_server-actions.ts:126-217` | ✅ batch + mouvements + rollback partiel |
| Server action `transfererUnVersCroissance(id)` | `cheptel/_server-actions.ts:222-304` | ✅ |
| Dialog single `_dialog-changer-stade.tsx` (fiche [id]) | `cheptel/[id]/_dialog-changer-stade.tsx` | ✅ |
| Action `changerStade()` single + audit_log `STADE_CHANGE` | `cheptel/[id]/_actions.ts:33-114` | ✅ |
| Helper `stadesAutorisesPour(categorie)` + `nouvelleCategoriePourStade()` | `lib/stades-animaux.ts:46-90` | 🔴 désync (cf §2) |

---

## 2. BUGS CRITIQUES DÉCOUVERTS (P0)

### 2.1 Désync enum TS vs BDD réelle

**Enum BDD prod `stade_porc`** (11 valeurs, source Management API) :
```
lactation, demarrage_1, demarrage_2, croissance, finition,
cochette, truie_vide, truie_gestante, truie_allaitante, verrat, reforme
```

**Enum TS `TOUS_LES_STADES`** (`lib/stades-animaux.ts:92-102`, 9 valeurs) :
```
truie_vide, truie_gestante, truie_allaitante, cochette, verrat,
croissance, finition, depart, controle
```

**Conséquences** :
- ❌ TS contient `depart, controle` **inexistants en BDD** → erreur INSERT/UPDATE silencieuse possible si user choisit ces options
- ❌ TS oublie `lactation, demarrage_1, demarrage_2, reforme` → impossible de transitionner via dialog
- ❌ `stadesAutorisesPour('porcelet_lait')` et `…('porcelet_sevre')` tombent dans `default` (tous les stades) — couverture catégorie incomplète (cf `lib/stades-animaux.ts:55-57` qui ne liste que `porcelet_croissance` + `porc_engraissement`)

### 2.2 Distribution data prod (ferme démo `3ed3960d-…`)

| stade | count actifs |
|---|---|
| `demarrage_2` | **95** |
| `croissance` | 50 |
| `truie_gestante` | 25 |
| `finition` | 15 |
| autres | 17 |

→ **95 porcelets bloqués en D2** sans UI pour les transitionner (`demarrage_2 → croissance` ou `→ finition`). Seule la règle auto ≥24 kg → Croissance les bouge.

### 2.3 Suspicion cascade sevrage S4 (hors scope Lane 1, à vérifier Lane 1.5)

`RAPPORT_PROF_S4.md:69` annonce INSERT porcelets `categorie='porcelet'`. Enum réel BDD `categorie_animal` n'a PAS `porcelet` simple → INSERT a pu échouer silencieusement OU enum a été élargi sans doc. À auditer hors S5-L1.

---

## 3. MANQUES RÉELS Lane 1 (vs scope initial passation)

| Item brief initial | Existant | Gap |
|---|---|---|
| Checkbox multi-sélection liste porcelets | ❌ | À créer |
| Bouton bulk "Faire passer en D2/Croissance/Finition" | 🟡 (force Croissance) | Choix stade libre manquant |
| Dialog mode multi | ❌ | Adapter `_dialog-changer-stade.tsx` ou en créer un dédié |
| Signature `changerStade(ids[])` batch | ❌ | À ajouter (réutiliser pattern `transfererTousVersCroissance`) |
| Audit log `STADE_CHANGE_BATCH` | ❌ | À ajouter |
| **Bug enum TS désync (P0)** | 🔴 | **À corriger sinon Lane 1 invisible** |
| **Catégories porcelet_lait/sevre incomplètes** | 🔴 | Étendre `stadesAutorisesPour()` |

---

## 4. REFORMULATION SCOPE — 3 options

### Option A — Bulk générique (recommandé)
- Checkbox multi-sélection sur onglet Porcelets (`page.tsx`)
- Bouton bulk → dialog choix stade cible libre (parmi stades enum réels filtrés par catégories sélectionnées)
- Server action `changerStadeBatch(ids[], nouveau_stade, motif)` + audit `STADE_CHANGE_BATCH`
- **Garde** le banner Croissance contextuel existant (cas pédagogique 24 kg)
- **Fixe** désync enum TS/BDD + couverture porcelet_lait/sevre

### Option B — Banners métiers multi
- Ajouter `BannerTransfertD2` (seuil poids/âge à définir), `BannerTransfertFinition`
- Pas de checkbox arbitraire, juste suggestions auto
- Moins flexible (éleveur ne peut pas choisir un sous-ensemble)
- **Question métier ouverte** : quels seuils D1→D2 (âge ? poids ?)

### Option C — Hybride (Option A + extension banner)
- Tout Option A
- En plus : étend `_banner-transfert-croissance` en générique `BannerTransfertSuggere` (Croissance + Finition selon seuils)
- **Effort ×1.5** vs Option A pure

---

## 5. RECOMMANDATION + EFFORT

**Option A** :
1. Fix `lib/stades-animaux.ts` (sync enum + couverture catégories) — **10 min**
2. Server action `changerStadeBatch()` + audit batch — **15 min**
3. Checkbox + bouton bulk page.tsx onglet Porcelets — **15 min**
4. Dialog mode multi (réutilisation `_dialog-changer-stade` ou nouveau `_dialog-changer-stade-batch.tsx`) — **15 min**
5. Tests : tsc + e2e:smoke + smoke visuel demo@ — **15 min** (cf protocole 8 étapes)

**Total : ~70 min** (vs 30 min estimé initial — gap dû aux 2 bugs P0 enum désync non anticipés)

**Risque** : faible si on garde l'action `changerStade` single intacte (rétro-compat fiche [id]).

---

## 6. QUESTIONS À CHRISTOPHE AVANT R2

1. **Option A/B/C** retenue ?
2. **Désync enum TS/BDD** : OK pour fixer dans la même PR Lane 1, ou commit séparé `fix(stades): sync enum TS/BDD` avant ?
3. **Stades `depart` et `controle`** présents en TS mais pas en BDD : à supprimer du TS (=jamais utilisés) ou à ajouter en BDD via migration ? (Recommandation : supprimer TS, ils ne servent à rien aujourd'hui)
4. **Suspicion cascade sevrage S4** (`categorie='porcelet'` vs enum réel) : audit hors S5-L1 maintenant ou plus tard ?
5. **Catégories porcelets dans `stadesAutorisesPour()`** : étendre à `porcelet_lait`/`porcelet_sevre` avec mêmes stades autorisés que `porcelet_croissance` (`croissance, finition, depart, controle` → à remplacer par stades réels) ?

---

**Fichier** : 5.4 KB (≤ 6 KB) ✅  · **Fin R1 Lane 1**
