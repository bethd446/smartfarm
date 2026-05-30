# Journal — 2026-05-30 · Identité VERGER + cohérence + casse naturelle

**Branche** : `fix/verger-identite-coherence` (depuis `origin/main` @ `c360e1b`)
**Worktree** : `~/sf-identite-coherence`

## Fait

Intégration de la **livraison design VERGER (phase 1 : identité)** + correction des écarts de cohérence relevés par l'audit menus/boutons, + passage de toute l'app interne en **casse naturelle** (alignement sur le prototype VERGER).

### 1. Identité de marque (commit `2e0fd88`)
- Nouveaux assets (kit `smartfarm-verger-desig.zip`, dossier `/brand`) : glyphe « berceau & pousse », lockups (h/v/mono), favicons 16/32/48 + `.ico`, app-icons 192/512, **maskable dédié**, apple-touch 180, OG 1200×630, glyphe topbar.
- `app/src/app/layout.tsx` : `themeColor` `#2D4A1F`→`#6E9551`, `metadataBase`, bloc `openGraph`.
- `app/public/manifest.json` : `theme_color` sauge, `background_color` paper, `purpose` corrigés (séparation `any` / `maskable`).

### 2. Onze correctifs cohérence (commit `2e0fd88`)
themeColor PWA, casse naturelle bottom-nav/sidebar/topbar/FAB-sheet, **contraste FAB** (`--sf-warm` indéfinie → `text-white`), ombre FAB vert TV → `--sh-md`, onglets statut `slate` → tokens, focus clavier bottom-nav, toggle contraste `amber/slate` → tokens, bulles assistant `emerald/amber` → sauge/abricot. Bonus : focus-ring FAB + hamburger alignés sur `--focus` (fallbacks ocre/vert morts retirés).

### 3. Casse naturelle globale (commit `181c3c0`)
Retrait de l'UPPERCASE « tampon imprimerie » (eyebrows, en-têtes de tableau, labels, badges, titres de dialogs, eyebrows d'en-tête de page) sur **87 fichiers** (workflow multi-agent + `.eyebrow` global + 3 eyebrows à `toUpperCase` JS). Sigles (KPI/PPA/GMQ/TMM/ISSF) et codes animaux préservés. **Landing/auth/registre PDF conservés** en style éditorial.

## Vérification
- `build:next-only` exit 0 (26/26 pages, « Compiled successfully »).
- `e2e:smoke` desktop+mobile vert (37/37 puis 36/36, 0 échec ; test hydration #418 inclus).
- Console 0 erreur/0 warning.
- Visuel (dev local `:3200`, compte démo) : dashboard, bâtiments, vue mobile (topbar/bottom-nav/FAB) en casse naturelle VERGER, contraste FAB corrigé.

## Total
108 fichiers vs `origin/main`, +200/−259.

## Reste (hors lot)
- Badges de sévérité « CRITIQUE/ÉLEVÉE… » en capitales (texte-source, pattern urgence) — à trancher.
- Valeurs enum sans accents (« Demarrage », « Maternite ») = **donnée**, pas design.
- Dette P2 : ~fallbacks hex TV morts, fichiers morts `page-fab.tsx`/`user-menu.tsx`, `design.md` racine encore en « Terrain Vivant ».
- **Refonte designer non livrée** : `/tokens` (mapping `--sf-*`), `/components` (specs 8 états), `/screens`, `/icons`, `/copy` (README « à suivre »). Suppression `/assistant` + refonte `/conseiller` (base de connaissances) + UX moteur de règles = phases suivantes.
