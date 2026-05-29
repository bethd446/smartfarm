# RAPPORT L5 — Task 6 : Actions rapides (re-tokenisation)

**Statut** : DONE
**Cible** : `app/src/app/(app)/actions-rapides/page.tsx` (77 → 92 l)
**Cas particulier** : lanceur terrain pensé pour les gants (≥44px préservés).

---

## AVANT / APRÈS — couleurs brutes → tokens

| Tuile | AVANT (fond + ring) | APRÈS (icône `tone`) |
|---|---|---|
| Nouvelle mise bas | `bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-400` + `text-white` | icône `var(--sf-primary)` |
| Peser | `bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-400` + `text-white` | icône `var(--sf-info-ink, var(--sf-info))` |
| Soin | `bg-red-600 hover:bg-red-700 focus-visible:ring-red-400` + `text-white` | icône `var(--sf-danger-ink, var(--sf-danger))` |
| Déplacer | `bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-400` + `text-white` | icône `var(--sf-accent)` |

**Fond tuiles** : `bg-[var(--sf-surface-1)]` + `border border-[var(--sf-line)] rounded-xl` + hover `hover:bg-[var(--sf-surface-2)]`. Suppression `shadow-md`.
**Focus** : `ring-4` (hors-token) → `ring-2` `--sf-primary` avec `ring-offset-2 ring-offset-[var(--sf-surface-1)]`.
**Label tuile** : `text-white text-xl font-bold` → `text-[var(--sf-ink)] text-xl` + Big Shoulders Display via `style`.
**Hint** : `text-xs font-normal opacity-90` → `text-xs text-[var(--sf-muted)]`.

**Header (Pattern E)** :
- AVANT : `<Zap text-amber-500>` + `<h1 text-3xl font-bold>Actions rapides</h1>` + `<p text-slate-500>…`.
- APRÈS : `<Zap text-[var(--sf-accent)]>` + eyebrow `TERRAIN` (`text-xs uppercase tracking-[0.18em] var(--sf-muted)` Big Shoulders) + `<h1 text-3xl var(--sf-ink)>` Big Shoulders + sous-titre `var(--sf-muted)`.
- Aide bas de page : `text-slate-500` → `text-[var(--sf-muted)]`.

**Type `Action`** : champ `classes: string` remplacé par `tone: string` (couleur token). Icône reçoit `style={{ color: tone }}`.

---

## GREP — AVANT / APRÈS

| Check | AVANT | APRÈS | Cible |
|---|---|---|---|
| `bg-(violet|indigo|red|emerald)-[0-9]` ou `text-slate-` | 4 + 2 = 6 | **0** | 0 |
| `quick=true` (hrefs) | 4 | **4** | 4 |
| anti-patterns (gradient/blur/border-l-2+/instrument.serif/font-editorial) | 0 | **0** | 0 |
| `h-32` (ergo gants ≥44px) | 1 | **1** | ≥1 |
| tokens `var(--sf-{primary|info|danger|accent})` | 0 | **6** | ≥4 |

---

## GARDE-FOUS RESPECTÉS

- ✅ Ergo gants : `h-32`, `grid grid-cols-2 gap-4`, focus-visible préservé (anneau passé en token).
- ✅ Tokens `--sf-*` uniquement, aucune couleur brute Tailwind.
- ✅ Pattern E header (eyebrow + titre Big Shoulders + sous-titre `--sf-muted`) sans dépendre de `PageTitle` (composant non listé au périmètre → inline contrôlé).
- ✅ 4 hrefs `?quick=true` intacts.
- ✅ Aucun autre fichier modifié. 0 build/tsc/commit/push.

## DIVERGENCES / CONCERNS

- **PageTitle non utilisé** : Sanitaire utilise `<PageTitle eyebrow icon>`. Périmètre Task 6 = `page.tsx` uniquement, donc Pattern E reproduit inline (mêmes tokens / fontes). Si harmonisation stricte attendue plus tard, swap vers `<PageTitle>` trivial (1 import + 5 lignes).
- **Apostrophe** : `s'actionnent` échappé en `s&apos;actionnent` pour rester safe JSX (équivalent rendu).
- **Tokens `--sf-info-ink` / `--sf-danger-ink`** : utilisés avec fallback `var(--sf-info)` / `var(--sf-danger)` comme spécifié dans la mission (mapping figé §3.5).
