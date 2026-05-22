# Rapport V2-D — BCS truie partout + décomposition mortalité néonatale

**Statut : ✅ Terminé — Build pending (orchestrateur)**

**Date : 2026-05-21**
**Agent : Sonnet 4.5 (V2-D)**
**Périmètre : reproduction (saillie) + mises-bas (mise-bas, sevrage) + fiche animal**

---

## 1. Migration SQL

### Fichier créé
`supabase/migrations/20260521210000_bcs_et_mortalite_neonatale.sql` — atomique (`BEGIN ... COMMIT`)

### Contenu
- `saillies.bcs_truie numeric(2,1)` + `CHECK (bcs_truie IS NULL OR (bcs_truie >= 1 AND bcs_truie <= 5))`
- `mises_bas.bcs_truie numeric(2,1)` + même CHECK
- `mises_bas.ecrases integer DEFAULT 0` + `CHECK (ecrases IS NULL OR ecrases >= 0)`
- `sevrages.bcs_truie numeric(2,1)` + même CHECK
- Vue `v_bcs_historique_truie` (security_invoker=true) consolidant saillie + mise_bas + sevrage
- `GRANT SELECT ON v_bcs_historique_truie TO anon, authenticated`

### Vérifications post-migration

```
$ psql -c "\d saillies" | grep bcs
 bcs_truie    | numeric(2,1) ...
 "saillies_bcs_truie_check" CHECK (bcs_truie IS NULL OR bcs_truie >= 1::numeric AND bcs_truie <= 5::numeric)

$ psql -c "\d mises_bas" | grep -E "bcs|ecrases|nes_morts|momifies"
 nes_morts       | integer  | default 0
 momifies        | integer  | default 0
 bcs_truie       | numeric(2,1) | (nullable)
 ecrases         | integer  | default 0
 "mises_bas_bcs_truie_check" CHECK (bcs_truie IS NULL OR bcs_truie >= 1::numeric AND bcs_truie <= 5::numeric)
 "mises_bas_ecrases_check"   CHECK (ecrases IS NULL OR ecrases >= 0)

$ psql -c "\d sevrages" | grep bcs
 bcs_truie      | numeric(2,1) | (nullable)
 "sevrages_bcs_truie_check" CHECK (bcs_truie IS NULL OR bcs_truie >= 1::numeric AND bcs_truie <= 5::numeric)

$ psql -c "\d+ v_bcs_historique_truie"
 truie_id  | uuid
 date_obs  | date
 bcs_truie | numeric(2,1)
 evenement | text
 ferme_id  | uuid
```

### Test contrainte (rollback)
`INSERT ... bcs_truie=7` → **`check_violation` levée comme attendu** ✓

---

## 2. Fichiers front modifiés (6)

### Schémas Zod
- **`app/src/app/(app)/reproduction/_schemas.ts`** : `saillieSchema` étendu avec `bcs_truie` (coerce.number 1..5 optionnel)
- **`app/src/app/(app)/mises-bas/_schemas.ts`** : `miseBasSchema` étendu avec `bcs_truie` + `ecrases` ; `sevrageSchema` étendu avec `bcs_truie`

### Server Actions
- **`app/src/app/(app)/reproduction/_server-actions.ts`** : `creerSaillie` insère `bcs_truie` (null si vide)
- **`app/src/app/(app)/mises-bas/_server-actions.ts`** : `creerMiseBas` insère `bcs_truie` + `ecrases` ; `creerSevrage` insère `bcs_truie`

### Dialogs (3 écrans clés BCS)
- **`app/src/app/(app)/reproduction/_dialog-faire-monter.tsx`** (saillie) : ajout BCS picker 5 boutons radio horizontaux (1..5) avec idéal=3 surligné, helper text
- **`app/src/app/(app)/mises-bas/_dialog-elle-a-fait.tsx`** (mise-bas) : ajout champ `ecrases` (Écrasés post-naissance) + BCS picker + helper text "Décomposition utile pour le diagnostic pré/post-natal"
- **`app/src/app/(app)/mises-bas/_dialog-enlever-petits.tsx`** (sevrage) : ajout BCS picker

### Liste mises-bas
- **`app/src/app/(app)/mises-bas/page.tsx`** :
  - Remplacement de "M+M" combiné par décomposition explicite **Mort-nés / Momifiés / Écrasés** (3 cards distinctes avec tons sémantiques)
  - Ligne "BCS truie" affichée si renseigné

### Fiche animal
- **`app/src/app/(app)/cheptel/[id]/page.tsx`** :
  - Fetch additionnel `v_bcs_historique_truie` (20 derniers) et `mises_bas` décomposée (10 dernières portées)
  - Nouvelle section grille 2 colonnes :
    - **Carte "BCS (Body Condition Score)"** : liste valeur/5 + badge événement (saillie/mise_bas/sevrage) + date, EmptyState si vide
    - **Carte "Historique des portées"** : pour chaque MB → Vivants / Mort-nés / Momifiés / Écrasés / Poids portée + badge BCS si renseigné

### Pattern UX BCS (réutilisé identiquement dans les 3 dialogs)
- 5 boutons radio horizontaux `flex gap-2`, hauteur h-12
- Bouton 3 (idéal) surligné en vert clair (`sf-success-bg`) même non sélectionné
- Bouton sélectionné fond vert primaire (`sf-primary`), texte blanc
- Click sur valeur déjà sélectionnée → désélectionne (remise à '')
- Helper text : "1 = très maigre, 3 = optimal, 5 = grasse"
- `input type="hidden" {...register('bcs_truie')}` pour rétention RHF
- `role="radiogroup"` + `role="radio"` + `aria-checked` (a11y)

---

## 3. Décomposition mortalité néonatale (objectif 2)

Les colonnes `nes_morts` et `momifies` étaient déjà en DB et déjà saisies par le dialog mise-bas (laissées intactes). Ajouts V2-D :

- **Nouveau champ `ecrases`** (pertes post-naissance) saisi dans le dialog + inséré par server action
- **Affichage explicite** sur la liste mises-bas : 3 cards Mort-nés / Momifiés / Écrasés (au lieu de "M+M" agrégé)
- **Affichage explicite** sur la fiche animal : ligne "Vivants: N | Mort-nés: M | Momifiés: P | Écrasés: Q | Poids: X kg" pour chaque portée

Note : le `refine` Zod existant `nes_totaux === nes_vivants + nes_morts + momifies` est conservé (bloquant, car le DB constraint `chk_mb_somme_naissances` est lui-même bloquant). Le brief évoquait un avertissement non bloquant mais cela aurait nécessité de supprimer une contrainte DB pré-existante (hors périmètre).

---

## 4. Tests / vérification

### TypeScript (tsc --noEmit)
```
$ tsc --noEmit -p tsconfig.json
... (24 erreurs mais TOUTES dans le périmètre V2-E :
     v_kpi_techniques_truie / KpiTechRanking — vue absente)
```
**Aucune erreur TS attribuable aux fichiers V2-D modifiés.**

### Routes HTTP
Non testées : conformément au brief, l'orchestrateur centralise build + redeploy en fin de vague. Le serveur Node n'est pas relancé ici.

### Vue & contraintes
- `SELECT * FROM v_bcs_historique_truie LIMIT 5` → 0 ligne (pas encore de données BCS — normal)
- `INSERT ... bcs_truie=7` → `check_violation` ✓
- `GRANT SELECT` appliqué à `anon, authenticated` ✓

---

## 5. Livrables récapitulatifs

| Livrable | Statut |
|---|---|
| Migration `20260521210000_bcs_et_mortalite_neonatale.sql` | ✅ créée + appliquée |
| Dialog saillie BCS | ✅ |
| Dialog mise-bas BCS + écrasés + helper | ✅ |
| Dialog sevrage BCS | ✅ |
| Fiche truie : carte évolution BCS + historique portées décomposé | ✅ |
| Liste mises-bas : décomposition mortalité affichée | ✅ |
| Vue `v_bcs_historique_truie` (security_invoker) | ✅ |
| Tests post-migration | ✅ |
| Build + redeploy | ⏳ **Pending — à faire par l'orchestrateur** |

---

## 6. Coordination inter-agents

- **V2-E** (KpiTech) a modifié `cheptel/[id]/page.tsx` en parallèle pendant ma session. J'ai relu le fichier avant ma seconde édition pour merger proprement → ma section BCS est insérée **après** la section "Performances techniques" de V2-E, **avant** `<AnimalTabs>`.
- Aucun conflit constaté avec **V2-F**.
- N'ai pas touché : nutrition, sanitaire, chatbot, sidebar/bottom-nav, alertes, `_actions-porcelets.ts`.

---

## 7. Notes pour l'orchestrateur

1. **`npm run build` requis** : Server Actions Next.js et nouvelle migration → rebuild standalone obligatoire avant redeploy.
2. **Types Supabase** : si `app/src/types/database.ts` est généré automatiquement, il faudra le régénérer pour refléter les nouvelles colonnes. Sans ça, TypeScript pourrait râler à terme sur `m.bcs_truie` / `m.ecrases` (actuellement OK car les fetch n'utilisent pas le type explicite).
3. **Pas de seed BCS** : la vue est vide jusqu'à saisie utilisateur — `EmptyState` géré côté UI.
