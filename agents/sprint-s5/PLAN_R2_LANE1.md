# PLAN R2 — Sprint S5 Lane 1 (Bulk transition stade porcelets)

**Date** : 2026-05-25 · **Phase** : R2 ORCHESTRATEUR · **Effort cible** : ~65 min

---

## Périmètre

### ✅ Touche
- `app/src/lib/stades-animaux.ts` — sync enum + extend catégories
- `app/src/app/(app)/cheptel/_server-actions.ts` — +`changerStadeBatch()`
- `app/src/app/(app)/cheptel/_porcelets-table-bulk.tsx` — **nouveau** (client, checkbox + sticky bar)
- `app/src/app/(app)/cheptel/_dialog-changer-stade-batch.tsx` — **nouveau** (client, intersection stades)
- `app/src/app/(app)/cheptel/page.tsx` — switch table conditionnel pour onglet `porcelets`

### ❌ Touche pas
- `cheptel/[id]/_dialog-changer-stade.tsx` (single, route fiche, intact)
- `cheptel/[id]/_actions.ts` `changerStade()` single (intact)
- `cheptel/_banner-transfert-croissance.tsx` (garde valeur pédagogique ≥24 kg)
- `cheptel/_row-actions.tsx` (intact)
- `nouvelleCategoriePourStade()` (bascule catégorie reportée mini-sprint dédié)

---

## Étapes ordonnées

### 1. Fix `lib/stades-animaux.ts` (10 min)

- `TOUS_LES_STADES` ← sync 11 valeurs BDD :
  `[lactation, demarrage_1, demarrage_2, croissance, finition, cochette, truie_vide, truie_gestante, truie_allaitante, verrat, reforme]`
- `LIBELLES_STADE` ← ajouter libellés FR pour `lactation`, `demarrage_1`, `demarrage_2`, `reforme`
- Supprimer `depart`, `controle` (dead code)
- `stadesAutorisesPour()` ← étendre :
  - `porcelet_lait` → `[lactation, demarrage_1]`
  - `porcelet_sevre` → `[demarrage_1, demarrage_2, croissance]`
  - `porcelet_croissance` → `[demarrage_2, croissance, finition]`
  - `porc_engraissement` → `[croissance, finition, reforme]`
  - `default` ← retirer `depart`/`controle`
- `nouvelleCategoriePourStade()` ← intact (out of scope)
- **Vérif** : `grep -rn "'depart'\|'controle'" app/src` → 0 (sinon corriger usages)

### 2. Server action `changerStadeBatch()` (15 min)

Fichier : `cheptel/_server-actions.ts`

```ts
export async function changerStadeBatch(input: {
  ids: string[]
  nouveau_stade: StadeAnimal
  motif?: string
}): Promise<{ ok: true; count: number; batch_id: string } | { ok: false; error: string }>
```

- Zod : `ids` array (min 1, max 100, uuid), `nouveau_stade` enum réel, motif optional ≤500
- SELECT `animaux` WHERE id IN (ids) AND statut='actif' AND deleted_at IS NULL → récupère `categorie, stade, tag, ferme_id`
- Validation : pour chaque animal, vérifier `nouveau_stade ∈ stadesAutorisesPour(categorie)`. Si un seul rejet → return error "Animal X ne peut transitionner vers Y"
- **Exclusion verrat** : si `categorie='verrat'` dans la sélection → return error
- UPDATE `animaux` SET stade=nouveau_stade WHERE id IN (ids)
- Génère `batch_id = crypto.randomUUID()`
- INSERT batch audit_log : 1 ligne par animal, `action='STADE_CHANGE_BATCH'`, `after_data={stade, motif, batch_id}`, `before_data={stade: ancien_stade, batch_id}`
- revalidatePath `/cheptel`, `/dashboard`, `/batiments`

### 3. Composant `_porcelets-table-bulk.tsx` (15 min)

`'use client'`, props : `rows: Animal[]`

- État local : `selectedIds: Set<string>`
- Table HTML native (pas ResponsiveTable, car state cross-row)
- Colonne checkbox header (select all visible) + checkbox par row (min h-11 touch)
- Colonnes : TAG / NOM / SEXE / CATÉGORIE / STADE / NAISSANCE / ACTIONS
- Sticky bar bas (apparaît si `selectedIds.size > 0`) :
  - "{N} sélectionné(s)"
  - Bouton "Changer le stade" → ouvre dialog batch
  - Bouton "Tout désélectionner"
- Mobile : table responsive native (overflow-x-auto + colonnes prioritaires)

### 4. Dialog `_dialog-changer-stade-batch.tsx` (15 min)

`'use client'`, props : `animalIds: string[]`, `animaux: Pick<Animal, 'id'|'tag'|'categorie'|'stade'>[]`, `onClose: () => void`

- Header : "Changer stade — {N} animaux"
- Section "Animaux sélectionnés" : badges tags (max 10 visible + "+X autres")
- Calcul intersection stades autorisés :
  ```ts
  const intersection = animaux.reduce<Set<StadeAnimal>>(
    (acc, a) => {
      const allowed = new Set(stadesAutorisesPour(a.categorie))
      return acc.size === 0
        ? allowed
        : new Set([...acc].filter(s => allowed.has(s)))
    },
    new Set()
  )
  ```
- Si `intersection.size === 0` → message "Sélection mixte non transitionnable, choisissez une catégorie homogène"
- Sinon : Select stade cible (options = intersection moins stades déjà partagés)
- Textarea motif optionnel
- Submit → `changerStadeBatch({ids, nouveau_stade, motif})` → toast.success/error → router.refresh + onClose

### 5. Intégration `page.tsx` onglet porcelets (10 min)

- Import `PorceletsTableBulk` dynamique
- Conditionnel ligne 219-223 :
  ```tsx
  {tab === 'portees' ? <PorteesTable .../>
   : tab === 'porcelets' ? <PorceletsTableBulk rows={animaux} />
   : <AnimauxTable rows={animaux} tab={tab} />}
  ```
- Banner Croissance reste intact (au-dessus, conditionnel filter=pret_croissance)

---

## Tests R4 / R5 (protocole charte §4)

| # | Test | Cible |
|---|---|---|
| 1 | `npm run typecheck` | 0 erreur |
| 2 | `npm run build` | exit 0 |
| 3 | `grep -rn "'depart'\|'controle'" app/src` | 0 |
| 4 | Smoke BDD démo : INSERT 3 porcelets test `demarrage_2`, UPDATE batch → `croissance`, vérif 3 lignes `audit_log` STADE_CHANGE_BATCH même `batch_id`, DELETE | OK |
| 5 | Smoke e2e desktop + mobile | PASS |
| 6 | `npm run dev` + DevTools MCP : /cheptel?tab=porcelets, sélectionner 3, bouton bulk, dialog batch, submit | Screenshots avant/après |
| 7 | Console browser : 0 React #418 / 0 hydration warn / 0 401-403 RLS | OK |
| 8 | Commit + push + sleep 180s + smoke prod (CI auto) | CI vert |

---

## Anti-pièges

- ❌ Ne pas casser ResponsiveTable (utilisé tabs truies/verrats)
- ❌ Ne pas toucher route fiche `[id]` (single intact)
- ❌ Filtre `statut='actif' AND deleted_at IS NULL` obligatoire dans `changerStadeBatch` SELECT (charte §10 règle 9)
- ❌ Exclure `categorie='verrat'` du batch (immutable)
- ❌ Ne pas étendre `nouvelleCategoriePourStade` (mini-sprint dédié plus tard)

---

## Livrables attendus phase R3

1. `lib/stades-animaux.ts` patché
2. `cheptel/_server-actions.ts` +`changerStadeBatch()`
3. `cheptel/_porcelets-table-bulk.tsx` créé
4. `cheptel/_dialog-changer-stade-batch.tsx` créé
5. `cheptel/page.tsx` patché (1 ligne switch table)

**Fin R2.**
