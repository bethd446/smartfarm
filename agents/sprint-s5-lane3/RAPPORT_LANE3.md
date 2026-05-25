# RAPPORT LANE 3 — Alertes Smart Farm (S5)

**Agent** : Claude Opus 4.7 — mode caveman, périmètre exclusif `app/src/app/(app)/alertes/**`
**Date** : 2026-05-25
**Branche worktree** : `claude/heuristic-raman-db8723`

---

## Fait

**3 fichiers modifiés** (zéro fichier créé hors rapport) :

| Fichier | LOC ± | Fixes |
|---|---|---|
| `app/src/app/(app)/alertes/_components/alerte-card.tsx` | +75 / -8 | Fix #1, Fix #2 |
| `app/src/app/(app)/alertes/_components/alertes-list.tsx` | +90 / -12 | Fix #2, Fix #4, Fix #5 |
| `app/src/app/(app)/alertes/page.tsx` | +5 / -2 | Fix #3 |

---

## Fix #1 — Boutons `href="#"` → action réelle (Option A retenue)

**Diagnostic** : La view SQL `v_alertes_actives` n'expose PAS de colonne `lien_suggere`. L'engine TypeScript (`@/lib/alertes-engine.ts:183`) faisait donc `r.lien_suggere ?? '#'` → **100 % des alertes pointaient vers `#`**, pas seulement colostrum/sevrage.

**Choix : Option A — routage contextuel client-side**

Justification :
- Option B (retirer les CTA) aurait perdu l'action utile pour toutes les alertes (gestation, vaccin, soins J3...), pas juste colostrum/sevrage. Régression UX.
- L'engine pur (hors scope L3) garde son fallback `'#'` côté serveur, mais le composant client `alerte-card.tsx` calcule un lien crédible via une nouvelle fonction `computeLien(alerte)`. Pas de modif `lib/alertes-engine.ts`.

**Implémentation** : `alerte-card.tsx`
- Nouvelle fonction `computeLien(alerte): string | null` (lignes 47-109)
- Mapping `regle_id` → route :
  - `colostrum*` → `/mises-bas/check-j1` (page formulaire existante)
  - `sevrage*` → `/mises-bas` (page avec dialog Sevrage)
  - `soins_porcelets_j3`, `vaccin`, `traitement`, `vermifuge`, `fer_porcelet` → `/sanitaire/calendrier`
  - `porcelets_pret_croissance`, `porcelets_anticipation_croissance` → `/cheptel?stade=demarrage`
  - `truies_vides*` → `/cheptel?stade=truie_vide`
  - `portees_zombies` → `/mises-bas`
  - `chaleur`, `gestation`, `echo`, `saillie`, `retour_chaleurs` → `/reproduction/saillies`
  - `mise_bas`, `surveillance_mb`, `transfert_maternite` → `/mises-bas`
  - `stock*` → `/stocks` ; `aliment*`, `transition` → `/alimentation/plans` ; `eau*` → `/sanitaire/eau`
  - `observation_manuelle` → `/alertes`
  - Fallback cible animale → `/cheptel/<id>`
  - Sinon → `null` → **CTA masqué** (pas de bouton mort)

Le lien `cible_label` côté texte applique la même logique : si `null`, on rend un `<span>` non cliquable au lieu d'un `<Link href="#">`.

---

## Fix #2 — Touch targets ≥44px

L'atome `Button` (`src/components/ui/button.tsx`) garantit déjà `min-h-12`/`min-h-14` sur toutes les variantes — pas de risque réel de bouton < 44px. La critique V2 mesurait probablement la **hauteur de texte rendu** (font 13px upcase = ~17px line-height), pas la hauteur du bouton.

**Ajouts défensifs `min-h-11` explicites** :
- `alerte-card.tsx` : CTA Button + Link `cible_label` (déjà à `min-h-[44px]` → migré vers `min-h-11`)
- `alertes-list.tsx` : boutons `Par catégorie`/`Par règle`, snooze/réactiver, toggle `Afficher snoozed`, pagination Précédent/Suivant

**Padding horizontal** sur snooze : `min-h-11 px-3` ; pagination : `min-h-11 px-4`.

---

## Fix #3 — Cap badge `99+` sur compteur header

**Fait** : `page.tsx` ligne 76-83 → `{total > 99 ? '99+' : total}` avec `aria-label={\`${total} alertes actives\`}` (lecteurs d'écran gardent le compte exact).

**Bottom-nav** : vérifié `app/src/components/bottom-nav.tsx:144` :
```
{alertesCount > 99 ? '99+' : alertesCount}
```
**Le cap est déjà en place côté bottom-nav.** Rien à flag à l'orchestrateur sur ce point.

---

## Fix #4 — Catégoriser les alertes colostrum périmées (>48h)

**Implémentation** : `alertes-list.tsx`
- Constantes `COLOSTRUM_EXPIRE_HEURES = 48` + `GROUPE_COLOSTRUM_EXPIRE = 'colostrum_expire'` (lignes 54-75)
- Helper `isColostrumExpire(a)` : âge alerte > 48h ET `regle_id` contient `'colostrum'`
- Dans `groupes` (useMemo) : si `isColostrumExpire(a)` → bucket dédié (peu importe le mode catégorie/règle)
- Section affichée **en bas de liste**, opacity 0.80, titre gris, **repliable** via button `aria-expanded` (état `showColostrumExpire`, replié par défaut)
- Label : `▸ Colostrum non vérifié (expiré >48 h)`

**Pas de modif BDD** (vue `v_alertes_actives` reste intacte). Pas besoin de flag Lane 1 pour ce point — la péremption est une décision UX, pas une suppression DB (l'alerte reste consultable pour traçabilité).

**Note** : la péremption est calculée à chaque `useMemo` (Date.now()) — si l'utilisateur garde la page ouverte plusieurs heures sans changer de filtre, le bucket peut être stale. Trade-off acceptable (pas critique).

---

## Fix #5 — Contraste boutons "Par catégorie" / "Par règle"

**Analyse** : la variante `outline` de l'atome Button (`bg-transparent text-[var(--sf-primary)]`) sur fond Card blanc devrait théoriquement être OK (vert sahel sur blanc = AAA). La critique mentionne "blanc sur blanc" — possiblement un état hover/focus mal géré ou un parent injectant `color: white`.

**Fix défensif** : sur l'état non-sélectionné (`outline`), on force via `!important` Tailwind :
- `bg-[var(--sf-surface-1,#fff)]` (fond explicite blanc)
- `!text-[var(--sf-primary,#2D4A1F)]` (texte vert ferme, ratio ~9:1 sur blanc → AAA)
- `hover:!text-white` (sur hover, le bg devient primary → texte blanc OK)

Appliqué également sur les boutons pagination (même variant outline).

`aria-pressed={…}` ajouté sur les 2 toggles + snooze pour sémantique correcte aux lecteurs d'écran (état pressé/non pressé).

---

## Vérifs

| Vérif | Résultat |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | **BLOQUÉ** : la sandbox refuse l'exécution de `tsc` (PermissionDeniedError sur `Bash`). |
| Lecture manuelle JSX balance | OK : ouvertures/fermetures `{groupes.map(…) => { ... return (<section>…</section>) })` correctes |
| Types | OK : `Alerte` du module engine, casts `as string`/`as CategorieFilter` cohérents, `aria-pressed` valide sur Button (utilisé ailleurs dans repo : `password-input.tsx`, `contrast-toggle.tsx`) |
| Réutilisation atomes shadcn | OK : `Button` + `Link` + `Card` existants, pas de nouveau composant |
| ARIA préservés | OK : `aria-label="Masquer pendant 24 heures"` + nouveaux `aria-pressed`, `aria-expanded`, `aria-live="polite"` sur pagination |
| Server vs Client | OK : `page.tsx` reste Server Component, `alertes-list.tsx` et `alerte-card.tsx` restent Client (le `'use client'` n'a pas été ajouté à alerte-card.tsx — il était déjà Server, et maintenant utilise juste des fonctions pures `computeLien` qui n'ont pas besoin de runtime client) |

**Flag tsc** : impossible de tourner tsc dans cette sandbox. **TODO orchestrateur** : lancer `cd app && npx tsc --noEmit -p tsconfig.json` avant merge.

---

## Divergences & flags orchestrateur

1. **Bottom-nav cap 99+** : **déjà en place** (ligne 144). Rien à faire.

2. **Lien suggere côté BDD** : la view `v_alertes_actives` n'expose pas `lien_suggere`. Le fix est appliqué côté client (acceptable, pas de blocage UX). **Flag Lane 1 (optionnel, P2)** : si on veut centraliser, ajouter une colonne `lien_suggere` calculée dans la view avec un `CASE WHEN type LIKE 'colostrum%' THEN '/mises-bas/check-j1' WHEN type LIKE 'sevrage%' THEN '/mises-bas' …END`. Pas urgent — la dégradation actuelle (computeLien côté client) tient parfaitement.

3. **Trigger SQL colostrum_check** : (cf. `20260523120000_smartfarm_genesis.sql:880-890`) l'alerte est créée avec `date_evenement = NEW.date_mb + 1 day`. Quand `mb` date d'il y a 2 mois, l'alerte reste "active" dans `v_alertes_actives` car `traitee=false`. **Flag Lane 1 (P1)** : ajouter un `WHERE` à la view qui filtre `type = 'colostrum_check' AND age > 7 days → NOT IN active`, OU créer un job de nettoyage. Mon fix #4 (bucket repliable) est un patch UX, pas une vraie correction métier.

4. **`<Link><Button>` nesting** : Le code existant (avant mon fix) avait déjà `<Link href><Button>` qui produit `<a><button>` (invalid HTML). J'ai préservé ce pattern car répandu dans le repo. **Pas un blocker**, mais à refactorer en P3 avec `Link asChild` ou `Button render={<a/>}`.

5. **`Date.now()` dans `useMemo` pour colostrum_expire** : le bucket "expiré" peut devenir obsolète si page ouverte > 1h. Acceptable, mais si on veut ultra-propre il faudrait un `setInterval` qui force un re-render toutes les 5 min. P3.

---

## TODO orchestrateur

1. **Tester `npx tsc --noEmit`** depuis `app/` (sandbox local) avant merge.
2. **Smoke test `/alertes` sur compte `13smartfarm` SF-000001** :
   - Vérifier qu'aucun CTA ne mène vers `#` (devtools : sélectionner tous les `<a href="#"]` → doit être 0).
   - Cliquer "VÉRIFIER COLOSTRUM" sur une alerte récente → doit ouvrir `/mises-bas/check-j1`.
   - Cliquer "TRAITER SEVRAGE" → doit ouvrir `/mises-bas`.
   - Vérifier compteur header : `100` → `99+`.
   - Vérifier bucket en bas "▸ Colostrum non vérifié (expiré >48 h) (N)" replié, cliquer pour déplier.
   - Mesurer touch targets sur tous les boutons d'une carte alerte → ≥ 44px.
3. **Vérifier contraste boutons "Par catégorie"/"Par règle"** en devtools (Lighthouse a11y audit) → ratio attendu ≥ 4.5:1.
4. **Coordonner avec Lane 1** si décision de pousser `lien_suggere` dans la view SQL (point 2 du flag).

---

**Caveman delivered. 3 files, 5 fixes, ZÉRO bouton mort, dégradation propre partout.**
