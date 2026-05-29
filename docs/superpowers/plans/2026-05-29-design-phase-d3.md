# Design Phase D3 — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent la syntaxe checkbox (`- [ ]`).

**Goal:** Harmoniser les 5 dernières pages (`mises-bas`, `mortalités`, `stock`, `pesees`, `actions-rapides`) au registre app dense, sans casser data/logique/nav.

**Architecture:** Application fidèle d'un design-system déjà en place (registre dense hairline, bandeau KPI, table dense, dot par forme). Exécution en 2 vagues séquentielles de sous-agents Opus sur des `page.tsx` à périmètres disjoints. Pas de tests unitaires : la vérification est **déterministe** (grep anti-patterns / nav préservée / dates) + `tsc` + `build` + **smoke visuel** (protocole CLAUDE.md §4).

**Tech Stack:** Next.js 16 (App Router, RSC, Turbopack), React 19, TypeScript, Tailwind v4 (`@theme`, tokens `--sf-*`), shadcn/ui, Supabase RLS.

**Branche:** `feat/design-phase-d` (PR #11). **Spec:** `docs/superpowers/specs/2026-05-29-design-phase-d3-design.md`.

---

## Patterns de référence (sources réelles, à reproduire — ne pas réinventer)

### Pattern A — Bandeau KPI dense
Source : `app/src/app/(app)/alimentation/_components/nutrition-stats.tsx:200-258`. Remplace les KPI hero-metric isolés.
```tsx
<section aria-label="Indicateurs <zone>" className="border-t-2 border-b border-[var(--sf-line)]" style={{ borderTopColor: 'var(--sf-primary)' }}>
  <div className="grid grid-cols-2 lg:grid-cols-4">
    {cells.map((c, i) => {
      const Icon = c.icon
      return (
        <div key={c.label} className={['min-h-[44px] px-3 py-3 sm:px-4','border-[var(--sf-line)]', i % 2 === 1 ? 'border-l' : '', 'lg:border-l', i % 4 === 0 ? 'lg:border-l-0' : '', i >= 2 ? 'border-t lg:border-t-0' : ''].filter(Boolean).join(' ')}>
          <div className="flex items-center justify-between gap-2">
            <Icon className="h-4 w-4 shrink-0" style={{ color: c.tone }} />
            <span className="text-[10px] uppercase tracking-[0.16em] shrink-0" style={{ color: 'var(--sf-subtle, #8A7F6D)', fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}>{c.period}</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold tabular-nums leading-tight" style={{ color: c.tone }}>{c.value}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.12em] leading-tight" style={{ color: 'var(--sf-muted, #5C5346)', fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}>{c.label}</div>
          <div className="mt-0.5 text-[11px] tabular-nums leading-tight line-clamp-1" style={{ color: 'var(--sf-subtle, #8A7F6D)' }}>{c.sub}</div>
        </div>
      )
    })}
  </div>
</section>
```
Note alerte : si une cellule est critique, ajouter `{...(c.critical ? { role: 'alert', 'aria-live': 'polite' as const } : {})}` et passer `c.tone = 'var(--sf-danger-ink)'`.

### Pattern B — Registre liste dense numéroté
Source : `app/src/app/(app)/alimentation/page.tsx:104-139`. Pour des listes de navigation/modules.
```tsx
<div className="border-t-2" style={{ borderTopColor: 'var(--sf-primary)' }}>
  <ul>
    {ITEMS.map((c, i) => {
      const Icon = c.icon
      return (
        <li key={c.href} className="border-b border-[var(--sf-line)]">
          <Link href={c.href} className="group flex items-center gap-3 min-h-[56px] px-2 py-3 transition-colors hover:bg-[var(--sf-surface-1)] focus:outline-none focus-visible:bg-[var(--sf-surface-1)] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--sf-primary)]">
            <span className="tabular-nums text-[var(--sf-subtle)] text-sm font-semibold shrink-0 w-6 text-right" style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}>{String(i + 1).padStart(2, '0')}</span>
            <Icon className="h-6 w-6 shrink-0 text-[var(--sf-primary)]" />
            <div className="min-w-0 flex-1">
              <h3 className="min-w-0 truncate text-[15px] font-semibold leading-tight tracking-[0.01em] text-[var(--sf-ink)]" style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}>{c.title}</h3>
              <p className="mt-0.5 text-xs leading-snug text-[var(--sf-muted)] line-clamp-2 md:line-clamp-1" style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}>{c.description}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--sf-subtle)] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </li>
      )
    })}
  </ul>
</div>
```

### Pattern C — Table dense hairline (journal chronologique)
Source : `app/src/app/(app)/reproduction/page.tsx:337-400`. Pour les registres de données (mortalités, mises bas, pesées, inventaire).
```tsx
<div className="overflow-x-auto -mx-4 sm:mx-0 border-t-2" style={{ borderTopColor: 'var(--sf-primary,#2D4A1F)' }}>
  <table className="w-full min-w-[800px] text-sm">
    <thead className="border-b border-[var(--sf-line)] text-left text-[var(--sf-muted)]" style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)", fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      <tr><th className="py-3 px-4 font-semibold">Date</th>{/* …colonnes… */}</tr>
    </thead>
    <tbody>
      {(rows ?? []).map((r: any) => (
        <tr key={r.id} className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40">
          <td className="py-3 px-4 tabular-nums text-[var(--sf-ink)]"><RelativeTime date={r.date} addSuffix /></td>
          {/* …cellules : tabular-nums pour les chiffres, <Badge variant=…> pour les statuts… */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Pattern D — Date hydration-safe (règle 10)
Remplace **tout** `new Date(x).toLocaleDateString('fr-FR')` / `toLocaleString` / `formatDistanceToNow` en JSX serveur.
```tsx
import { RelativeTime } from '@/components/ui/relative-time'
// …
<RelativeTime date={x} addSuffix />
```
Import : `RelativeTime` (relatif « il y a 3 jours »). Pas de composant date-civile dédié ; `RelativeTime addSuffix` est le défaut retenu (précédent D2-L3).

### Pattern E — Header de page (eyebrow + titre)
Eyebrow Big Shoulders 11px uppercase tracking + titre Big Shoulders. Voir `app/src/app/(app)/sanitaire/page.tsx` (header hub) comme référence. Sous-compteur en `font-semibold tabular-nums`, pas en hero-metric.

---

## File Structure

| Fichier (touché) | Vague | Responsabilité | Exclus (ne pas toucher) |
|---|---|---|---|
| `app/src/app/(app)/mises-bas/page.tsx` | V1 | Liste mises bas + portées + KPI | `_dialog-{mise-bas,adoption,sevrage}.tsx`, `_fab.tsx`, `_server-actions.ts`, `_schemas.ts`, `check-j1/` |
| `app/src/app/(app)/mortalites/page.tsx` | V1 | KPI taux + registre mortalités | `_dialog-mortalite.tsx`, `_server-actions.ts`, `_schemas.ts` |
| `app/src/app/(app)/stock/page.tsx` | V2 | KPI valeur + inventaire | `_dialogs-stock.tsx`, `_fab.tsx`, `_server-actions.ts` |
| `app/src/app/(app)/pesees/page.tsx` | V2 | KPI + pesées récentes | `_dialog-peser.tsx`, `_actions-peser.tsx`, `_fab.tsx`, `_schemas.ts`, `_server-actions.ts` |
| `app/src/app/(app)/actions-rapides/page.tsx` | V2 | Lanceur 4 tuiles tactiles | (aucun autre fichier dans le dossier) |

Périmètre : **chaque tâche ne touche que `page.tsx`**. Aucun `ui/*`.

---

## VAGUE 1 — mises-bas + mortalités (2 sous-agents parallèles)

### Task 1 : Harmoniser `mises-bas/page.tsx`

**Files:**
- Modify: `app/src/app/(app)/mises-bas/page.tsx` (579 l)

- [ ] **Step 1 : Baseline grep (capturer l'état AVANT pour preuve de non-régression)**

Run :
```bash
cd app/src/app/\(app\)/mises-bas
echo "href:";        grep -c "href=" page.tsx
echo "dialogs:";     grep -cE "DialogMiseBas|DialogAdoption|DialogSevrage" page.tsx
echo "check-j1:";    grep -c "check-j1" page.tsx
echo "dates:";       grep -cE "toLocaleDateString|toLocaleString|formatDistanceToNow" page.tsx
```
Noter les 4 nombres (servent de référence avant==après en Step 4).

- [ ] **Step 2 : Appliquer la transformation**

1. **Header** → Pattern E (eyebrow ÉLEVAGE + titre Big Shoulders « Mises bas »). Sous-compteur en `tabular-nums`.
2. **KPI éventuels** (gros chiffres isolés) → Pattern A (bandeau dense). S'il n'y a pas de KPI hero, ne rien ajouter.
3. **Cards / card-grids** (19 `<Card>`, 3 `grid-cols`) :
   - Listes de données chronologiques (mises bas enregistrées, portées) → **Pattern C** (table dense). Colonnes alignées, `tabular-nums` sur les chiffres (nés vivants, mort-nés, poids), `<Badge>` pour les statuts.
   - Listes de navigation/sections → **Pattern B** (registre numéroté) si pertinent.
4. **Dates** : remplacer les 4 occurrences `toLocaleDateString` par **Pattern D** (`<RelativeTime date={…} addSuffix />`). Ajouter l'import `RelativeTime`.
5. **Préserver à l'identique** : les 3 triggers de dialog (`DialogMiseBas`/`DialogAdoption`/`DialogSevrage`), le `_fab`, le lien vers `check-j1`, tous les calculs et requêtes Supabase, le vocabulaire (Mise bas, Portée, Sevrage, Adoption).
6. **Interdits** : 0 `linear-gradient`/`backdrop-blur`/`border-l-[2-9]`/Instrument Serif/`font-editorial`. Tokens `--sf-*` only. Cibles ≥ 44 px.

- [ ] **Step 3 : Nettoyer les imports morts**

Retirer les imports `Card`/`CardContent`/`CardHeader` devenus inutilisés. Ajouter `RelativeTime`, et `ChevronRight`/`Badge` si utilisés par les patterns.

- [ ] **Step 4 : Vérification déterministe**

Run :
```bash
cd app/src/app/\(app\)/mises-bas
echo "anti-patterns (attendu 0):"; grep -niE "linear-gradient|backdrop-blur|border-l-[2-9]|instrument.serif|font-editorial" page.tsx | wc -l
echo "dates non-safe (attendu 0):"; grep -cE "toLocaleDateString|toLocaleString|formatDistanceToNow" page.tsx
echo "href (== baseline):";        grep -c "href=" page.tsx
echo "dialogs (== baseline):";     grep -cE "DialogMiseBas|DialogAdoption|DialogSevrage" page.tsx
echo "check-j1 (== baseline):";    grep -c "check-j1" page.tsx
echo "RelativeTime (≥1):";         grep -c "RelativeTime" page.tsx
```
Expected : anti-patterns 0 · dates 0 · href/dialogs/check-j1 == baseline Step 1 · RelativeTime ≥ 1.

- [ ] **Step 5 : Rapport de lane**

Écrire `agents/sprint-design-phase-d3/rapports/RAPPORT_L1.md` (≤ 120 l) : avant/après par bloc, data préservée, sorties grep réelles, divergences. **Pas** de commit (gate W1).

---

### Task 2 : Harmoniser `mortalites/page.tsx`

**Files:**
- Modify: `app/src/app/(app)/mortalites/page.tsx` (458 l)

- [ ] **Step 1 : Baseline grep**

Run :
```bash
cd app/src/app/\(app\)/mortalites
echo "href:";    grep -c "href=" page.tsx
echo "dialog:";  grep -c "DialogMortalite" page.tsx
echo "dates:";   grep -cE "toLocaleDateString|toLocaleString|formatDistanceToNow" page.tsx
```

- [ ] **Step 2 : Appliquer la transformation**

1. **Header** → Pattern E (eyebrow + titre « Mortalités »).
2. **KPI hero** (2 gros chiffres : taux mortalité 30 j, etc.) → **Pattern A** (bandeau dense). Conserver le calcul du taux et son ton (danger si élevé).
3. **28 `<Card>`** (registre des mortalités) → **Pattern C** (table dense). Colonnes : Date · Animal (nom + tag mono) · Motif (`<Badge>` tonal) · Poids (`tabular-nums`). Préserver **le vocabulaire motif strict** (motifs métier existants, ne pas reformuler).
4. **Date** : 1 occurrence `toLocaleDateString` → **Pattern D**.
5. **Préserver** : trigger `DialogMortalite`, requêtes Supabase, calcul taux.
6. **Interdits** : idem Task 1.

- [ ] **Step 3 : Nettoyer imports morts** (Card/* → retirer si inutilisés ; ajouter RelativeTime/Badge).

- [ ] **Step 4 : Vérification déterministe**

Run :
```bash
cd app/src/app/\(app\)/mortalites
echo "anti-patterns (0):"; grep -niE "linear-gradient|backdrop-blur|border-l-[2-9]|instrument.serif|font-editorial" page.tsx | wc -l
echo "dates (0):";         grep -cE "toLocaleDateString|toLocaleString|formatDistanceToNow" page.tsx
echo "href (==baseline):"; grep -c "href=" page.tsx
echo "dialog (==baseline):"; grep -c "DialogMortalite" page.tsx
echo "RelativeTime (≥1):"; grep -c "RelativeTime" page.tsx
```
Expected : anti-patterns 0 · dates 0 · href/dialog == baseline · RelativeTime ≥ 1.

- [ ] **Step 5 : Rapport** `agents/sprint-design-phase-d3/rapports/RAPPORT_L2.md` (≤ 120 l). Pas de commit.

---

### Task 3 : Gate Vague 1 (orchestrateur — prof reviewer + commit)

**Files:** aucun fichier source (validation + git).

- [ ] **Step 1 : Typecheck**

Run : `cd app && npx tsc --noEmit -p tsconfig.json`
Expected : 0 erreur.

- [ ] **Step 2 : Build**

Run : `cd app && npm run build:next-only`
Expected : exit 0.

- [ ] **Step 3 : Smoke visuel** (dev server localhost:3000, compte `demo@smartfarm.group`)

Naviguer `/mises-bas` et `/mortalites` (Chrome DevTools MCP) :
- Registre dense rendu (hairlines, bandeau KPI, table alignée, `tabular-nums`).
- Console : 0 **nouvelle** erreur hydration (le bug Radix DialogTrigger préexistant est hors scope).
- 0 régression data (compteurs, badges, listes présents).

- [ ] **Step 4 : Commit Vague 1**

```bash
git add "app/src/app/(app)/mises-bas/page.tsx" "app/src/app/(app)/mortalites/page.tsx" agents/sprint-design-phase-d3/
git commit -m "feat(design): Phase D3 vague 1 — mises-bas + mortalités (registre dense)"
git push origin feat/design-phase-d
```

---

## VAGUE 2 — stock + pesees + actions-rapides (3 sous-agents parallèles)

### Task 4 : Harmoniser `stock/page.tsx`

**Files:**
- Modify: `app/src/app/(app)/stock/page.tsx` (266 l)

- [ ] **Step 1 : Baseline grep**

Run :
```bash
cd app/src/app/\(app\)/stock
echo "href:";   grep -c "href=" page.tsx
echo "dialogs:"; grep -cE "DialogEntreeStock|DialogSortieStock|DialogNouvelleMatiere" page.tsx
echo "isAlerte:"; grep -c "isAlerte" page.tsx
echo "emoji typeIcons:"; grep -c "typeIcons" page.tsx
echo "dates:";  grep -cE "toLocaleDateString|toLocaleString|formatDistanceToNow" page.tsx
```

- [ ] **Step 2 : Appliquer la transformation**

1. **Header** : déjà tokenisé `--sf-*` + Big Shoulders — ne le casse pas ; aligner sur Pattern E si besoin (eyebrow).
2. **KPI 3 cards** (`grid-cols-3`, `text-3xl`) → **Pattern A** (bandeau dense, ex-modèle alimentation).
3. **Inventaire** (liste articles, 10 `<Card>`) → **Pattern C** (table dense) ou Pattern B selon le contenu. **Conserver les emoji `typeIcons` 🌾🥄💉💊🧴📦** (exception DS documentée L23-24 du fichier — NE PAS remplacer par Lucide).
4. **Alerte stock bas** : conserver `isAlerte` + `AlertTriangle` ; en bandeau, porter le ton `--sf-danger` + `role="alert"` (cf note Pattern A).
5. **Dates** : 3 occurrences → **Pattern D**.
6. **Préserver** : `ExportButton`, les 3 triggers dialog, `_fab`.
7. **Interdits** : idem.

- [ ] **Step 3 : Nettoyer imports morts.**

- [ ] **Step 4 : Vérification déterministe**

Run :
```bash
cd app/src/app/\(app\)/stock
echo "anti-patterns (0):"; grep -niE "linear-gradient|backdrop-blur|border-l-[2-9]|instrument.serif|font-editorial" page.tsx | wc -l
echo "dates (0):";          grep -cE "toLocaleDateString|toLocaleString|formatDistanceToNow" page.tsx
echo "isAlerte (==baseline):"; grep -c "isAlerte" page.tsx
echo "typeIcons (==baseline):"; grep -c "typeIcons" page.tsx
echo "dialogs (==baseline):"; grep -cE "DialogEntreeStock|DialogSortieStock|DialogNouvelleMatiere" page.tsx
echo "RelativeTime (≥1):";   grep -c "RelativeTime" page.tsx
```
Expected : anti-patterns 0 · dates 0 · isAlerte/typeIcons/dialogs == baseline · RelativeTime ≥ 1.

- [ ] **Step 5 : Rapport** `…/rapports/RAPPORT_L3.md` (≤ 120 l). Pas de commit.

---

### Task 5 : Harmoniser `pesees/page.tsx`

**Files:**
- Modify: `app/src/app/(app)/pesees/page.tsx` (97 l)

- [ ] **Step 1 : Baseline grep**

Run :
```bash
cd app/src/app/\(app\)/pesees
echo "href:";   grep -c "href=" page.tsx
echo "dialog:"; grep -cE "DialogPeser|_actions-peser|ActionsPeser" page.tsx
echo "dates:";  grep -cE "toLocaleDateString|toLocaleString|formatDistanceToNow" page.tsx
```

- [ ] **Step 2 : Appliquer la transformation**

1. **Header** → Pattern E.
2. **KPI** (1 gros chiffre) → bandeau dense Pattern A (ou intégré au header si une seule mesure).
3. **Pesées récentes** (10 `<Card>`) → **Pattern C** (table dense : Date · Animal · Poids `tabular-nums` · GMQ si présent).
4. **Date** : 1 occurrence → **Pattern D**.
5. **Préserver** : trigger `DialogPeser`, `_actions-peser`, `_fab`.
6. **Interdits** : idem.

- [ ] **Step 3 : Nettoyer imports morts.**

- [ ] **Step 4 : Vérification déterministe**

Run :
```bash
cd app/src/app/\(app\)/pesees
echo "anti-patterns (0):"; grep -niE "linear-gradient|backdrop-blur|border-l-[2-9]|instrument.serif|font-editorial" page.tsx | wc -l
echo "dates (0):";          grep -cE "toLocaleDateString|toLocaleString|formatDistanceToNow" page.tsx
echo "href (==baseline):";  grep -c "href=" page.tsx
echo "RelativeTime (≥1):";  grep -c "RelativeTime" page.tsx
```
Expected : anti-patterns 0 · dates 0 · href == baseline · RelativeTime ≥ 1.

- [ ] **Step 5 : Rapport** `…/rapports/RAPPORT_L4.md` (≤ 80 l). Pas de commit.

---

### Task 6 : Harmoniser `actions-rapides/page.tsx` (cas particulier — tuiles tactiles)

**Files:**
- Modify: `app/src/app/(app)/actions-rapides/page.tsx` (77 l)

- [ ] **Step 1 : Baseline grep**

Run :
```bash
cd app/src/app/\(app\)/actions-rapides
echo "hrefs quick:"; grep -c "quick=true" page.tsx        # attendu 4
echo "couleurs brutes:"; grep -cE "bg-(violet|indigo|red|emerald)-[0-9]" page.tsx  # attendu 4 AVANT
```

- [ ] **Step 2 : Re-tokeniser les 4 tuiles (garder l'ergonomie gants)**

Conserver la grille `grid grid-cols-2 gap-4` et les tuiles **`h-32`** (cibles ≥ 44 px — règle 7). Pour chaque tuile :
- Fond : `bg-[var(--sf-surface-1)]` + bordure hairline `border border-[var(--sf-line)] rounded-xl` (retirer `bg-violet-600`/`indigo`/`red`/`emerald` + `text-white` + `shadow-md`).
- Label : Big Shoulders — `style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}`, `text-[var(--sf-ink)]`.
- Hint : `text-[var(--sf-muted)]`.
- **Icône colorée par domaine** (mapping figé spec §3.5) — ajouter `tone` au type `Action` et l'appliquer via `style={{ color: tone }}` sur l'`<Icon>` :

| Action | `href` | `tone` |
|---|---|---|
| Nouvelle mise bas | `/mises-bas?quick=true` | `var(--sf-primary)` |
| Peser | `/pesees?quick=true` | `var(--sf-info-ink, var(--sf-info))` |
| Soin | `/sanitaire?quick=true` | `var(--sf-danger-ink, var(--sf-danger))` |
| Déplacer | `/cheptel?quick=true` | `var(--sf-accent)` |

- Header : Pattern E (eyebrow + titre) — retirer `text-3xl font-bold` et `text-slate-500` (→ `text-[var(--sf-muted)]`). L'icône `Zap` du header peut passer en `text-[var(--sf-accent)]`.
- Focus visible : conserver un anneau (`focus-visible:ring-2 focus-visible:ring-[var(--sf-primary)] focus-visible:ring-offset-2`).
- **Préserver** : les 4 `href` avec `?quick=true`, le texte d'aide bas de page.

- [ ] **Step 3 : Vérification déterministe**

Run :
```bash
cd app/src/app/\(app\)/actions-rapides
echo "couleurs brutes (attendu 0):"; grep -cE "bg-(violet|indigo|red|emerald)-[0-9]|text-slate-" page.tsx
echo "hrefs quick (==4):";           grep -c "quick=true" page.tsx
echo "anti-patterns (0):";           grep -niE "linear-gradient|backdrop-blur|border-l-[2-9]|instrument.serif|font-editorial" page.tsx | wc -l
echo "h-32 conservé (≥1):";          grep -c "h-32" page.tsx
```
Expected : couleurs brutes 0 · hrefs quick 4 · anti-patterns 0 · h-32 ≥ 1.

- [ ] **Step 4 : Rapport** `…/rapports/RAPPORT_L5.md` (≤ 60 l). Pas de commit.

---

### Task 7 : Gate Vague 2 (orchestrateur — prof reviewer + commit)

**Files:** aucun fichier source (validation + git).

- [ ] **Step 1 : Typecheck** — `cd app && npx tsc --noEmit -p tsconfig.json` → 0 erreur.
- [ ] **Step 2 : Build** — `cd app && npm run build:next-only` → exit 0.
- [ ] **Step 3 : Smoke visuel** — `/stock`, `/pesees`, `/actions-rapides` (compte démo) : registre dense + tuiles neutres + icônes colorées rendues ; 0 nouvelle erreur hydration ; alerte stock bas visible si applicable.
- [ ] **Step 4 : Commit Vague 2**

```bash
git add "app/src/app/(app)/stock/page.tsx" "app/src/app/(app)/pesees/page.tsx" "app/src/app/(app)/actions-rapides/page.tsx" agents/sprint-design-phase-d3/
git commit -m "feat(design): Phase D3 vague 2 — stock + pesees + actions-rapides (registre dense + tuiles tactiles)"
git push origin feat/design-phase-d
```

- [ ] **Step 5 : Clôturer le handoff** — mettre à jour `~/.claude/handoffs/smart-farm-design-phase-d-handoff.md` §9 (D3 terminée, Design D complet).

---

## Notes d'exécution

- **Périmètres disjoints** : à l'intérieur d'une vague, chaque sous-agent ne touche QUE son `page.tsx` → 0 conflit de merge.
- **Sous-agents** : pas de `tsc`/`build`/`commit` (sandbox les bloque de toute façon) ; vérifs par grep + lecture. L'orchestrateur valide aux gates (Task 3, Task 7).
- **Hors scope** (ne pas traiter ici) : bug hydration Radix `DialogTrigger asChild` (tâche dédiée), orphelin `sanitaire-stats.tsx`, Vague 4 fonctionnel.
- **Vocabulaire FR zootech strict** partout (Mise bas, Portée, Sevrage, Truie {gestante|allaitante|vide}, motif mortalité, etc.).
