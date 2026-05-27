# RAPPORT LANE STOCK — Phase A items A4 + A5

Date : 2026-05-27
Auteur : Lane Stock (Claude Opus 4.7)
Branche cible : `feat/phase-a-quick-wins` (worktree principal `/Users/13mac/smartfarm/`)

---

## 1. Résumé exécutif

| Item | Sujet | Statut | Fichiers modifiés |
|---|---|---|---|
| A4 | FAB mobile Stock : `matieres=[]` / `fournisseurs=[]` | ✅ Fix | `_fab.tsx`, `page.tsx` |
| A5 | Centralisation `isAlerte()` | ✅ Fix | `stock-helpers.ts` (nouveau), `page.tsx` (stock + dashboard) |

Aucun changement de comportement non demandé. Sémantique préservée.

---

## 2. A4 — FAB mobile Stock

### Bug constaté
`app/src/app/(app)/stock/_fab.tsx` (lignes 41-42) appelait
```tsx
<DialogEntreeStock matieres={[]} fournisseurs={[]} />
```
→ L'éleveur en mobile (FAB visible `<lg` uniquement) ouvrait le dialog mais ne pouvait sélectionner aucun article ni fournisseur. UX cassée sur le chemin critique mobile.

### Fix appliqué
Pattern Server → Client retenu (plus simple, évite double fetch et nouveau Server Component).

**`_fab.tsx`** — Le composant accepte désormais ses données en props (avec types `FabMatiere` / `FabFournisseur` typés stricts, pas d'`any`) :
```tsx
export function StockFab({
  matieres,
  fournisseurs,
}: {
  matieres: FabMatiere[]
  fournisseurs: FabFournisseur[]
})
```

**`stock/page.tsx`** — Le Server Component qui possède déjà `stocks` + `fournisseurs` (lignes 16-19) les passe maintenant au FAB :
```tsx
<StockFab
  matieres={(stocks ?? []) as any}
  fournisseurs={(fournisseurs ?? []) as any}
/>
```

Aucun nouveau fetch Supabase. Le payload est rendu côté serveur puis injecté dans le client component, comme déjà fait pour les boutons desktop `DialogEntreeStock` (lignes 58-67 de la page).

---

## 3. A5 — Centralisation `isAlerte()`

### Bug constaté
Logique "stock en alerte" dupliquée :
- `dashboard/page.tsx:120-124` → `seuil > 0 && stock < seuil` (gate `seuil > 0`)
- `stock/page.tsx:192` → `s.seuil_alerte && s.stock_actuel < s.seuil_alerte` (truthy)

Divergence visible : "1 EN ALERTE" dashboard vs 4 réelles /stock (cf audit terrain).

### Fix appliqué
**Nouveau fichier `app/src/lib/stock-helpers.ts`** — Helper unique TypeScript strict :
```ts
export type StockItem = {
  stock_actuel: number | null
  seuil_alerte: number | null
}

export function isAlerte(s: StockItem): boolean {
  if (s.seuil_alerte == null || s.stock_actuel == null) return false
  return s.stock_actuel < s.seuil_alerte
}
```

**`stock/page.tsx`** ligne 192 :
```diff
- const alerte = s.seuil_alerte && s.stock_actuel < s.seuil_alerte
+ const alerte = isAlerte(s)
```

**`dashboard/page.tsx`** lignes 119-124 :
```diff
- const nbStocksAlerte = (stockAlertes ?? []).filter((s: any) => {
-   const seuil = s.seuil_alerte ?? 0
-   const stock = s.stock_actuel ?? 0
-   return seuil > 0 && stock < seuil
- }).length
+ const nbStocksAlerte = (stockAlertes ?? []).filter(isAlerte).length
```

### Sémantique préservée ?
Tableau de vérité pour les cas edge :

| `stock_actuel` | `seuil_alerte` | Ancien dashboard | Ancien stock | `isAlerte()` |
|---|---|---|---|---|
| 5 | 10 | true | true | **true** ✅ |
| 10 | 10 | false | false | **false** ✅ |
| 15 | 10 | false | false | **false** ✅ |
| 0 | 10 | true | true | **true** ✅ |
| null | 10 | false (0<10? non, ?? 0 = 0 donc true en fait) | false (truthy stock_actuel = null) | **false** |
| 5 | null | false (?? 0 → seuil=0 → fail seuil>0) | false (truthy) | **false** ✅ |
| 5 | 0 | false (fail seuil>0) | false (truthy 0) | **false** ✅ |

⚠️ **Cas `stock_actuel = null, seuil_alerte = 10`** : ancien dashboard évaluait `0 < 10 = true` à cause du `?? 0`. Le nouvel helper renvoie `false` (explicit null-safe). Comportement plus correct : un article sans stock saisi n'est pas "en alerte", c'est plutôt un trou de donnée.

C'est conforme à la spec brief explicite (`stock_actuel == null ⇒ false`).

---

## 4. Constat hors-périmètre (à signaler pour suite Phase A/B)

### Compteur dashboard tronqué
`dashboard/page.tsx:102` charge stockAlertes via :
```ts
sb.from('matieres_premieres').select('*').order('stock_actuel', { ascending: true }).limit(5)
```
→ Même avec `isAlerte` centralisé, **le compteur "X en alerte" du dashboard reste plafonné à 5** (taille du résultat). Si la ferme a 7 articles en alerte réelle, le dashboard affichera 5 max.

**Recommandation** : faire une seconde requête `count: 'exact'` avec filtre côté SQL (`.lt('stock_actuel', col('seuil_alerte'))` n'existe pas direct → soit RPC, soit vue dédiée, soit fetch all + filter `isAlerte`).

**Hors lane Stock** car touche fetch dashboard, à arbitrer Phase B.

### Autres usages de la logique alerte (hors périmètre exclusif)
Détectés via grep mais NON modifiés (hors lane Stock) :
- `app/src/app/(app)/alimentation/matieres/page.tsx:360` → `Number(m.stock_actuel) < Number(m.seuil_alerte)` (logique encore différente)
- `app/src/lib/chatbot/rag.ts:63` → idem

→ Candidats Phase B : migrer ces 2 fichiers sur `isAlerte()` pour cohérence totale.

---

## 5. Vérifications

| Vérif | Résultat |
|---|---|
| `npx tsc --noEmit` | ❌ Non exécutable depuis ce contexte sandbox (Bash bloqué sur `npx`). À lancer par l'orchestrateur côté worktree principal avant commit. |
| Lecture croisée diff | ✅ Types cohérents : `StockItem` (champs `stock_actuel?: number\|null`, `seuil_alerte?: number\|null`) compatible des rows Supabase `matieres_premieres`. |
| grep régression `matieres={[]}` | ✅ 0 occurrence restante après fix |
| Sémantique préservée | ✅ Cf tableau §3 |

**À faire côté orchestrateur avant commit** : `cd /Users/13mac/smartfarm/app && npx tsc --noEmit` puis smoke visuel mobile FAB Stock (compte demo).

---

## 6. Fichiers livrés

| Path | Action |
|---|---|
| `app/src/lib/stock-helpers.ts` | **Créé** (18 lignes) |
| `app/src/app/(app)/stock/_fab.tsx` | Modifié (props matieres/fournisseurs) |
| `app/src/app/(app)/stock/page.tsx` | Modifié (passe props au FAB + `isAlerte`) |
| `app/src/app/(app)/dashboard/page.tsx` | Modifié (use `isAlerte` pour `nbStocksAlerte` uniquement, par scope strict du brief) |
| `agents/sprint-phase-a-2026-05-27/RAPPORT_LANE_STOCK.md` | **Créé** (ce rapport) |

Fin du rapport.
