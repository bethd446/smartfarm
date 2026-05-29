# RAPPORT L3 — Harmonisation `app/(app)/stock/page.tsx`

**Sprint** : Design Phase D3 — Task 4
**Cible** : `app/src/app/(app)/stock/page.tsx` (266 lignes baseline)
**Statut** : DONE_WITH_CONCERNS (divergence mineure sur consigne dates — voir §3)

---

## 1. AVANT / APRÈS — Vue d'ensemble

| Zone | AVANT | APRÈS |
|---|---|---|
| Header | `text-4xl` Big Shoulders + icône Package + sous-titre. OK déjà tokenisé. | Idem + **eyebrow `LOGISTIQUE`** ajouté en tête (Pattern E). |
| KPI 3 cards | Grille `grid-cols-3` de `<Card>` shadcn, valeurs `text-3xl`. Encart neutre. | **Pattern A bandeau registre** : `<section>` `border-t-2 primary` + `border-b line` + 3 cellules avec icône (`Boxes`/`Coins`/`Truck`), eyebrow Big Shoulders, valeur `text-2xl tabular-nums`, label + sub. Alerte globale si articles sous seuil (`role="alert" aria-live="polite"`). |
| Tableau inventaire | `<div>` wrapper avec 4 bordures custom via vars `--sf-rule-*`, header `eyebrow` séparé. | **Pattern C strict** : wrapper `border-t-2 primary` + `overflow-x-auto -mx-4 sm:mx-0`, `min-w-[800px]`, hairlines `border-b border-line`. Plus simple, aligné repro. |
| Empty state | `<EmptyOnboarding>` dans une cellule `<td colSpan={6}>`. | Hissé **hors table** (rendu conditionnel propre), pas de table fantôme quand 0 article. |
| Lignes alerte | `AlertTriangle` inline + `Badge danger`. | Idem + **`role="alert" aria-live="polite"` sur la `<tr>`** quand `isAlerte`. |
| Imports morts | `Card`, `CardContent`, `CardHeader` (non utilisés en partie). | `Card`/`CardContent` supprimés. Ajouts : `Boxes`, `Coins`, `Truck` lucide. |
| FAB / dialogs / ExportButton | OK. | **Inchangés** (props, IDs, comportement). |

---

## 2. Préservation data — grep AVANT vs APRÈS

| Token | AVANT | APRÈS | Statut |
|---|---|---|---|
| `DialogEntreeStock\|DialogSortieStock\|DialogNouvelleMatiere` | 6 | 6 | ✅ identique (3 imports + 3 triggers) |
| `isAlerte` | 2 | 3 | ➕ +1 (calcul agrégé `articlesEnAlerte` pour KPI critique) — non régression |
| `typeIcons` | 2 | 2 | ✅ identique (déclaration + usage `typeIcons[s.type]`) |
| `ExportButton` | (1 usage) | 2 (import + usage) | ✅ préservé |
| `StockFab` | (1 usage) | 2 (import + usage) | ✅ préservé |
| `totalValeur` | 2 | 2 | ✅ calcul intact |
| `from '@/components/ui/card'` | 1 | 0 | ✅ import mort nettoyé |
| anti-patterns (`linear-gradient`, `backdrop-blur`, `border-l-[2-9]`, `instrument.serif`, `font-editorial`) | 0 | 0 | ✅ |

---

## 3. Divergence vs brief — Consigne dates / RelativeTime

**Brief** : « Dates : 3 occurrences → `<RelativeTime date={x} addSuffix />`. Import `RelativeTime` depuis `@/components/ui/relative-time`. »

**Réalité fichier** : le grep baseline `toLocaleDateString|toLocaleString|formatDistanceToNow` retournait **3** matches, **tous sur des `toLocaleString('fr-FR')` appliqués à des nombres FCFA** :
- L125 : `totalValeur.toLocaleString('fr-FR')` — somme FCFA
- L229 : `s.cout_moyen_unite?.toLocaleString('fr-FR')` — coût unitaire FCFA
- L232 : `(s.stock_actuel * (s.cout_moyen_unite ?? 0)).toLocaleString('fr-FR')` — valeur ligne FCFA

**Aucune date n'est rendue dans `page.tsx`** (le modèle `matieres_premieres` a bien des `created_at`/`updated_at` mais ils ne sont pas affichés ici).

**Décision** : ne pas importer `RelativeTime`, ne pas remplacer les `toLocaleString` numériques (ce sont des formats monétaires `tabular-nums`, attendus par §3.3 du spec).

**Confirmation grep APRÈS** :
- `toLocaleDateString|formatDistanceToNow` → **0**
- `toLocaleString` (numérique FCFA) → **3** (inchangé)
- `RelativeTime` → **0**

→ Divergence assumée et documentée. Pas de régression métier.

---

## 4. Garde-fous respectés

- 0 `linear-gradient` / `backdrop-blur` / `border-l-[2-9]` / `Instrument Serif` / `font-editorial`
- Tokens `--sf-*` only (primary, line, ink, muted, subtle, accent, danger-ink, surface-2, font-display, font-body)
- Cibles tactiles ≥ 44px (`min-h-[44px]` sur cellules KPI, `py-3 px-4` sur lignes table)
- **Emoji `typeIcons` préservés** (exception DS L31-37 documentée)
- A11y renforcée : `role="alert" aria-live="polite"` sur cellule KPI critique + lignes en alerte
- 0 commit / 0 push / 0 build / 0 tsc (respect périmètre worktree design)

---

## 5. Fichier touché

- `/Users/13mac/smartfarm-design/app/src/app/(app)/stock/page.tsx` — 1 réécriture complète (266 → ~330 lignes, gain en lisibilité Pattern A/C + a11y)

**Hors périmètre, non touchés** : `_dialogs-stock.tsx`, `_fab.tsx`, `_server-actions.ts`, `ui/*`.

---

## 6. Risques résiduels

- **Aucune date à harmoniser dans ce fichier** — si une future itération doit afficher `created_at`/`last_movement_at`, prévoir l'import `RelativeTime` à ce moment-là.
- Les emoji conservés peuvent rendre différemment selon le système (Android Noto vs iOS Apple Color Emoji). Cohérent avec exception DS déjà actée.
- `articlesEnAlerte` est calculé côté serveur (RSC) — aucun coût client, aligné avec le reste du fichier.

---

**STATUT : DONE_WITH_CONCERNS**
Concern unique = divergence dates documentée §3 (la consigne ne s'applique pas au contenu réel du fichier).
