# Audit Dark Mode — Light 9/10 · Dark 4/10

> Méthode : 5 pages auditées (dashboard, alertes, sanitaire, cheptel, assistant). Toggle `document.documentElement.setAttribute('data-theme', 'dark')`. Vision Gemini KO → audit DOM via `getComputedStyle` (couleurs réelles bg/color/border). Fallback documenté dans le brief.

---

## OK (bonnes surprises)

- **Sidebar** : `aside` bg `#0d0c09` (override `dark:bg-[#0d0c09]`) → identique en light/dark, texte `white/90`. Cohérent voulu (sidebar toujours sombre côté design).
- **Cards / sub-cards** : tous les `[class*="card"]` bg `rgb(27,24,18)` (~`#1B1812`) + text crème `rgb(246,241,229)`. Contraste ≈ 13:1 → AAA.
- **KPI cards dashboard + sanitaire** : OK, lisibles, bg dark cohérent.
- **Textarea assistant** : bg `rgb(27,24,18)` + text `rgb(246,241,229)` + placeholder `rgb(181,169,146)` → OK (contraste ≈ 7:1).
- **Boutons primaires "NOUVEL ANIMAL" / "NOUVEAU VACCIN"** : bg vert foncé `rgb(45,74,31)` + text blanc, OK partout.
- **Light mode** : body crème + text `rgb(26,26,26)` noir → contraste 16:1, sidebar volontairement sombre → cohérence visuelle propre.
- **CSS vars `--sf-*`** : `--sf-bg #1b1812`, `--sf-primary #7ba853`, `--sf-success #98c56f`, `--sf-danger #d87262` → palette dark-friendly correcte.

---

## P0 bugs (illisible / cassé)

### BUG RACINE — `<main>` reste en bg crème en dark mode
- Confirmé sur **les 5 pages auditées** : `main { background: rgb(250,247,240) }` (cream `#FAF7F0` hardcodé via `bg-[var(--sf-cream,#FAF7F0)]`).
- Combiné à `color: rgb(246,241,229)` (text crème hérité du `body` dark) → **texte crème sur fond crème, contraste ≈ 1.02:1**.
- Impact : **tout le contenu hors cards est illisible** :
  - **/cheptel** : table sans wrapper card → 5 lignes (Adjoa, Akissi, Aya, Koffi, Yao) avec text crème invisible sur main cream. Headers TR `rgb(181,169,146)` aussi invisibles.
  - **/sanitaire** : `<table>` "Derniers vaccins" bg transparent → cells text crème sur cream = illisible. Headers TH `rgb(181,169,146)` sur cream = invisible.
  - **/assistant** : titre `h1` "Assistant Smart Farm" text crème sur main cream = invisible.
  - **/alertes** : compteurs hors cards ("5 ALERTES ACTIVES", "1 CRITIQUES", "3 ÉLEVÉES", "1 MOYENNES") + titre H1 "Alertes" + paragraphe sous-titre = illisibles.
  - **/dashboard** : h1 "AUJOURD'HUI", h2 "ALERTES ACTIVES", "TIP DU JOUR", "PROCHAINS ÉVÉNEMENTS", "DERNIÈRES NAISSANCES", "STOCK QUI BAISSE" → tous text crème sur main cream = invisibles. Heureusement les liens (ALLER VOIR, VOIR TOUTES) restent verts donc lisibles.

### Selects / Filtres /alertes restés en blanc pur
- Combobox "GRAVITÉ" et "CATÉGORIE" : `bg rgb(255,255,255)` + text `rgb(26,26,26)` → reste en mode light hardcodé, contraste fonctionnel mais incohérent dans une UI dark.

---

## P1 (peu lisible / incohérences)

- **Boutons secondaires "EXPORT VACCINS / SOINS / PERTES" + "SCANNER"** : bg transparent + text vert foncé `rgb(45,74,31)`. Sur main cream (light leak), lisible par accident. Si le main était fixé en dark, le texte vert foncé sur bg sombre deviendrait illisible (contraste ≈ 2:1) — **piège latent post-fix**.
- **Headers tableaux TH** : color `rgb(181,169,146)` (gris muted). Sur card dark = correct (~4.5:1). Sur main cream (cheptel/sanitaire actuel) = invisible. Faudra requalifier après fix main.
- **Variables shadcn non patchées** : `--background: lab(100% 0 0)` (= blanc pur) et `--card: lab(100% 0 0)` restent **identiques en dark** d'après l'inspection. Aucun composant shadcn brut (Tooltip, Popover, DropdownMenu) ne basculera proprement. Pas vu sur les 5 pages mais bombe à retardement sur dialogs/modals.
- **Bordures sf-border `#f6f1e533`** (crème 20% alpha) : OK sur bg dark, peu visible. À conserver.

---

## Score

- **Light : 9/10** — propre, contrasté, identité visuelle solide. -1 pour aucun défaut critique observé.
- **Dark  : 4/10** — palette CSS bien pensée mais bug racine sur `<main>` casse l'expérience sur 100% des pages. Cards lisibles, mais headers, tables sans wrapper, titres H1/H2 et compteurs flottants → illisibles.

---

## Recommandations fix (≤5 bullets)

1. **Fix racine `<main>`** : remplacer `bg-[var(--sf-cream,#FAF7F0)]` par `bg-[var(--sf-surface-0)]` (ou tout token qui suit le data-theme). Localisé probablement dans `app-shell.tsx` ou layout root. Vague 3 du dark-mode fix.
2. **Forcer wrap card autour des tables** `/cheptel` et `/sanitaire` (table actuellement orpheline sur main) — ou ajouter `[data-theme=dark] table { background: var(--sf-surface-1); }` global.
3. **Patcher les comboboxes Radix `[role="combobox"]`** dans `/alertes` (filtres GRAVITÉ/CATÉGORIE) : remplacer `bg-white` hardcodé par `bg-[var(--sf-surface-1)]`. Idem chercher tous les `bg-white` restants (`rg "bg-white" src/`).
4. **Patcher tokens shadcn** dans `globals.css` : ajouter bloc `[data-theme='dark'] { --background: …; --card: …; --foreground: …; --muted: …; }` pour que les composants ui/* brut (Dialog, Popover, Tooltip-fallback) suivent automatiquement.
5. **Re-tester boutons secondaires (EXPORT/SCANNER)** après fix main : leur text `rgb(45,74,31)` (vert foncé) devra basculer sur `--sf-primary #7ba853` clair en dark — sinon contraste 2:1 sur fond sombre. Token `text-primary-dark` ou variant `outline-dark` à introduire.

---

## Annexe — couleurs clés inspectées

| Élément | bg dark | color dark | Status |
|---|---|---|---|
| body | `rgb(13,12,9)` (`#0D0C09`) | `rgb(246,241,229)` | ✅ |
| sidebar `aside` | `rgb(26,26,26)` | `white/90` | ✅ (intentionnel) |
| `main` | `rgb(250,247,240)` (`#FAF7F0`) | `rgb(246,241,229)` | ❌ contraste 1.02:1 |
| `[class*="card"]` | `rgb(27,24,18)` / `rgb(42,36,28)` | `rgb(246,241,229)` | ✅ ≈13:1 |
| `textarea` (assistant) | `rgb(27,24,18)` | `rgb(246,241,229)` | ✅ |
| combobox filtres /alertes | `rgb(255,255,255)` | `rgb(26,26,26)` | ⚠️ hardcodé blanc |
| bouton primaire | `rgb(45,74,31)` | `rgb(255,255,255)` | ✅ |
| bouton secondaire outline | transparent | `rgb(45,74,31)` | ⚠️ piège post-fix |
